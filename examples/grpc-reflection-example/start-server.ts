import { Server, loadPackageDefinition, ServerCredentials, ServiceClientConstructor } from '@grpc/grpc-js';
import { load } from '@grpc/proto-loader';
import { join } from 'path';

import wrapServerWithReflection from 'grpc-node-server-reflection';
const seconds = Date.now();

const Genre = {
  UNSPECIFIED: 0,
  ACTION: 1,
  DRAMA: 2,
};

const Movies = [
  {
    cast: ['Tom Cruise', 'Simon Pegg', 'Jeremy Renner'],
    name: 'Mission: Impossible Rogue Nation',
    rating: 0.97,
    year: 2015,
    time: {
      seconds,
    },
    genre: Genre.ACTION,
  },
  {
    cast: ['Tom Cruise', 'Simon Pegg', 'Henry Cavill'],
    name: 'Mission: Impossible - Fallout',
    rating: 0.93,
    year: 2018,
    time: {
      seconds,
    },
    genre: Genre.ACTION,
  },
  {
    cast: ['Leonardo DiCaprio', 'Jonah Hill', 'Margot Robbie'],
    name: 'The Wolf of Wall Street',
    rating: 0.78,
    year: 2013,
    time: {
      seconds,
    },
    genre: Genre.DRAMA,
  },
];

export default async function startServer(subscriptionInterval = 1000) {
  const server = wrapServerWithReflection(new Server());

  const packageDefinition = await load('./service.proto', {
    includeDirs: [join(__dirname, './proto')],
  });
  const grpcObject = loadPackageDefinition(packageDefinition);
  server.addService((grpcObject.MoviesService as ServiceClientConstructor).service, {
    getMovies(call, callback) {
      const result = Movies.filter(movie => {
        for (const [key, value] of Object.entries(call.request.movie)) {
          if (movie[key] === value) {
            return true;
          }
        }
      });
      const moviesResult = { result };
      callback(null, moviesResult);
    },
  });
  server.addService((grpcObject.MovieSearchService as ServiceClientConstructor).service, {
    searchMoviesByCast(call) {
      const input = call.request;
      call.on('error', error => {
        console.error(error);
        call.end();
      });
      const interval = setInterval(() => {
        Movies.forEach((movie, i) => {
          if (movie.cast.indexOf(input.castName) > -1) {
            setTimeout(() => {
              if (call.cancelled || call.destroyed) {
                clearInterval(interval);
                return;
              }
              call.write(movie);
            }, i * subscriptionInterval);
          }
        });
      }, subscriptionInterval * (Movies.length + 1));
    },
  });
  server.bindAsync('0.0.0.0:50051', ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      throw error;
    }
    server.start();

    console.log('gRPC Server started, listening: 0.0.0.0:' + port);
  });
  return server;
}

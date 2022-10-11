import 'json-bigint-patch';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { getMesh } from '@graphql-mesh/runtime';
import { basename, join } from 'path';

import { printSchema, lexicographicSortSchema } from 'graphql';
import { readFile } from 'fs-extra';

const config$ = findAndParseConfig({
  dir: join(__dirname, '..'),
});
const mesh$ = config$.then(config => getMesh(config));
import { startServer as startGrpcServer } from '../start-server';
import { Server } from '@grpc/grpc-js';
const grpc$ = startGrpcServer(300);
jest.setTimeout(15000);

describe('gRPC Example', () => {
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(printSchema(lexicographicSortSchema(schema))).toMatchSnapshot('grpc-schema');
  });
  it('should get movies correctly', async () => {
    const GetMoviesQuery = await readFile(join(__dirname, '../example-queries/GetMovies.query.graphql'), 'utf8');
    const { execute } = await mesh$;
    await grpc$;
    const result = await execute(GetMoviesQuery, {});
    expect(result).toMatchSnapshot('get-movies-grpc-example-result');
  });
  it('should fetch movies by cast as a subscription correctly', async () => {
    const MoviesByCastSubscription = await readFile(
      join(__dirname, '../example-queries/MoviesByCast.subscription.graphql'),
      'utf8'
    );
    const { subscribe } = await mesh$;
    await grpc$;
    const result = await subscribe(MoviesByCastSubscription);
    expect(Symbol.asyncIterator in result).toBeTruthy();
    const resultIterator = result[Symbol.asyncIterator]();
    expect(await resultIterator.next()).toMatchSnapshot('movies-by-cast-grpc-example-result-1');
    expect(await resultIterator.next()).toMatchSnapshot('movies-by-cast-grpc-example-result-2');
    await resultIterator.return();
  });
  afterAll(() => {
    mesh$.then(mesh => mesh.destroy());
    grpc$.then((grpc: Server) => grpc.forceShutdown());
  });
});

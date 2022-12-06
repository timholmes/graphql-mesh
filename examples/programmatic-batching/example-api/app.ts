import { Router } from 'itty-router';
import { createServerAdapter } from '@whatwg-node/server';
import { Response } from '@whatwg-node/fetch';

export function createApp() {
  const app = createServerAdapter(Router());

  const users = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Doe' },
    { id: 3, name: 'John Smith' },
    { id: 4, name: 'Jane Smith' },
  ];

  app.post('/users_by_ids', async (req: Request) => {
    const body = await req.json();
    const ids = body.ids;
    const results = users.filter(user => ids.includes(user.id));
    return new Response(
      JSON.stringify({
        results,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  return app;
}

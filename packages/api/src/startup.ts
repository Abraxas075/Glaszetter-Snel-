import type { Express } from 'express';
import type { Server } from 'node:http';

export async function startApi(app: Express, check: () => Promise<void>, port: number | string): Promise<Server> {
  await check(); // No requests are accepted against an incomplete database.
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.once('error', reject);
  });
}

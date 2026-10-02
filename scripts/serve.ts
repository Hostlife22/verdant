import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { build } from './build';

const development = process.argv.includes('--dev');
const server = createServer((request, response) => {
  void (async () => {
    if (
      request.url !== '/' &&
      request.url !== '/index.html' &&
      request.url !== '/verdant/'
    ) {
      response.writeHead(404).end('Not found');
      return;
    }
    if (development) await build();
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(await readFile('dist/index.html'));
  })().catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    response.writeHead(500).end('Build failed. Check the terminal.');
  });
});

server.listen(4173, '127.0.0.1', () =>
  process.stdout.write(
    'Verdant: http://127.0.0.1:4173 (refresh to see edits)\n',
  ),
);

function stop(): void {
  server.close();
  server.closeAllConnections();
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

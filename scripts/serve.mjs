import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 4177);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.bin':'application/octet-stream', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml', '.py':'text/plain; charset=utf-8', '.md':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.zip':'application/zip' };
const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/lab-05') { response.writeHead(301, { Location: '/lab-05/' }); response.end(); return; }
    if (pathname.startsWith('/lab-05/')) pathname = pathname.slice('/lab-05'.length);
    if (pathname.split('/').some(part => part.startsWith('.') && part !== '.nojekyll')) throw new Error('Forbidden');
    let path = resolve(root, '.' + pathname);
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Forbidden');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type':types[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => { console.log(`Lab 5 preview: http://127.0.0.1:${port}/`); console.log(`GitHub Pages path test: http://127.0.0.1:${port}/lab-05/`); });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

// Servidor local simples: o player do YouTube não toca em páginas abertas via file://
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5500;
const ROOT = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.ico': 'image/x-icon'
};

// Imita as funções da Vercel: /api/nome roda api/nome.js (a pasta api não é servida como arquivo)
function runApi(name, req, res) {
  const fn = path.join(ROOT, 'api', name + '.js');
  if (name.startsWith('_') || !fs.existsSync(fn)) { res.writeHead(404); return res.end(); }
  delete require.cache[require.resolve('./api/_convidados')];
  delete require.cache[require.resolve(fn)];
  req.query = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
  require(fn)(req, res);
}

http.createServer((req, res) => {
  let file = decodeURIComponent(req.url.split('?')[0]);
  if (file.startsWith('/api/')) return runApi(file.slice(5), req, res);
  if (file === '/') file = '/index.html';
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Convite em http://localhost:${PORT} (feche esta janela para parar)`));

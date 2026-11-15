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
// Arquivos que nunca são servidos ao navegador
const PRIVADOS = new Set(['servidor.js', 'confirmacoes-local.json', 'abrir convite.bat']);

// Lê o arquivo .env (se existir) para testar ligado à planilha: GOOGLE_SCRIPT_URL=... e PLANILHA_TOKEN=...
try {
  for (const linha of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (e) { /* sem .env: confirmações vão para confirmacoes-local.json */ }

const lerCorpo = req => new Promise(resolve => {
  let dados = '';
  req.on('data', c => { dados += c; if (dados.length > 1e5) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(dados || '{}')); } catch (e) { resolve({}); } });
});

// Imita as funções da Vercel: /api/nome roda api/nome.js (a pasta api não é servida como arquivo)
async function runApi(name, req, res) {
  const fn = path.join(ROOT, 'api', name + '.js');
  if (!/^[a-z0-9-]+$/i.test(name) || name.startsWith('_') || !fs.existsSync(fn)) { res.writeHead(404); return res.end(); }
  delete require.cache[require.resolve('./api/_convidados')];
  delete require.cache[require.resolve(fn)];
  req.query = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  if (req.method === 'POST') req.body = await lerCorpo(req);
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
  try { await require(fn)(req, res); }
  catch (err) { console.error(err); if (!res.headersSent) res.status(500).json({ ok: false }); }
}

http.createServer((req, res) => {
  let file = decodeURIComponent(req.url.split('?')[0]);
  if (file.startsWith('/api/')) return runApi(file.slice(5), req, res);
  if (file === '/') file = '/index.html';
  const full = path.join(ROOT, file);
  const rel = path.relative(ROOT, full);
  if (!full.startsWith(ROOT) || rel.split(path.sep).some(p => p.startsWith('.')) ||
      PRIVADOS.has(rel.toLowerCase()) || /^(api|planilha)[\\/]/i.test(rel)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Convite em http://localhost:${PORT} (feche esta janela para parar)`);
  console.log(process.env.GOOGLE_SCRIPT_URL ? 'Confirmações: planilha do Google' : 'Confirmações: arquivo confirmacoes-local.json (teste)');
});

// Roda o site (pasta docs/) e uma imitação da API do Google Apps Script no computador,
// para testar o site exatamente como ele vai funcionar no GitHub Pages.
//   TZ=America/Sao_Paulo node dev/servidor-local.js     → http://localhost:8801/
//
// A imitação faz o mesmo caminho do Google: POST em /exec responde com um
// redirecionamento (302) para outro endereço, que devolve o JSON com CORS liberado.
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function iniciar(portas) {
  portas = portas || { site: 8801, api: 8802, eco: 8803 };
  const G = require('./fake-gas.js');
  const ctx = vm.createContext(Object.assign({ console, Date, Math, JSON, Object, String, Number, Array, RegExp, Error, parseInt, isNaN }, G));
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'servidor/Codigo.gs'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'exemplos.js'), 'utf8'), ctx);
  const respostas = new Map();
  let seq = 0;

  const site = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    if (p === '/config.js') {
      res.writeHead(200, { 'content-type': TIPOS['.js'] });
      res.end("window.CALENDARIO_API = 'http://127.0.0.1:" + portas.api + "/macros/s/TESTE/exec';");
      return;
    }
    const arq = path.join(RAIZ, 'docs', path.normalize(p));
    if (!arq.startsWith(path.join(RAIZ, 'docs')) || !fs.existsSync(arq)) { res.writeHead(404); res.end('não encontrado'); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(fs.readFileSync(arq));
  }).listen(portas.site);

  const api = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (!u.pathname.endsWith('/exec')) { res.writeHead(404); res.end(); return; }
    let corpo = '';
    req.on('data', (d) => { corpo += d; });
    req.on('end', () => {
      if (req.method === 'OPTIONS') { res.writeHead(405); res.end(); return; } // o Google não responde pré-checagem
      const saida = req.method === 'POST'
        ? ctx.doPost({ postData: { contents: corpo, type: req.headers['content-type'] } })
        : ctx.doGet({ parameter: Object.fromEntries(u.searchParams) });
      const id = String(++seq);
      respostas.set(id, saida.getContent());
      res.writeHead(302, { location: 'http://127.0.0.1:' + portas.eco + '/macros/echo?id=' + id, 'access-control-allow-origin': '*' });
      res.end();
    });
  }).listen(portas.api);

  const eco = http.createServer((req, res) => {
    const id = new URL(req.url, 'http://x').searchParams.get('id');
    const txt = respostas.get(id);
    respostas.delete(id);
    res.writeHead(txt ? 200 : 404, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
    res.end(txt || '{}');
  }).listen(portas.eco);

  return {
    url: 'http://localhost:' + portas.site + '/',
    ctx: ctx,
    fechar: () => { site.close(); api.close(); eco.close(); }
  };
}

module.exports = { iniciar };
if (require.main === module) console.log('Site em', iniciar().url);

/*
 * Service worker do Calendário Paroquial (o que faz o site funcionar como PWA).
 * - Páginas e arquivos do próprio site: busca na internet primeiro (sempre a
 *   versão mais nova) e guarda uma cópia para abrir sem internet.
 * - Fontes e o gerador de planilhas (ExcelJS): guarda depois do primeiro uso.
 * - Chamadas à API (script.google.com) passam direto, nunca ficam guardadas.
 * Ao mudar este arquivo, troque o número da VERSAO para limpar as cópias antigas.
 */
var VERSAO = 'calendario-v1';
var ARQUIVOS = ['./', './index.html', './config.js', './logo.png', './manifest.webmanifest', './icone-192.png', './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    return Promise.all(nomes.filter(function (n) { return n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    if (/(^|\.)cdn\.jsdelivr\.net$|(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
      e.respondWith(caches.open(VERSAO).then(function (c) {
        return c.match(req).then(function (r) {
          return r || fetch(req).then(function (resp) { c.put(req, resp.clone()); return resp; });
        });
      }));
    }
    return; // API e outros sites: direto pela internet
  }

  e.respondWith(fetch(req).then(function (resp) {
    if (resp.ok) { var copia = resp.clone(); caches.open(VERSAO).then(function (c) { c.put(req, copia); }); }
    return resp;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (r) {
      return r || caches.match('./index.html');
    });
  }));
});

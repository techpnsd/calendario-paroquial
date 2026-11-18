/*
 * Só da demonstração: em vez de chamar a API pela internet, chama o Codigo.gs
 * rodando aqui mesmo sobre a planilha simulada. Também liga a faixa de aviso,
 * o download pela página publicada e desliga cache/PWA/impressão.
 */
(function () {
  'use strict';
  function publicada() { return !!(window.claude && window.claude.use); }

  window.__transporte = function (nome, args) {
    return new Promise(function (ok, falha) {
      setTimeout(function () {
        var r = JSON.parse(JSON.stringify(executarComResposta_(nome, JSON.parse(JSON.stringify(args)))));
        if (r.ok) ok(r.dados); else falha(new Error(r.erro));
      }, 200 + Math.random() * 250);
    });
  };
  window.__semCache = true;
  window.__semSW = true;
  window.__urlSite = '';

  window.__demoMsg = 'Demonstração com eventos de exemplo: nada fica salvo ao recarregar. ' +
    'Senha da secretaria: <b>demo</b>. Para testar “Meu pedido”: pedido nº <b>' + window.__demo.pedidoExemplo + '</b> e telefone <b>' + window.__demo.telefoneExemplo + '</b>.';

  function baixarComum(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 100);
    return url;
  }

  Object.defineProperty(window, '__semCompartilhar', { get: publicada });
  window.__salvarArquivo = function (blob, nome) {
    if (!publicada()) return baixarComum(blob, nome);
    var avisar = function (m, erro) { if (window.__app && window.__app.toast) window.__app.toast(m, erro); };
    window.claude.use('downloads').then(function (d) {
      if (!d) { avisar('Nesta visualização não dá para baixar arquivos. Veja as planilhas de exemplo enviadas na conversa.', true); return; }
      return d.save({ filename: nome, data: blob }).then(function () { avisar('Planilha salva.'); }, function (e) {
        if (e && e.code === 'declined') return;
        avisar('Não foi possível salvar a planilha aqui (' + ((e && e.code) || 'erro') + ').', true);
      });
    });
    return null;
  };

  Object.defineProperty(window, '__semImpressao', {
    get: function () { return publicada() ? 'Na demonstração a impressão fica desligada. No site publicado, o botão Imprimir abre a impressão do navegador.' : ''; }
  });

  document.addEventListener('DOMContentLoaded', function () {
    var f = document.getElementById('faixaDemo');
    if (!f) return;
    document.getElementById('faixaDemoTexto').innerHTML = window.__demoMsg;
    f.hidden = false;
  });
})();

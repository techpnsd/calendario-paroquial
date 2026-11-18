// Gera a demonstração a partir do site + servidor.
//   node dev/build-demo.js
// Saídas: demo/demonstracao.html (abre direto no navegador) e demo/artifact.html (página publicada)
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');

let site = ler('docs/index.html');
const scripts = [
  '<script>\n' + ler('dev/fake-gas.js') + '\n</script>',
  '<script>\n' + ler('servidor/Codigo.gs') + '\n</script>',
  '<script>\n' + ler('dev/exemplos.js') + '\n</script>',
  '<script>\n' + ler('dev/demo-extras.js') + '\n</script>'
].join('\n');

function trocar(a, b) {
  if (!site.includes(a)) throw new Error('não encontrado: ' + a.slice(0, 60));
  site = site.replace(a, () => b);
}
trocar('<script src="config.js"></script>', scripts);
const logo = fs.readFileSync(path.join(raiz, 'docs/logo.png')).toString('base64');
trocar('src="logo.png"', 'src="data:image/png;base64,' + logo + '"');
// arquivos que só existem no site publicado
site = site
  .replace(/<link rel="manifest"[^>]*>\n/, '')
  .replace(/<link rel="icon"[^>]*>\n/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\n/, '');

fs.mkdirSync(path.join(raiz, 'demo'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'demo/demonstracao.html'), site);

// Versão para publicar: sem doctype/html/head/body (o publicador coloca o esqueleto)
const art = site
  .replace(/<!DOCTYPE html>\s*/i, '')
  .replace(/<html[^>]*>\s*/i, '')
  .replace(/<\/html>\s*$/i, '')
  .replace(/<head>\s*/i, '')
  .replace(/<\/head>\s*/i, '')
  .replace(/<body>\s*/i, '')
  .replace(/<\/body>\s*/i, '')
  .replace('<meta charset="utf-8">\n', '')
  .replace('<meta name="viewport" content="width=device-width, initial-scale=1">\n', '')
  .replace(/<title>[^<]*<\/title>/, '<title>Calendário da Paróquia das Dores</title>\n<meta name="claude:viewport-fit-sides" content="cover">');
fs.writeFileSync(path.join(raiz, 'demo/artifact.html'), art);
console.log('ok', (site.length / 1024).toFixed(0) + ' KB');

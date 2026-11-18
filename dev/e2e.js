// Teste de ponta a ponta no navegador (Playwright).
//   TZ=America/Sao_Paulo node dev/e2e.js <pasta-de-saida>            → demonstração (arquivo local)
//   MODO=site TZ=America/Sao_Paulo node dev/e2e.js <pasta-de-saida>  → site + imitação da API do Google
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2] || '/tmp/e2e';
const DEPS = process.env.DEPS;
fs.mkdirSync(OUT, { recursive: true });
const MODO = process.env.MODO || 'demo';
const local = MODO === 'site' ? require('./servidor-local.js').iniciar() : null;
const URL_DEMO = local ? local.url : 'file://' + path.join(__dirname, '../demo/demonstracao.html');
const EXCEL = fs.readFileSync(path.join(DEPS, 'node_modules/exceljs/dist/exceljs.min.js'));
const FONTES = {
  'cg-600': 'node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2',
  'cg-700': 'node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff2',
  'ss-400': 'node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff2',
  'ss-400i': 'node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-italic.woff2',
  'ss-600': 'node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-600-normal.woff2',
  'ss-700': 'node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-700-normal.woff2'
};
const CSS_FONTES = [
  ['Cormorant Garamond', 600, 'normal', 'cg-600'], ['Cormorant Garamond', 700, 'normal', 'cg-700'],
  ['Source Sans 3', 400, 'normal', 'ss-400'], ['Source Sans 3', 400, 'italic', 'ss-400i'],
  ['Source Sans 3', 500, 'normal', 'ss-600'], ['Source Sans 3', 600, 'normal', 'ss-600'], ['Source Sans 3', 700, 'normal', 'ss-700']
].map(([f, w, s, k]) => `@font-face{font-family:'${f}';font-weight:${w};font-style:${s};src:url(https://fonts.gstatic.com/local/${k}.woff2) format('woff2');}`).join('\n');

async function rotas(ctx) {
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: CSS_FONTES }));
  await ctx.route('https://fonts.gstatic.com/local/**', (r) => {
    const k = r.request().url().split('/').pop().replace('.woff2', '');
    r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(DEPS, FONTES[k])) });
  });
  await ctx.route('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: EXCEL }));
}

const erros = [];
function vigiar(page, nome) {
  page.on('pageerror', (e) => erros.push(nome + ': ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(nome + ' console: ' + m.text()); });
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let passo = 0;
async function foto(page, nome, opts) {
  await page.screenshot(Object.assign({ path: path.join(OUT, String(++passo).padStart(2, '0') + '-' + nome + '.png') }, opts || {}));
}
function ok(cond, msg) { if (!cond) throw new Error('FALHOU: ' + msg); console.log('  ✓ ' + msg); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR', serviceWorkers: 'block' });
  await rotas(ctx);
  const page = await ctx.newPage();
  vigiar(page, 'desktop');
  await page.goto(URL_DEMO);
  await page.waitForSelector('.mes .ev');
  await page.evaluate(() => document.fonts.ready);
  ok((await page.textContent('#calTitulo')).includes('2026'), 'calendário abre no mês atual');
  ok(await page.locator('.mes .ev').count() > 5, 'eventos aparecem na grade');
  await foto(page, 'calendario-mes', { fullPage: true });

  // navegar para setembro de 2027
  await page.selectOption('#irAno', '2027');
  await page.selectOption('#irMes', '9');
  await page.waitForFunction(() => document.querySelector('#calTitulo').textContent.includes('Setembro de 2027') && document.querySelector('.mes .ev'));
  ok(await page.locator('.dia-esp', { hasText: 'Nossa Senhora das Dores' }).count() === 1, 'festa da padroeira aparece em 15/09');
  await foto(page, 'calendario-setembro-2027', { fullPage: true });
  await page.click('.dia[data-dia="2027-09-18"]', { position: { x: 60, y: 110 } });
  await page.waitForSelector('dialog[open]');
  await foto(page, 'janela-dia');
  await page.click('dialog .cartao-ev >> nth=0');
  await espera(150);
  await foto(page, 'janela-evento');
  await page.click('[data-acao="fechar-dlg"]');

  // semana e lista
  await page.click('[data-vista="semana"]');
  await page.waitForSelector('.semana');
  await foto(page, 'semana', { fullPage: true });
  await page.click('[data-vista="lista"]');
  await page.waitForSelector('.lista');
  await page.click('[data-vista="mes"]');

  // filtro por local
  await page.selectOption('#fLocal', 'Igreja Matriz');
  await espera(100);
  const locaisVistos = await page.$$eval('.mes .ev', (els) => els.length);
  ok(locaisVistos >= 1, 'filtro por local funciona');
  await page.selectOption('#fLocal', '');

  // ---------- formulário ----------
  await page.click('.tab[data-ir="reservar"]');
  await page.selectOption('#rPastoral', 'Pastoral Familiar');
  await page.fill('#rResp', 'Joana Martins');
  await page.fill('#rTel', '(11) 95555-1234');
  await page.fill('#rEvento', 'Encontro de noivos');
  await page.check('#rLocais input[value="Salão Paroquial"]', { force: true });
  await page.fill('#rData', '2027-03-06');
  await page.dispatchEvent('#rData', 'change');
  await page.fill('#rIni', '08:00');
  await page.fill('#rFim', '17:00');
  await page.dispatchEvent('#rFim', 'change');
  const opcoes = await page.$$eval('#rRep option', (o) => o.map((x) => x.textContent));
  ok(opcoes.some((t) => t.includes('na 1ª') || t.includes('no 1º')), 'repetição oferece "1º sábado do mês": ' + opcoes.join(' | '));
  await page.selectOption('#rRep', 'mensal-n');
  await page.fill('#rAte', '2027-06-30');
  await page.dispatchEvent('#rAte', 'change');
  await espera(100);
  ok(await page.locator('#listaPrincipais .dchip').count() === 4, 'gera 4 datas (mar a jun)');
  await page.check('#rVespera', { force: true });
  await page.fill('#xData', '2027-03-07');
  await page.selectOption('#xTipo', 'Desmontagem / limpeza');
  await page.click('[data-acao="add-extra"]');
  await page.waitForSelector('#dispo.warn, #dispo.ok', { timeout: 5000 });
  const dispo = await page.textContent('#dispo');
  ok(/já têm|já tem/.test(dispo), 'aviso de conflito com a ECC (1ª sexta = véspera): ' + dispo);
  await foto(page, 'formulario-preenchido', { fullPage: true });
  await page.click('#btnEnviar');
  await page.waitForSelector('#sucessoArea:not([hidden]) .numero-pedido');
  const numero = (await page.textContent('.numero-pedido b')).trim();
  ok(+numero > 0, 'pedido enviado, nº ' + numero);
  await foto(page, 'pedido-enviado', { fullPage: true });

  // validação: formulário vazio
  await page.click('[data-acao="novo-pedido"]');
  await page.fill('#rEvento', '');
  await page.click('#btnEnviar');
  ok(await page.locator('.campo.invalido').count() >= 2, 'formulário vazio mostra erros');

  // ---------- meu pedido ----------
  await page.click('.tab[data-ir="meu-pedido"]');
  await page.fill('#cNum', numero);
  await page.fill('#cTel', '11955551234');
  await page.click('#btnConsultar');
  await page.waitForSelector('#consultaRes .painel');
  const nDatas = await page.locator('.cCanc').count();
  ok(nDatas === 9, 'consulta mostra as 9 datas (4 + 4 vésperas + 1 desmontagem): ' + nDatas);
  await page.check('.cCanc >> nth=0');
  await page.click('[data-acao="cancelar-marcadas"]');
  await page.waitForSelector('dialog[open]');
  await page.click('dialog .btn.perigo');
  await page.waitForFunction(() => document.querySelectorAll('#consultaRes .badge.canc').length === 1);
  ok(true, 'solicitante cancelou uma data');
  await foto(page, 'meu-pedido', { fullPage: true });

  // ---------- secretaria ----------
  await page.click('[data-ir="secretaria"] >> nth=-1');
  await page.fill('#sSenha', 'errada');
  await page.click('#btnEntrar');
  await page.waitForSelector('.toast.on.erro');
  await page.fill('#sSenha', 'demo');
  await page.click('#btnEntrar');
  await page.waitForSelector('#secPainel:not([hidden]) .pedido-card');
  const cards = await page.locator('.pedido-card').count();
  ok(cards >= 4, 'pendentes agrupados por pedido: ' + cards);
  await foto(page, 'secretaria-pendentes', { fullPage: true });
  const card = page.locator('.pedido-card', { hasText: 'Encontro de noivos' });
  await card.locator('[data-acao="aprovar"]').click();
  await page.waitForFunction(() => !Array.from(document.querySelectorAll('.pedido-card h3')).some((h) => h.textContent.includes('Encontro de noivos')));
  ok(true, 'aprovação remove o pedido da lista de pendentes');
  const card2 = page.locator('.pedido-card', { hasText: 'Ensaio da peça de Natal' });
  await card2.locator('[data-acao="recusar"]').click();
  await page.fill('#dlgTexto', 'O salão já está reservado para o Bazar.');
  await page.click('dialog .btn.perigo');
  await page.waitForFunction(() => !Array.from(document.querySelectorAll('.pedido-card h3')).some((h) => h.textContent.includes('Ensaio da peça')));
  ok(true, 'recusa com motivo');
  await page.click('[data-secaba="todas"]');
  await page.selectOption('#tAno', '2027');
  await page.waitForFunction(() => document.querySelectorAll('#tabTodas tbody tr').length > 20);
  await page.fill('#tBusca', 'noivos');
  await espera(100);
  await foto(page, 'secretaria-todas', { fullPage: true });
  await page.click('#tabTodas [data-editar] >> nth=0');
  await page.waitForSelector('dialog[open] #eData');
  await foto(page, 'secretaria-editar');
  await page.fill('#eData', '2027-03-13');
  await page.click('dialog .btn.primario');
  await page.waitForFunction(() => !document.querySelector('dialog[open] #eData'));
  await espera(800);
  ok(true, 'edição salva');
  if (await page.locator('dialog[open]').count()) await page.click('[data-acao="fechar-dlg"]');

  // nova reserva confirmada pela secretaria
  await page.click('[data-acao="sec-nova"]');
  ok(!(await page.locator('#notaSecretaria').isHidden()), 'modo secretaria no formulário');

  // ---------- exportar ----------
  await page.click('.tab[data-ir="calendario"]');
  await page.selectOption('#irAno', '2027');
  await page.selectOption('#irMes', '9');
  await page.waitForFunction(() => document.querySelector('#calTitulo').textContent.includes('Setembro de 2027'));
  const baixar = async (per, fmt) => {
    await page.click('[data-acao="exportar"]');
    await page.waitForSelector('dialog[open] input[name="xPer"]');
    await page.check('input[name="xPer"][value="' + per + '"]');
    if (per === 'semana') await page.fill('#xSemana', '2027-09-12');
    await page.check('input[name="xFmt"][value="' + fmt + '"]');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('dialog .btn.primario')]);
    const destino = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(destino);
    await page.waitForSelector('#xResultado .alerta');
    await page.click('[data-acao="fechar-dlg"]');
    return destino;
  };
  const arqMes = await baixar('mes', 'ambos');
  ok(fs.statSync(arqMes).size > 5000, 'planilha do mês: ' + path.basename(arqMes));
  const arqSem = await baixar('semana', 'ambos');
  ok(fs.statSync(arqSem).size > 5000, 'planilha da semana: ' + path.basename(arqSem));
  const arqAno = await baixar('ano', 'ambos');
  ok(fs.statSync(arqAno).size > 10000, 'planilha do ano: ' + path.basename(arqAno));

  // impressão (PDF do que sai na impressora)
  await page.click('[data-acao="fechar-dlg"]').catch(() => {});
  await page.emulateMedia({ media: 'print' });
  await foto(page, 'impressao-tela');
  await page.pdf({ path: path.join(OUT, 'impressao-setembro-2027.pdf'), landscape: true, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });

  // ---------- tema escuro ----------
  const escuro = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: 'dark', timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block' });
  await rotas(escuro);
  const pe = await escuro.newPage();
  vigiar(pe, 'escuro');
  await pe.goto(URL_DEMO);
  await pe.waitForSelector('.mes .ev');
  await pe.evaluate(() => document.fonts.ready);
  await foto(pe, 'escuro-calendario');
  await pe.click('.tab[data-ir="reservar"]');
  await foto(pe, 'escuro-formulario');

  // ---------- celular ----------
  const cel = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'America/Sao_Paulo', serviceWorkers: 'block' });
  await rotas(cel);
  const pc = await cel.newPage();
  vigiar(pc, 'celular');
  await pc.goto(URL_DEMO);
  await pc.waitForSelector('.lista-dia');
  await pc.evaluate(() => document.fonts.ready);
  const larg = await pc.evaluate(() => document.documentElement.scrollWidth);
  ok(larg <= 390, 'sem rolagem lateral no celular (' + larg + 'px)');
  await foto(pc, 'celular-lista');
  await pc.click('[data-vista="mes"]');
  await foto(pc, 'celular-mes');
  await pc.click('.dia[data-dia="2026-11-28"]');
  await pc.waitForSelector('dialog[open]');
  await foto(pc, 'celular-dia');
  await pc.click('[data-acao="fechar-dlg"]');
  await pc.click('.tab[data-ir="reservar"]');
  const larg2 = await pc.evaluate(() => document.documentElement.scrollWidth);
  ok(larg2 <= 390, 'formulário sem rolagem lateral (' + larg2 + 'px)');
  await foto(pc, 'celular-formulario', { fullPage: true });

  // ---------- PWA: abre sem internet (só no modo site)
  if (local) {
    const r1 = await (await fetch(local.url + 'manifest.webmanifest')).json();
    ok(r1.icons.length === 3 && r1.display === 'standalone', 'manifesto do PWA');
    for (const ic of ['icone-192.png', 'icone-512.png', 'icone-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'logo.png']) {
      ok((await fetch(local.url + ic)).status === 200, 'arquivo ' + ic);
    }
    const off = await browser.newContext({ viewport: { width: 1280, height: 800 }, timezoneId: 'America/Sao_Paulo' });
    const po = await off.newPage();
    vigiar(po, 'pwa');
    await po.goto(URL_DEMO);
    await po.waitForSelector('.mes .ev, .lista-dia .cartao-ev');
    await po.evaluate(() => navigator.serviceWorker.ready);
    await po.reload();
    await po.waitForSelector('.mes .ev, .lista-dia .cartao-ev');
    await espera(800);
    await off.setOffline(true);
    await po.reload();
    await po.waitForSelector('.mes .ev, .lista-dia .cartao-ev', { timeout: 10000 });
    await po.waitForSelector('.toast.on.erro', { timeout: 10000 });
    ok((await po.textContent('.toast')).includes('última versão'), 'sem internet: abre o calendário salvo e avisa');
    await foto(po, 'pwa-sem-internet');
    await off.close();
    erros.splice(0, erros.length, ...erros.filter((e) => !/^pwa/.test(e) || !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(e)));
  }

  await browser.close();
  if (local) local.fechar();
  if (erros.length) { console.log('ERROS NO NAVEGADOR:\n' + erros.join('\n')); process.exitCode = 1; }
  else console.log('Sem erros no console.');
})().catch((e) => { console.error(e); process.exit(1); });

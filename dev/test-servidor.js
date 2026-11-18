// Testes do Codigo.gs com a planilha simulada.  Rodar: TZ=America/Sao_Paulo node dev/test-servidor.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const G = require('./fake-gas.js');
const ctx = vm.createContext(Object.assign({ console, Date, Math, JSON, Object, String, Number, Array, RegExp, Error, parseInt, isNaN }, G));
vm.runInContext(fs.readFileSync(path.join(__dirname, '../servidor/Codigo.gs'), 'utf8'), ctx);
const run = (code) => vm.runInContext(code, ctx);
const call = (fn, ...args) => ctx[fn](...JSON.parse(JSON.stringify(args)));
const roundtrip = (v) => JSON.parse(JSON.stringify(v));

let ok = 0;
function t(nome, f) {
  try { f(); ok++; console.log('  ✓ ' + nome); } catch (e) { console.log('  ✗ ' + nome + '\n    ' + e.stack); process.exitCode = 1; }
}
function deveFalhar(f, trecho) {
  let msg = null;
  try { f(); } catch (e) { msg = e.message; }
  assert(msg, 'esperava erro');
  if (trecho) assert(msg.includes(trecho), 'mensagem: ' + msg);
}

console.log('Servidor (Codigo.gs)');

t('configurarPlanilha cria as abas e a senha', () => {
  const msg = call('configurarPlanilha');
  assert(msg.includes('Senha da secretaria'));
  const nomes = G.__ss.sheets.map((s) => s.name);
  assert.deepStrictEqual(nomes, ['Reservas', 'Configurações', 'Locais', 'Pastorais', 'Datas especiais', 'Histórico']);
  // rodar de novo não duplica nada
  call('configurarPlanilha');
  assert.strictEqual(G.__ss.sheets.length, 6);
  const cfg = G.__ss.sheets[1].data.filter((r) => r[0]);
  assert.strictEqual(cfg.length, 1 + 11);
});

const senha = () => G.__ss.sheets[1].data.find((r) => r[0] === 'Senha da secretaria')[1];

t('dados iniciais trazem config e anos', () => {
  const boot = roundtrip(run('dadosIniciais_()'));
  assert.strictEqual(boot.config.nomeParoquia, 'Paróquia Nossa Senhora das Dores');
  assert.strictEqual(boot.config.locais.length, 8);
  assert(boot.config.pastorais.includes('Catequese'));
  assert.deepStrictEqual(boot.config.datasEspeciais[0], { dia: 15, mes: 9, ano: null, nome: 'Festa de Nossa Senhora das Dores (Padroeira)' });
  assert.strictEqual(boot.config.secretariaAtiva, true);
  assert(!('senha' in boot.config));
});

const base = {
  pastoral: 'Pastoral da Juventude', responsavel: 'Ana Souza', telefone: '(11) 98888-7777', email: 'ana@exemplo.com',
  evento: 'Festa Junina', locais: ['Salão Paroquial', 'Cozinha'], obs: '', repeticao: 'Não se repete',
  datas: [
    { data: '2027-06-19', tipo: 'Preparação / montagem', diaInteiro: true },
    { data: '2027-06-20', tipo: 'Evento', diaInteiro: false, inicio: '14:00', fim: '22:00' }
  ]
};

let p1;
t('enviarPedido grava uma linha por data, pendente no modo manual', () => {
  p1 = roundtrip(call('enviarPedido', base));
  assert.strictEqual(p1.pedido, 1);
  assert.strictEqual(p1.total, 2);
  assert.strictEqual(p1.pendentes, 2);
  const linhas = G.__ss.sheets[0].data.slice(1).filter((r) => r[0]);
  assert.strictEqual(linhas.length, 2);
  assert(linhas[0][0] instanceof Date, 'data gravada como data');
  assert.strictEqual(linhas[0][1], 'Dia inteiro');
  assert.strictEqual(linhas[1][1], '14:00');
  assert.strictEqual(linhas[1][6], 'Salão Paroquial, Cozinha');
  assert.strictEqual(linhas[1][7], 'Pendente');
  assert.strictEqual(G.__mails.length, 1, 'e-mail para o solicitante');
});

t('validação recusa dados incompletos e datas passadas', () => {
  deveFalhar(() => call('enviarPedido', Object.assign({}, base, { evento: '' })), 'nome do evento');
  deveFalhar(() => call('enviarPedido', Object.assign({}, base, { telefone: '123' })), 'telefone');
  deveFalhar(() => call('enviarPedido', Object.assign({}, base, { locais: [] })), 'local');
  deveFalhar(() => call('enviarPedido', Object.assign({}, base, { datas: [{ data: '2020-01-05', diaInteiro: true }] })), 'já passou');
  deveFalhar(() => call('enviarPedido', Object.assign({}, base, { datas: [{ data: '2027-03-01', inicio: '10:00', fim: '09:00' }] })), 'término');
  deveFalhar(() => call('enviarPedido', Object.assign({}, base, { email: 'ana@' })), 'e-mail');
});

t('verificarConflitos encontra sobreposição no mesmo local', () => {
  const c = roundtrip(call('verificarConflitos', {
    locais: ['Cozinha'],
    datas: [
      { data: '2027-06-20', inicio: '08:00', fim: '13:59' }, // antes da festa
      { data: '2027-06-20', inicio: '13:00', fim: '15:00' }, // sobrepõe
      { data: '2027-06-19', inicio: '09:00', fim: '10:00' }  // dia inteiro de preparação
    ]
  }));
  assert.strictEqual(c[0].length, 0);
  assert.strictEqual(c[1].length, 1);
  assert.strictEqual(c[1][0].evento, 'Festa Junina');
  assert.deepStrictEqual(c[1][0].locais, ['Cozinha']);
  assert.strictEqual(c[2].length, 1);
  const livre = roundtrip(call('verificarConflitos', { locais: ['Igreja Matriz'], datas: [{ data: '2027-06-20', diaInteiro: true }] }));
  assert.strictEqual(livre[0].length, 0);
  const semChecagem = roundtrip(call('verificarConflitos', { locais: ['Fora da paróquia (só divulgação)'], datas: [{ data: '2027-06-20', diaInteiro: true }] }));
  assert.strictEqual(semChecagem[0].length, 0);
});

t('eventos públicos não expõem telefone/e-mail', () => {
  const r = roundtrip(call('listarEventos', 2027));
  assert.strictEqual(r.eventos.length, 2);
  assert(!('telefone' in r.eventos[0]) && !('email' in r.eventos[0]));
  assert.strictEqual(r.eventos[0].status, 'Pendente');
});

t('consultarPedido exige o telefone certo', () => {
  deveFalhar(() => call('consultarPedido', '1', '11 99999-0000'), 'Não encontramos');
  const r = roundtrip(call('consultarPedido', '#1', '98888-7777'));
  assert.strictEqual(r.datas.length, 2);
  assert.strictEqual(r.evento, 'Festa Junina');
});

let p2;
t('modo "Automática sem conflito" confirma só o que está livre', () => {
  const cfgSh = G.__ss.sheets[1];
  cfgSh.data.find((r) => r[0] === 'Modo de aprovação')[1] = 'Automática sem conflito';
  p2 = roundtrip(call('enviarPedido', Object.assign({}, base, {
    evento: 'Reunião do ECC', pastoral: 'Encontro de Casais com Cristo (ECC)', locais: ['Salão Paroquial'], telefone: '11 97777-1111', email: '',
    datas: [
      { data: '2027-06-20', inicio: '19:00', fim: '21:00', tipo: 'Evento' },
      { data: '2027-06-27', inicio: '19:00', fim: '21:00', tipo: 'Evento' }
    ]
  })));
  assert.strictEqual(p2.pedido, 2);
  assert.strictEqual(p2.datas[0].status, 'Pendente');
  assert.strictEqual(p2.datas[0].conflitos.length, 1);
  assert.strictEqual(p2.datas[1].status, 'Confirmado');
  cfgSh.data.find((r) => r[0] === 'Modo de aprovação')[1] = 'Manual';
});

t('secretaria: senha errada é recusada', () => {
  deveFalhar(() => call('entrarSecretaria', 'errada'), 'Senha incorreta');
  assert(call('entrarSecretaria', senha()).ok);
});

t('secretaria lista pendentes com conflitos', () => {
  const r = roundtrip(call('listarSecretaria', senha(), 2027));
  assert.strictEqual(r.linhas.length, 4);
  const pend = r.linhas.filter((l) => l.status === 'Pendente');
  assert.strictEqual(pend.length, 3);
  const festa = pend.find((l) => l.evento === 'Festa Junina' && l.data === '2027-06-20');
  assert.strictEqual(festa.conflitos.length, 1);
  assert.strictEqual(festa.conflitos[0].evento, 'Reunião do ECC');
  assert.strictEqual(festa.telefone, '(11) 98888-7777');
});

t('aprovar e recusar mudam a situação e mandam e-mail', () => {
  const r = roundtrip(call('listarSecretaria', senha(), 2027));
  const festa = r.linhas.filter((l) => l.pedido === 1).map((l) => l.id);
  const antes = G.__mails.length;
  const res = roundtrip(call('alterarStatus', senha(), festa, 'Confirmado', ''));
  assert.strictEqual(res.alteradas, 2);
  assert.strictEqual(G.__mails.length, antes + 1);
  const ecc = r.linhas.find((l) => l.pedido === 2 && l.status === 'Pendente');
  call('alterarStatus', senha(), [ecc.id], 'Recusado', 'Salão já reservado para a Festa Junina');
  const pub = roundtrip(call('listarEventos', 2027)).eventos;
  assert.strictEqual(pub.length, 3);
  assert(pub.every((e) => e.status === 'Confirmado'));
  const linhaRec = G.__ss.sheets[0].data.find((row) => row[16] && String(row[16]).includes('Salão já reservado'));
  assert(linhaRec && linhaRec[7] === 'Recusado');
});

t('editarReserva remarca e avisa conflito', () => {
  const r = roundtrip(call('listarSecretaria', senha(), 2027));
  const reuniao = r.linhas.find((l) => l.pedido === 2 && l.status === 'Confirmado');
  const res = roundtrip(call('editarReserva', senha(), reuniao.id, { data: '2027-06-20', inicio: '20:00', fim: '21:30', diaInteiro: false }));
  assert.strictEqual(res.conflitos.length, 1);
  const depois = roundtrip(call('listarSecretaria', senha(), 2027)).linhas.find((l) => l.id === reuniao.id);
  assert.strictEqual(depois.data, '2027-06-20');
  assert.strictEqual(depois.inicio, '20:00');
});

t('solicitante cancela uma data do próprio pedido', () => {
  const r = roundtrip(call('consultarPedido', '1', '11988887777'));
  const prep = r.datas.find((d) => d.tipo === 'Preparação / montagem');
  const depois = roundtrip(call('cancelarPedido', '1', '11988887777', [prep.id]));
  assert.strictEqual(depois.datas.find((d) => d.id === prep.id).status, 'Cancelado');
  assert.strictEqual(depois.datas.find((d) => d.id !== prep.id).status, 'Confirmado');
  deveFalhar(() => call('cancelarPedido', '1', '11988887777', [prep.id]), 'Nenhuma data');
});

t('linha digitada à mão na planilha aparece no calendário', () => {
  const sh = G.__ss.sheets[0];
  sh.data[sh.getLastRow()] = [new Date(2027, 8, 15), '19h', '', 'Missa da Padroeira', '', 'Liturgia', 'Igreja Matriz', '', '', '', '', '', '', '', '', '', '', ''];
  const ev = roundtrip(call('listarEventos', 2027)).eventos.find((e) => e.evento === 'Missa da Padroeira');
  assert(ev, 'evento encontrado');
  assert.strictEqual(ev.status, 'Confirmado');
  assert.strictEqual(ev.inicio, '19:00');
  assert.strictEqual(ev.data, '2027-09-15');
  // a secretaria consegue editar (ganha ID)
  const l = roundtrip(call('listarSecretaria', senha(), 2027)).linhas.find((x) => x.evento === 'Missa da Padroeira');
  assert(/^R[0-9A-F]{9}$/.test(l.id));
});

t('secretaria lança reserva confirmada (pode ser no passado)', () => {
  const r = roundtrip(call('enviarPedido', Object.assign({}, base, { telefone: '', evento: 'Retiro antigo', datas: [{ data: '2025-01-10', diaInteiro: true }] }), senha()));
  assert.strictEqual(r.confirmadas, 1);
  deveFalhar(() => call('enviarPedido', base, 'senha-errada'));
});

t('texto que começa com = não vira fórmula', () => {
  call('enviarPedido', Object.assign({}, base, { evento: '=IMPORTXML("x")', datas: [{ data: '2027-12-01', diaInteiro: true }] }));
  const ev = roundtrip(call('listarEventos', 2027)).eventos.find((e) => e.data === '2027-12-01');
  assert.strictEqual(ev.evento, '=IMPORTXML("x")'); // a planilha guarda como texto
});

t('histórico registra as ações', () => {
  const h = G.__ss.sheets[5].data.slice(1).filter((r) => r[0]);
  const acoes = h.map((r) => r[2]);
  assert(acoes.includes('Novo pedido'));
  assert(acoes.includes('Aprovado pela secretaria'));
  assert(acoes.includes('Recusado pela secretaria'));
  assert(acoes.includes('Cancelado pelo solicitante'));
  assert(acoes.includes('Editado pela secretaria'));
});

t('API JSON: doPost e doGet respondem e não expõem funções internas', () => {
  const post = (corpo) => JSON.parse(ctx.doPost({ postData: { contents: corpo } }).getContent());
  const r = post(JSON.stringify({ acao: 'listarEventos', args: [2027] }));
  assert(r.ok && r.dados.eventos.length > 0);
  const e = post(JSON.stringify({ acao: 'entrarSecretaria', args: ['x'] }));
  assert(!e.ok && e.erro.includes('Senha incorreta'));
  const interna = post(JSON.stringify({ acao: 'lerConfig_', args: [] }));
  assert(!interna.ok && interna.erro.includes('desconhecida'));
  const proto = post(JSON.stringify({ acao: 'constructor', args: [] }));
  assert(!proto.ok);
  assert(!post('{quebrado').ok);
  const g = JSON.parse(ctx.doGet({ parameter: { acao: 'inicio' } }).getContent());
  assert(g.ok && g.dados.config.nomeParoquia && g.dados.anos);
  assert(!('senha' in g.dados.config));
});

console.log(ok + ' testes passaram');

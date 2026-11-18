/**
 * @OnlyCurrentDoc
 *
 * ==========================================================================
 *  CALENDÁRIO PAROQUIAL — Paróquia Nossa Senhora das Dores
 * --------------------------------------------------------------------------
 *  Sistema gratuito feito com Google Planilhas + Google Apps Script.
 *  Todos os dados ficam nesta planilha, nas abas:
 *
 *    • Reservas ........... uma linha para cada data reservada
 *    • Configurações ...... nome da paróquia, senha da secretaria, aprovação…
 *    • Locais ............. espaços que podem ser reservados
 *    • Pastorais .......... pastorais e movimentos que aparecem no formulário
 *    • Datas especiais .... festas da paróquia que aparecem no calendário
 *    • Histórico .......... registro de pedidos, aprovações e cancelamentos
 *
 *  Este arquivo é o SERVIDOR (uma API que responde em JSON). O site fica
 *  na pasta "docs" (publicada pelo GitHub Pages) e conversa com esta API
 *  pelo endereço colocado no arquivo docs/config.js.
 *
 *  Para instalar, siga o guia COMO-INSTALAR que acompanha estes arquivos.
 *  Resumo: cole este código, rode "configurarPlanilha" uma vez e implante
 *  como App da Web (Executar como: Eu · Quem pode acessar: Qualquer pessoa).
 *
 *  Não é preciso mexer neste código para usar o sistema no dia a dia:
 *  tudo o que muda (locais, pastorais, senha, modo de aprovação) fica
 *  nas abas da planilha.
 * ==========================================================================
 */

// ---------------------------------------------------------------- constantes

const ABA = {
  RESERVAS: 'Reservas',
  CONFIG: 'Configurações',
  LOCAIS: 'Locais',
  PASTORAIS: 'Pastorais',
  DATAS: 'Datas especiais',
  HISTORICO: 'Histórico'
};

const COL = {
  DATA: 'Data',
  INICIO: 'Início',
  FIM: 'Fim',
  EVENTO: 'Evento',
  TIPO: 'Tipo',
  PASTORAL: 'Pastoral / Movimento',
  LOCAL: 'Local',
  STATUS: 'Situação',
  RESPONSAVEL: 'Responsável',
  TELEFONE: 'Telefone',
  EMAIL: 'E-mail',
  OBS: 'Observações',
  PEDIDO: 'Pedido nº',
  REPETICAO: 'Repetição',
  ENVIADO: 'Enviado em',
  ATUALIZADO: 'Atualizado em',
  OBS_SECRETARIA: 'Obs. da secretaria',
  ID: 'ID'
};

const ORDEM_COLUNAS = [
  COL.DATA, COL.INICIO, COL.FIM, COL.EVENTO, COL.TIPO, COL.PASTORAL, COL.LOCAL,
  COL.STATUS, COL.RESPONSAVEL, COL.TELEFONE, COL.EMAIL, COL.OBS, COL.PEDIDO,
  COL.REPETICAO, COL.ENVIADO, COL.ATUALIZADO, COL.OBS_SECRETARIA, COL.ID
];

const LARGURAS = {
  'Data': 90, 'Início': 75, 'Fim': 60, 'Evento': 240, 'Tipo': 150,
  'Pastoral / Movimento': 190, 'Local': 190, 'Situação': 110, 'Responsável': 160,
  'Telefone': 125, 'E-mail': 190, 'Observações': 260, 'Pedido nº': 75,
  'Repetição': 210, 'Enviado em': 125, 'Atualizado em': 125,
  'Obs. da secretaria': 240, 'ID': 95
};

const ST = {
  PENDENTE: 'Pendente',
  CONFIRMADO: 'Confirmado',
  RECUSADO: 'Recusado',
  CANCELADO: 'Cancelado'
};
const LISTA_STATUS = [ST.PENDENTE, ST.CONFIRMADO, ST.RECUSADO, ST.CANCELADO];

const TIPOS = ['Evento', 'Preparação / montagem', 'Ensaio', 'Desmontagem / limpeza'];

const DIA_INTEIRO = 'Dia inteiro';

const MODO = { MANUAL: 'Manual', AUTO: 'Automática', SEM_CONFLITO: 'Automática sem conflito' };

const CONFIG_PADRAO = [
  ['Nome da paróquia', 'Paróquia Nossa Senhora das Dores',
    'Aparece no topo do calendário, nos e-mails e nas planilhas para imprimir.'],
  ['Título do calendário', 'Calendário Paroquial',
    'Aparece logo abaixo do nome da paróquia.'],
  ['Senha da secretaria', '',
    'Senha para entrar na "Área da secretaria" (aprovar, recusar, editar e cancelar reservas). Pode trocar quando quiser.'],
  ['Modo de aprovação', MODO.MANUAL,
    'Manual: todo pedido espera a secretaria aprovar. Automática: todo pedido já entra confirmado. Automática sem conflito: confirma sozinho quando o local está livre e só espera aprovação quando houver conflito.'],
  ['Mostrar pedidos pendentes no calendário', 'Sim',
    'Sim: pedidos que aguardam aprovação aparecem no calendário com borda tracejada (ajuda a evitar dois pedidos no mesmo dia). Não: só aparecem depois de confirmados.'],
  ['Mostrar feriados e datas litúrgicas', 'Sim',
    'Sim: mostra feriados nacionais e as principais datas litúrgicas (Cinzas, Páscoa, Pentecostes, Corpus Christi, Advento…).'],
  ['E-mails da secretaria (avisos)', '',
    'Quem recebe aviso por e-mail de pedido novo ou cancelado. Separe vários e-mails por vírgula. Deixe vazio para não enviar.'],
  ['Avisar solicitante por e-mail', 'Sim',
    'Sim: quem fez o pedido recebe e-mail ao enviar, quando for aprovado, recusado ou cancelado (só se informou e-mail).'],
  ['Aviso no formulário', 'Os pedidos passam pela secretaria paroquial, que confere se o local está livre. Acompanhe a situação do seu pedido em "Meu pedido", usando o número do pedido e o seu telefone.',
    'Texto que aparece no topo do formulário de reserva.'],
  ['Contato da secretaria', '',
    'Telefone ou WhatsApp da secretaria. Aparece no rodapé e na tela "Meu pedido".'],
  ['Endereço do site', '',
    'Endereço do calendário no GitHub Pages (ex.: https://paroquiadasdores.github.io/calendario/). Usado nos links dos e-mails.']
];

const LOCAIS_PADRAO = [
  ['Igreja Matriz', 'Sim', ''],
  ['Salão Paroquial', 'Sim', ''],
  ['Capela', 'Sim', ''],
  ['Sala de reuniões', 'Sim', ''],
  ['Salas de catequese', 'Sim', ''],
  ['Cozinha', 'Sim', ''],
  ['Pátio / área externa', 'Sim', ''],
  ['Fora da paróquia (só divulgação)', 'Não', '']
];

const PASTORAIS_PADRAO = [
  'Secretaria Paroquial', 'Conselho Pastoral Paroquial (CPP)', 'Catequese', 'Crisma',
  'Pastoral do Batismo', 'Pastoral Familiar', 'Encontro de Casais com Cristo (ECC)',
  'Pastoral da Juventude', 'Liturgia', 'Ministério de Música', 'Coroinhas',
  'Ministros Extraordinários da Comunhão', 'Pastoral do Dízimo', 'Pastoral da Criança',
  'Pastoral da Saúde', 'Renovação Carismática Católica (RCC)', 'Legião de Maria',
  'Apostolado da Oração', 'Terço dos Homens', 'Vicentinos (SSVP)'
];

const DATAS_PADRAO = [
  ['15/09', 'Festa de Nossa Senhora das Dores (Padroeira)']
];

// ------------------------------------------------------------ API (JSON)
// O site chama esta API com POST (corpo em texto: {"acao": "...", "args": [...]})
// e recebe {"ok": true, "dados": ...} ou {"ok": false, "erro": "mensagem"}.

const ACOES_ = {
  inicio: function () { return dadosIniciais_(); },
  listarEventos: listarEventos,
  carregarConfig: carregarConfig,
  verificarConflitos: verificarConflitos,
  enviarPedido: enviarPedido,
  consultarPedido: consultarPedido,
  cancelarPedido: cancelarPedido,
  entrarSecretaria: entrarSecretaria,
  listarSecretaria: listarSecretaria,
  alterarStatus: alterarStatus,
  editarReserva: editarReserva
};

function doPost(e) {
  let pedido;
  try {
    pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, erro: 'Pedido mal formatado.' });
  }
  return json_(executarComResposta_(pedido.acao, pedido.args));
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.acao) {
    let args = [];
    try { args = JSON.parse(p.args || '[]'); } catch (err) { /* sem argumentos */ }
    return json_(executarComResposta_(p.acao, args));
  }
  // Aberto direto no navegador: mostra só um aviso com o link do site.
  let site = '';
  try { site = lerConfig_().site; } catch (err) { /* planilha ainda não configurada */ }
  const link = /^https?:\/\//.test(site) ? '<p><a href="' + esc_(site) + '" target="_top">Abrir o calendário</a></p>' : '';
  return HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:40px auto;line-height:1.5">' +
    '<h2>Calendário Paroquial: servidor</h2>' +
    '<p>Este endereço é a API do calendário. Ele não é o site: cole este endereço no arquivo <b>config.js</b> do site.</p>' +
    link + '</div>').setTitle('Calendário Paroquial · servidor');
}

function executarAcao_(acao, args) {
  const fn = Object.prototype.hasOwnProperty.call(ACOES_, acao) ? ACOES_[acao] : null;
  if (!fn) erro_('Ação desconhecida: ' + acao);
  return fn.apply(null, Array.isArray(args) ? args : []);
}

function executarComResposta_(acao, args) {
  try {
    return { ok: true, dados: executarAcao_(acao, args) };
  } catch (err) {
    return { ok: false, erro: mensagemErro_(err) };
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function dadosIniciais_() {
  const cfg = lerConfig_();
  const hoje = hojeIso_();
  const ano = Number(hoje.slice(0, 4));
  const linhas = lerReservas_().linhas;
  const anos = {};
  [ano, ano + 1].forEach(function (a) { anos[a] = eventosPublicos_(linhas, cfg, a); });
  return { config: configPublica_(cfg), hoje: hoje, anos: anos };
}

// ------------------------------------------------------- funções públicas
// (chamadas pelo site através da API acima)

/** Eventos de um ano, só com informações públicas (sem telefone e e-mail). */
function listarEventos(ano) {
  ano = Number(ano);
  if (!(ano >= 2000 && ano <= 2100)) erro_('Ano inválido.');
  const cfg = lerConfig_();
  return { ano: ano, eventos: eventosPublicos_(lerReservas_().linhas, cfg, ano) };
}

/** Recarrega configurações (locais, pastorais…) sem recarregar a página. */
function carregarConfig() {
  return { config: configPublica_(lerConfig_()), hoje: hojeIso_() };
}

/** Confere conflitos de local/horário antes de enviar o pedido. */
function verificarConflitos(pedido) {
  pedido = pedido || {};
  const cfg = lerConfig_();
  const locais = limparLista_(pedido.locais, 80);
  const datas = (Array.isArray(pedido.datas) ? pedido.datas : []).slice(0, 400).map(function (d) {
    return normalizarDataPedido_(d, false, true);
  });
  const linhas = lerReservas_().linhas;
  const ignorar = Array.isArray(pedido.ignorarIds) ? pedido.ignorarIds.map(String) : [];
  return calcularConflitos_(datas, locais, linhas, cfg, ignorar, null).map(function (lista) {
    return lista.map(conflitoPublico_);
  });
}

/**
 * Recebe um pedido de reserva.
 * Se vier a senha da secretaria, a reserva já entra confirmada
 * (e pode ter datas no passado).
 */
function enviarPedido(dados, senhaSecretaria) {
  const cfg = lerConfig_();
  const ehSecretaria = !!senhaSecretaria;
  if (ehSecretaria && !conferirSenha_(cfg, senhaSecretaria)) erro_('Senha da secretaria incorreta. Saia e entre de novo na Área da secretaria.');
  const p = validarPedido_(dados, ehSecretaria, cfg);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let resposta;
  try {
    const base = lerReservas_();
    const conflitos = calcularConflitos_(p.datas, p.locais, base.linhas, cfg, [], null);
    const numero = proximoPedido_(base.linhas);
    const agora = new Date();
    const modo = ehSecretaria ? MODO.AUTO : cfg.modo;

    const linhasNovas = p.datas.map(function (d, i) {
      let status = ST.PENDENTE;
      if (modo === MODO.AUTO) status = ST.CONFIRMADO;
      else if (modo === MODO.SEM_CONFLITO && conflitos[i].length === 0) status = ST.CONFIRMADO;
      d.status = status;
      const campos = {};
      campos[COL.DATA] = d.data;
      campos[COL.INICIO] = d.diaInteiro ? DIA_INTEIRO : d.inicio;
      campos[COL.FIM] = d.diaInteiro ? '' : d.fim;
      campos[COL.EVENTO] = p.evento;
      campos[COL.TIPO] = d.tipo;
      campos[COL.PASTORAL] = p.pastoral;
      campos[COL.LOCAL] = p.locais.join(', ');
      campos[COL.STATUS] = status;
      campos[COL.RESPONSAVEL] = p.responsavel;
      campos[COL.TELEFONE] = p.telefone;
      campos[COL.EMAIL] = p.email;
      campos[COL.OBS] = p.obs;
      campos[COL.PEDIDO] = numero;
      campos[COL.REPETICAO] = p.repeticao;
      campos[COL.ENVIADO] = agora;
      campos[COL.ATUALIZADO] = agora;
      campos[COL.OBS_SECRETARIA] = ehSecretaria ? 'Lançado pela secretaria' : '';
      campos[COL.ID] = novoId_();
      return montarLinha_(base, campos);
    });

    acrescentarLinhas_(base.sh, linhasNovas);
    PropertiesService.getScriptProperties().setProperty('ULTIMO_PEDIDO', String(numero));

    const confirmadas = p.datas.filter(function (d) { return d.status === ST.CONFIRMADO; }).length;
    registrarHistorico_(numero, ehSecretaria ? 'Reserva lançada pela secretaria' : 'Novo pedido',
      p.evento + ' · ' + p.pastoral + ' · ' + p.datas.length + ' data(s) · ' + p.locais.join(', '),
      ehSecretaria ? 'Secretaria' : p.responsavel);

    resposta = {
      pedido: numero,
      evento: p.evento,
      total: p.datas.length,
      confirmadas: confirmadas,
      pendentes: p.datas.length - confirmadas,
      datas: p.datas.map(function (d, i) {
        return {
          data: d.data, tipo: d.tipo, inicio: d.inicio, fim: d.fim, diaInteiro: d.diaInteiro,
          status: d.status, conflitos: conflitos[i].map(conflitoPublico_)
        };
      })
    };
  } finally {
    lock.releaseLock();
  }

  // E-mails (fora do bloqueio para não atrasar outros pedidos)
  if (!ehSecretaria) {
    avisarSecretaria_(cfg, 'Novo pedido nº ' + resposta.pedido + ': ' + p.evento,
      '<p>Chegou um novo pedido de reserva pelo calendário.</p>' +
      resumoPedidoHtml_(p, resposta.datas) +
      (resposta.pendentes ? '<p><b>' + resposta.pendentes + ' data(s) aguardam aprovação.</b></p>' : '') +
      linkHtml_(cfg, 'Abrir a área da secretaria', 'secretaria'));
    if (cfg.avisarSolicitante && p.email) {
      enviarEmail_(cfg, p.email, 'Recebemos seu pedido nº ' + resposta.pedido + ' — ' + p.evento,
        '<p>Olá, ' + esc_(p.responsavel) + '!</p>' +
        '<p>Recebemos o seu pedido de reserva. O número do pedido é <b>' + resposta.pedido + '</b>. ' +
        'Guarde este número: com ele e o seu telefone você consulta ou cancela o pedido em "Meu pedido".</p>' +
        resumoPedidoHtml_(p, resposta.datas) +
        (resposta.pendentes ? '<p>A secretaria vai analisar e você receberá outro e-mail com a resposta.</p>' : '') +
        linkHtml_(cfg, 'Ver meu pedido', 'meu-pedido'));
    }
  }
  return resposta;
}

/** Consulta um pedido pelo número + telefone (o telefone funciona como senha). */
function consultarPedido(numero, telefone) {
  const cfg = lerConfig_();
  const base = lerReservas_();
  const linhas = linhasDoPedido_(base.linhas, numero, telefone);
  return pedidoParaSolicitante_(linhas, cfg);
}

/** O próprio solicitante cancela datas do seu pedido. */
function cancelarPedido(numero, telefone, ids) {
  const cfg = lerConfig_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let canceladas = [], linhas;
  try {
    const base = lerReservas_();
    linhas = linhasDoPedido_(base.linhas, numero, telefone);
    const alvo = Array.isArray(ids) && ids.length ? ids.map(String) : null;
    const agora = new Date();
    linhas.forEach(function (l) {
      if (alvo && alvo.indexOf(l.id) < 0) return;
      if (l.status !== ST.PENDENTE && l.status !== ST.CONFIRMADO) return;
      escreverCampos_(base, l.linha, campos_(COL.STATUS, ST.CANCELADO, COL.ATUALIZADO, agora,
        COL.OBS_SECRETARIA, juntarObs_(l.obsSecretaria, 'Cancelado pelo solicitante em ' + Utilities.formatDate(agora, tz_(), 'dd/MM/yyyy'))));
      l.status = ST.CANCELADO;
      canceladas.push(l);
    });
    if (!canceladas.length) erro_('Nenhuma data foi cancelada. Elas já estavam canceladas ou recusadas.');
    registrarHistorico_(linhas[0].pedido, 'Cancelado pelo solicitante',
      canceladas.map(function (l) { return dataBr_(l.data); }).join(', '), linhas[0].responsavel);
  } finally {
    lock.releaseLock();
  }
  avisarSecretaria_(cfg, 'Pedido nº ' + linhas[0].pedido + ' cancelado: ' + linhas[0].evento,
    '<p><b>' + esc_(linhas[0].responsavel) + '</b> cancelou ' + canceladas.length + ' data(s) do pedido nº ' + linhas[0].pedido + ':</p>' +
    listaDatasHtml_(canceladas));
  return pedidoParaSolicitante_(linhas, cfg);
}

// ------------------------------------------------------ área da secretaria

function entrarSecretaria(senha) {
  const cfg = lerConfig_();
  if (!conferirSenha_(cfg, senha)) erro_('Senha incorreta.');
  return { ok: true };
}

/**
 * Lista reservas para a secretaria: todas as do ano escolhido
 * (qualquer situação) + todos os pedidos pendentes (de qualquer ano),
 * com os conflitos de cada data pendente.
 */
function listarSecretaria(senha, ano) {
  const cfg = lerConfig_();
  if (!conferirSenha_(cfg, senha)) erro_('Senha incorreta.');
  ano = String(Number(ano) || hojeIso_().slice(0, 4));
  const base = lerReservas_();
  garantirIds_(base);
  const todas = base.linhas;
  const escolhidas = todas.filter(function (l) { return l.data.slice(0, 4) === ano || l.status === ST.PENDENTE; });
  const pendentes = escolhidas.filter(function (l) { return l.status === ST.PENDENTE; });
  const conflitos = calcularConflitos_(pendentes, null, todas, cfg, [], 'mesmoPedido');
  const mapa = {};
  pendentes.forEach(function (l, i) { mapa[l.id] = conflitos[i].map(conflitoPublico_); });
  return {
    ano: Number(ano),
    hoje: hojeIso_(),
    linhas: escolhidas.map(function (l) {
      const o = linhaSecretaria_(l);
      if (mapa[l.id]) o.conflitos = mapa[l.id];
      return o;
    })
  };
}

/** Aprova, recusa, cancela ou volta para pendente uma ou mais datas. */
function alterarStatus(senha, ids, novoStatus, motivo) {
  const cfg = lerConfig_();
  if (!conferirSenha_(cfg, senha)) erro_('Senha incorreta.');
  novoStatus = normalizarStatus_(novoStatus);
  if (LISTA_STATUS.indexOf(novoStatus) < 0) erro_('Situação inválida.');
  ids = (Array.isArray(ids) ? ids : [ids]).map(String);
  if (!ids.length) erro_('Escolha pelo menos uma data.');
  motivo = String(motivo || '').trim().slice(0, 500);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const alteradas = [];
  try {
    const base = lerReservas_();
    garantirIds_(base);
    const agora = new Date();
    base.linhas.forEach(function (l) {
      if (ids.indexOf(l.id) < 0 || l.status === novoStatus) return;
      const campos = campos_(COL.STATUS, novoStatus, COL.ATUALIZADO, agora);
      if (motivo) campos[COL.OBS_SECRETARIA] = juntarObs_(l.obsSecretaria, motivo);
      escreverCampos_(base, l.linha, campos);
      l.status = novoStatus;
      alteradas.push(l);
    });
    const porPedido = agrupar_(alteradas, function (l) { return l.pedido || ('linha ' + l.linha); });
    Object.keys(porPedido).forEach(function (k) {
      const g = porPedido[k];
      registrarHistorico_(g[0].pedido || '', acaoStatus_(novoStatus),
        g.map(function (l) { return dataBr_(l.data); }).join(', ') + (motivo ? ' · Motivo: ' + motivo : ''), 'Secretaria');
    });
  } finally {
    lock.releaseLock();
  }

  // e-mail para os solicitantes
  if (cfg.avisarSolicitante && novoStatus !== ST.PENDENTE) {
    const porPedido = agrupar_(alteradas.filter(function (l) { return l.email; }), function (l) { return l.pedido + '|' + l.email; });
    Object.keys(porPedido).forEach(function (k) {
      const g = porPedido[k], l0 = g[0];
      const verbo = { Confirmado: 'aprovada(s)', Recusado: 'recusada(s)', Cancelado: 'cancelada(s)' }[novoStatus];
      enviarEmail_(cfg, l0.email, 'Pedido nº ' + l0.pedido + ' — ' + l0.evento + ': ' + novoStatus.toLowerCase(),
        '<p>Olá, ' + esc_(l0.responsavel) + '!</p>' +
        '<p>A secretaria paroquial atualizou o seu pedido nº <b>' + l0.pedido + '</b> (' + esc_(l0.evento) + '). ' +
        'As datas abaixo foram <b>' + verbo + '</b>:</p>' + listaDatasHtml_(g) +
        (motivo ? '<p><b>Observação da secretaria:</b> ' + esc_(motivo) + '</p>' : '') +
        (cfg.contato ? '<p>Dúvidas: ' + esc_(cfg.contato) + '</p>' : '') +
        linkHtml_(cfg, 'Ver o calendário', 'calendario'));
    });
  }
  return { alteradas: alteradas.length };
}

/** A secretaria edita uma data (remarcar, trocar local, horário, etc.). */
function editarReserva(senha, id, mudancas) {
  const cfg = lerConfig_();
  if (!conferirSenha_(cfg, senha)) erro_('Senha incorreta.');
  mudancas = mudancas || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let resultado;
  try {
    const base = lerReservas_();
    garantirIds_(base);
    const l = base.linhas.filter(function (x) { return x.id === String(id); })[0];
    if (!l) erro_('Reserva não encontrada. Atualize a lista e tente de novo.');

    const d = normalizarDataPedido_({
      data: mudancas.data != null ? mudancas.data : l.data,
      diaInteiro: mudancas.diaInteiro != null ? mudancas.diaInteiro : l.diaInteiro,
      inicio: mudancas.inicio != null ? mudancas.inicio : l.inicio,
      fim: mudancas.fim != null ? mudancas.fim : l.fim,
      tipo: mudancas.tipo != null ? mudancas.tipo : l.tipo
    }, true, false);
    const locais = mudancas.locais != null ? limparLista_(mudancas.locais, 80) : l.locais;
    if (!locais.length) erro_('Escolha pelo menos um local.');
    const txt = function (v, atual, max) { return v != null ? limparTexto_(v, max) : atual; };
    const evento = txt(mudancas.evento, l.evento, 150);
    if (!evento) erro_('Informe o nome do evento.');
    const status = mudancas.status != null ? normalizarStatus_(mudancas.status) : l.status;

    const campos = {};
    campos[COL.DATA] = d.data;
    campos[COL.INICIO] = d.diaInteiro ? DIA_INTEIRO : d.inicio;
    campos[COL.FIM] = d.diaInteiro ? '' : d.fim;
    campos[COL.TIPO] = d.tipo;
    campos[COL.LOCAL] = locais.join(', ');
    campos[COL.EVENTO] = evento;
    campos[COL.PASTORAL] = txt(mudancas.pastoral, l.pastoral, 100);
    campos[COL.RESPONSAVEL] = txt(mudancas.responsavel, l.responsavel, 100);
    campos[COL.TELEFONE] = txt(mudancas.telefone, l.telefone, 30);
    campos[COL.EMAIL] = txt(mudancas.email, l.email, 120);
    campos[COL.STATUS] = status;
    campos[COL.OBS_SECRETARIA] = mudancas.obsSecretaria != null ? String(mudancas.obsSecretaria).trim().slice(0, 1000) : l.obsSecretaria;
    campos[COL.ATUALIZADO] = new Date();
    escreverCampos_(base, l.linha, campos);

    const mudou = [];
    if (d.data !== l.data) mudou.push('data ' + dataBr_(l.data) + ' → ' + dataBr_(d.data));
    if (horarioTexto_(d) !== horarioTexto_(l)) mudou.push('horário ' + horarioTexto_(l) + ' → ' + horarioTexto_(d));
    if (locais.join(', ') !== l.locais.join(', ')) mudou.push('local ' + l.locais.join(', ') + ' → ' + locais.join(', '));
    if (status !== l.status) mudou.push('situação ' + l.status + ' → ' + status);
    if (evento !== l.evento) mudou.push('evento → ' + evento);
    registrarHistorico_(l.pedido || '', 'Editado pela secretaria', mudou.join(' · ') || 'Sem mudanças de data/horário/local', 'Secretaria');

    const conflitos = calcularConflitos_([d], locais, base.linhas, cfg, [l.id], null)[0];
    resultado = { ok: true, conflitos: conflitos.map(conflitoPublico_) };
  } finally {
    lock.releaseLock();
  }
  return resultado;
}

// --------------------------------------------------------------- planilha

/** Abre o menu "Calendário" na planilha. */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('📅 Calendário')
      .addItem('Configurar planilha (rodar na instalação)', 'configurarPlanilha')
      .addItem('Mostrar endereço da API e do site', 'mostrarLink')
      .addToUi();
  } catch (e) { /* sem interface (ex.: rodando pelo editor) */ }
}

/**
 * Cria (ou conserta) as abas da planilha. Pode rodar quantas vezes quiser:
 * não apaga nenhum dado, só cria o que estiver faltando.
 */
function configurarPlanilha() {
  const ss = ss_();
  try { ss.setSpreadsheetLocale('pt_BR'); } catch (e) { /* ignora */ }
  const criadas = [];

  // Reservas
  let sh = ss.getSheetByName(ABA.RESERVAS);
  if (!sh) {
    const abas = ss.getSheets();
    if (abas.length === 1 && abas[0].getLastRow() === 0 && abas[0].getLastColumn() === 0) {
      sh = abas[0];
      sh.setName(ABA.RESERVAS);
    } else {
      sh = ss.insertSheet(ABA.RESERVAS, 0);
    }
    criadas.push(ABA.RESERVAS);
  }
  formatarReservas_(sh);

  // Configurações
  let cfgSh = ss.getSheetByName(ABA.CONFIG);
  let senhaNova = '';
  if (!cfgSh) {
    cfgSh = ss.insertSheet(ABA.CONFIG);
    cfgSh.getRange(1, 1, 1, 3).setValues([['Configuração', 'Valor', 'Para que serve']]);
    criadas.push(ABA.CONFIG);
  }
  const existentes = {};
  if (cfgSh.getLastRow() >= 2) {
    cfgSh.getRange(2, 1, cfgSh.getLastRow() - 1, 2).getDisplayValues().forEach(function (r, i) {
      existentes[chave_(r[0])] = { linha: i + 2, valor: r[1] };
    });
  }
  CONFIG_PADRAO.forEach(function (item) {
    const k = chave_(item[0]);
    if (existentes[k]) return;
    let valor = item[1];
    if (k === chave_('Senha da secretaria')) { valor = gerarSenha_(); senhaNova = valor; }
    cfgSh.appendRow([item[0], valor, item[2]]);
  });
  const senhaAtual = existentes[chave_('Senha da secretaria')];
  if (senhaAtual && !String(senhaAtual.valor).trim()) {
    senhaNova = gerarSenha_();
    cfgSh.getRange(senhaAtual.linha, 2).setValue(senhaNova);
  }
  formatarConfig_(cfgSh);

  // Locais
  let locSh = ss.getSheetByName(ABA.LOCAIS);
  if (!locSh) {
    locSh = ss.insertSheet(ABA.LOCAIS);
    locSh.getRange(1, 1, 1, 3).setValues([['Local', 'Verificar conflito?', 'Cor no calendário (opcional)']]);
    locSh.getRange(2, 1, LOCAIS_PADRAO.length, 3).setValues(LOCAIS_PADRAO);
    criadas.push(ABA.LOCAIS);
  }
  formatarSimples_(locSh, [220, 140, 200], '#2c4a7c');
  locSh.getRange(2, 2, Math.max(locSh.getMaxRows() - 1, 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Sim', 'Não'], true).setAllowInvalid(true).build());
  locSh.getRange(1, 5).setValue('Dica: escreva cada local em uma linha. "Verificar conflito? = Não" serve para locais que podem ter vários eventos ao mesmo tempo. A cor é opcional (ex.: #2E6DB4).');

  // Pastorais
  let pasSh = ss.getSheetByName(ABA.PASTORAIS);
  if (!pasSh) {
    pasSh = ss.insertSheet(ABA.PASTORAIS);
    pasSh.getRange(1, 1).setValue('Pastoral / Movimento');
    pasSh.getRange(2, 1, PASTORAIS_PADRAO.length, 1).setValues(PASTORAIS_PADRAO.map(function (p) { return [p]; }));
    criadas.push(ABA.PASTORAIS);
  }
  formatarSimples_(pasSh, [320], '#2c4a7c');
  pasSh.getRange(1, 3).setValue('Dica: uma pastoral ou movimento por linha. Eles aparecem na lista do formulário (em ordem alfabética).');

  // Datas especiais
  let datSh = ss.getSheetByName(ABA.DATAS);
  if (!datSh) {
    datSh = ss.insertSheet(ABA.DATAS);
    datSh.getRange(1, 1, 1, 2).setValues([['Data (dd/mm ou dd/mm/aaaa)', 'Descrição']]);
    datSh.getRange(2, 1, Math.max(datSh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    datSh.getRange(2, 1, DATAS_PADRAO.length, 2).setValues(DATAS_PADRAO);
    criadas.push(ABA.DATAS);
  }
  formatarSimples_(datSh, [190, 380], '#8a6d1f');
  datSh.getRange(2, 1, Math.max(datSh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  datSh.getRange(1, 4).setValue('Dica: "15/09" repete todo ano. "20/03/2027" aparece só em 2027. Essas datas aparecem no calendário e nas planilhas.');

  // Histórico
  let hisSh = ss.getSheetByName(ABA.HISTORICO);
  if (!hisSh) {
    hisSh = ss.insertSheet(ABA.HISTORICO);
    hisSh.getRange(1, 1, 1, 5).setValues([['Quando', 'Pedido nº', 'O que aconteceu', 'Detalhes', 'Feito por']]);
    criadas.push(ABA.HISTORICO);
  }
  formatarSimples_(hisSh, [130, 75, 210, 520, 160], '#5b6473');
  hisSh.getRange(2, 1, Math.max(hisSh.getMaxRows() - 1, 1), 1).setNumberFormat('dd/mm/yyyy hh:mm');

  ss.setActiveSheet(sh);

  const msg = 'Planilha pronta!' +
    (criadas.length ? '\n\nAbas criadas: ' + criadas.join(', ') + '.' : '\n\nNenhuma aba precisou ser criada; formatação conferida.') +
    (senhaNova ? '\n\nSenha da secretaria: ' + senhaNova + '\n(Ela está na aba "Configurações" e pode ser trocada lá.)' : '') +
    '\n\nPróximo passo: no Apps Script, Implantar > Nova implantação > App da Web, e colar o endereço no config.js do site.';
  try { SpreadsheetApp.getUi().alert('Calendário Paroquial', msg, SpreadsheetApp.getUi().ButtonSet.OK); }
  catch (e) { Logger.log(msg); }
  return msg;
}

/** Mostra o endereço da API (para o config.js) e o endereço do site. */
function mostrarLink() {
  const api = urlApp_();
  const site = lerConfig_().site;
  const ui = SpreadsheetApp.getUi();
  if (!api) {
    ui.alert('O servidor ainda não foi publicado. No editor do Apps Script, clique em Implantar > Nova implantação > App da Web.');
    return;
  }
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">' +
    '<p><b>Endereço da API</b> (cole no arquivo config.js do site):<br><input style="width:100%" readonly onclick="this.select()" value="' + esc_(api) + '"></p>' +
    (/^https?:\/\//.test(site)
      ? '<p><b>Site (para todos):</b><br><a href="' + esc_(site) + '" target="_blank">' + esc_(site) + '</a></p>'
      : '<p>Depois de publicar o site, escreva o endereço dele na aba "Configurações" (linha "Endereço do site").</p>') +
    '</div>').setWidth(560).setHeight(240);
  ui.showModalDialog(html, 'Calendário Paroquial');
}

// ======================================================================
//  Daqui para baixo: funções internas (terminam com _ e não são chamadas
//  diretamente pela página).
// ======================================================================

let SS_CACHE_ = null;
function ss_() {
  if (SS_CACHE_) return SS_CACHE_;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Planilha não encontrada. Este código precisa ficar dentro da planilha (menu Extensões > Apps Script).');
  SS_CACHE_ = ss;
  return ss;
}

function tz_() {
  try { return ss_().getSpreadsheetTimeZone() || Session.getScriptTimeZone(); }
  catch (e) { return Session.getScriptTimeZone(); }
}

function hojeIso_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }

function urlApp_() {
  try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; }
}

function erro_(msg) { throw new Error(msg); }

function mensagemErro_(err) { return String((err && err.message) || err); }

function chave_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pad2_(n) { return (n < 10 ? '0' : '') + n; }

function limparTexto_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function limparLista_(v, max) {
  const out = [];
  (Array.isArray(v) ? v : String(v || '').split(/\s*[,;]\s*/)).forEach(function (x) {
    const t = limparTexto_(x, max).replace(/[,;]/g, ' ');
    if (t && out.map(chave_).indexOf(chave_(t)) < 0) out.push(t);
  });
  return out;
}

/** Evita que um texto digitado vire fórmula na planilha. */
function seguro_(v) {
  if (typeof v !== 'string') return v;
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function novoId_() { return 'R' + Utilities.getUuid().replace(/-/g, '').slice(0, 9).toUpperCase(); }

function gerarSenha_() {
  const letras = 'abcdefghjkmnpqrstuvwxyz', nums = '23456789';
  let s = 'dores-';
  for (let i = 0; i < 4; i++) s += letras.charAt(Math.floor(Math.random() * letras.length));
  for (let j = 0; j < 3; j++) s += nums.charAt(Math.floor(Math.random() * nums.length));
  return s;
}

function campos_() {
  const o = {};
  for (let i = 0; i < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
  return o;
}

function agrupar_(lista, fn) {
  const o = {};
  lista.forEach(function (x) { const k = fn(x); (o[k] = o[k] || []).push(x); });
  return o;
}

function juntarObs_(atual, nova) {
  atual = String(atual || '').trim();
  return atual ? atual + ' | ' + nova : nova;
}

// -------------------------------------------------------- datas e horários

function paraIso_(v, tz) {
  if (v === '' || v == null) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return isoValido_(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let a = +m[3];
    if (a < 100) a += 2000;
    return isoValido_(a, +m[2], +m[1]);
  }
  return '';
}

function isoValido_(a, m, d) {
  if (!(a >= 2000 && a <= 2100 && m >= 1 && m <= 12 && d >= 1)) return '';
  const dias = new Date(a, m, 0).getDate();
  if (d > dias) return '';
  return a + '-' + pad2_(m) + '-' + pad2_(d);
}

function lerHora_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, tz_(), 'HH:mm');
  }
  const m = String(v == null ? '' : v).trim().match(/^(\d{1,2})\s*(?:[:hH]\s*(\d{2})?)/);
  if (!m) return '';
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  if (h > 23 || mi > 59) return '';
  return pad2_(h) + ':' + pad2_(mi);
}

function minutos_(hhmm) {
  const p = String(hhmm || '').split(':');
  return (+p[0]) * 60 + (+p[1] || 0);
}

const DIAS_SEMANA_ = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function dataBr_(iso) {
  const p = String(iso).split('-');
  if (p.length !== 3) return String(iso);
  const dt = new Date(+p[0], +p[1] - 1, +p[2]);
  return DIAS_SEMANA_[dt.getDay()] + ', ' + p[2] + '/' + p[1] + '/' + p[0];
}

function horarioTexto_(d) {
  if (d.diaInteiro || !d.inicio) return DIA_INTEIRO;
  return d.inicio + (d.fim ? '–' + d.fim : '');
}

function horariosSobrepoem_(a, b) {
  if (a.diaInteiro || b.diaInteiro || !a.inicio || !b.inicio) return true;
  const ai = minutos_(a.inicio), bi = minutos_(b.inicio);
  let af = a.fim ? minutos_(a.fim) : ai + 60;
  let bf = b.fim ? minutos_(b.fim) : bi + 60;
  if (af <= ai) af = 24 * 60;
  if (bf <= bi) bf = 24 * 60;
  return ai < bf && bi < af;
}

// ------------------------------------------------------------- leitura

function mapaCabecalho_(linha) {
  const idx = {};
  linha.forEach(function (h, i) {
    const k = chave_(h);
    if (k && idx[k] === undefined) idx[k] = i;
  });
  // aceita "Status" no lugar de "Situação"
  if (idx[chave_(COL.STATUS)] === undefined && idx.status !== undefined) idx[chave_(COL.STATUS)] = idx.status;
  return idx;
}

function lerReservas_() {
  const ss = ss_();
  const sh = ss.getSheetByName(ABA.RESERVAS);
  if (!sh) erro_('A aba "Reservas" não existe. Abra a planilha e use o menu 📅 Calendário > Configurar planilha.');
  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 1 || lc < 1) erro_('A aba "Reservas" está vazia. Use o menu 📅 Calendário > Configurar planilha.');
  const rg = sh.getRange(1, 1, lr, lc);
  const val = rg.getValues();
  const dis = rg.getDisplayValues();
  const idx = mapaCabecalho_(dis[0]);
  [COL.DATA, COL.EVENTO].forEach(function (c) {
    if (idx[chave_(c)] === undefined) erro_('A coluna "' + c + '" não foi encontrada na aba Reservas. Use o menu 📅 Calendário > Configurar planilha.');
  });
  const tz = tz_();
  const ci = function (c) { return idx[chave_(c)]; };
  const linhas = [];
  for (let r = 1; r < val.length; r++) {
    const v = val[r], d = dis[r];
    const g = function (c) { const i = ci(c); return i === undefined ? '' : String(d[i]).trim(); };
    const gv = function (c) { const i = ci(c); return i === undefined ? '' : v[i]; };
    const data = paraIso_(gv(COL.DATA), tz) || paraIso_(g(COL.DATA), tz);
    if (!data) continue;
    const inicio = lerHora_(g(COL.INICIO)) || lerHora_(gv(COL.INICIO));
    const fim = inicio ? (lerHora_(g(COL.FIM)) || lerHora_(gv(COL.FIM))) : '';
    linhas.push({
      linha: r + 1,
      id: g(COL.ID),
      pedido: parseInt(g(COL.PEDIDO).replace(/\D/g, ''), 10) || null,
      status: normalizarStatus_(g(COL.STATUS)),
      data: data,
      diaInteiro: !inicio,
      inicio: inicio,
      fim: fim,
      evento: g(COL.EVENTO),
      tipo: normalizarTipo_(g(COL.TIPO)),
      pastoral: g(COL.PASTORAL),
      locais: limparLista_(g(COL.LOCAL), 80),
      responsavel: g(COL.RESPONSAVEL),
      telefone: g(COL.TELEFONE),
      email: g(COL.EMAIL),
      obs: g(COL.OBS),
      repeticao: g(COL.REPETICAO),
      enviado: g(COL.ENVIADO),
      atualizado: g(COL.ATUALIZADO),
      obsSecretaria: g(COL.OBS_SECRETARIA)
    });
  }
  return { sh: sh, idx: idx, ncols: lc, linhas: linhas };
}

function normalizarStatus_(s) {
  const k = chave_(s);
  if (!k) return ST.CONFIRMADO; // linha digitada direto na planilha pela secretaria
  if (k.indexOf('pend') === 0 || k.indexOf('aguard') === 0 || k.indexOf('analise') >= 0) return ST.PENDENTE;
  if (k.indexOf('confirm') === 0 || k.indexOf('aprov') === 0 || k === 'ok' || k === 'sim') return ST.CONFIRMADO;
  if (k.indexOf('recus') === 0 || k.indexOf('negad') === 0 || k.indexOf('indefer') === 0) return ST.RECUSADO;
  if (k.indexOf('cancel') === 0) return ST.CANCELADO;
  return ST.CONFIRMADO;
}

function normalizarTipo_(s) {
  const k = chave_(s);
  if (!k) return TIPOS[0];
  if (k.indexOf('prepar') === 0 || k.indexOf('mont') === 0 || k.indexOf('arrum') === 0) return TIPOS[1];
  if (k.indexOf('ensai') === 0) return TIPOS[2];
  if (k.indexOf('desmont') === 0 || k.indexOf('limp') === 0) return TIPOS[3];
  if (k.indexOf('evento') === 0) return TIPOS[0];
  return limparTexto_(s, 60);
}

function lerConfig_() {
  const ss = ss_();
  const mapa = {};
  const sh = ss.getSheetByName(ABA.CONFIG);
  if (sh && sh.getLastRow() >= 2) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues().forEach(function (r) {
      if (String(r[0]).trim()) mapa[chave_(r[0])] = String(r[1]).trim();
    });
  }
  const val = function (nome) {
    const k = chave_(nome);
    if (k in mapa) return mapa[k];
    const p = CONFIG_PADRAO.filter(function (c) { return chave_(c[0]) === k; })[0];
    return p ? p[1] : '';
  };
  const sim = function (nome) { return /^s/i.test(val(nome) || 'Sim'); };

  const modoTxt = chave_(val('Modo de aprovação'));
  let modo = MODO.MANUAL;
  if (modoTxt.indexOf('conflito') >= 0) modo = MODO.SEM_CONFLITO;
  else if (modoTxt.indexOf('autom') === 0) modo = MODO.AUTO;

  // locais
  const locais = [];
  const lsh = ss.getSheetByName(ABA.LOCAIS);
  if (lsh && lsh.getLastRow() >= 2) {
    lsh.getRange(2, 1, lsh.getLastRow() - 1, 3).getDisplayValues().forEach(function (r) {
      const nome = limparTexto_(r[0], 80).replace(/[,;]/g, ' ');
      if (!nome) return;
      const cor = String(r[2] || '').trim();
      locais.push({ nome: nome, conflito: !/^n/i.test(String(r[1]).trim()), cor: /^#[0-9a-f]{6}$/i.test(cor) ? cor : '' });
    });
  }

  // pastorais
  const pastorais = [];
  const psh = ss.getSheetByName(ABA.PASTORAIS);
  if (psh && psh.getLastRow() >= 2) {
    psh.getRange(2, 1, psh.getLastRow() - 1, 1).getDisplayValues().forEach(function (r) {
      const n = limparTexto_(r[0], 100);
      if (n) pastorais.push(n);
    });
  }
  pastorais.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });

  // datas especiais
  const datas = [];
  const dsh = ss.getSheetByName(ABA.DATAS);
  if (dsh && dsh.getLastRow() >= 2) {
    const rg = dsh.getRange(2, 1, dsh.getLastRow() - 1, 2);
    const vv = rg.getValues(), dd = rg.getDisplayValues();
    dd.forEach(function (r, i) {
      const nome = limparTexto_(r[1], 120);
      if (!nome) return;
      const bruto = vv[i][0];
      if (Object.prototype.toString.call(bruto) === '[object Date]') {
        const iso = paraIso_(bruto, tz_());
        if (iso) datas.push({ dia: +iso.slice(8, 10), mes: +iso.slice(5, 7), ano: +iso.slice(0, 4), nome: nome });
        return;
      }
      const m = String(r[0]).trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
      if (!m) return;
      let ano = m[3] ? +m[3] : null;
      if (ano && ano < 100) ano += 2000;
      datas.push({ dia: +m[1], mes: +m[2], ano: ano, nome: nome });
    });
  }

  return {
    nomeParoquia: val('Nome da paróquia') || 'Paróquia',
    titulo: val('Título do calendário') || 'Calendário Paroquial',
    senha: val('Senha da secretaria'),
    modo: modo,
    mostrarPendentes: sim('Mostrar pedidos pendentes no calendário'),
    mostrarFeriados: sim('Mostrar feriados e datas litúrgicas'),
    emailsAviso: val('E-mails da secretaria (avisos)'),
    avisarSolicitante: sim('Avisar solicitante por e-mail'),
    aviso: val('Aviso no formulário'),
    contato: val('Contato da secretaria'),
    site: val('Endereço do site'),
    locais: locais,
    pastorais: pastorais,
    datasEspeciais: datas
  };
}

function configPublica_(cfg) {
  return {
    nomeParoquia: cfg.nomeParoquia,
    titulo: cfg.titulo,
    modo: cfg.modo,
    mostrarPendentes: cfg.mostrarPendentes,
    mostrarFeriados: cfg.mostrarFeriados,
    aviso: cfg.aviso,
    contato: cfg.contato,
    locais: cfg.locais,
    pastorais: cfg.pastorais,
    datasEspeciais: cfg.datasEspeciais,
    tipos: TIPOS,
    secretariaAtiva: !!cfg.senha
  };
}

function eventoPublico_(l) {
  return {
    id: l.id || ('L' + l.linha),
    pedido: l.pedido,
    data: l.data,
    diaInteiro: l.diaInteiro,
    inicio: l.inicio,
    fim: l.fim,
    evento: l.evento,
    tipo: l.tipo,
    pastoral: l.pastoral,
    locais: l.locais,
    responsavel: l.responsavel,
    status: l.status
  };
}

function eventosPublicos_(linhas, cfg, ano) {
  const a = String(ano);
  return linhas.filter(function (l) {
    if (l.data.slice(0, 4) !== a) return false;
    if (l.status === ST.CONFIRMADO) return true;
    return l.status === ST.PENDENTE && cfg.mostrarPendentes;
  }).map(eventoPublico_).sort(ordenarEventos_);
}

function ordenarEventos_(a, b) {
  if (a.data !== b.data) return a.data < b.data ? -1 : 1;
  const ha = a.diaInteiro ? '' : a.inicio, hb = b.diaInteiro ? '' : b.inicio;
  if (ha !== hb) return ha < hb ? -1 : 1;
  return String(a.evento).localeCompare(String(b.evento), 'pt-BR');
}

function linhaSecretaria_(l) {
  const o = eventoPublico_(l);
  o.telefone = l.telefone;
  o.email = l.email;
  o.obs = l.obs;
  o.repeticao = l.repeticao;
  o.enviado = l.enviado;
  o.atualizado = l.atualizado;
  o.obsSecretaria = l.obsSecretaria;
  o.linha = l.linha;
  return o;
}

function conflitoPublico_(l) {
  return {
    id: l.id, pedido: l.pedido, data: l.data, evento: l.evento, pastoral: l.pastoral, tipo: l.tipo,
    locais: l.locaisEmComum || l.locais, inicio: l.inicio, fim: l.fim, diaInteiro: l.diaInteiro, status: l.status
  };
}

// ------------------------------------------------------------- conflitos

function localVerifica_(nome, cfg) {
  const k = chave_(nome);
  const achado = cfg.locais.filter(function (l) { return chave_(l.nome) === k; })[0];
  return achado ? achado.conflito : true;
}

/**
 * Para cada data em `datas`, devolve a lista de reservas ativas
 * (pendentes ou confirmadas) no mesmo local com horário sobreposto.
 * Se `locais` for null, usa os locais de cada data (para a lista da secretaria).
 * `ignorarPedido = 'mesmoPedido'` ignora as datas do próprio pedido.
 */
function calcularConflitos_(datas, locais, linhas, cfg, ignorarIds, ignorarPedido) {
  const porData = {};
  linhas.forEach(function (l) {
    if (l.status !== ST.PENDENTE && l.status !== ST.CONFIRMADO) return;
    if (ignorarIds && ignorarIds.indexOf(l.id) >= 0) return;
    (porData[l.data] = porData[l.data] || []).push(l);
  });
  return datas.map(function (d) {
    const meus = (locais || d.locais || []).filter(function (x) { return localVerifica_(x, cfg); }).map(chave_);
    if (!meus.length) return [];
    const out = [];
    (porData[d.data] || []).forEach(function (l) {
      if (d.id && l.id === d.id) return;
      if (ignorarPedido === 'mesmoPedido' && d.pedido && l.pedido === d.pedido) return;
      const comuns = l.locais.filter(function (x) { return meus.indexOf(chave_(x)) >= 0; });
      if (!comuns.length || !horariosSobrepoem_(d, l)) return;
      const c = Object.assign({}, l);
      c.locaisEmComum = comuns;
      out.push(c);
    });
    return out;
  });
}

// ------------------------------------------------------------- validação

function normalizarDataPedido_(d, permitirPassado, semErro) {
  d = d || {};
  const data = paraIso_(d.data, tz_());
  const diaInteiro = d.diaInteiro === true || d.diaInteiro === 'true' || !lerHora_(d.inicio);
  const inicio = diaInteiro ? '' : lerHora_(d.inicio);
  let fim = diaInteiro ? '' : lerHora_(d.fim);
  const tipo = normalizarTipo_(d.tipo);
  const o = { data: data, diaInteiro: diaInteiro, inicio: inicio, fim: fim, tipo: tipo };
  if (semErro) return o;
  if (!data) erro_('Há uma data inválida no pedido.');
  if (!diaInteiro && !fim) erro_('Informe o horário de término em ' + dataBr_(data) + '.');
  if (!diaInteiro && minutos_(fim) <= minutos_(inicio)) erro_('Em ' + dataBr_(data) + ', o horário de término precisa ser depois do início.');
  if (!permitirPassado && data < hojeIso_()) erro_('A data ' + dataBr_(data) + ' já passou. Escolha uma data a partir de hoje.');
  return o;
}

function validarPedido_(p, ehSecretaria, cfg) {
  if (!p || typeof p !== 'object') erro_('Pedido inválido. Recarregue a página e tente de novo.');
  const o = {
    pastoral: limparTexto_(p.pastoral, 100),
    responsavel: limparTexto_(p.responsavel, 100),
    telefone: limparTexto_(p.telefone, 30),
    email: limparTexto_(p.email, 120).toLowerCase(),
    evento: limparTexto_(p.evento, 150),
    obs: String(p.obs == null ? '' : p.obs).trim().slice(0, 1500),
    repeticao: limparTexto_(p.repeticao, 200),
    locais: limparLista_(p.locais, 80)
  };
  if (!o.evento) erro_('Informe o nome do evento.');
  if (!o.pastoral) erro_('Informe a pastoral ou movimento.');
  if (!o.responsavel) erro_('Informe o nome do responsável.');
  if (!ehSecretaria && o.telefone.replace(/\D/g, '').length < 8) erro_('Informe um telefone com DDD.');
  if (o.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) erro_('O e-mail parece estar incompleto. Confira ou deixe em branco.');
  if (!o.locais.length) erro_('Escolha pelo menos um local.');

  const lista = Array.isArray(p.datas) ? p.datas : [];
  if (!lista.length) erro_('Escolha pelo menos uma data.');
  if (lista.length > 300) erro_('São muitas datas em um pedido só (máximo 300). Divida em mais de um pedido.');
  const vistos = {};
  o.datas = [];
  lista.forEach(function (d) {
    const n = normalizarDataPedido_(d, ehSecretaria, false);
    const k = n.data + '|' + n.tipo + '|' + n.inicio;
    if (vistos[k]) return;
    vistos[k] = true;
    o.datas.push(n);
  });
  o.datas.sort(function (a, b) { return (a.data + (a.inicio || '')) < (b.data + (b.inicio || '')) ? -1 : 1; });
  return o;
}

function conferirSenha_(cfg, senha) {
  if (!cfg.senha) erro_('A área da secretaria está desligada: defina uma senha na aba "Configurações" da planilha.');
  const ok = String(senha || '').trim() === String(cfg.senha).trim();
  if (!ok) Utilities.sleep(1200); // dificulta tentativas em sequência
  return ok;
}

function digitos_(t) { return String(t || '').replace(/\D/g, ''); }

function linhasDoPedido_(linhas, numero, telefone) {
  const n = parseInt(String(numero || '').replace(/\D/g, ''), 10);
  const tel = digitos_(telefone);
  if (!n) erro_('Informe o número do pedido.');
  if (tel.length < 8) erro_('Informe o telefone usado no pedido (com DDD).');
  const doPedido = linhas.filter(function (l) { return l.pedido === n; });
  const confere = doPedido.length && digitos_(doPedido[0].telefone).slice(-8) === tel.slice(-8);
  if (!confere) {
    Utilities.sleep(800);
    erro_('Não encontramos o pedido nº ' + n + ' com esse telefone. Confira os dados ou fale com a secretaria.');
  }
  return doPedido;
}

function pedidoParaSolicitante_(linhas, cfg) {
  const l0 = linhas[0];
  return {
    pedido: l0.pedido,
    evento: l0.evento,
    pastoral: l0.pastoral,
    responsavel: l0.responsavel,
    locais: l0.locais,
    repeticao: l0.repeticao,
    enviado: l0.enviado,
    contato: cfg.contato,
    datas: linhas.slice().sort(ordenarEventos_).map(function (l) {
      return {
        id: l.id || ('L' + l.linha), data: l.data, tipo: l.tipo, diaInteiro: l.diaInteiro, inicio: l.inicio, fim: l.fim,
        locais: l.locais, status: l.status, obsSecretaria: l.obsSecretaria
      };
    })
  };
}

// ------------------------------------------------------------- escrita

function montarLinha_(base, campos) {
  const row = [];
  for (let i = 0; i < base.ncols; i++) row.push('');
  Object.keys(campos).forEach(function (c) {
    const i = base.idx[chave_(c)];
    if (i !== undefined) row[i] = seguro_(campos[c]);
  });
  return row;
}

function acrescentarLinhas_(sh, linhas) {
  if (!linhas.length) return;
  const inicio = sh.getLastRow() + 1;
  const falta = inicio + linhas.length - 1 - sh.getMaxRows();
  if (falta > 0) sh.insertRowsAfter(sh.getMaxRows(), falta + 200);
  sh.getRange(inicio, 1, linhas.length, linhas[0].length).setValues(linhas);
}

function escreverCampos_(base, linha, campos) {
  Object.keys(campos).forEach(function (c) {
    const i = base.idx[chave_(c)];
    if (i !== undefined) base.sh.getRange(linha, i + 1).setValue(seguro_(campos[c]));
  });
}

/** Dá um ID para linhas digitadas direto na planilha (precisa para editar pelo site). */
function garantirIds_(base) {
  const i = base.idx[chave_(COL.ID)];
  if (i === undefined) return;
  base.linhas.forEach(function (l) {
    if (!l.id) {
      l.id = novoId_();
      base.sh.getRange(l.linha, i + 1).setValue(l.id);
    }
  });
}

function proximoPedido_(linhas) {
  let max = 0;
  linhas.forEach(function (l) { if (l.pedido && l.pedido > max) max = l.pedido; });
  const salvo = parseInt(PropertiesService.getScriptProperties().getProperty('ULTIMO_PEDIDO') || '0', 10) || 0;
  return Math.max(max, salvo) + 1;
}

function registrarHistorico_(pedido, acao, detalhes, por) {
  try {
    const sh = ss_().getSheetByName(ABA.HISTORICO);
    if (!sh) return;
    sh.appendRow([new Date(), pedido || '', seguro_(acao), seguro_(String(detalhes || '').slice(0, 2000)), seguro_(por || '')]);
  } catch (e) { console.warn('Histórico: ' + mensagemErro_(e)); }
}

function acaoStatus_(s) {
  return { Confirmado: 'Aprovado pela secretaria', Recusado: 'Recusado pela secretaria', Cancelado: 'Cancelado pela secretaria', Pendente: 'Voltou para pendente' }[s] || s;
}

// -------------------------------------------------------------- e-mails

function enviarEmail_(cfg, para, assunto, corpo) {
  if (!para) return;
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return;
    MailApp.sendEmail({
      to: para,
      subject: assunto,
      name: cfg.nomeParoquia,
      htmlBody: '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1d2433;max-width:620px">' +
        '<p style="font-size:13px;color:#5b6473;margin:0 0 12px">' + esc_(cfg.nomeParoquia) + ' · ' + esc_(cfg.titulo) + '</p>' +
        corpo + '</div>'
    });
  } catch (e) { console.warn('E-mail não enviado: ' + mensagemErro_(e)); }
}

function avisarSecretaria_(cfg, assunto, corpo) {
  const para = String(cfg.emailsAviso || '').split(/[,;\s]+/).filter(function (x) { return /@/.test(x); }).join(',');
  if (para) enviarEmail_(cfg, para, assunto, corpo);
}

function listaDatasHtml_(datas) {
  return '<ul style="padding-left:20px">' + datas.map(function (d) {
    return '<li><b>' + dataBr_(d.data) + '</b> · ' + esc_(horarioTexto_(d)) + ' · ' + esc_(d.tipo) +
      (d.locais && d.locais.length ? ' · ' + esc_(d.locais.join(', ')) : '') +
      (d.status ? ' — <i>' + esc_(d.status === ST.PENDENTE ? 'aguardando aprovação' : d.status.toLowerCase()) + '</i>' : '') +
      (d.conflitos && d.conflitos.length ? ' <span style="color:#a4441c">⚠ conflito com: ' + esc_(d.conflitos.map(function (c) { return c.evento; }).join(', ')) + '</span>' : '') +
      '</li>';
  }).join('') + '</ul>';
}

function resumoPedidoHtml_(p, datas) {
  return '<table style="border-collapse:collapse;font-size:14px">' +
    [['Evento', p.evento], ['Pastoral / movimento', p.pastoral], ['Local', p.locais.join(', ')],
      ['Responsável', p.responsavel + (p.telefone ? ' · ' + p.telefone : '')], ['Repetição', p.repeticao], ['Observações', p.obs]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return '<tr><td style="padding:2px 12px 2px 0;color:#5b6473">' + r[0] + '</td><td style="padding:2px 0">' + esc_(r[1]) + '</td></tr>'; })
      .join('') + '</table>' + listaDatasHtml_(datas);
}

function linkHtml_(cfg, texto, pagina) {
  const url = String(cfg.site || '').trim();
  if (!/^https?:\/\//.test(url)) return '';
  const destino = pagina && pagina !== 'calendario' ? url + (url.indexOf('?') >= 0 ? '&' : '?') + 'pagina=' + pagina : url;
  return '<p><a href="' + esc_(destino) + '" style="color:#1f3a68;font-weight:bold">' + esc_(texto) + '</a></p>';
}

// ---------------------------------------------------------- formatação

function colLetra_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function formatarReservas_(sh) {
  // cabeçalho: cria o que faltar sem apagar nada
  let lc = sh.getLastColumn();
  const atual = lc ? sh.getRange(1, 1, 1, lc).getDisplayValues()[0] : [];
  if (!atual.some(function (h) { return String(h).trim(); })) {
    sh.getRange(1, 1, 1, ORDEM_COLUNAS.length).setValues([ORDEM_COLUNAS]);
  } else {
    const idx = mapaCabecalho_(atual);
    const faltando = ORDEM_COLUNAS.filter(function (c) { return idx[chave_(c)] === undefined; });
    if (faltando.length) sh.getRange(1, lc + 1, 1, faltando.length).setValues([faltando]);
  }
  lc = sh.getLastColumn();
  const cab = sh.getRange(1, 1, 1, lc).getDisplayValues()[0];
  const idx = mapaCabecalho_(cab);
  const n = Math.max(sh.getMaxRows() - 1, 1);
  if (sh.getMaxRows() < 500) sh.insertRowsAfter(sh.getMaxRows(), 500 - sh.getMaxRows());
  const linhas = Math.max(sh.getMaxRows() - 1, n);

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, lc).setFontWeight('bold').setBackground('#1f3a68').setFontColor('#ffffff')
    .setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(1, 34);
  cab.forEach(function (h, i) { if (LARGURAS[h]) sh.setColumnWidth(i + 1, LARGURAS[h]); });

  const col = function (c) { const i = idx[chave_(c)]; return i === undefined ? null : i + 1; };
  const faixa = function (c) { const k = col(c); return k ? sh.getRange(2, k, linhas, 1) : null; };

  const fData = faixa(COL.DATA); if (fData) fData.setNumberFormat('dd/mm/yyyy');
  [COL.INICIO, COL.FIM, COL.TELEFONE, COL.ID, COL.EVENTO, COL.PASTORAL, COL.LOCAL, COL.RESPONSAVEL,
    COL.EMAIL, COL.OBS, COL.REPETICAO, COL.OBS_SECRETARIA, COL.TIPO, COL.STATUS].forEach(function (c) {
    const f = faixa(c); if (f) f.setNumberFormat('@');
  });
  const fPed = faixa(COL.PEDIDO); if (fPed) fPed.setNumberFormat('0').setHorizontalAlignment('center');
  [COL.ENVIADO, COL.ATUALIZADO].forEach(function (c) { const f = faixa(c); if (f) f.setNumberFormat('dd/mm/yyyy hh:mm'); });

  const fSt = faixa(COL.STATUS);
  if (fSt) fSt.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(LISTA_STATUS, true).setAllowInvalid(true)
    .setHelpText('Pendente = aguardando aprovação · Confirmado · Recusado · Cancelado').build());
  const fTipo = faixa(COL.TIPO);
  if (fTipo) fTipo.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(TIPOS, true).setAllowInvalid(true).build());

  // cores por situação
  const cs = col(COL.STATUS);
  if (cs) {
    const letra = colLetra_(cs);
    const tudo = sh.getRange(2, 1, linhas, lc);
    const regra = function (valor) { return '=$' + letra + '2="' + valor + '"'; };
    const regras = [
      SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(regra(ST.PENDENTE)).setBackground('#fff3cd').setRanges([tudo]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(regra(ST.RECUSADO)).setFontColor('#9aa1ad').setStrikethrough(true).setRanges([tudo]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(regra(ST.CANCELADO)).setFontColor('#9aa1ad').setStrikethrough(true).setRanges([tudo]).build()
    ];
    sh.setConditionalFormatRules(regras);
  }
  sh.setTabColor('#1f3a68');
}

function formatarConfig_(sh) {
  formatarSimples_(sh, [300, 320, 560], '#1f3a68');
  const n = sh.getLastRow();
  if (n >= 2) {
    sh.getRange(2, 1, n - 1, 1).setFontWeight('bold');
    sh.getRange(2, 2, n - 1, 1).setNumberFormat('@').setBackground('#f4f6fb');
    sh.getRange(2, 3, n - 1, 1).setWrap(true).setFontColor('#5b6473');
    sh.getRange(2, 1, n - 1, 3).setVerticalAlignment('top');
  }
  const linhas = sh.getRange(2, 1, Math.max(n - 1, 1), 1).getDisplayValues();
  linhas.forEach(function (r, i) {
    const k = chave_(r[0]);
    const cel = sh.getRange(i + 2, 2);
    if (k === chave_('Modo de aprovação')) {
      cel.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([MODO.MANUAL, MODO.AUTO, MODO.SEM_CONFLITO], true).build());
    } else if (/^mostrar|^avisar/.test(k)) {
      cel.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Sim', 'Não'], true).build());
    } else if (k === chave_('Aviso no formulário')) {
      cel.setWrap(true);
    }
  });
}

function formatarSimples_(sh, larguras, cor) {
  const lc = Math.max(sh.getLastColumn(), larguras.length);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, larguras.length).setFontWeight('bold').setBackground(cor).setFontColor('#ffffff');
  larguras.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  if (lc > larguras.length) sh.getRange(1, larguras.length + 1, 1, lc - larguras.length).setFontColor('#5b6473').setFontStyle('italic');
  sh.setTabColor(cor);
}

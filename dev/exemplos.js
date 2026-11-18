/* Exemplos: monta a planilha simulada com eventos fictícios (usado na demonstração e nos testes). */
(function () {
  'use strict';
  var SENHA = 'demo';
  configurarPlanilha();
  var cfg = __ss.getSheetByName('Configurações');
  cfg.data.forEach(function (r) {
    if (r[0] === 'Senha da secretaria') r[1] = SENHA;
    if (r[0] === 'Contato da secretaria') r[1] = '(11) 4000-0000 (exemplo)';
  });

  function semanal(ini, fim, passo) {
    var out = [], d = new Date(ini + 'T12:00:00'), f = new Date(fim + 'T12:00:00');
    while (d <= f) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + (passo || 7)); }
    return out;
  }
  function nthMensal(ano, wd, n) { // n = 1..4 ou -1 (último)
    var out = [];
    for (var m = 0; m < 12; m++) {
      var d;
      if (n > 0) { d = new Date(ano, m, 1, 12); while (d.getDay() !== wd) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 7 * (n - 1)); }
      else { d = new Date(ano, m + 1, 0, 12); while (d.getDay() !== wd) d.setDate(d.getDate() - 1); }
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }
  function h(lista, ini, fim, tipo) { return lista.map(function (d) { return { data: d, inicio: ini, fim: fim, diaInteiro: !ini, tipo: tipo || 'Evento' }; }); }

  var pedidos = [
    { pastoral: 'Catequese', responsavel: 'Marta Ribeiro', telefone: '(11) 90000-0001', evento: 'Encontro de catequese', locais: ['Salas de catequese'],
      repeticao: 'Toda semana (todo sábado) até 27/11/2027', datas: h(semanal('2027-02-06', '2027-11-27'), '09:00', '11:00') },
    { pastoral: 'Encontro de Casais com Cristo (ECC)', responsavel: 'Paulo e Regina Alves', telefone: '(11) 90000-0002', evento: 'Reunião do ECC', locais: ['Salão Paroquial'],
      repeticao: 'Todo mês, na 1ª sexta do mês', datas: h(nthMensal(2027, 5, 1), '19:30', '21:30') },
    { pastoral: 'Conselho Pastoral Paroquial (CPP)', responsavel: 'Secretaria Paroquial', telefone: '(11) 4000-0000', evento: 'Reunião do Conselho Pastoral', locais: ['Sala de reuniões'],
      repeticao: 'Todo mês, na última terça do mês', datas: h(['2026-11-24', '2026-12-15'].concat(nthMensal(2027, 2, -1)), '19:30', '21:30') },
    { pastoral: 'Pastoral do Batismo', responsavel: 'Ana Lúcia Prado', telefone: '(11) 90000-0004', evento: 'Curso de preparação para o batismo', locais: ['Sala de reuniões'],
      repeticao: 'Todo mês, no 2º domingo do mês', datas: h(nthMensal(2027, 0, 2), '09:00', '11:30') },
    { pastoral: 'Ministério de Música', responsavel: 'Rafael Nunes', telefone: '(11) 90000-0005', evento: 'Ensaio da Cantata de Natal', locais: ['Igreja Matriz'],
      repeticao: 'Toda semana (toda quinta) até 17/12/2026', datas: h(semanal('2026-11-19', '2026-12-17'), '19:30', '21:00', 'Ensaio') },
    { pastoral: 'Ministério de Música', responsavel: 'Rafael Nunes', telefone: '(11) 90000-0005', evento: 'Cantata de Natal', locais: ['Igreja Matriz'],
      repeticao: 'Não se repete', datas: h(['2026-12-20'], '19:00', '21:00').concat(h(['2026-12-19'], '', '', 'Ensaio')) },
    { pastoral: 'Vicentinos (SSVP)', responsavel: 'Dona Cida Moraes', telefone: '(11) 90000-0007', evento: 'Bazar beneficente', locais: ['Salão Paroquial'],
      repeticao: 'Não se repete · com dia anterior para preparação', datas: h(['2026-11-28'], '08:00', '13:00').concat(h(['2026-11-27'], '', '', 'Preparação / montagem')) },
    { pastoral: 'Secretaria Paroquial', responsavel: 'Secretaria Paroquial', telefone: '(11) 4000-0000', evento: 'Confraternização das pastorais', locais: ['Salão Paroquial', 'Cozinha'],
      repeticao: 'Não se repete', datas: h(['2026-12-12'], '18:00', '22:00') },
    { pastoral: 'Pastoral da Juventude', responsavel: 'Lucas Ferreira', telefone: '(11) 90000-0009', evento: 'Festa Junina da Paróquia', locais: ['Pátio / área externa', 'Cozinha', 'Salão Paroquial'],
      repeticao: 'Não se repete · com dia anterior para preparação', datas: h(['2027-06-19'], '16:00', '23:00').concat(h(['2027-06-18'], '', '', 'Preparação / montagem'), h(['2027-06-20'], '08:00', '12:00', 'Desmontagem / limpeza')) },
    { pastoral: 'Liturgia', responsavel: 'Secretaria Paroquial', telefone: '(11) 4000-0000', evento: 'Missa solene e procissão da Padroeira', locais: ['Igreja Matriz'],
      repeticao: 'Não se repete', datas: h(['2027-09-15'], '19:00', '21:30') },
    { pastoral: 'Conselho Pastoral Paroquial (CPP)', responsavel: 'Comissão da Festa', telefone: '(11) 90000-0011', evento: 'Quermesse de Nossa Senhora das Dores', locais: ['Pátio / área externa', 'Cozinha', 'Salão Paroquial'],
      repeticao: 'Sábado e domingo, com preparação e desmontagem', datas: h(['2027-09-18', '2027-09-19'], '17:00', '23:00').concat(h(['2027-09-17'], '', '', 'Preparação / montagem'), h(['2027-09-20'], '08:00', '12:00', 'Desmontagem / limpeza')) },
    { pastoral: 'Crisma', responsavel: 'Beatriz Lima', telefone: '(11) 90000-0012', evento: 'Retiro da Crisma', locais: ['Salão Paroquial', 'Cozinha'],
      repeticao: 'Não se repete · com dia anterior para preparação', datas: h(['2027-08-14'], '', '').concat(h(['2027-08-13'], '14:00', '20:00', 'Preparação / montagem')) },
    { pastoral: 'Terço dos Homens', responsavel: 'José Carlos', telefone: '(11) 90000-0013', evento: 'Terço dos Homens', locais: ['Capela'],
      repeticao: 'Toda semana (toda segunda)', datas: h(semanal('2026-11-02', '2027-12-27'), '20:00', '21:00') }
  ];
  pedidos.forEach(function (p) { enviarPedido(p, SENHA); });

  // Pedidos que chegaram pelo formulário e aguardam a secretaria
  var pendentes = [
    { pastoral: 'Pastoral da Juventude', responsavel: 'Lucas Ferreira', telefone: '(11) 90000-0009', email: '', evento: 'Ensaio da peça de Natal', locais: ['Salão Paroquial'],
      obs: 'Vamos precisar do salão o dia todo para montar o cenário.', repeticao: 'Não se repete', datas: h(['2026-11-27'], '', '') },
    { pastoral: 'Legião de Maria', responsavel: 'Teresa Campos', telefone: '(11) 90000-0014', email: '', evento: 'Retiro de Advento', locais: ['Salão Paroquial', 'Cozinha'],
      obs: 'Almoço para 40 pessoas.', repeticao: 'Não se repete', datas: h(['2026-12-05'], '08:00', '17:00') },
    { pastoral: 'Catequese', responsavel: 'Marta Ribeiro', telefone: '(11) 90000-0001', email: '', evento: 'Reunião de pais da catequese', locais: ['Salas de catequese'],
      obs: '', repeticao: 'Não se repete', datas: h(['2027-02-06'], '10:00', '11:30') },
    { pastoral: 'Renovação Carismática Católica (RCC)', responsavel: 'Sandra Rocha', telefone: '(11) 90000-0016', email: '', evento: 'Noite de louvor', locais: ['Igreja Matriz'],
      obs: '', repeticao: 'Todo mês, na 3ª sexta do mês até 31/12/2027', datas: h(nthMensal(2027, 5, 3), '20:00', '22:00') }
  ];
  var numeros = pendentes.map(function (p) { return enviarPedido(p, SENHA).pedido; });
  var ids = listarSecretaria(SENHA, 2027).linhas.concat(listarSecretaria(SENHA, 2026).linhas)
    .filter(function (l) { return numeros.indexOf(l.pedido) >= 0; }).map(function (l) { return l.id; });
  alterarStatus(SENHA, ids, 'Pendente', '');
  __mails.length = 0;

  globalThis.__demo = { senha: SENHA, pedidoExemplo: numeros[0], telefoneExemplo: '(11) 90000-0009' };
})();

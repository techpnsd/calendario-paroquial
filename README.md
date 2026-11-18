# Calendário Paroquial: Paróquia Nossa Senhora das Dores

Calendário público e reserva de espaços da paróquia. É um site (sem login e sem nada para instalar) que guarda os dados numa planilha do Google.

- **Calendário:** mês, semana ou lista, com filtros por local e pastoral, feriados e datas litúrgicas.
- **Reservar espaço:** várias datas, eventos que se repetem, dia anterior para montagem, aviso de conflito na hora.
- **Meu pedido:** consultar e cancelar com o número do pedido e o telefone.
- **Área da secretaria:** aprovar, recusar, remarcar, cancelar e lançar reservas.
- **Planilha para imprimir:** Excel do mês, da semana ou do ano, pronto para A4.
- **PWA:** pode ser adicionado à tela de início do celular e abre sem internet com a última versão carregada.

## Como funciona

```
docs/      → o site (GitHub Pages publica esta pasta)
servidor/  → Codigo.gs: API em Google Apps Script, ligada à planilha
dev/       → testes e servidor local
exemplos/  → planilhas geradas com dados fictícios
demo/      → demonstração que abre direto no navegador
```

O site chama a API (`docs/config.js` tem o endereço `/exec`), e a API lê e grava na planilha.
Tudo é gratuito: GitHub Pages, Google Apps Script e Google Planilhas.

**Instalação, uso e manutenção:** veja [COMO-INSTALAR.md](COMO-INSTALAR.md).

## Testar no computador

```bash
TZ=America/Sao_Paulo node dev/servidor-local.js   # http://localhost:8801/ (senha da secretaria: demo)
TZ=America/Sao_Paulo node dev/test-servidor.js    # testes do servidor
```

# Calendário Paroquial: Paróquia Nossa Senhora das Dores

É um **site**: as pessoas abrem o link no navegador (Safari, Chrome…), no celular ou no computador, sem login e sem instalar nada. Quem quiser pode adicionar o site à tela de início do celular (PWA), e ele abre como um aplicativo, mas isso é opcional.

Tudo é gratuito:

```
 Visitante (celular ou computador)
        │  abre o site
        ▼
 GitHub Pages ── docs/  (index.html, config.js, logo…)
        │  chama a API (POST com JSON)
        ▼
 Google Apps Script ── servidor/Codigo.gs
        │  lê e grava
        ▼
 Google Planilhas ── abas Reservas, Configurações, Locais, Pastorais…
```

- **Site** (pasta `docs/`, nome que o GitHub Pages exige): HTML, CSS e JavaScript puros, sem build. Fica no GitHub Pages, com endereço próprio e HTTPS.
- **Servidor** (`servidor/Codigo.gs`): roda no Google, dentro da planilha, e responde em JSON. Executa com a conta da paróquia, então **a planilha não fica pública**: o site só recebe o que o servidor deixa (telefone e e-mail nunca vão para o público).
- **Dados**: ficam na planilha. Dá para ver, filtrar e até editar direto por lá.

| Tela | Quem usa | Para quê |
|---|---|---|
| **Calendário** | Todo mundo | Ver o mês (como o calendário de parede), a semana ou a lista. Filtrar por local ou pastoral. Baixar ou compartilhar a planilha para imprimir. |
| **Reservar espaço** | Todo mundo | Pedir um ou mais locais: uma data, várias datas, eventos que se repetem, o dia anterior para montagem e outras datas de preparação, ensaio ou desmontagem. Avisa na hora se o local já está ocupado. |
| **Meu pedido** | Quem pediu | Ver se foi aprovado e cancelar datas, com o **número do pedido** e o **telefone**. |
| **Área da secretaria** | Secretaria (senha) | Aprovar ou recusar (vendo os conflitos), remarcar, cancelar e lançar reservas já confirmadas. |

> Faça tudo com uma **conta da paróquia** (Google e GitHub), não com contas pessoais. Assim o sistema continua funcionando se a pessoa que montou deixar a função.

---

## Parte 1: Servidor (planilha + Apps Script), uns 10 minutos

1. Entre em **https://sheets.new** com a conta Google da paróquia e dê o nome **Calendário Paroquial**.
2. Menu **Extensões › Apps Script**. No arquivo **Código.gs**, apague tudo e cole o conteúdo de `servidor/Codigo.gs`. Salve (Ctrl+S).
3. Na lista de funções do topo, escolha **`configurarPlanilha`** e clique em **Executar**. Autorize com a conta da paróquia.
   - Se aparecer *"O Google não verificou este app"*: **Avançado › Acessar (não seguro) › Permitir**. É normal para código próprio.
   - Permissões pedidas: mexer **só nesta planilha** e enviar e-mails (avisos de pedido).
4. Na planilha surgem as abas **Reservas, Configurações, Locais, Pastorais, Datas especiais e Histórico**. Anote a **senha da secretaria** (aba Configurações).
5. No Apps Script: **Implantar › Nova implantação**, tipo **App da Web**:
   - **Executar como:** Eu
   - **Quem pode acessar:** Qualquer pessoa
6. Clique em **Implantar** e copie o **URL do app da Web**, que termina em **`/exec`**. Esse é o endereço da API.

## Parte 2: Site (GitHub Pages), uns 5 minutos

O repositório do GitHub guarda o projeto inteiro. O GitHub Pages publica só a pasta **`docs/`**, que é o site.

1. No repositório, abra **`docs/config.js`**, clique no lápis (**Edit**) e troque o texto entre aspas pelo endereço `/exec` da Parte 1:
   ```js
   window.CALENDARIO_API = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
   Clique em **Commit changes**. Em 1 ou 2 minutos o site atualiza.
2. Confira em **Settings › Pages**: *Source* **Deploy from a branch**, *Branch* **main**, pasta **/docs**. O endereço do site aparece no topo dessa tela.
3. Volte na planilha, aba **Configurações**, e preencha **Endereço do site** com esse endereço. Ele é usado nos links dos e-mails.

> **Montando do zero em outro GitHub?** Crie um repositório **público** (o Pages gratuito exige), suba todos os arquivos do projeto mantendo as pastas (**Add file › Upload files**) e configure o Pages como no passo 2.
> Para um endereço mais bonito, use uma **organização** gratuita com o nome da paróquia (ex.: `paroquiadasdores`): o site fica em `https://paroquiadasdores.github.io/calendario/`.

Pronto. Na planilha, o menu **📅 Calendário › Mostrar endereço da API e do site** mostra os dois endereços quando precisar.

### Links para enviar

| Link | Abre em |
|---|---|
| `https://…/calendario/` | Calendário |
| `https://…/calendario/?pagina=reservar` | Formulário de reserva |
| `https://…/calendario/?pagina=meu-pedido` | Consultar ou cancelar pedido |
| `https://…/calendario/?pagina=secretaria` | Área da secretaria |

O rodapé do site também tem **Copiar link do calendário** e **Copiar link do formulário**.

### Domínio próprio (opcional)
Se a paróquia tiver um domínio (ex.: `paroquiadasdores.com.br`, no registro.br), dá para usar `calendario.paroquiadasdores.com.br`:
1. Em **Settings › Pages › Custom domain**, escreva o endereço e salve.
2. No registro.br (ou onde estiver o DNS), crie um registro **CNAME** `calendario` apontando para `paroquiadasdores.github.io`.
3. Depois que o GitHub confirmar, marque **Enforce HTTPS**.

### Na tela de início do celular (opcional)
- **iPhone:** abra o site no **Safari › Compartilhar › Adicionar à Tela de Início**.
- **Android:** no Chrome, **menu ⋮ › Adicionar à tela inicial** (ou "Instalar app").

Ele ganha o ícone da paróquia, abre em tela cheia e, se a internet cair, mostra a última versão do calendário que foi carregada naquele aparelho.

---

## Ajustar para a paróquia

Tudo pela **planilha**, sem mexer no código. Depois de mudar, basta recarregar o site.

- **Locais**: um espaço por linha. Troque os exemplos pelos espaços reais.
  - **Verificar conflito? = Não** serve para locais que aceitam vários eventos ao mesmo tempo.
  - **Cor**: opcional (ex.: `#2E6DB4`).
- **Pastorais**: uma por linha. A pessoa também pode escrever outra no formulário.
- **Datas especiais**: `15/09` repete todo ano; `20/03/2027` aparece só em 2027. Feriados nacionais e as principais datas litúrgicas já são calculados para qualquer ano.
- **Configurações**:
  - **Modo de aprovação**: *Manual* (padrão: tudo espera a secretaria), *Automática* (tudo entra confirmado) ou *Automática sem conflito* (confirma sozinho se o local estiver livre).
  - **Mostrar pedidos pendentes no calendário**: pedidos aguardando aparecem com borda tracejada.
  - **E-mails da secretaria (avisos)**, **Avisar solicitante por e-mail**, **Aviso no formulário**, **Contato da secretaria**, **Endereço do site**.
- **Logo**: é o arquivo `docs/logo.png` (círculo com fundo transparente, 192×192). Os ícones do celular são `icone-192.png`, `icone-512.png`, `icone-maskable-512.png` (com fundo azul), `apple-touch-icon.png` e `favicon-32.png`. Para trocar, suba arquivos novos com os mesmos nomes. A logo também vai para a impressão e para as planilhas.
- **Nome no ícone do celular**: no arquivo `docs/manifest.webmanifest` (`name` e `short_name`).

---

## Uso no dia a dia

### Quem pede um espaço
1. **Reservar espaço** → pastoral, responsável, telefone, evento, locais, data e horário (ou "Dia inteiro").
2. Se repete: escolha a repetição (toda semana, a cada 15 dias, todo mês no 1º sábado, todo mês no dia 10…) e **até quando**. Dá para tirar datas da lista e adicionar datas avulsas.
3. Se precisar do local antes: **"Reservar também o dia anterior"**, ou outras datas de preparação, ensaio ou desmontagem.
4. O **resumo** mostra todas as datas e avisa conflitos. Ao enviar, aparece o **número do pedido**.

### Secretaria
1. **Área da secretaria** → senha.
2. **Aguardando aprovação**: cada pedido com contato (o telefone abre o WhatsApp) e, em amarelo, as datas que batem com outra reserva no mesmo local. Marque e **aprove** ou **recuse**. Na recusa, o motivo vai por e-mail e aparece em "Meu pedido".
3. **Todas as reservas**: buscar, filtrar, **editar** (remarcar, trocar local ou horário, mudar a situação) e **cancelar**.
4. **Nova reserva confirmada**: lança direto como aprovada (aceita datas passadas).

Também dá para mexer direto na aba **Reservas** (coluna **Situação**: *Pendente, Confirmado, Recusado, Cancelado*), mas por ali não sai e-mail. Linhas digitadas à mão aparecem no calendário: só **Data** e **Evento** são obrigatórias, e se a Situação ficar em branco a reserva conta como confirmada.

### Imprimir e enviar
- **Baixar planilha** gera um Excel (.xlsx) pronto para A4 deitada: **o mês** (grade de parede), **uma semana** (7 dias lado a lado) ou **o ano inteiro** (uma aba por mês), com ou sem a **lista** em tabela.
- No celular aparece **Compartilhar**, que manda a planilha direto para o WhatsApp, o e-mail ou os Arquivos.
- **Imprimir** (no computador) imprime o que está na tela.
- Se houver filtro ligado, a planilha sai filtrada. Ela tem só o **nome** do responsável, nunca telefone ou e-mail.

---

## Outros anos (2028 em diante)

**No sistema não há nada para fazer.** Nenhum ano está fixo no código: a data de hoje vem do servidor, a lista de anos se ajusta sozinha, e os feriados e datas da paróquia são calculados para cada ano. Os pedidos de 2028 entram na mesma aba **Reservas**, e a numeração continua de onde parou.

- **Eventos fixos:** as repetições viram linhas no momento do pedido (o "repetir até" vem preenchido com 31/12). Para 2028, cada pastoral pede de novo, ou a secretaria lança pela **Nova reserva confirmada**.
- **Limpeza (opcional):** se a aba **Reservas** ficar muito grande (muitos milhares de linhas), crie uma aba "Arquivo 2027" e mova para lá as linhas antigas. O servidor só lê a aba **Reservas**.

---

## Atualizar depois

- **Site:** no GitHub, edite ou suba o arquivo novo dentro de `docs/` (**Add file › Upload files**). Em 1 ou 2 minutos está no ar. O site sempre busca a versão nova quando há internet. Só se mudar o próprio `sw.js`, troque o número da `VERSAO` no topo dele.
- **Servidor:** cole o `Codigo.gs` novo, salve e use **Implantar › Gerenciar implantações › lápis › Versão: Nova versão › Implantar**. Assim o endereço `/exec` continua o mesmo. "Nova implantação" cria outro endereço, e aí seria preciso trocar o `config.js`.
- Ao atualizar o servidor, rode `configurarPlanilha` de novo: ele só acrescenta o que estiver faltando (como configurações novas) e não apaga nada.

## Privacidade e segurança

- O repositório do GitHub é público, mas só tem **código**. O endereço da API aparece para qualquer visitante (é assim que o site funciona) e não dá acesso a nada além do que o site já mostra.
- A **senha da secretaria** fica só na planilha. Nunca coloque senhas no GitHub.
- A planilha continua privada. Para o conselho acompanhar, compartilhe como **Leitor**; como **Editor**, a pessoa pode aprovar direto na planilha.
- Para cancelar em "Meu pedido", é preciso o número **e** o telefone do pedido.
- Cópia de segurança: **Arquivo › Fazer uma cópia** de vez em quando. O Google guarda o **Histórico de versões**.

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| "O endereço do servidor ainda não foi colocado no arquivo config.js" | Edite o `config.js` no GitHub (Parte 2, passo 4). |
| "Não foi possível falar com o servidor" | Confira se o endereço do `config.js` termina em **/exec** (não em /dev) e se a implantação está com **Quem pode acessar: Qualquer pessoa**. |
| "A aba Reservas não existe" | Na planilha: **📅 Calendário › Configurar planilha**. |
| Mudei o Codigo.gs e nada mudou | Faltou **Gerenciar implantações › Nova versão**. |
| O GitHub mostra erro 404 | Espere 2 minutos e confira **Settings › Pages** (branch **main**, pasta **/ (root)**) e se o `index.html` está na raiz do repositório. |
| E-mails não chegam | Confira a aba **Configurações** e o spam. Contas Gmail gratuitas enviam até cerca de 100 e-mails por dia. |

## Testar no computador (para quem é de tecnologia)

Com o Node instalado, na pasta do projeto:

```bash
TZ=America/Sao_Paulo node dev/servidor-local.js
```

Isso abre o site em http://localhost:8801/ usando uma imitação da API do Google: o mesmo código do servidor, rodando sobre uma planilha simulada com exemplos (senha da secretaria: `demo`). Os testes ficam em `dev/test-servidor.js` (servidor) e `dev/e2e.js` (navegador, com Playwright).

## Arquivos

```
calendario-paroquial/
├── servidor/
│   └── Codigo.gs          ← cole no Apps Script da planilha
├── docs/                  ← o site (publicado pelo GitHub Pages)
│   ├── index.html         ← o site
│   ├── config.js          ← endereço da API (/exec)
│   ├── logo.png, icone-*.png, apple-touch-icon.png, favicon-32.png
│   ├── manifest.webmanifest, sw.js   ← PWA
├── exemplos/              ← planilhas geradas com dados fictícios
├── demo/demonstracao.html ← demonstração que abre direto no navegador
├── dev/                   ← testes e servidor local
└── COMO-INSTALAR.md       ← este guia
```

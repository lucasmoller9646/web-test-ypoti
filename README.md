# Ypoti · site institucional

Site estático (HTML, CSS e JavaScript puro, sem build) da Ypoti, em cinco idiomas: espanhol (padrão), guarani, português, inglês e alemão. Funciona no GitHub Pages, na Netlify ou em qualquer hospedagem comum.

Todos os textos do site ficam fora do código, numa tabela com uma linha por texto e uma coluna por idioma. Essa tabela pode morar em dois lugares, e o site aceita os dois:

1. **No próprio repositório**, nos arquivos `data/textos.csv` e `data/config.csv`. É o modo padrão: basta trocar o CSV e fazer commit.
2. **Numa planilha do Google**, lida ao vivo pelo Apps Script da pasta `apps-script/`. Quem edita a planilha muda o site sem tocar no GitHub. Se a planilha falhar, o site volta sozinho a usar os CSV do repositório.

A planilha `ypoti_textos.xlsx` (entregue junto com este pacote) tem exatamente a mesma estrutura dos CSV: abas `textos` e `config`.

## Estrutura

```
index.html              página inicial
faq.html                as 15 perguntas frequentes
data/textos.csv         textos nos 5 idiomas (clave · seccion · contexto · es · pt · en · de · gn · comentarios)
data/config.csv         telefones, e-mail, endereços, links e parâmetros do simulador
assets/css/style.css    estilos (cores no início do arquivo, em :root)
assets/js/main.js       idiomas, modo escuro, simulador e formulários
assets/js/site-config.js  escolhe de onde ler os textos (CSV ou Apps Script)
assets/img, assets/fonts, assets/video
apps-script/Code.gs     script da planilha do Google (textos ao vivo + registro de leads)
apps-script/appsscript.json
```

## Publicar no GitHub Pages

1. Crie um repositório (por exemplo `ypoti-site`) e suba todo o conteúdo desta pasta para a branch `main` (pelo site do GitHub: *Add file › Upload files*, arrastando as pastas).
2. Em *Settings › Pages*, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`, e salve. Em um ou dois minutos o site aparece em `https://lucasmoller9646.github.io/ypoti-site/`.
3. Para usar o domínio `ypoti.com`: em *Settings › Pages › Custom domain* escreva `ypoti.com` e salve (o GitHub cria o arquivo `CNAME`). No painel de quem administra o domínio, crie quatro registros `A` para `@` apontando para `185.199.108.153`, `185.199.109.153`, `185.199.110.153` e `185.199.111.153`, e um `CNAME` para `www` apontando para `lucasmoller9646.github.io`. Quando o DNS propagar, marque *Enforce HTTPS*.

Antes de trocar o domínio, confirme onde está hospedada a página `ypoti.com/map` (tour virtual), porque ela some junto com o site antigo se estiver no mesmo servidor. O link do tour é configurável em `config.csv` (`tour_url`).

Para testar no computador, não abra o `index.html` com dois cliques: o navegador bloqueia a leitura dos CSV e o site fica só em espanhol. Rode um servidor simples na pasta (`python -m http.server`) e abra `http://localhost:8000`.

## Editar textos

**Pelo CSV (modo padrão).** Abra `ypoti_textos.xlsx`, edite a aba `textos`, e salve essa aba como *CSV UTF-8 (delimitado por vírgulas)* com o nome `textos.csv`. Substitua `data/textos.csv` no GitHub (*Add file › Upload files*). O site aceita CSV separado por vírgula ou por ponto e vírgula, então tanto faz o Excel em português ou em espanhol. Faça o mesmo com a aba `config` se mudar telefones ou parâmetros.

**Pela planilha do Google (opcional, ao vivo).**

1. Suba `ypoti_textos.xlsx` para o Google Drive e abra com *Planilhas Google* (*Arquivo › Salvar como Planilhas Google*).
2. Na planilha: *Extensões › Apps Script*. Apague o conteúdo do `Código.gs`, cole o conteúdo de `apps-script/Code.gs` e salve. Em *Configurações do projeto*, marque *Mostrar o arquivo de manifesto* e substitua o `appsscript.json` pelo da pasta.
3. *Implantar › Nova implantação › Tipo: App da Web*. Executar como: **eu**. Quem pode acessar: **Qualquer pessoa**. Autorize e copie a URL que termina em `/exec`.
4. Cole a URL em `assets/js/site-config.js`, em `APPS_SCRIPT_URL: '...'`, e faça commit.

A partir daí, o que for editado nas abas `textos` e `config` aparece no site em até 5 minutos (ou na hora, pelo menu *Sitio Ypoti › Publicar cambios ahora* que o script cria na planilha). Os formulários do site passam a ficar registrados na aba `leads`, e se em `config` houver um e-mail em `leads_email`, cada formulário gera um aviso por e-mail. Se mudar o código do script, crie uma nova versão em *Implantar › Gerenciar implantações* mantendo a mesma URL.

## Regras para quem edita textos

- Não altere a coluna `clave`: é ela que liga o texto ao lugar certo no site. Para tirar um texto, deixe a célula vazia (o site mostra o espanhol no lugar).
- Mantenha o que estiver entre chaves, como `{valor}`, `{n}`, `{peso}` ou `{categoria}`: o site preenche sozinho.
- Mantenha as marcas `<b>…</b>` (negrito) e `<br>` (quebra de linha). Nas mensagens de WhatsApp (`wa.*`), a quebra de linha é uma quebra real dentro da célula (Alt+Enter no Excel).
- A coluna `contexto` diz onde o texto aparece. A coluna `comentarios` é livre e o site a ignora.

## Ajustes (config)

| clave | para que serve |
|---|---|
| `whatsapp_hoteleria`, `whatsapp_compras` | números de WhatsApp (só dígitos, com 595) usados pelos botões e formulários |
| `telefono_*`, `email`, `direccion_*` | como aparecem no site |
| `precio_ms_usd`, `diaria_usd` | cotação de referência mostrada no simulador e usada no cálculo |
| `rc_entrada`, `rc_salida`, `otros_costos_usd` | premissas do simulador |
| `sim_*` | valores iniciais dos campos do simulador |
| `tour_url`, `video_url`, `testimonio_video_url` | links; vazio esconde o link do vídeo |
| `sostenibilidad_url`, `rokakuaa_url` | links do ESG; vazio esconde o link |
| `instagram_url` … `tiktok_url` | redes; vazio mostra só o nome, sem link |
| `leads_email` | só com Apps Script: e-mail que recebe aviso de cada formulário |

Números podem ser escritos com ponto ou vírgula decimal (`0.29` ou `0,29`).

## Fotos pendentes

Dois cartões de clientes usam um fundo neutro até receberem foto. Basta subir os arquivos com estes nomes (formato WebP ou troque a extensão no `index.html`):

- `assets/img/prueba-piveta.webp` — Benjamín Piveta / Grupo Piveta
- `assets/img/prueba-argentina.webp` — visita dos produtores argentinos

## Pendências de conteúdo antes de publicar

- A fonte HighVoltage Rough precisa de licença que permita uso em site; se não houver, troque em `style.css` (`--font-display`) por uma fonte do Google Fonts.
- A coluna `gn` (guarani) deve ser revisada por um falante nativo.
- Confirmar os pontos marcados na coluna `comentarios` da planilha (mínimo de 126 ou 160 animais, ano de início 1993 ou 1994, 140 ou 142 famílias).

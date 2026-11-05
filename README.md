# Ypoti · site institucional com tour virtual 3D

Site estático da Ypoti (Arroyito, Concepción) em cinco idiomas (espanhol, guarani, português, inglês e alemão), com o tour virtual 3D da estância (aba `#tour`), a história guiada "Historia de un toro" e as páginas de sustentabilidade (`#ambiental`), Rokakuaa (`#rokakuaa`) e governança (`#gobernanza`).

Tudo funciona sem build: `index.html` traz o HTML, o CSS, o JavaScript e as traduções; a pasta `media/` traz fotos, logos, vídeo, fonte e a biblioteca Three.js usada pelo 3D.

## Publicar no GitHub Pages

1. Suba o conteúdo desta pasta para a branch `main` do repositório.
2. Em *Settings › Pages*, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
3. O arquivo `.nojekyll` evita que o GitHub processe o site com Jekyll.

Para testar no computador, rode um servidor simples na pasta (`python -m http.server`) e abra `http://localhost:8000`; com dois cliques no `index.html` o navegador bloqueia parte dos recursos.

Versão 14 do protótipo (novembro de 2026).

# Testes manuais — Drive Hunt GED

## Deploy / diagnóstico
- [ ] A raiz do repositório contém `package.json`, `render.yaml`, `index.html`, `src/` e `server/`.
- [ ] O serviço é do tipo Web Service (não Static Site).
- [ ] `npm install && npm run build` termina sem erros.
- [ ] `npm start` inicia o servidor na porta recebida por `PORT`.
- [ ] `/health` responde `ok: true` e `buildReady: true`.
- [ ] `/` abre a tela inicial do jogo, não uma página 404.

## Salas e convite
- [ ] Criar uma sala gera um código de seis caracteres.
- [ ] O link compartilhado contém `#/sala/CODIGO` e abre a tela de entrada.
- [ ] O botão **QR em tela cheia** abre um QR que pode ser lido pelo celular.
- [ ] Em computador, a apresentação ocupa a tela inteira e fecha por Esc ou pelo botão Fechar.
- [ ] Em celular, o QR e os controles cabem na tela sem rolagem horizontal.
- [ ] Pelo menos duas pessoas conseguem entrar e marcar Pronto.
- [ ] A contagem de 3 segundos é sincronizada.

## Partida
- [ ] A navegação de pastas funciona por toque e clique.
- [ ] Não existe campo ou botão de pesquisa de documentos.
- [ ] Ordenar por nome, tamanho e extensão funciona nos dois sentidos.
- [ ] Abrir um documento incorreto exibe seu conteúdo fictício e não registra conclusão.
- [ ] Abrir o documento correto registra tempo e posição e atualiza o ranking em tempo real.
- [ ] Os dez níveis funcionam e a sala avança quando todos terminam.

## Acessibilidade e dispositivos
- [ ] Aumentar/diminuir texto funciona.
- [ ] Alto contraste, redução de animações e botões maiores funcionam.
- [ ] A interface é utilizável em tela de celular e computador.

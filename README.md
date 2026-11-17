# Drive Hunt GED — v1.0

Jogo educacional multiplayer de Gestão Eletrônica de Documentos. O professor cria a partida (PIN + link + QR Code), os alunos entram pelo celular e disputam **10 níveis** na mesma sessão, localizando um documento-alvo **navegando manualmente** pelas pastas de uma empresa fictícia (não existe busca).

## Como funciona
- **Professor (apresentador):** não pontua nem aparece no ranking. Controla: iniciar, pausar/retomar, encerrar rodada, exibir ranking parcial, avançar de nível, bloquear entradas, permitir entrada tardia, remover participante, encerrar sessão.
- **Jogadores:** entram por PIN, link ou QR Code com um apelido (único na sala, sem acento/caixa).
- **Rodada:** contagem de 3 s → cronômetro único do servidor → o jogador abre o documento → o servidor valida, registra tempo, colocação e pontos. A rodada termina quando todos acham, o tempo limite acaba (90 s no nível 1 até 360 s no nível 10) ou o professor encerra.
- **Pontuação:** 1000/900/800/700/600 e depois −50 por colocação (mínimo 100); configurável em `PONTOS_POR_COLOCACAO`. Desempate: menor tempo total, depois ordem de entrada. Quem não conclui não pontua.
- **Níveis:** cada um gera sua própria árvore (de ~28 arquivos/2 setores no nível 1 a ~1.450 arquivos/10 setores/6 níveis de pasta no nível 10) com armadilhas: versões antigas, rascunhos, extensões diferentes, mesmo documento em outro setor e nomes fora do padrão. O alvo é único (verificado por teste).
- **Servidor é a autoridade:** tempo, validação do alvo, pontos e ranking. O cliente nunca recebe qual arquivo é o alvo; só envia o id do arquivo aberto.

## Executar localmente
```bash
npm install
cp .env.example .env     # opcional
npm run dev              # front em http://localhost:5173, servidor em :3000
# produção local:
npm run build && npm start   # tudo em http://localhost:3000
npm test                 # testes do motor e do adaptador de sockets
```
Para testar com celulares na mesma rede, abra `http://IP-DO-COMPUTADOR:3000` (o QR Code usa o endereço aberto pelo professor).

## Estrutura
```
server/  engine.js (regras, rodadas, pontos) · tree.js (árvores por nível) · sockets.js (Socket.IO, autenticação, limites) · store.js (persistência) · index.js
shared/  constants.js (níveis, pontuação, dicas educativas)
src/     App.jsx · pages/ (Home, Host, Player) · components/ · hooks/useGame.js · services/socket.js
tests/   engine.test.mjs · sockets.test.mjs
```

## Hospedagem (Render / qualquer Node com WebSocket)
- Build: `npm install --include=dev && npm run build` · Start: `npm start` · Health: `/health`.
- Variáveis: veja `.env.example`. Não há segredos no código; as credenciais de professor/jogador são geradas por sala.
- **Persistência:** as sessões são gravadas em `DATA_DIR/rooms.json` (escrita atômica). Após reinício, as salas voltam, a rodada em andamento fica **pausada** e o tempo da queda não é descontado; jogadores e professor reconectam sozinhos.
- **Limitações do plano free do Render:** o serviço dorme após ~15 min sem tráfego e o disco é efêmero (as sessões se perdem ao dormir/redeploy). Para aulas, abra o site alguns minutos antes; para persistência real use plano pago com disco montado em `DATA_DIR`. Banco externo (Postgres/Redis) **não** está implementado: o `store.js` é o ponto de troca.
- Instância única: o estado vive em um processo. Para escalar horizontalmente seria necessário Redis adapter + banco.
- Front em outro domínio: defina `CLIENT_ORIGIN` e aponte o cliente ao servidor (hoje ele usa a mesma origem).

## Segurança implementada
Identidade vinculada ao socket (token do professor/jogador nunca vem do payload após a autenticação), comparação de tokens em tempo constante, validação de tipo/tamanho de todo evento, limite de eventos por socket, limite de tentativas inválidas de PIN/retomada e de criação de salas por IP, isolamento por sala, uma conclusão por jogador por nível, bloqueio de pontos retroativos.

## O que foi testado
`npm test` (22 testes): sessões/PIN, apelidos, permissões, cronômetro/pausa, pontuação, empate, 10 níveis com 7 jogadores simulados, entrada tardia/bloqueio, reconexão, persistência, árvores (alvo único em várias sementes), adaptador de sockets (fluxo completo, reconexão, limites). Também foi executado um teste ponta a ponta no Chromium (professor + 4 jogadores, 10 níveis, pausa, ranking, entrada tardia, bloqueio, reconexão por recarga, pódio e encerramento).
**Ainda não verificado:** execução com o pacote real `socket.io` e o build Vite (ambiente sem acesso à internet; use `npm install`, `npm test` e `npm run build` no seu ambiente), visual dos ícones reais e de QR Code legível por câmera, publicação na internet.

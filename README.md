# Drive Hunt GED — v1.3

Jogo educacional multiplayer de Gestão Eletrônica de Documentos. O professor cria a partida (PIN + link + QR Code), os alunos entram pelo celular e disputam **10 níveis** na mesma sessão, localizando um documento-alvo **navegando manualmente** pelas pastas de uma empresa fictícia (não existe busca).

## Como funciona
- **Professor (apresentador):** não pontua nem aparece no ranking. Controla: iniciar, pausar/retomar, encerrar rodada, exibir ranking parcial, avançar de nível, bloquear entradas, permitir entrada tardia, remover participante, encerrar sessão.
- **Jogadores:** entram por PIN, link ou QR Code com um apelido (único na sala, sem acento/caixa).
- **Rodada:** contagem de 3 s → cronômetro único do servidor → o jogador abre o documento → o servidor valida, registra tempo, colocação e pontos. A rodada termina quando todos acham, o tempo limite acaba (90 s no nível 1 até 360 s no nível 10) ou o professor encerra.
- **Pontuação (tempo + erros):** a colocação da rodada vem do tempo (1000/900/800/700/600, depois −50 por colocação, mínimo 100) e cada documento errado aberto desconta 50 pontos (piso de 100 para quem concluiu). Reabrir o mesmo arquivo errado não conta de novo. Classificação final: mais pontos → menos erros → menor tempo total → ordem de entrada. Quem não conclui não pontua. Configurável em `PONTOS_POR_COLOCACAO` e `PENALIDADE_POR_ERRO`.
- **Níveis:** cada um gera sua própria árvore (de ~36 arquivos/2 setores no nível 1 a ~2.500 arquivos/10 setores/5 níveis de pasta no nível 10, ~500 KB enviados por rodada) com armadilhas: versões antigas, rascunhos, extensões diferentes, mesmo documento em outro setor e nomes fora do padrão. Segue padrões de GED: códigos do plano de classificação nas pastas (`01 - Recursos Humanos` › `01.1 - Admissões`), áreas comuns (Correspondências, Relatórios e Atas, Modelos e Formulários, Controle e Registros), fases do ciclo de vida (Corrente/Intermediária/Permanente), pastas por ano e nomes `TIPO_ASSUNTO_SETOR_ANO_Vnn[_STATUS].ext`. O alvo é único (verificado por teste).
- **Explorador estilo Windows 11:** barra de comandos (voltar, subir, endereço, classificar por nome/tamanho/extensão em ordem crescente ou decrescente, detalhes/ícones), painel de pastas em árvore (gaveta no celular), pastas e arquivos com ícones por tipo e **painel de visualização lateral** (folha inferior no celular) que não cobre a lista.
- **Pódio final** inspirado no croqui do projeto: três quadros com a foto de cada jogador (1º ao centro, mais alto), apelido, pontos, níveis concluídos, erros e tempo total.
- **Foto do jogador (opcional):** na tela inicial o jogador busca uma imagem na web (Openverse, licenças Creative Commons, sem chave de API) ou envia/tira uma foto, e **recorta** em tela (arrastar, pinça/roda/controle de zoom, girar 90°, setas e +/− no teclado). A busca e as miniaturas passam pelo nosso servidor (`/api/imagens`, `/api/imagem`), o que permite o recorte no navegador e mantém a lista de hosts fixa. A foto vai com 256×256 px (JPEG, até ~45 KB) e é validada no servidor; só um selo viaja nas atualizações da sala e a imagem é servida em `/api/avatar/:sala/:jogador`.
- **Temas:** Lavanda, Oceano, Menta, Pôr do sol e Noite (botão de acessibilidade no topo), com visual suave e vidro fosco na barra; funciona junto com alto contraste e tamanho de texto.
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
`npm test` (28 testes, incluindo erros/penalidade/desempate, busca de imagens com provedor simulado, proxy e validação de foto): sessões/PIN, apelidos, permissões, cronômetro/pausa, pontuação, empate, 10 níveis com 7 jogadores simulados, entrada tardia/bloqueio, reconexão, persistência, árvores (alvo único em várias sementes), adaptador de sockets (fluxo completo, reconexão, limites). Também foi executado um teste ponta a ponta no Chromium (professor + 4 jogadores, 10 níveis, pausa, ranking, entrada tardia, bloqueio, reconexão por recarga, pódio e encerramento).
**Ainda não verificado:** a busca real no Openverse (o ambiente de teste não tem internet; o código foi testado com respostas simuladas e os endpoints de miniatura/Wikimedia seguem a documentação pública dos provedores, que pode mudar ou limitar requisições); execução com o pacote real `socket.io` e o build Vite (ambiente sem acesso à internet; use `npm install`, `npm test` e `npm run build` no seu ambiente), visual dos ícones reais e de QR Code legível por câmera, publicação na internet.

# Drive Hunt GED

Jogo multiplayer de navegador para praticar organização, classificação e localização de documentos digitais. Interface mobile-first inspirada na navegação do Google Drive, com salas por link/código, contagem regressiva sincronizada, cronômetro de servidor e leaderboard ao vivo.

## Recursos

- Criar sala ou entrar por código/link (`/#/sala/CODIGO`).
- Até 32 participantes por sala.
- Início sincronizado quando pelo menos duas pessoas estão na sala e todos os participantes conectados marcam **Pronto**; contagem regressiva de 3 segundos.
- Dez níveis em sequência, com dificuldade progressiva.
- Empresa fictícia com departamentos, pastas, subpastas e documentos textuais simulados.
- Nomenclatura documental padronizada com data, setor, assunto, identificador, versão e status.
- Sem barra de pesquisa: a pessoa localiza o arquivo navegando pelas pastas.
- Ordenação por nome, tamanho e extensão, com inversão da ordem.
- Ao abrir o documento correto, o servidor registra o tempo e a posição; o ranking é atualizado em tempo real.
- QR Code para convite em **modo de apresentação em tela cheia**, adequado a projetores e monitores; no celular, a visualização ocupa a tela disponível.
- Acessibilidade: tamanho do texto, alto contraste, redução de animações, botões maiores e leitura do desafio em voz alta quando suportada pelo navegador.
- Os arquivos são objetos de texto fictícios, não uploads nem arquivos reais.

## Estrutura do projeto

**Atenção ao extrair o ZIP:** os arquivos do projeto ficam diretamente na raiz do repositório. A raiz deve mostrar `package.json`, `render.yaml`, `index.html`, `server/` e `src/`. Não deixe tudo dentro de uma subpasta `drive-hunt/` e não envie apenas o arquivo ZIP ao GitHub.

## Requisitos

- Node.js 20 ou superior
- npm

## Executar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. O Vite encaminha as conexões Socket.IO para o servidor Node local na porta 3000.

Para validar e compilar:

```bash
npm run check
npm run build
npm start
```

Em produção, abra `/health`. Uma instalação válida responde com JSON contendo `\"ok\": true` e `\"buildReady\": true`. Se o build não existir, a rota `/` agora mostra uma página explicando a configuração necessária em vez de retornar um 404 genérico.

## Publicar no Render

Este projeto é um **Web Service Node**, não um Static Site, porque o mesmo processo Node serve o frontend e mantém as conexões WebSocket do multiplayer.

1. Extraia o ZIP e envie **o conteúdo da pasta** para a raiz de um repositório GitHub. Confira se `package.json` está no nível principal do repositório.
2. No Render, selecione **New + → Web Service** (ou conecte o repositório pelo Blueprint, usando `render.yaml`).
3. Se estiver configurando manualmente, deixe **Root Directory** vazio quando os arquivos estiverem na raiz do repositório. Se optou por manter o projeto dentro de uma subpasta, informe exatamente essa subpasta em Root Directory.
4. Use:
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variable: `NODE_ENV=production`
5. Faça o deploy e abra primeiro `https://SEU-SERVICO.onrender.com/health`. Confirme `ok: true` e `buildReady: true`; depois abra a raiz `/`.

Se a página mostrar **O site ainda não foi compilado**, o servidor está acessível, mas o build não está no local esperado: corrija o Root Directory e confira os logs do comando de build. Se o próprio domínio mostrar o `Not Found` padrão do Render, confira se o serviço selecionado é **Web Service** e se o deploy está ativo, não Static Site ou uma URL antiga.

## Alternativa gratuita: Northflank

O projeto também pode ser publicado no Northflank usando o repositório GitHub como serviço Node.js. Na criação do serviço, escolha build a partir do repositório, deixe a raiz do projeto como diretório de trabalho e configure o build como `npm install && npm run build` e o start como `npm start`. Exponha a porta HTTP definida por `PORT`; a aplicação também usa essa mesma porta para Socket.IO/WebSockets.

O plano Developer Sandbox anuncia até 2 serviços, 1 banco de dados e até US$ 20/mês em recursos, com serviços sempre ativos (sem suspensão por inatividade). O uso permanece sujeito ao limite de recursos incluídos no Sandbox. O Northflank declara suporte a WebSockets em serviços públicos HTTP. Verifique os limites atuais da conta antes de uma apresentação com muitos participantes.

## Observação sobre o plano gratuito do Render

O Render pode suspender um Web Service Free após 15 minutos sem receber tráfego de entrada. Esta aplicação envia um heartbeat WebSocket a cada 2 minutos enquanto o jogador está em uma sala; desde a atualização de 24/02/2026, mensagens WebSocket recebidas contam como tráfego de entrada no Render. Assim, uma sala com participantes conectados tende a manter o serviço acordado. O Render ainda pode reiniciar a instância, e qualquer reinício derruba as conexões e apaga as salas em memória.

## Salas e persistência

As salas e os resultados ficam em memória no processo Node. Isso mantém o projeto simples e sem custo de banco de dados, mas significa que uma sala será perdida se a instância reiniciar, suspender ou receber um novo deploy. Use o jogo para sessões ao vivo e evite atualizar/reimplantar durante uma partida. Para histórico permanente, a próxima evolução recomendada é persistir os resultados em PostgreSQL.

## Privacidade e uso educativo

- A empresa NEXA Soluções Integradas e todos os documentos são fictícios.
- Use apelidos; não insira senhas, documentos reais nem dados pessoais dos participantes.

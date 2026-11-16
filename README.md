# Drive Hunt GED

Jogo multiplayer de navegador para praticar organização, classificação e localização de documentos digitais. Interface mobile-first inspirada na experiência de navegação do Google Drive, com salas por link/código, contagem regressiva sincronizada, cronômetro de servidor e leaderboard em tempo real.

## Recursos

- Criar uma sala ou entrar por código/link (`/#/sala/CODIGO`).
- Até 32 participantes por sala.
- Início sincronizado após pelo menos duas pessoas entrarem e todos marcarem **Pronto**; contagem regressiva de 3 segundos.
- Dez níveis em sequência, com dificuldade progressiva. A sala escolhe o nível inicial e avança após todos concluírem o nível atual.
- Estrutura corporativa fictícia com pastas, subpastas e centenas de documentos textuais simulados.
- Nomes padronizados com data, setor, tipo/assunto, identificador, versão e status.
- Sem pesquisa por texto. A localização é feita navegando pelas pastas.
- Ordenação por nome, tamanho ou extensão, com inversão crescente/decrescente.
- Ao abrir o arquivo correto, o servidor registra o tempo e a posição; o ranking é transmitido em tempo real.
- Opções de acessibilidade: tamanho do texto, alto contraste, redução de animações e botões ampliados. Há também leitura do desafio em voz alta quando o navegador oferece síntese de voz.
- Visualização de documentos apenas como texto fictício. Nenhum arquivo real é armazenado.

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

## Publicar no GitHub e Render

1. Crie um repositório no GitHub, por exemplo `drive-hunt-ged`.
2. Envie todo o conteúdo desta pasta para a raiz do repositório. Não envie `node_modules` nem `dist`.
3. No Render, escolha **New + → Blueprint** e conecte o repositório. O arquivo `render.yaml` configura o serviço automaticamente.
4. Alternativamente, crie um **Web Service** e use:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variable:** `NODE_ENV=production`
5. Aguarde o deploy e abra o endereço `https://...onrender.com`.

O frontend e o servidor Socket.IO são servidos pelo mesmo Web Service, portanto não é necessário configurar CORS, um banco de dados externo ou um segundo serviço.

## Observações sobre salas e plano gratuito

As salas e os resultados ficam em memória no processo Node. Isso mantém o projeto simples e sem custo de banco de dados, mas significa que uma sala será perdida se a instância reiniciar, dormir ou receber um novo deploy. Use o jogo para sessões ao vivo e evite atualizar/reimplantar durante uma partida.

No Render Free, serviços web podem dormir após 15 minutos sem tráfego de entrada. Mensagens WebSocket recebidas também contam como tráfego; os clientes nesta aplicação enviam um heartbeat enquanto estão em uma sala. Ao acordar, a primeira conexão pode demorar cerca de um minuto. Uma reinicialização ainda pode encerrar as conexões e apagar salas em andamento.

Para uma experiência persistente entre reinicializações, a próxima evolução recomendada é migrar o armazenamento de salas/resultados para PostgreSQL (por exemplo, Render Postgres ou Supabase) e usar um serviço sempre ativo para partidas importantes.

## Privacidade e uso educativo

- A empresa NEXA Soluções Integradas e todos os documentos são fictícios.
- Não solicite nem insira senhas, documentos reais ou dados pessoais dos participantes.
- Os arquivos são objetos de texto renderizados no navegador, não uploads nem documentos baixáveis.

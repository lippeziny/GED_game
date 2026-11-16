import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  ArrowDownWideNarrow, ArrowLeft, ArrowUpDown, ArrowUpWideNarrow, Bell, Check,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clipboard,
  Cloud, Contrast, File, FileArchive, FileAudio, FileImage, FileSpreadsheet,
  FileText, FileType, FileVideo, Folder, FolderOpen, HardDrive, Home, Info,
  ListFilter, LockKeyhole, LogOut, Maximize2, Medal, Menu, Mic, Minus, Plus,
  RefreshCw, ShieldCheck, SlidersHorizontal, Sparkles, Star, Timer, Trophy,
  Users, Volume2, X, Zap,
} from 'lucide-react';
import { LEVELS, ROOT_FOLDER, findFileById, formatBytes } from './data/gameData.js';

const PLAYER_KEY = 'drive-hunt-player-id';
const NAME_KEY = 'drive-hunt-player-name';

function getPlayerId() {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

function getRoomFromHash() {
  const match = window.location.hash.match(/\/sala\/([A-Z0-9]{4,8})/i);
  return match ? match[1].toUpperCase() : '';
}

function findNode(node, id) {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    if (child.id === id) return child;
    if (child.type === 'folder') {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

function sortItems(items, sortBy, direction) {
  const sign = direction === 'asc' ? 1 : -1;
  const folders = items.filter((item) => item.type === 'folder');
  const files = items.filter((item) => item.type === 'file');
  const compare = (a, b) => {
    if (sortBy === 'size') return ((a.size || 0) - (b.size || 0)) * sign;
    if (sortBy === 'extension') {
      const extensionCompare = (a.extension || '').localeCompare(b.extension || '', 'pt-BR');
      return (extensionCompare || a.name.localeCompare(b.name, 'pt-BR')) * sign;
    }
    return a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' }) * sign;
  };
  folders.sort(compare);
  files.sort(compare);
  return [...folders, ...files];
}

function formatDuration(ms = 0) {
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const centiseconds = Math.floor((safe % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function fileIcon(extension) {
  if (['xlsx', 'csv'].includes(extension)) return <FileSpreadsheet />;
  if (['jpg', 'jpeg', 'png'].includes(extension)) return <FileImage />;
  if (['ppt', 'pptx'].includes(extension)) return <FileType />;
  if (['zip', 'rar'].includes(extension)) return <FileArchive />;
  if (['mp3', 'wav'].includes(extension)) return <FileAudio />;
  if (['mp4', 'mov'].includes(extension)) return <FileVideo />;
  if (['pdf', 'docx', 'txt'].includes(extension)) return <FileText />;
  return <File />;
}

function fileTone(extension) {
  if (['xlsx', 'csv'].includes(extension)) return 'green';
  if (['ppt', 'pptx'].includes(extension)) return 'orange';
  if (['jpg', 'jpeg', 'png'].includes(extension)) return 'purple';
  if (extension === 'pdf') return 'red';
  return 'blue';
}

function emitAck(socket, eventName, payload) {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) {
      resolve({ ok: false, error: 'Conexão perdida. Aguarde reconectar e tente novamente.' });
      return;
    }
    socket.emit(eventName, payload, (response) => resolve(response || { ok: false, error: 'O servidor não respondeu.' }));
  });
}

function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [screen, setScreen] = useState(getRoomFromHash() ? 'join' : 'home');
  const [roomCode, setRoomCode] = useState(getRoomFromHash());
  const [room, setRoom] = useState(null);
  const [playerId] = useState(getPlayerId);
  const [name, setName] = useState(localStorage.getItem(NAME_KEY) || '');
  const [joinCode, setJoinCode] = useState(getRoomFromHash());
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [modalFile, setModalFile] = useState(null);
  const [winner, setWinner] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [direction, setDirection] = useState('asc');
  const [folderStack, setFolderStack] = useState(['root']);
  const [elapsed, setElapsed] = useState(0);
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeTargets, setLargeTargets] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);

  const activePlayer = room?.players?.find((player) => player.id === playerId);
  const isHost = room?.hostId === playerId;
  const level = room ? LEVELS.find((item) => item.level === room.level) || LEVELS[0] : null;
  const currentFolderId = folderStack[folderStack.length - 1];
  const currentFolder = useMemo(() => findNode(ROOT_FOLDER, currentFolderId) || ROOT_FOLDER, [currentFolderId]);
  const currentItems = useMemo(() => sortItems(currentFolder.children || [], sortBy, direction), [currentFolder, sortBy, direction]);
  const breadcrumbs = useMemo(() => {
    const nodes = [];
    let current = ROOT_FOLDER;
    nodes.push(current);
    for (const id of folderStack.slice(1)) {
      const next = findNode(current, id);
      if (next) {
        nodes.push(next);
        current = next;
      }
    }
    return nodes;
  }, [folderStack]);
  const leaderboard = useMemo(() => {
    if (!room) return [];
    return [...room.players].sort((a, b) => {
      if (a.elapsedMs == null && b.elapsedMs == null) return a.name.localeCompare(b.name, 'pt-BR');
      if (a.elapsedMs == null) return 1;
      if (b.elapsedMs == null) return -1;
      return a.elapsedMs - b.elapsedMs;
    });
  }, [room]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => setToast(''), 3400);
  }, []);

  useEffect(() => {
    const socket = io({ autoConnect: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('room:update', (nextRoom) => {
      setRoom((previous) => (previous?.code === nextRoom.code ? nextRoom : previous));
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const code = getRoomFromHash();
      if (code && !room) {
        setRoomCode(code);
        setJoinCode(code);
        setScreen('join');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [room]);

  useEffect(() => {
    if (!room?.code || !connected) return undefined;
    const heartbeat = window.setInterval(() => {
      socketRef.current?.emit('heartbeat', { roomCode: room.code });
    }, 120000);
    socketRef.current?.emit('heartbeat', { roomCode: room.code });
    return () => window.clearInterval(heartbeat);
  }, [room?.code, connected]);

  useEffect(() => {
    if (room?.status !== 'playing' || !room.startedAt) return undefined;
    const update = () => setElapsed(Date.now() - room.startedAt);
    update();
    const interval = window.setInterval(update, 80);
    return () => window.clearInterval(interval);
  }, [room?.status, room?.startedAt]);

  useEffect(() => {
    if (room?.status === 'lobby') {
      setFolderStack(['root']);
      setWinner(null);
      setModalFile(null);
    }
  }, [room?.level, room?.status]);

  const createRoom = async () => {
    if (name.trim().length < 2) return showToast('Digite seu nome para criar a sala.');
    setBusy(true);
    const response = await emitAck(socketRef.current, 'room:create', { name, playerId, level: selectedLevel });
    setBusy(false);
    if (!response.ok) return showToast(response.error);
    localStorage.setItem(NAME_KEY, name.trim());
    setRoom(response.room);
    setRoomCode(response.room.code);
    setScreen('room');
    window.location.hash = `/sala/${response.room.code}`;
  };

  const joinRoom = async () => {
    const code = (joinCode || roomCode).trim().toUpperCase();
    if (name.trim().length < 2) return showToast('Digite seu nome para entrar na sala.');
    if (code.length < 4) return showToast('Informe um código de sala válido.');
    setBusy(true);
    const response = await emitAck(socketRef.current, 'room:join', { roomCode: code, name, playerId });
    setBusy(false);
    if (!response.ok) return showToast(response.error);
    localStorage.setItem(NAME_KEY, name.trim());
    setRoom(response.room);
    setRoomCode(code);
    setScreen('room');
    window.location.hash = `/sala/${code}`;
  };

  const toggleReady = async () => {
    if (!room || !activePlayer) return;
    const response = await emitAck(socketRef.current, 'player:ready', {
      roomCode: room.code, playerId, ready: !activePlayer.ready,
    });
    if (!response.ok) showToast(response.error);
  };

  const copyInvite = async () => {
    if (!room) return;
    const link = `${window.location.origin}${window.location.pathname}#/sala/${room.code}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link da sala copiado. Envie para os participantes.');
    } catch {
      showToast(`Código da sala: ${room.code}`);
    }
  };

  const shareInvite = async () => {
    if (!room) return;
    const link = `${window.location.origin}${window.location.pathname}#/sala/${room.code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Drive Hunt GED', text: `Entre na minha sala ${room.code}`, url: link }); }
      catch { /* Compartilhamento cancelado pelo usuário. */ }
    } else {
      copyInvite();
    }
  };

  const leaveRoom = () => {
    if (room) socketRef.current?.emit('room:leave', { roomCode: room.code, playerId });
    setRoom(null);
    setRoomCode('');
    setJoinCode('');
    setScreen('home');
    setWinner(null);
    setModalFile(null);
    window.location.hash = '';
  };

  const openFolder = (folder) => {
    setFolderStack((previous) => [...previous, folder.id]);
    setMobileMenu(false);
  };

  const goToBreadcrumb = (index) => {
    setFolderStack((previous) => previous.slice(0, index + 1));
  };

  const openFile = async (file) => {
    const isTarget = file.name === room?.challenge?.targetFileName;
    if (isTarget) {
      const response = await emitAck(socketRef.current, 'file:found', { roomCode: room.code, playerId, fileId: file.id });
      if (!response.ok) {
        showToast(response.error);
        setModalFile(file);
        return;
      }
      setWinner({ elapsedMs: response.elapsedMs, place: response.place, totalPlayers: response.totalPlayers });
      setModalFile(null);
      return;
    }
    setModalFile(file);
  };

  const advanceLevel = async () => {
    const response = await emitAck(socketRef.current, 'room:next-level', { roomCode: room.code, playerId });
    if (!response.ok) showToast(response.error);
    else if (response.campaignComplete) showToast('Campanha de 10 níveis concluída!');
  };

  const startNewRoomFlow = () => {
    setRoom(null);
    setScreen('home');
    window.location.hash = '';
  };

  const readChallenge = () => {
    if (!room?.challenge || !('speechSynthesis' in window)) return showToast('Leitura em voz alta indisponível neste navegador.');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${room.challenge.title}. ${room.challenge.clue}. Arquivo solicitado: ${room.challenge.targetFileName}`);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
  };

  const rootClasses = [
    'app-shell',
    highContrast ? 'high-contrast' : '',
    reducedMotion ? 'reduce-motion' : '',
    largeTargets ? 'large-targets' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClasses} style={{ '--font-scale': fontScale }}>
      <header className="topbar">
        <div className="brand-lockup" onClick={startNewRoomFlow} role="button" tabIndex={0} aria-label="Voltar ao início">
          <div className="brand-icon"><HardDrive size={21} /></div>
          <div className="brand-copy"><strong>Drive Hunt</strong><span>GED Challenge</span></div>
        </div>
        <div className="topbar-center">
          <span className={`connection-dot ${connected ? 'online' : ''}`} />
          <span>{connected ? 'Conectado' : 'Reconectando...'}</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-button accessibility-trigger" onClick={() => setShowAccessibility((value) => !value)} aria-label="Abrir opções de acessibilidade" title="Acessibilidade">
            <SlidersHorizontal size={19} />
          </button>
          {room && <button className="room-pill" onClick={copyInvite}><Users size={15} /> {room.code}</button>}
        </div>
      </header>

      {showAccessibility && (
        <div className="accessibility-panel" role="dialog" aria-label="Acessibilidade">
          <div className="panel-head"><strong>Acessibilidade</strong><button className="tiny-icon" onClick={() => setShowAccessibility(false)} aria-label="Fechar acessibilidade"><X size={16} /></button></div>
          <div className="access-row"><span>Tamanho do texto</span><div className="access-controls">
            <button className="small-control" onClick={() => setFontScale((value) => Math.max(0.92, +(value - 0.08).toFixed(2)))} aria-label="Diminuir texto"><Minus size={16} /></button>
            <strong>{Math.round(fontScale * 100)}%</strong>
            <button className="small-control" onClick={() => setFontScale((value) => Math.min(1.32, +(value + 0.08).toFixed(2)))} aria-label="Aumentar texto"><Plus size={16} /></button>
          </div></div>
          <button className={`access-toggle ${highContrast ? 'selected' : ''}`} onClick={() => setHighContrast((value) => !value)}><Contrast size={17} /> Alto contraste <span>{highContrast ? 'Ativado' : 'Desativado'}</span></button>
          <button className={`access-toggle ${reducedMotion ? 'selected' : ''}`} onClick={() => setReducedMotion((value) => !value)}><Zap size={17} /> Reduzir animações <span>{reducedMotion ? 'Ativado' : 'Desativado'}</span></button>
          <button className={`access-toggle ${largeTargets ? 'selected' : ''}`} onClick={() => setLargeTargets((value) => !value)}><Maximize2 size={17} /> Botões ampliados <span>{largeTargets ? 'Ativado' : 'Desativado'}</span></button>
          <p className="access-note">Compatível com toque, teclado e leitores de tela.</p>
        </div>
      )}

      {!room && screen === 'home' && (
        <main className="home-screen">
          <section className="hero-panel">
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="hero-kicker"><Sparkles size={14} /> DESAFIO MULTIPLAYER DE GED</div>
            <div className="hero-symbol"><FolderOpen size={34} /><span className="symbol-spark">✦</span></div>
            <h1>Encontre o documento.<br /><em>Domine a organização.</em></h1>
            <p>Entre em uma sala, explore o arquivo digital de uma empresa fictícia e seja o primeiro a localizar o documento solicitado.</p>
            <div className="hero-stats">
              <div><strong>10</strong><span>níveis</span></div>
              <div><strong>0</strong><span>buscas prontas</span></div>
              <div><strong>∞</strong><span>pastas para explorar</span></div>
            </div>
          </section>

          <section className="entry-grid">
            <article className="entry-card create-card">
              <div className="entry-icon blue-icon"><Plus size={22} /></div>
              <div className="entry-heading"><h2>Criar sala</h2><p>Organize uma partida e convide seu grupo.</p></div>
              <label className="field-label" htmlFor="create-name">Seu nome</label>
              <input id="create-name" className="text-field" value={name} onChange={(event) => setName(event.target.value)} maxLength={22} placeholder="Como a turma vai te chamar?" autoComplete="nickname" />
              <label className="field-label" htmlFor="level-select">Nível inicial</label>
              <select id="level-select" className="text-field select-field" value={selectedLevel} onChange={(event) => setSelectedLevel(Number(event.target.value))}>
                {LEVELS.map((item) => <option key={item.level} value={item.level}>Nível {String(item.level).padStart(2, '0')} — {item.difficulty}</option>)}
              </select>
              <button className="primary-button full-button" onClick={createRoom} disabled={busy || !connected}>{busy ? 'Criando sala...' : 'Criar sala e gerar convite'} <ChevronRight size={18} /></button>
              <div className="microcopy"><LockKeyhole size={13} /> Sala privada por código. Até 32 participantes.</div>
            </article>

            <article className="entry-card join-card">
              <div className="entry-icon violet-icon"><Users size={22} /></div>
              <div className="entry-heading"><h2>Entrar em uma sala</h2><p>Já recebeu um código ou link? Acesse a partida.</p></div>
              <label className="field-label" htmlFor="join-name">Seu nome</label>
              <input id="join-name" className="text-field" value={name} onChange={(event) => setName(event.target.value)} maxLength={22} placeholder="Digite seu nome" autoComplete="nickname" />
              <label className="field-label" htmlFor="join-code">Código da sala</label>
              <input id="join-code" className="text-field code-field" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="EX.: 7KQ4MP" maxLength={8} autoCapitalize="characters" />
              <button className="secondary-button full-button" onClick={joinRoom} disabled={busy || !connected}>{busy ? 'Entrando...' : 'Entrar na sala'} <ArrowUpDown size={17} /></button>
              <div className="microcopy"><Clipboard size={13} /> O link compartilhado abre esta sala automaticamente.</div>
            </article>
          </section>

          <section className="how-strip">
            <div className="how-title"><span>COMO FUNCIONA</span><strong>Simples de entrar.<br />Difícil de dominar.</strong></div>
            <div className="how-step"><b>01</b><div><strong>Entre na sala</strong><span>Use o link ou o código enviado pelo organizador.</span></div></div>
            <div className="how-step"><b>02</b><div><strong>Fique pronto</strong><span>Quando todos confirmarem, a contagem começa.</span></div></div>
            <div className="how-step"><b>03</b><div><strong>Explore e encontre</strong><span>Navegue pelas pastas e abra o arquivo correto.</span></div></div>
          </section>
          <footer className="site-footer"><span>DRIVE HUNT GED</span><span>Uma simulação educativa de gestão documental • NEXA Soluções Integradas</span></footer>
        </main>
      )}

      {!room && screen === 'join' && (
        <main className="join-screen">
          <button className="back-link" onClick={() => { setScreen('home'); setRoomCode(''); setJoinCode(''); window.location.hash = ''; }}><ArrowLeft size={17} /> Voltar ao início</button>
          <section className="join-card-large">
            <div className="entry-icon violet-icon"><Users size={23} /></div>
            <div className="room-invite-label">CONVITE PARA PARTIDA</div>
            <h1>Você foi chamado<br />para uma sala.</h1>
            <p>Informe seu nome para entrar no arquivo da NEXA Soluções Integradas.</p>
            <div className="invite-code-box"><span>CÓDIGO DA SALA</span><strong>{joinCode || roomCode || '------'}</strong></div>
            <label className="field-label" htmlFor="invite-name">Seu nome</label>
            <input id="invite-name" className="text-field" value={name} onChange={(event) => setName(event.target.value)} maxLength={22} placeholder="Digite seu nome" autoComplete="nickname" />
            <button className="primary-button full-button" onClick={joinRoom} disabled={busy || !connected}>{busy ? 'Conectando...' : 'Entrar na sala'} <ChevronRight size={18} /></button>
            {!connected && <div className="connection-warning">Conectando ao servidor da sala...</div>}
          </section>
          <p className="privacy-note"><ShieldCheck size={14} /> Use apenas um apelido. Não informe senhas ou dados pessoais.</p>
        </main>
      )}

      {room && screen === 'room' && room.status === 'lobby' && (
        <main className="lobby-screen">
          <div className="lobby-toolbar"><button className="back-link" onClick={leaveRoom}><ArrowLeft size={17} /> Sair da sala</button><div className="room-status-chip"><span /> SALA ABERTA</div></div>
          <section className="lobby-main-card">
            <div className="lobby-overline">SALA DE DESAFIO <span>•</span> {room.code}</div>
            <h1>Prepare-se para<br /><em>caçar arquivos.</em></h1>
            <p>Compartilhe o convite. A rodada começa automaticamente quando pelo menos duas pessoas estiverem conectadas e todos marcarem “Pronto”.</p>
            <div className="invite-share-row"><div className="invite-code"><span>CÓDIGO</span><strong>{room.code}</strong></div><button className="secondary-button" onClick={copyInvite}><Clipboard size={17} /> Copiar link</button><button className="icon-button share-button" onClick={shareInvite} aria-label="Compartilhar convite"><Users size={18} /></button></div>
            <div className="selected-level-card">
              <div className={`level-number ${level?.color}`}>{String(room.level).padStart(2, '0')}</div>
              <div><span>NÍVEL INICIAL • {level?.difficulty?.toUpperCase()}</span><strong>{level?.title}</strong><small>A partida seguirá pelos níveis seguintes após todos concluírem.</small></div>
              <div className="level-progress"><span>{room.level}/10</span><div><i style={{ width: `${room.level * 10}%` }} /></div></div>
            </div>
            <div className="players-heading"><div><strong>Participantes</strong><span>{room.players.length}/32 na sala</span></div><button className="text-button" onClick={copyInvite}>+ Convidar</button></div>
            <div className="players-list">
              {room.players.map((player, index) => (
                <div className="player-row" key={player.id}>
                  <div className={`avatar avatar-${index % 5}`}>{player.name.slice(0, 1).toUpperCase()}</div>
                  <div className="player-info"><strong>{player.name} {player.id === room.hostId && <span className="host-tag">ORGANIZADOR</span>} {player.id === playerId && <span className="you-tag">VOCÊ</span>}</strong><span>{player.online ? 'Conectado' : 'Reconectando...'}</span></div>
                  <div className={`ready-label ${player.ready ? 'is-ready' : ''}`}>{player.ready ? <><CheckCircle2 size={15} /> Pronto</> : 'Aguardando'}</div>
                </div>
              ))}
              {room.players.length < 2 && <div className="waiting-note"><Users size={17} /> Aguardando pelo menos mais uma pessoa...</div>}
            </div>
            <button className={`ready-button ${activePlayer?.ready ? 'ready-active' : ''}`} onClick={toggleReady} disabled={!activePlayer || !connected}>
              {activePlayer?.ready ? <><Check size={19} /> Você está pronto</> : <>Estou pronto <CheckCircle2 size={19} /> </>}
            </button>
            <div className="lobby-footnote"><Info size={14} /> Quando todos estiverem prontos, uma contagem regressiva sincronizada de 3 segundos será iniciada.</div>
          </section>
        </main>
      )}

      {room && screen === 'room' && room.status === 'countdown' && (
        <main className="countdown-screen">
          <div className="countdown-card">
            <div className="countdown-kicker"><Users size={16} /> TODOS PRONTOS</div>
            <div className="count-number">{Math.max(1, Math.ceil(((room.countdownEndsAt || Date.now()) - Date.now()) / 1000))}</div>
            <h1>Prepare seu foco.</h1>
            <p>O arquivo da empresa será liberado em instantes.</p>
            <div className="countdown-progress"><i /></div>
            <span className="countdown-room">SALA {room.code} • NÍVEL {String(room.level).padStart(2, '0')}</span>
          </div>
        </main>
      )}

      {room && screen === 'room' && room.status === 'playing' && (
        <main className="game-screen">
          <section className="game-heading-row">
            <div className="game-heading-title"><div className="game-eyebrow">NEXA SOLUÇÕES INTEGRADAS <span>•</span> ARQUIVO CORPORATIVO</div><h1>Meu Drive <span className="drive-badge">SIMULAÇÃO</span></h1></div>
            <div className="game-metrics"><div className="timer-card"><Timer size={17} /><span>SEU TEMPO</span><strong>{formatDuration(elapsed)}</strong></div><div className="level-mini"><span>NÍVEL</span><strong>{String(room.level).padStart(2, '0')}<small>/10</small></strong></div></div>
          </section>

          <section className="challenge-card">
            <div className="challenge-icon"><Trophy size={20} /></div>
            <div className="challenge-copy"><div className="challenge-meta"><span>OBJETIVO DO NÍVEL {String(room.level).padStart(2, '0')}</span><span className={`difficulty-tag ${level?.color}`}>{level?.difficulty}</span></div><h2>{room.challenge?.title}</h2><p>{room.challenge?.clue}</p><div className="target-file"><FileText size={16} /><code>{room.challenge?.targetFileName}</code></div></div>
            <button className="read-challenge" onClick={readChallenge} aria-label="Ler desafio em voz alta" title="Ler desafio"><Volume2 size={18} /></button>
          </section>

          <div className="drive-layout">
            <section className="drive-main-panel">
              <div className="drive-toolbar">
                <div className="drive-location"><div className="drive-small-logo"><HardDrive size={17} /></div><div><strong>Meu Drive</strong><span>Arquivo digital da NEXA</span></div></div>
                <div className="drive-tools">
                  <label className="sort-label" htmlFor="sort-select"><ListFilter size={16} /> Ordenar</label>
                  <select id="sort-select" className="sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Ordenar arquivos por">
                    <option value="name">Nome</option><option value="size">Tamanho</option><option value="extension">Extensão</option>
                  </select>
                  <button className="sort-direction" onClick={() => setDirection((value) => value === 'asc' ? 'desc' : 'asc')} aria-label={`Inverter ordem atual: ${direction === 'asc' ? 'crescente' : 'decrescente'}`} title="Inverter ordem">
                    {direction === 'asc' ? <ArrowUpWideNarrow size={18} /> : <ArrowDownWideNarrow size={18} />}
                  </button>
                </div>
              </div>

              <div className="breadcrumbs" aria-label="Caminho da pasta">
                {breadcrumbs.map((crumb, index) => (
                  <div className="crumb-piece" key={crumb.id}>
                    {index > 0 && <ChevronRight size={14} />}
                    <button onClick={() => goToBreadcrumb(index)} className={index === breadcrumbs.length - 1 ? 'current-crumb' : ''}>{index === 0 ? 'Meu Drive' : crumb.name}</button>
                  </div>
                ))}
              </div>

              <div className="list-header"><span>Nome <button className="header-sort" onClick={() => { setSortBy('name'); setDirection((value) => value === 'asc' ? 'desc' : 'asc'); }} aria-label="Ordenar por nome"><ArrowUpDown size={13} /></button></span><span className="hide-mobile">Última modificação</span><span className="size-col">Tamanho</span><span className="type-col">Tipo</span></div>
              <div className="file-list" aria-live="polite">
                {currentItems.map((item) => (
                  <button className={`file-row ${item.type === 'folder' ? 'folder-row' : ''}`} key={item.id} onClick={() => item.type === 'folder' ? openFolder(item) : openFile(item)}>
                    <span className={`file-type-icon ${item.type === 'folder' ? 'folder-tone' : `file-tone-${fileTone(item.extension)}`}`}>{item.type === 'folder' ? <Folder size={21} fill="currentColor" /> : fileIcon(item.extension)}</span>
                    <span className="file-name-cell"><strong title={item.name}>{item.name}</strong><small>{item.type === 'folder' ? `${item.children?.length || 0} itens` : item.extension.toUpperCase()}</small></span>
                    <span className="file-date hide-mobile">{item.type === 'folder' ? '—' : item.modifiedAt.split('-').reverse().join('/')}</span>
                    <span className="file-size">{item.type === 'folder' ? '—' : formatBytes(item.size)}</span>
                    <span className="file-extension type-col">{item.type === 'folder' ? 'Pasta' : item.extension.toUpperCase()}</span>
                  </button>
                ))}
                {currentItems.length === 0 && <div className="empty-folder"><FolderOpen size={26} /><strong>Esta pasta está vazia</strong><span>Volte para a pasta anterior.</span></div>}
              </div>
              <div className="drive-footer"><span>{currentItems.filter((item) => item.type === 'folder').length} pastas • {currentItems.filter((item) => item.type === 'file').length} arquivos</span><span><LockKeyhole size={13} /> Documentos simulados</span></div>
            </section>

            <aside className="leaderboard-panel">
              <div className="leaderboard-head"><div><div className="panel-eyebrow">AO VIVO</div><h3><Trophy size={17} /> Classificação</h3></div><span className="live-indicator"><i /> LIVE</span></div>
              <div className="leaderboard-subtitle">Nível {String(room.level).padStart(2, '0')} • {room.players.filter((player) => player.elapsedMs != null).length}/{room.players.length} concluíram</div>
              <div className="leaderboard-list">
                {leaderboard.map((player, index) => (
                  <div className={`leader-row ${player.id === playerId ? 'self-row' : ''} ${player.elapsedMs != null ? 'finished-row' : ''}`} key={player.id}>
                    <div className={`rank-medal rank-${index + 1}`}>{player.elapsedMs != null ? (index === 0 ? <Medal size={17} /> : String(index + 1)) : '—'}</div>
                    <div className="leader-name"><strong>{player.name} {player.id === playerId && <small>VOCÊ</small>}</strong><span>{player.elapsedMs != null ? 'Documento encontrado' : player.online ? 'Em busca...' : 'Desconectado'}</span></div>
                    <div className="leader-time">{player.elapsedMs != null ? formatDuration(player.elapsedMs) : '—:—'}</div>
                  </div>
                ))}
              </div>
              <div className="leaderboard-bottom"><Users size={14} /> O ranking é atualizado assim que alguém encontra o documento.</div>
            </aside>
          </div>
          <div className="game-bottom-mobile"><span><Timer size={15} /> {formatDuration(elapsed)}</span><button onClick={() => setShowLeaderboard((value) => !value)}><Trophy size={15} /> {showLeaderboard ? 'Ocultar ranking' : 'Ver ranking'}</button></div>
          {showLeaderboard && <div className="mobile-leaderboard">{leaderboard.map((player, index) => <div key={player.id}><b>{player.elapsedMs != null ? `${index + 1}º` : '—'}</b><span>{player.name}</span><strong>{player.elapsedMs != null ? formatDuration(player.elapsedMs) : 'Em busca'}</strong></div>)}</div>}
        </main>
      )}

      {room && screen === 'room' && room.status === 'completed' && (
        <main className="results-screen">
          <div className="results-hero"><div className="results-trophy"><Trophy size={30} /></div><div className="results-kicker">NÍVEL {String(room.level).padStart(2, '0')} CONCLUÍDO</div><h1>{room.level === 10 ? 'Arquivo dominado.' : 'Missão cumprida.'}</h1><p>{room.level === 10 ? 'O grupo concluiu os 10 níveis de gestão documental.' : 'Todos encontraram o documento solicitado. Confira os tempos da equipe.'}</p></div>
          <section className="results-board"><div className="results-board-title"><div><span>RESULTADO DA RODADA</span><h2><Trophy size={19} /> Classificação final</h2></div><span className="level-complete">{room.level}/10</span></div>
            {leaderboard.map((player, index) => <div className={`result-row ${player.id === playerId ? 'self-row' : ''}`} key={player.id}><div className={`result-rank rank-${index + 1}`}>{index === 0 ? <Medal size={19} /> : `${index + 1}º`}</div><div className={`avatar avatar-${index % 5}`}>{player.name.slice(0, 1).toUpperCase()}</div><div className="result-player"><strong>{player.name} {player.id === playerId && <small>VOCÊ</small>}</strong><span>{player.elapsedMs == null ? (player.online ? 'Não concluiu' : 'Desconectado') : (index === 0 ? 'Mais rápido da rodada' : 'Documento localizado')}</span></div><strong className="result-time">{player.elapsedMs == null ? '—:—' : formatDuration(player.elapsedMs)}</strong></div>)}
            <div className="results-actions">{isHost && room.level < 10 && <button className="primary-button" onClick={advanceLevel}>Avançar para o nível {room.level + 1} <ChevronRight size={18} /></button>}{isHost && room.level === 10 && <div className="campaign-complete"><CheckCircle2 size={18} /> Campanha concluída com sucesso.</div>}<button className="secondary-button" onClick={copyInvite}><Clipboard size={16} /> Copiar convite</button></div>
            {!isHost && room.level < 10 && <p className="waiting-host"><Timer size={14} /> Aguardando o organizador avançar para o próximo nível.</p>}
          </section>
          <button className="back-link results-exit" onClick={leaveRoom}><LogOut size={16} /> Sair da sala</button>
        </main>
      )}

      {modalFile && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalFile(null); }}>
          <section className="document-modal" role="dialog" aria-modal="true" aria-label="Visualização do documento">
            <div className="modal-top"><div><span className={`modal-file-icon file-tone-${fileTone(modalFile.extension)}`}>{fileIcon(modalFile.extension)}</span><div><strong>Visualização de documento</strong><span>{modalFile.extension.toUpperCase()} • Documento simulado</span></div></div><button className="tiny-icon" onClick={() => setModalFile(null)} aria-label="Fechar documento"><X size={19} /></button></div>
            <div className="document-preview"><div className="document-brand"><span>NEXA</span><small>SOLUÇÕES INTEGRADAS</small></div><h2>{modalFile.name}</h2><div className="document-meta"><span>Data: {modalFile.modifiedAt.split('-').reverse().join('/')}</span><span>Tamanho: {formatBytes(modalFile.size)}</span><span>Extensão: .{modalFile.extension}</span></div><div className="document-line" /><p>{modalFile.content}</p><div className="document-stamp"><ShieldCheck size={15} /> ARQUIVO FICTÍCIO • USO EDUCACIONAL</div></div>
            <div className="modal-footer"><span><Info size={14} /> Este documento não é um arquivo real.</span><button className="secondary-button" onClick={() => setModalFile(null)}>Fechar visualização</button></div>
          </section>
        </div>
      )}

      {winner && (
        <div className="modal-backdrop success-backdrop">
          <section className="success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
            <div className="success-confetti">✦</div><div className="success-check"><Check size={31} /></div>
            <div className="success-kicker">DOCUMENTO CORRETO</div><h2 id="success-title">Parabéns, {name.split(' ')[0]}!</h2><p>Você encontrou o documento solicitado.</p>
            <div className="success-stats"><div><span>SEU TEMPO</span><strong>{formatDuration(winner.elapsedMs)}</strong></div><div><span>SUA POSIÇÃO</span><strong>{winner.place}º <small>de {winner.totalPlayers}</small></strong></div></div>
            <div className="success-live-note"><Trophy size={15} /> A classificação continua sendo atualizada para todos.</div>
            <button className="primary-button full-button" onClick={() => setWinner(null)}>Ver sala e classificação <ChevronRight size={17} /></button>
          </section>
        </div>
      )}

      {toast && <div className="toast-message" role="status"><Bell size={16} /> {toast}</div>}
    </div>
  );
}

export default App;

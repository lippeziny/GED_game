// Persistência em arquivo JSON (escrita atômica). Adequada a disco persistente ou execução local.
import fs from 'node:fs';
import path from 'node:path';

export class FileStore {
  constructor(dir, { debounceMs = 500, log = console } = {}) {
    this.dir = dir; this.file = path.join(dir, 'rooms.json'); this.debounceMs = debounceMs; this.log = log;
    this.timer = null; this.getData = null; this.writing = false;
    try { fs.mkdirSync(dir, { recursive: true }); this.ok = true; } catch (e) { this.ok = false; this.log.error('Persistência desativada (sem acesso ao diretório):', e.message); }
  }
  load() {
    if (!this.ok || !fs.existsSync(this.file)) return [];
    try { const d = JSON.parse(fs.readFileSync(this.file, 'utf8')); return Array.isArray(d.rooms) ? d.rooms : []; }
    catch (e) { this.log.error('Arquivo de persistência ilegível; iniciando vazio:', e.message); return []; }
  }
  schedule(getData) {
    this.getData = getData;
    if (!this.ok || this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, this.debounceMs);
    this.timer.unref?.();
  }
  flush() {
    if (!this.ok || !this.getData) return;
    try {
      const tmp = `${this.file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ version: 1, savedAt: Date.now(), rooms: this.getData() }));
      fs.renameSync(tmp, this.file);
    } catch (e) { this.log.error('Falha ao salvar sessões:', e.message); }
  }
}

export class NullStore { load() { return []; } schedule() {} flush() {} }

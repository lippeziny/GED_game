// Limitadores simples em memória (token bucket / janela deslizante).
export class Bucket {
  constructor(capacity, windowMs) { this.capacity = capacity; this.windowMs = windowMs; this.hits = []; }
  take(now = Date.now()) {
    this.hits = this.hits.filter((t) => now - t < this.windowMs);
    if (this.hits.length >= this.capacity) return false;
    this.hits.push(now); return true;
  }
  full(now = Date.now()) { this.hits = this.hits.filter((t) => now - t < this.windowMs); return this.hits.length >= this.capacity; }
}

export class KeyedLimiter {
  constructor(capacity, windowMs) { this.capacity = capacity; this.windowMs = windowMs; this.map = new Map(); }
  _b(key) { let b = this.map.get(key); if (!b) { b = new Bucket(this.capacity, this.windowMs); this.map.set(key, b); } return b; }
  take(key, now) { return this._b(key).take(now); }
  blocked(key, now) { return this._b(key).full(now); }
  sweep(now = Date.now()) { for (const [k, b] of this.map) { b.hits = b.hits.filter((t) => now - t < this.windowMs); if (!b.hits.length) this.map.delete(k); } }
}

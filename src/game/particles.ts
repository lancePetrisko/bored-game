/** Fixed-size particle pool: no allocation after startup, no per-frame garbage. */

export const POOL_SIZE = 600;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  drag: number;
}

export interface ParticlePool {
  items: Particle[];
  /** Round-robin cursor; emitting past capacity overwrites the oldest. */
  next: number;
}

export function createPool(): ParticlePool {
  const items: Particle[] = new Array(POOL_SIZE);
  for (let i = 0; i < POOL_SIZE; i++) {
    items[i] = { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 0, hue: 0, drag: 3 };
  }
  return { items, next: 0 };
}

export interface EmitOptions {
  x: number;
  y: number;
  count: number;
  /** Direction the spray points, in radians. Omit for a full radial burst. */
  angle?: number;
  spread?: number;
  speed: number;
  speedVar?: number;
  life: number;
  size: number;
  hue: number;
  hueVar?: number;
  drag?: number;
}

export function emit(pool: ParticlePool, o: EmitOptions): void {
  const spread = o.spread ?? Math.PI * 2;
  const speedVar = o.speedVar ?? 0.5;
  const hueVar = o.hueVar ?? 20;
  const drag = o.drag ?? 3;

  for (let i = 0; i < o.count; i++) {
    const p = pool.items[pool.next];
    pool.next = (pool.next + 1) % POOL_SIZE;

    const base = o.angle ?? 0;
    const a = o.angle === undefined
      ? Math.random() * Math.PI * 2
      : base + (Math.random() - 0.5) * spread;
    const speed = o.speed * (1 + (Math.random() - 0.5) * 2 * speedVar);

    p.x = o.x;
    p.y = o.y;
    p.vx = Math.cos(a) * speed;
    p.vy = Math.sin(a) * speed;
    p.maxLife = o.life * (0.7 + Math.random() * 0.6);
    p.life = p.maxLife;
    p.size = o.size * (0.6 + Math.random() * 0.8);
    p.hue = o.hue + (Math.random() - 0.5) * 2 * hueVar;
    p.drag = drag;
  }
}

export function updateParticles(pool: ParticlePool, dt: number): void {
  for (let i = 0; i < POOL_SIZE; i++) {
    const p = pool.items[i];
    if (p.life <= 0) continue;
    p.life -= dt;
    const damp = Math.exp(-p.drag * dt);
    p.vx *= damp;
    p.vy *= damp;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

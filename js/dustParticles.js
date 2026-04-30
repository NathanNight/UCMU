const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

function rand(min, max){ return min + Math.random() * (max - min); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function makeParticle(w, h){
  const depth = Math.random();
  return {
    x: rand(-40, w + 40),
    y: rand(-40, h + 40),
    r: rand(0.18, 0.72),
    vx: rand(-0.008, 0.014) * (0.7 + depth * 0.4),
    vy: rand(-0.007, 0.012) * (0.7 + depth * 0.4),
    drift: rand(0.00025, 0.0011),
    phase: rand(0, Math.PI * 2),
    twinkle: rand(0.0012, 0.0042),
    alpha: rand(0.006, 0.028),
    hue: rand(185, 225),
    depth
  };
}

export function initDustParticles(){
  if(prefersReduced) return;
  if(document.getElementById('ucmuDustCanvas')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'ucmuDustCanvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = [
    'position:fixed',
    'inset:0',
    'width:100vw',
    'height:100vh',
    'z-index:0',
    'pointer-events:none',
    'opacity:.52',
    'mix-blend-mode:screen'
  ].join(';');
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });
  let w = 0, h = 0, dpr = 1, particles = [], raf = 0, last = performance.now();

  function resize(){
    dpr = clamp(window.devicePixelRatio || 1, 1, 1.75);
    w = Math.max(1, window.innerWidth);
    h = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = clamp(Math.round((w * h) / 16500), 34, 88);
    particles = Array.from({ length: count }, () => makeParticle(w, h));
  }

  function drawLightBeams(t){
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g1 = ctx.createLinearGradient(w * 0.16, 0, w * 0.9, h);
    g1.addColorStop(0, 'rgba(255,255,255,0)');
    g1.addColorStop(0.5, 'rgba(210,235,255,.008)');
    g1.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g1;
    ctx.translate(Math.sin(t * 0.00006) * 10, 0);
    ctx.rotate(-0.12);
    ctx.fillRect(w * 0.22, -80, w * 0.11, h + 180);
    ctx.restore();
  }

  function tick(now){
    const dt = clamp((now - last) / 16.666, 0.35, 2.2);
    last = now;
    ctx.clearRect(0, 0, w, h);
    drawLightBeams(now);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for(const p of particles){
      p.phase += p.twinkle * dt;
      p.x += (p.vx + Math.sin(p.phase * 0.43) * p.drift) * dt;
      p.y += (p.vy + Math.cos(p.phase * 0.35) * p.drift) * dt;

      if(p.x > w + 55) p.x = -55;
      if(p.x < -55) p.x = w + 55;
      if(p.y > h + 55) p.y = -55;
      if(p.y < -55) p.y = h + 55;

      const sparkle = Math.pow(Math.max(0, Math.sin(p.phase)), 14);
      const hue = p.hue + Math.sin(p.phase * 0.19) * 14 + sparkle * 18;
      const alpha = p.alpha + sparkle * 0.045;
      const core = Math.min(1, p.r * (0.75 + sparkle * 0.45));
      const glow = core * (4.8 + sparkle * 1.8);

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
      grad.addColorStop(0, `hsla(${hue}, 70%, 88%, ${alpha})`);
      grad.addColorStop(0.16, `hsla(${hue + 8}, 65%, 78%, ${alpha * 0.26})`);
      grad.addColorStop(0.42, `hsla(${hue + 12}, 60%, 72%, ${alpha * 0.08})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    raf = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  raf = requestAnimationFrame(tick);

  window.UCMUDust = {
    stop(){ cancelAnimationFrame(raf); canvas.remove(); },
    restart(){ resize(); last = performance.now(); raf = requestAnimationFrame(tick); }
  };
}

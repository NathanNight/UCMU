const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

function rand(min, max){ return min + Math.random() * (max - min); }
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function makeParticle(w, h){
  const depth = Math.random();
  return {
    x: rand(-40, w + 40),
    y: rand(-40, h + 40),
    r: rand(.45, 1.9) * (0.55 + depth),
    vx: rand(-0.018, 0.035) * (0.55 + depth),
    vy: rand(-0.015, 0.028) * (0.55 + depth),
    drift: rand(0.0008, 0.0032),
    phase: rand(0, Math.PI * 2),
    twinkle: rand(0.004, 0.018),
    alpha: rand(0.018, 0.105),
    hue: rand(170, 225),
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
    'opacity:.72',
    'mix-blend-mode:screen'
  ].join(';');
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d', {alpha:true});
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
    const count = clamp(Math.round((w * h) / 13500), 42, 120);
    particles = Array.from({length: count}, () => makeParticle(w, h));
  }

  function drawLightBeams(t){
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g1 = ctx.createLinearGradient(w * .18, 0, w * .88, h);
    g1.addColorStop(0, 'rgba(255,255,255,0)');
    g1.addColorStop(.48, 'rgba(210,235,255,.018)');
    g1.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g1;
    ctx.translate(Math.sin(t * .00012) * 18, 0);
    ctx.rotate(-0.13);
    ctx.fillRect(w * .18, -80, w * .16, h + 180);
    ctx.fillRect(w * .62, -120, w * .10, h + 220);
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
      p.x += (p.vx + Math.sin(p.phase * .41) * p.drift) * dt;
      p.y += (p.vy + Math.cos(p.phase * .37) * p.drift) * dt;

      if(p.x > w + 55) p.x = -55;
      if(p.x < -55) p.x = w + 55;
      if(p.y > h + 55) p.y = -55;
      if(p.y < -55) p.y = h + 55;

      const sparkle = Math.pow(Math.max(0, Math.sin(p.phase)), 9);
      const hue = p.hue + Math.sin(p.phase * .23) * 38 + sparkle * 55;
      const alpha = p.alpha + sparkle * .28;
      const radius = p.r * (1 + sparkle * 1.9);

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 5.2);
      grad.addColorStop(0, `hsla(${hue}, 82%, 86%, ${alpha})`);
      grad.addColorStop(.28, `hsla(${hue + 18}, 82%, 70%, ${alpha * .28})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 5.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    raf = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize, {passive:true});
  raf = requestAnimationFrame(tick);

  window.UCMUDust = {
    stop(){ cancelAnimationFrame(raf); canvas.remove(); },
    restart(){ resize(); last = performance.now(); raf = requestAnimationFrame(tick); }
  };
}

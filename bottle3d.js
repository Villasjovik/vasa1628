/**
 * bottle3d.js — premium 2D-billboard of the real vasa.png photo.
 * Uses the brand's authentic product shot (brand-accurate, always).
 * Adds: soft float, micro-tilt, ambient glow, elliptical ground shadow.
 * Shadow level is calibrated to align with the Villa Sjövik logo baseline
 * (logo container ~330 tall, bottle container ~500 tall → shadow 85px
 * above bottle bottom so both brand marks sit on the same visual ground).
 */

function initBottle(container) {
  const imgPath = container.dataset.img;
  const rawNudgeX = parseFloat(container.dataset.nudgeX || '0');
  const hasSparks = container.dataset.sparks !== 'false';

  // Mobile stacks logo above bottle vertically → nudgeX pushes bottle off-center.
  // On narrow viewports apply a small constant left-bias so the bottle reads as
  // centered (the photo content itself sits ~0.3% right of PNG center).
  const IS_MOBILE = window.matchMedia('(max-width:768px)').matches;
  const nudgeX = IS_MOBILE ? -4 : rawNudgeX;
  const floatAmp = IS_MOBILE ? 0.45 : 1;

  // Shadow sits shadowOffset px above container bottom to align with the
  // Villa Sjövik logo baseline on desktop. On small containers (mobile) we
  // scale it down so the image isn't crushed.
  const cH = container.clientHeight || 500;
  const defaultOffset = cH > 320 ? 85 : Math.round(cH * 0.12);
  const shadowOffset = parseFloat(container.dataset.shadowOffset || defaultOffset);

  // Reset container
  container.innerHTML = '';
  container.style.position = 'relative';
  container.style.perspective = '1400px';
  container.style.overflow = 'visible';

  // Inner wrapper — receives float + tilt. Bottom reserved for shadow so the
  // photo sits on the same visual ground plane as the Villa Sjövik logo.
  const stage = document.createElement('div');
  stage.className = 'b-stage';
  Object.assign(stage.style, {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '0',
    bottom: `${shadowOffset}px`,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    willChange: 'transform',
    transformStyle: 'preserve-3d',
    transformOrigin: '50% 90%'
  });
  container.appendChild(stage);

  // Bottle image — fills stage height, object-fit contain
  const img = document.createElement('img');
  img.src = imgPath;
  img.alt = 'Vasa 1628';
  img.draggable = false;
  Object.assign(img.style, {
    width: 'auto',
    height: '100%',
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
    objectPosition: 'bottom center',
    filter: [
      'drop-shadow(0 22px 44px rgba(0,0,0,.55))',
      'drop-shadow(0 6px 16px rgba(0,0,0,.38))',
      'drop-shadow(0 0 30px rgba(212,168,75,.08))'
    ].join(' '),
    userSelect: 'none',
    pointerEvents: 'none'
  });
  stage.appendChild(img);

  // Elliptical ground shadow sits directly under the image bottom —
  // centered at shadowOffset px above container bottom = Villa Sjövik logo baseline.
  const shadow = document.createElement('div');
  shadow.className = 'b-shadow';
  Object.assign(shadow.style, {
    position: 'absolute',
    left: '50%',
    bottom: `${shadowOffset - 18}px`,
    width: '68%',
    height: '36px',
    transform: 'translateX(-50%) translateZ(-20px)',
    background: 'radial-gradient(ellipse 50% 100% at 50% 50%, rgba(0,0,0,.62), rgba(0,0,0,.28) 42%, transparent 72%)',
    filter: 'blur(7px)',
    pointerEvents: 'none',
    willChange: 'transform,opacity'
  });
  container.appendChild(shadow);

  // Soft amber glow halo behind bottle (matches logo aura)
  const halo = document.createElement('div');
  Object.assign(halo.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '72%',
    height: '72%',
    transform: 'translate(-50%,-50%)',
    background: 'radial-gradient(ellipse at 50% 50%, rgba(212,168,75,.12), rgba(212,168,75,.05) 45%, transparent 70%)',
    pointerEvents: 'none',
    filter: 'blur(12px)'
  });
  container.insertBefore(halo, stage);

  // Gold sparks (optional)
  let sparks = [];
  if (hasSparks) {
    const sparkLayer = document.createElement('div');
    Object.assign(sparkLayer.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      overflow: 'hidden'
    });
    container.appendChild(sparkLayer);

    for (let i = 0; i < 10; i++) {
      const s = document.createElement('div');
      Object.assign(s.style, {
        position: 'absolute',
        width: '3px',
        height: '3px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(236,198,122,.85), rgba(212,168,75,.35) 60%, transparent)',
        opacity: '0',
        willChange: 'transform,opacity'
      });
      sparkLayer.appendChild(s);
      sparks.push({
        el: s,
        age: 999,
        life: 0,
        x: 0, y: 0, dx: 0, dy: 0
      });
    }
  }

  // Animation loop — premium float + micro-tilt
  let t0 = performance.now();
  let sparkTimer = 0;

  function frame(now) {
    const t = (now - t0) / 1000;

    // Float & micro-tilt — same timing family as Villa Sjövik float-spin
    const floatY = Math.sin(t * 0.55) * 10 + Math.sin(t * 1.4) * 2;
    const floatX = (Math.sin(t * 0.35) * 4 + Math.sin(t * 0.8) * 1.2) * floatAmp + nudgeX;
    const tiltY = Math.sin(t * 0.47) * 3.5;   // subtle left/right tilt in degrees
    const tiltZ = Math.sin(t * 0.31) * 1.4;   // tiny sway
    const breatheScale = 1 + Math.sin(t * 0.9) * 0.012;

    stage.style.transform =
      `translate(${floatX}px, ${floatY}px) ` +
      `rotateY(${tiltY}deg) ` +
      `rotateZ(${tiltZ}deg) ` +
      `scale(${breatheScale})`;

    // Shadow responds inversely to float — higher bottle → softer, smaller shadow
    const floatNorm = (floatY + 10) / 20;
    const shadowScale = 1.3 - Math.max(0, Math.min(1, floatNorm)) * 0.4;
    const shadowOpacity = 0.9 - Math.max(0, Math.min(1, floatNorm)) * 0.4;
    shadow.style.transform = `translateX(calc(-50% + ${floatX * 0.4}px)) scale(${shadowScale}, 1)`;
    shadow.style.opacity = shadowOpacity.toFixed(2);

    // Sparks
    if (sparks.length) {
      const dt = 1 / 60;
      sparkTimer += dt;
      const rect = container.getBoundingClientRect();
      if (sparkTimer > 1.5 + Math.random() * 2) {
        sparkTimer = 0;
        let toSpawn = 1 + Math.floor(Math.random() * 2);
        for (const s of sparks) {
          if (toSpawn <= 0) break;
          if (s.age >= s.life) {
            s.x = (Math.random() - 0.5) * rect.width * 0.7;
            s.y = rect.height * 0.35 + Math.random() * rect.height * 0.4;
            s.dx = (Math.random() - 0.5) * 18;
            s.dy = -(10 + Math.random() * 25);
            s.life = 1.4 + Math.random() * 1.6;
            s.age = 0;
            toSpawn--;
          }
        }
      }
      for (const s of sparks) {
        if (s.age < s.life) {
          s.age += dt;
          const p = s.age / s.life;
          const alpha = (p < 0.12 ? p / 0.12 : 1 - Math.pow((p - 0.12) / 0.88, 2)) * 0.75;
          s.x += s.dx * dt;
          s.y += s.dy * dt;
          s.el.style.transform = `translate(calc(${s.x}px + 50% - 1.5px), ${s.y}px)`;
          s.el.style.opacity = alpha.toFixed(2);
        } else {
          s.el.style.opacity = '0';
        }
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

document.querySelectorAll('.bottle-3d').forEach(initBottle);

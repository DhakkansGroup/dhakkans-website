/**
 * Dhakkan's Treks & Tours - Single Page Maintenance Script
 * Features: Starfield Canvas with Shooting Stars & Constellation Lines, 3D Tilt
 */

document.addEventListener('DOMContentLoaded', () => {
  initStarCanvas();
  initTilt();
});

/* ==========================================================================
   1. INTERACTIVE STARFIELD & SHOOTING STARS CANVAS
   ========================================================================== */
function initStarCanvas() {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let stars = [];
  let shootingStars = [];
  let mouse = { x: null, y: null, radius: 140 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createStars();
  }

  function createStars() {
    stars = [];
    const count = Math.floor((width * height) / 3800);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.3,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: (Math.random() * 0.02 + 0.006) * (Math.random() > 0.5 ? 1 : -1),
        color: Math.random() > 0.8 ? '#f59e0b' : (Math.random() > 0.65 ? '#38bdf8' : '#ffffff'),
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06
      });
    }
  }

  function addShootingStar() {
    if (shootingStars.length < 2 && Math.random() < 0.018) {
      shootingStars.push({
        x: Math.random() * width * 0.8,
        y: Math.random() * (height * 0.4),
        length: Math.random() * 90 + 40,
        speed: Math.random() * 7 + 8,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  resize();

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Render stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.alpha += s.twinkleSpeed;
      if (s.alpha > 1 || s.alpha < 0.15) {
        s.twinkleSpeed = -s.twinkleSpeed;
      }

      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = width;
      if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;
      if (s.y > height) s.y = 0;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
      ctx.fill();

      // Connect stars near mouse pointer
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - s.x;
        const dy = mouse.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = 'rgba(245, 158, 11, ' + (1 - dist / mouse.radius) * 0.3 + ')';
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    // Render shooting stars
    addShootingStar();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      const endX = ss.x + Math.cos(ss.angle) * ss.length;
      const endY = ss.y + Math.sin(ss.angle) * ss.length;

      const grad = ctx.createLinearGradient(ss.x, ss.y, endX, endY);
      grad.addColorStop(0, 'rgba(255, 255, 255, ' + ss.alpha + ')');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0)');

      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.alpha -= ss.decay;

      if (ss.alpha <= 0 || ss.x > width || ss.y > height) {
        shootingStars.splice(i, 1);
      }
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================================================
   2. SUBTLE 3D TILT EFFECT ON LOGO
   ========================================================================== */
function initTilt() {
  const logoWrapper = document.querySelector('.compass-logo-wrapper');
  if (!logoWrapper) return;

  window.addEventListener('mousemove', (e) => {
    const x = (window.innerWidth / 2 - e.clientX) / 45;
    const y = (window.innerHeight / 2 - e.clientY) / 45;
    logoWrapper.style.transform = `perspective(800px) rotateY(${-x}deg) rotateX(${y}deg)`;
  });
}

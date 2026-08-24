// Interactive hero wave field: a grid of vertical SVG lines displaced by 2D gradient noise,
// with a spring-damped push away from the cursor. Ported from the original React component.

// Builds a seeded 2D gradient (Perlin) noise function, replacing the simplex-noise
// dependency so the page stays self-contained and works offline.
function makeNoise2D(seed){
  seed = seed || 1;
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for(let i=0;i<256;i++) p[i]=i;
  let s = seed * 9301 + 49297;

  // Deterministic LCG, so the field looks the same on every load.
  function rand(){ s = (s*9301+49297)%233280; return s/233280; }

  for(let i=255;i>0;i--){
    const j = Math.floor(rand()*(i+1));
    const tmp = p[i]; p[i]=p[j]; p[j]=tmp;
  }
  for(let i=0;i<512;i++) perm[i]=p[i&255];

  // Quintic smoothstep - eases each cell boundary so the noise has no visible grid seams.
  function fade(t){return t*t*t*(t*(t*6-15)+10);}

  // Linear interpolation between a and b.
  function lerp(a,b,t){return a+t*(b-a);}

  // Dot product against one of four fixed gradient directions chosen by the hash.
  function grad(hash,x,y){
    const h = hash & 3;
    const u = h<2 ? x : y;
    const v = h<2 ? y : x;
    return ((h&1)? -u:u) + ((h&2)? -2*v:2*v);
  }

  // Samples the noise field at (x, y), returning roughly -1..1.
  return function(x,y){
    const X = Math.floor(x)&255, Y=Math.floor(y)&255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u=fade(x), v=fade(y);
    const aa=perm[X+perm[Y]], ab=perm[X+perm[Y+1]], ba=perm[X+1+perm[Y]], bb=perm[X+1+perm[Y+1]];
    return lerp(
      lerp(grad(aa,x,y), grad(ba,x-1,y), u),
      lerp(grad(ab,x,y-1), grad(bb,x-1,y-1), u),
      v
    );
  };
}

(function(){
  const container = document.getElementById('wavesMount');
  if(!container) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS,'svg');
  container.appendChild(svg);

  const noise = makeNoise2D(7);

  const mouse = { x:-10, y:0, lx:0, ly:0, sx:0, sy:0, v:0, vs:0, a:0, set:false };
  let bounding = null;
  let lines = [];
  let paths = [];
  let visible = true;
  let running = false;

  // Line spacing stays at 10px up to ~1900px wide, then widens so an ultra-wide
  // viewport does not keep multiplying the number of paths drawn every frame.
  function gaps(){
    const w = window.innerWidth;
    if(w < 700) return { x:16, y:16 };
    return { x: Math.max(10, Math.round((w + 200) / 220)), y:10 };
  }

  // Caches the mount's viewport rect; must be refreshed whenever the page scrolls or resizes.
  function setSize(){
    bounding = container.getBoundingClientRect();
  }

  // Rebuilds the point grid and one <path> per column to match the current size.
  function setLines(){
    const { width, height } = bounding;
    const { x:xGap, y:yGap } = gaps();
    lines = [];
    paths.forEach(p=>p.remove());
    paths = [];

    const oWidth = width + 200;
    const oHeight = height + 30;
    const totalLines = Math.ceil(oWidth / xGap);
    const totalPoints = Math.ceil(oHeight / yGap);
    const xStart = (width - xGap*totalLines) / 2;
    const yStart = (height - yGap*totalPoints) / 2;

    for(let i=0;i<totalLines;i++){
      const points = [];
      for(let j=0;j<totalPoints;j++){
        points.push({
          x: xStart + xGap*i,
          y: yStart + yGap*j,
          wave:{x:0,y:0},
          cursor:{x:0,y:0,vx:0,vy:0}
        });
      }
      const path = document.createElementNS(svgNS,'path');
      path.classList.add('js-line');
      svg.appendChild(path);
      paths.push(path);
      lines.push(points);
    }
  }

  // Stores the cursor position in mount-local coordinates.
  function updateMouse(x,y){
    mouse.x = x - bounding.left;
    mouse.y = y - bounding.top;
    if(!mouse.set){
      mouse.sx = mouse.x; mouse.sy = mouse.y;
      mouse.lx = mouse.x; mouse.ly = mouse.y;
      mouse.set = true;
    }
  }

  // Tracks the mouse in viewport coordinates, which stay correct as the page scrolls.
  function onMouseMove(e){ updateMouse(e.clientX, e.clientY); }

  // Mirrors mouse tracking for touch input.
  function onTouchMove(e){
    const t = e.touches[0];
    if(t) updateMouse(t.clientX, t.clientY);
  }

  // Advances every point: noise drives the ambient wave, and a damped spring
  // pushes points away from a fast-moving cursor and then pulls them home.
  function movePoints(time){
    lines.forEach(points=>{
      points.forEach(p=>{
        const move = noise(
          (p.x + time*0.008) * 0.003,
          (p.y + time*0.003) * 0.002
        ) * 8;

        p.wave.x = Math.cos(move) * 12;
        p.wave.y = Math.sin(move) * 6;

        const dx = p.x - mouse.sx;
        const dy = p.y - mouse.sy;
        const d = Math.hypot(dx,dy);
        const l = Math.max(175, mouse.vs);

        if(d < l){
          const s = 1 - d/l;
          const f = Math.cos(d*0.001) * s;
          p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00035;
          p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00035;
        }

        p.cursor.vx += (0 - p.cursor.x) * 0.01;
        p.cursor.vy += (0 - p.cursor.y) * 0.01;
        p.cursor.vx *= 0.95;
        p.cursor.vy *= 0.95;
        p.cursor.x += p.cursor.vx;
        p.cursor.y += p.cursor.vy;
        p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
        p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
      });
    });
  }

  // Returns a point's drawn position, optionally including its cursor displacement.
  function moved(point, withCursor){
    return {
      x: point.x + point.wave.x + (withCursor ? point.cursor.x : 0),
      y: point.y + point.wave.y + (withCursor ? point.cursor.y : 0)
    };
  }

  // Serialises each column of points into its path's `d` attribute.
  function drawLines(){
    lines.forEach((points,i)=>{
      if(points.length < 2 || !paths[i]) return;
      // The first point ignores cursor displacement so the top edge stays anchored.
      const first = moved(points[0], false);
      const seg = new Array(points.length);
      seg[0] = `M ${first.x} ${first.y}`;
      for(let k=1;k<points.length;k++){
        const c = moved(points[k], true);
        seg[k] = `L ${c.x} ${c.y}`;
      }
      paths[i].setAttribute('d', seg.join(''));
    });
  }

  // One animation frame: smooth the cursor, derive its speed and heading, then redraw.
  function tick(time){
    if(!visible){ running = false; return; }

    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;
    const dx = mouse.x - mouse.lx;
    const dy = mouse.y - mouse.ly;
    const d = Math.hypot(dx,dy);
    mouse.v = d;
    mouse.vs += (d - mouse.vs) * 0.1;
    mouse.vs = Math.min(100, mouse.vs);
    mouse.lx = mouse.x; mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy,dx);

    container.style.setProperty('--x', mouse.sx + 'px');
    container.style.setProperty('--y', mouse.sy + 'px');

    movePoints(time);
    drawLines();
    requestAnimationFrame(tick);
  }

  // Starts the loop, unless it is already running or motion is reduced.
  function start(){
    if(running || reduceMotion) return;
    running = true;
    requestAnimationFrame(tick);
  }

  function init(){
    setSize();
    setLines();
    if(reduceMotion){
      // Render a single static frame and never schedule another.
      movePoints(0);
      drawLines();
    } else {
      start();
    }
  }

  window.addEventListener('resize', ()=>{ setSize(); setLines(); });
  window.addEventListener('scroll', setSize, { passive:true });
  window.addEventListener('mousemove', onMouseMove);
  container.addEventListener('touchmove', onTouchMove, { passive:true });

  // Stop burning frames on a field nobody can see once the hero scrolls away.
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      visible = entries[0].isIntersecting;
      if(visible) start();
    }, { threshold:0 }).observe(container);
  }

  init();
})();

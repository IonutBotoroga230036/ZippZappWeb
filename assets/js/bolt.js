// Hero bolt: the brand mark drawn as a field of horizontal wave lines clipped to the
// bolt silhouette, matching how the real logo is constructed. Reuses makeNoise2D from
// waves.js, so this file must load after it.

(function(){
  const svg = document.getElementById('boltWave');
  if(!svg || typeof makeNoise2D !== 'function') return;

  const group = svg.querySelector('.bolt-lines');
  if(!group) return;

  const svgNS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Drawn in viewBox units, deliberately overflowing the 120x200 box so the clip
  // never exposes a line end inside the bolt.
  const VB = { w:120, h:200 };
  const X_FROM = -14, X_TO = 134, X_STEP = 5;
  const Y_GAP = 7;
  const AMP = 3.6;          // vertical wave height, tuned so bands read like the logo's stripes
  const PUSH_RADIUS = 46;   // in viewBox units

  const noise = makeNoise2D(7);
  const pointer = { x:-999, y:-999, inside:false };
  let rows = [];
  let visible = true;
  let running = false;

  // Builds one <path> per horizontal band, each a row of points spanning the bolt.
  function buildRows(){
    rows.forEach(r => r.path.remove());
    rows = [];
    for(let y = -Y_GAP; y <= VB.h + Y_GAP; y += Y_GAP){
      const points = [];
      for(let x = X_FROM; x <= X_TO; x += X_STEP){
        points.push({ x, y, dy:0, vy:0 });
      }
      const path = document.createElementNS(svgNS,'path');
      path.classList.add('bolt-line');
      group.appendChild(path);
      rows.push({ y, points, path });
    }
  }

  // Converts a viewport point into the svg's viewBox coordinate space.
  function toLocal(clientX, clientY){
    const r = svg.getBoundingClientRect();
    if(!r.width || !r.height) return null;
    return {
      x: ((clientX - r.left) / r.width) * VB.w,
      y: ((clientY - r.top) / r.height) * VB.h
    };
  }

  // Tracks the cursor so the mark reacts to it the same way the background field does.
  function onMove(clientX, clientY){
    const p = toLocal(clientX, clientY);
    if(!p) return;
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.inside = p.x > -40 && p.x < VB.w + 40 && p.y > -40 && p.y < VB.h + 40;
  }

  // Advances every point: noise drives the standing wave, and nearby points are
  // pushed down-field by the cursor then spring back.
  function step(time){
    for(const row of rows){
      for(const p of row.points){
        const wave = noise((p.x + time*0.010) * 0.030, (p.y + time*0.004) * 0.012) * AMP;

        let target = wave;
        if(pointer.inside){
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if(d < PUSH_RADIUS){
            const s = 1 - d / PUSH_RADIUS;
            target += Math.sign(dy || 1) * s * s * 9;
          }
        }

        // Critically damped-ish spring toward the target offset.
        p.vy += (target - p.dy) * 0.14;
        p.vy *= 0.78;
        p.dy += p.vy;
      }
    }
  }

  // Serialises each row into a smooth polyline.
  function draw(){
    for(const row of rows){
      const pts = row.points;
      const seg = new Array(pts.length);
      seg[0] = `M ${pts[0].x} ${(pts[0].y + pts[0].dy).toFixed(2)}`;
      for(let i=1;i<pts.length;i++){
        seg[i] = `L ${pts[i].x} ${(pts[i].y + pts[i].dy).toFixed(2)}`;
      }
      row.path.setAttribute('d', seg.join(''));
    }
  }

  function tick(time){
    if(!visible){ running = false; return; }
    step(time);
    draw();
    requestAnimationFrame(tick);
  }

  // Starts the loop unless it is already running or motion is reduced.
  function start(){
    if(running || reduceMotion) return;
    running = true;
    requestAnimationFrame(tick);
  }

  buildRows();
  if(reduceMotion){
    // A single static frame, so the mark still reads as wave-built without animating.
    step(0);
    draw();
  } else {
    start();
  }

  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if(t) onMove(t.clientX, t.clientY);
  }, { passive:true });

  // The pointer leaving the window should let the mark settle back to its resting wave.
  window.addEventListener('mouseout', e => {
    if(!e.relatedTarget) pointer.inside = false;
  });

  if('IntersectionObserver' in window){
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if(visible) start();
    }, { threshold:0 }).observe(svg);
  }
})();

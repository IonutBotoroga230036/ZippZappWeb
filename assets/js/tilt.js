// Cursor-tracked 3D tilt for product imagery. Binds to every [data-tilt] container and
// rotates the image inside it toward the pointer, easing in a RAF loop rather than
// writing a transform on every pointer event.

// Gives one container a pointer-driven tilt; the element it rotates is the first child.
function initTilt(container){
  const el = container.querySelector('img, [data-tilt-target]');
  if(!el) return;

  // Per-instance, so a heavy object can be given less travel and more lag than a light
  // one. Defaults match the power bank, which is small and responsive.
  const MAX_DEG = parseFloat(container.dataset.tiltMax)  || 9;
  const EASE    = parseFloat(container.dataset.tiltEase) || 0.12;
  const REST_EPSILON = 0.01;

  const target = { x:0, y:0 };
  const current = { x:0, y:0 };
  let running = false;

  // Maps a pointer position to a target rotation, normalised to the element's own box.
  function aim(clientX, clientY){
    const r = container.getBoundingClientRect();
    if(!r.width || !r.height) return;
    const nx = (clientX - r.left) / r.width  - 0.5;   // -0.5 .. 0.5
    const ny = (clientY - r.top)  / r.height - 0.5;
    // Clamped, so MAX_DEG is a real limit rather than just a scale factor. A pointer
    // reported outside the box would otherwise drive the rotation far past it.
    const clamp = v => Math.max(-MAX_DEG, Math.min(MAX_DEG, v));
    target.y = clamp( nx * 2 * MAX_DEG);   // horizontal travel spins around the Y axis
    target.x = clamp(-ny * 2 * MAX_DEG);   // vertical travel tips around the X axis
    start();
  }

  // Sends the tilt back to flat when the pointer leaves.
  function rest(){
    target.x = 0; target.y = 0;
    start();
  }

  // One frame: ease toward the target and stop once it has settled at rest.
  function tick(){
    current.x += (target.x - current.x) * EASE;
    current.y += (target.y - current.y) * EASE;
    el.style.transform = `rotateX(${current.x.toFixed(3)}deg) rotateY(${current.y.toFixed(3)}deg)`;

    const settled = Math.abs(target.x - current.x) < REST_EPSILON &&
                    Math.abs(target.y - current.y) < REST_EPSILON;
    if(settled && target.x === 0 && target.y === 0){
      el.style.transform = '';   // hand the element back to CSS when flat
      running = false;
      return;
    }
    requestAnimationFrame(tick);
  }

  // Starts the loop unless one is already in flight.
  function start(){
    if(running) return;
    running = true;
    requestAnimationFrame(tick);
  }

  container.addEventListener('pointermove', e => aim(e.clientX, e.clientY));
  container.addEventListener('pointerleave', rest);
}

// Bind only where a tilt makes sense: a real hovering pointer, and motion not reduced.
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(reduceMotion || !canHover) return;
  document.querySelectorAll('[data-tilt]').forEach(initTilt);
})();

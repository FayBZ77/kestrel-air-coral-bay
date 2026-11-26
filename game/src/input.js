// Input: the keyboard and the mouse together make one stick. Arrow keys
// (or WASD's cousins) pitch and roll, W/S work the throttle, and the mouse
// acts as a gentle virtual stick — move it down to pull, sideways to bank.
(function () {
  const keys = new Set();
  let mouseX = 0.5, mouseY = 0.5, mouseSeen = false;
  const pressHandlers = {};

  window.addEventListener('keydown', (ev) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(ev.code)) ev.preventDefault();
    if (!ev.repeat && pressHandlers[ev.code]) pressHandlers[ev.code]();
    keys.add(ev.code);
  });
  window.addEventListener('keyup', (ev) => keys.delete(ev.code));
  window.addEventListener('mousemove', (ev) => {
    mouseX = ev.clientX / Math.max(1, window.innerWidth);
    mouseY = ev.clientY / Math.max(1, window.innerHeight);
    mouseSeen = true;
  });
  window.addEventListener('blur', () => keys.clear());

  KA.onPress = function (code, fn) { pressHandlers[code] = fn; };

  KA.readInput = function () {
    let pitch = 0, roll = 0, throttle = 0;
    if (keys.has('ArrowDown')) pitch += 1;       // pull back: nose up
    if (keys.has('ArrowUp')) pitch -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) roll += 1;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) roll -= 1;
    if (keys.has('KeyW')) throttle += 1;
    if (keys.has('KeyS')) throttle -= 1;
    if (mouseSeen) {
      roll += (mouseX - 0.5) * 1.7;
      pitch += (mouseY - 0.5) * 1.7; // mouse low on the screen = pull
    }
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    return {
      pitch: clamp(pitch),
      roll: clamp(roll),
      throttle,
      brake: keys.has('Space'),
    };
  };
})();

// Kestrel Air — Coral Bay: the boot and the game loop. Builds the world,
// owns the sortie state (menu, flying, debrief), wires the controls, scores
// rings and landings, and keeps every other module in step each frame.
(function () {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfeefb, 1000, 5600);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.3, 14000);
  camera.position.set(0, 90, 900);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.getElementById('scene').appendChild(renderer.domElement);

  // Light: a warm sun with shadows that follow the aeroplane, plus sky fill.
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 1600;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xbfe3f5, 0x5d7a4a, 0.75));

  KA.buildTerrain(scene);
  KA.buildCity(scene);
  KA.buildAirport(scene);
  const rings = KA.buildRings(scene);
  const plane = KA.buildAircraft();
  scene.add(plane);
  KA.bindPanel(plane);

  const flight = KA.createFlight();
  const rig = KA.createCameraRig(camera, plane);
  const state = {
    mode: 'menu', // menu | flying | debrief
    scenario: 'runway',
    score: 0,
    ringsDone: 0,
    paused: false,
    msg: '',
    sub: '',
    endTimer: 0,
  };

  const menuEl = document.getElementById('menu');
  const menuTitle = document.getElementById('menu-title');
  const menuBody = document.getElementById('menu-body');
  const menuButtons = document.getElementById('menu-buttons');

  function showMenu(title, body) {
    menuTitle.textContent = title;
    menuBody.textContent = body;
    menuButtons.innerHTML = '';
    for (const [key, sc] of Object.entries(KA.SCENARIOS)) {
      const b = document.createElement('button');
      b.className = 'scenario-btn';
      const bold = document.createElement('b');
      bold.textContent = sc.title;
      const span = document.createElement('span');
      span.textContent = sc.brief;
      b.append(bold, span);
      b.addEventListener('click', () => startScenario(key));
      menuButtons.appendChild(b);
    }
    menuEl.style.display = 'flex';
    state.mode = 'menu';
    rig.mode = 'orbit';
  }

  function startScenario(key) {
    state.scenario = key;
    KA.resetFlight(flight, key);
    KA.resetRings();
    state.score = 0;
    state.ringsDone = 0;
    state.paused = false;
    state.endTimer = 0;
    rig.mode = key === 'approach' ? 'cockpit' : 'chase';
    rig.snapBehind(flight);
    menuEl.style.display = 'none';
    state.mode = 'flying';
    KA.audio.unlock();
    if (key === 'runway') setMsg('Throttle up — W — and ease back at 50 knots', 'Runway 36, Coral Bay field. Wind calm.');
    if (key === 'rings') setMsg('Ring run: chase the amber ring', 'Nine rings. Each one is worth 150 points.');
    if (key === 'approach') setMsg('On final for runway 36', 'Hold about 55 knots. Two white, two red on the PAPI is the slope.');
  }

  function setMsg(msg, sub) {
    state.msg = msg;
    state.sub = sub || '';
  }

  function endSortie(title, body) {
    state.mode = 'debrief';
    setMsg('', '');
    setTimeout(() => showMenu(title, body), 900);
  }

  function onTouchdown(td) {
    KA.audio.thud(Math.abs(flight.verticalSpeed));
    if (td.quality === 'field') {
      setMsg(td.label, 'Throttle up and climb away, or roll to a stop to end the sortie.');
      return;
    }
    state.score += td.score;
    const ringPts = state.ringsDone * 150;
    endSortie(
      td.quality === 'smooth' ? 'Beautifully done.' : 'Down in one piece.',
      `${td.label} Rings: ${state.ringsDone} of 9 (${ringPts} points). ` +
      `Landing: ${td.score} points. Damage: ${Math.round(flight.damage)}%. Total score: ${state.score + (state.ringsDone >= 9 ? 250 : 0)}.`
    );
  }

  function onCrash() {
    KA.audio.thud(9);
    endSortie('The Kestrel is bent.', `${flight.crashReason} You had ${state.score + state.ringsDone * 0} points and ${state.ringsDone} rings. She will be repaired by morning — pick a sortie and try again.`);
  }

  // Keys that act once per press.
  KA.onPress('KeyC', () => { if (state.mode === 'flying') setMsg(`Camera: ${rig.toggle()}`, ''); });
  KA.onPress('KeyR', () => { if (state.mode !== 'menu') startScenario(state.scenario); });
  KA.onPress('KeyP', () => { if (state.mode === 'flying') { state.paused = !state.paused; setMsg(state.paused ? 'Paused' : '', ''); } });
  KA.onPress('KeyM', () => setMsg(KA.audio.toggleMute() ? 'Sound off' : 'Sound on', ''));

  // Screenshot runs: ?shot=takeoff|rings|approach|city starts a scenario in
  // a photogenic state with a scripted hand on the controls.
  const shotMode = new URLSearchParams(window.location.search).get('shot');
  function shotInput(t) {
    if (shotMode === 'takeoff') {
      return { pitch: t > 5.2 ? 0.55 : 0, roll: 0, throttle: t < 0.2 ? 0 : 1, brake: false, fixedThrottle: t >= 0.2 ? 1 : 0 };
    }
    if (shotMode === 'approach') {
      return { pitch: 0.05, roll: 0, throttle: 0, brake: false, fixedThrottle: 0.34 };
    }
    return null;
  }
  if (shotMode) {
    const map = { takeoff: 'runway', rings: 'rings', approach: 'approach', city: 'rings' };
    startScenario(map[shotMode] || 'runway');
    if (shotMode === 'takeoff') rig.mode = 'cockpit';
    if (shotMode === 'city') {
      flight.pos.set(560, 300, 420);
      flight.heading = 1.15;
      flight.bank = 0.42;
      flight.speed = 52;
      flight.throttle = 0.7;
    }
    if (shotMode === 'rings') {
      flight.pos.set(-60, 128, -240);
      flight.heading = -0.12;
      flight.speed = 50;
    }
  } else {
    showMenu('Pick your sortie', menuBody.textContent);
  }

  const clock = new THREE.Clock();
  let elapsed = 0;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    const now = performance.now();

    if (state.mode === 'flying' && !state.paused) {
      const prevPos = flight.pos.clone();
      let input = KA.readInput();
      const scripted = shotInput(elapsed);
      if (scripted) {
        input = scripted;
        if (scripted.fixedThrottle !== undefined) flight.throttle = scripted.fixedThrottle;
      }
      const events = KA.stepFlight(flight, input, dt, elapsed);

      const ringHit = KA.updateRings(dt, flight.pos, prevPos);
      if (ringHit) {
        state.ringsDone = ringHit.index;
        state.score += 150;
        KA.audio.chime();
        if (ringHit.finished) {
          state.score += 250;
          setMsg('Course complete — +250. Now bring her home', 'Land on the Coral Bay runway to finish the sortie.');
        } else {
          setMsg(`Ring ${ringHit.index} of ${ringHit.total} — +150`, 'Follow the pillar of light to the next ring.');
        }
      }
      if (events.tookOff && state.scenario === 'runway') setMsg('Airborne. Chase the amber ring ahead', '');
      if (events.touchdown) onTouchdown(events.touchdown);
      if (flight.status === 'crashed') onCrash();
      if (flight.onGround && flight.speed < 0.4 && flight.airborneAt > 0 && flight.status === 'flying') {
        state.score += 90;
        endSortie('Down and stopped.', `You rolled to a halt away from the strip with ${state.ringsDone} rings and ${Math.round(flight.damage)}% damage. Total score: ${state.score}.`);
      }
      if (flight.fuel <= 0 && flight.onGround && flight.speed < 0.4) {
        endSortie('Out of fuel.', `The tank is dry. Rings: ${state.ringsDone} of 9. Total score: ${state.score}.`);
      }
      // Guide line: bearing and distance to the next ring.
      if (state.mode === 'flying' && flight.status === 'flying' && rings.next < rings.rings.length) {
        const c = rings.rings[rings.next].center;
        const dist = Math.round(flight.pos.distanceTo(c));
        const brg = ((Math.round(THREE.MathUtils.radToDeg(Math.atan2(c.x - flight.pos.x, -(c.z - flight.pos.z)))) % 360) + 360) % 360;
        if (!state.msg) state.sub = `Next ring: ${dist} m, bearing ${String(brg).padStart(3, '0')}°`;
      }
    }

    // Pose the aeroplane.
    plane.position.copy(flight.pos);
    plane.rotation.order = 'YXZ';
    plane.rotation.set(flight.pitch, -flight.heading, -flight.bank);
    const ud = plane.userData;
    ud.prop.rotation.z -= dt * (2 + flight.throttle * 42 + flight.speed * 0.22);
    ud.blade2.visible = flight.throttle > 0.3;

    // Sun shadow box and light follow the action.
    sun.position.set(flight.pos.x + 260, flight.pos.y + 420, flight.pos.z + 180);
    sun.target.position.copy(flight.pos);
    if (KA.clouds) KA.clouds.position.x = (elapsed * 1.6) % 800;
    if (KA.windsock) KA.windsock.rotation.y = elapsed * 0.4;

    KA.updateHud(flight, state.score, state.ringsDone, rings.rings.length,
      state.mode === 'menu' ? '' : state.msg, state.mode === 'menu' ? '' : state.sub);
    if (rig.mode === 'cockpit') KA.drawPanel(flight, now);
    KA.audio.setEngine(flight.throttle, flight.speed / KA.FLIGHT.maxSpeed);
    rig.update(dt, flight, now);
    renderer.render(scene, camera);
  }
  frame();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // A handle for screenshot runs and curious consoles.
  window.__kestrel = { flight, state, startScenario, scene, camera, renderer };
})();

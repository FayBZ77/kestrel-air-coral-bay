// The flight model: an honest arcade model. Throttle makes speed, speed
// makes lift, bank makes turn, and the ground always has the last word —
// touchdowns are graded by sink rate, speed and where you actually land.
(function () {
  const F = KA.FLIGHT;
  const W = KA.WORLD;
  const GRAV = 9.81;

  KA.createFlight = function () {
    return {
      pos: new THREE.Vector3(0, W.airportElevation + F.gearHeight, W.airportCenter.z + 380),
      heading: 0,        // radians, compass: 0 = north, clockwise
      pitch: 0,          // radians, nose up positive
      bank: 0,           // radians, right wing down positive
      speed: 0,          // m/s along the nose
      throttle: 0,       // 0..1
      fuel: F.fuelCapacity,
      damage: 0,
      onGround: true,
      verticalSpeed: 0,  // m/s, for the instruments and touchdown grading
      status: 'ready',   // ready | flying | landed | crashed
      touchdown: null,   // { quality, score } once landed
      crashReason: '',
      airborneAt: 0,
    };
  };

  KA.resetFlight = function (f, scenario) {
    const fresh = KA.createFlight();
    Object.assign(f, fresh);
    f.pos.copy(fresh.pos);
    if (scenario === 'rings') {
      f.pos.set(0, 150, 260);
      f.heading = 0;
      f.speed = 46;
      f.throttle = 0.72;
      f.onGround = false;
      f.status = 'flying';
    } else if (scenario === 'approach') {
      // Three kilometres south of the threshold, lined up, on the slope.
      f.pos.set(0, W.airportElevation + 165, W.airportCenter.z + W.runwayLength / 2 + 2900);
      f.heading = 0;
      f.speed = 31;
      f.throttle = 0.38;
      f.onGround = false;
      f.status = 'flying';
    } else {
      f.status = 'ready';
    }
    return f;
  };

  function groundHeightAt(x, z) {
    return KA.terrainHeight(x, z);
  }

  function onRunway(x, z) {
    return Math.abs(x - W.airportCenter.x) <= W.runwayWidth / 2 + 4 &&
      Math.abs(z - W.airportCenter.z) <= W.runwayLength / 2;
  }

  // input: { pitch: -1..1 (pull positive), roll: -1..1 (right positive),
  //          throttle: -1..1, brake: bool }
  KA.stepFlight = function (f, input, dt, now) {
    const events = {};
    if (f.status === 'landed' || f.status === 'crashed') return events;

    // Throttle and fuel.
    f.throttle = Math.min(1, Math.max(0, f.throttle + input.throttle * dt * 0.55));
    const engineOut = f.fuel <= 0;
    const power = engineOut ? 0 : f.throttle;
    if (!engineOut) f.fuel = Math.max(0, f.fuel - power * F.fuelBurn * dt);

    // Attitude: stick moves bank and pitch toward commanded limits, with
    // less authority at low speed and none to rotate before flying speed.
    const authority = f.onGround ? Math.min(1, f.speed / F.rotateSpeed) : 1;
    const targetBank = input.roll * THREE.MathUtils.degToRad(F.maxBankDeg);
    const targetPitch = input.pitch * THREE.MathUtils.degToRad(F.maxPitchDeg) * authority;
    const bankStep = F.rollRate * dt, pitchStep = F.pitchRate * dt;
    f.bank += THREE.MathUtils.clamp(targetBank - f.bank, -bankStep, bankStep);
    f.pitch += THREE.MathUtils.clamp(targetPitch - f.pitch, -pitchStep, pitchStep);
    if (f.onGround && f.speed < F.rotateSpeed * 0.92) f.pitch = Math.max(0, f.pitch - dt * 0.8);

    // Bank turns the nose; a stalled wing drops it instead.
    const stalled = !f.onGround && f.speed < F.stallSpeed;
    if (!f.onGround) {
      const turnRate = (GRAV * Math.tan(f.bank)) / Math.max(f.speed, 16);
      f.heading += turnRate * dt;
      if (stalled) f.pitch = Math.max(f.pitch - dt * 0.55, -0.5);
    } else if (f.speed > 2) {
      f.heading += input.roll * dt * 0.45 * Math.min(1, f.speed / 24);
      f.bank *= Math.max(0, 1 - dt * 5);
    }

    // Speed: thrust against drag, plus gravity along the flight path.
    const drag = 0.0035 * f.speed * f.speed + (f.onGround ? 0.55 : 0.12);
    let accel = power * F.maxThrust - drag - Math.sin(f.pitch) * GRAV * (f.onGround ? 0 : 0.82);
    if (input.brake && f.onGround) accel -= 4.2;
    f.speed = Math.max(0, f.speed + accel * dt);
    if (!f.onGround && engineOut) f.speed = Math.max(F.stallSpeed * 0.9, f.speed - dt * 1.1);

    // Velocity from attitude: forward along the nose, with a stall sink and
    // the lift lost in a steep bank.
    const forward = new THREE.Vector3(
      Math.sin(f.heading) * Math.cos(f.pitch),
      Math.sin(f.pitch),
      -Math.cos(f.heading) * Math.cos(f.pitch)
    );
    const vel = forward.multiplyScalar(f.speed);
    if (!f.onGround) {
      let sink = 0;
      if (stalled) sink += (F.stallSpeed - f.speed) * 0.55;
      sink += (1 - Math.cos(f.bank)) * f.speed * 0.16;
      vel.y -= sink;
    }
    const prevY = f.pos.y;
    f.pos.addScaledVector(vel, dt);
    f.verticalSpeed = dt > 0 ? (f.pos.y - prevY) / dt : 0;

    // The ground.
    const ground = groundHeightAt(f.pos.x, f.pos.z);
    const wheelY = f.pos.y - F.gearHeight;
    if (wheelY <= ground + 0.02) {
      const impactSink = f.verticalSpeed;
      f.pos.y = ground + F.gearHeight;
      if (!f.onGround) {
        events.touchdown = gradeTouchdown(f, impactSink, ground);
        if (events.touchdown.quality === 'crash') {
          f.status = 'crashed';
          f.crashReason = events.touchdown.reason;
          f.speed = 0;
          return events;
        }
        f.damage = Math.min(100, f.damage + events.touchdown.damage);
        if (f.damage >= 100) {
          f.status = 'crashed';
          f.crashReason = 'The landing gear gave way after one knock too many.';
          return events;
        }
        f.onGround = true;
        f.pitch = 0;
        f.verticalSpeed = 0;
        if (events.touchdown.quality !== 'field') {
          f.status = 'landed';
          f.touchdown = events.touchdown;
        }
      }
    } else if (f.onGround) {
      // Rolled off a rise or rotated into the air.
      f.onGround = false;
      f.status = 'flying';
      events.tookOff = true;
      f.airborneAt = now;
    }
    if (f.onGround && f.speed > F.rotateSpeed && f.pitch > 0.04) {
      f.onGround = false;
      f.status = 'flying';
      events.tookOff = true;
      f.airborneAt = now;
    }
    return events;
  };

  function gradeTouchdown(f, sink, ground) {
    const runway = onRunway(f.pos.x, f.pos.z);
    const inWater = ground < 1.1 && KA.terrainHeight(f.pos.x, f.pos.z) < 0.6;
    if (inWater) return { quality: 'crash', damage: 100, score: 0, reason: 'You ditched in Coral Bay. The Kestrel does not float.' };
    if (sink < -11) return { quality: 'crash', damage: 100, score: 0, reason: 'That was not a landing, it was an arrival — far too fast downward.' };
    if (runway) {
      if (sink > -1.4) return { quality: 'smooth', damage: 0, score: 500, label: 'Silky touchdown on the runway.' };
      if (sink > -3.2) return { quality: 'firm', damage: 8, score: 320, label: 'Firm arrival — the tower felt that one.' };
      if (sink > -5.5) return { quality: 'hard', damage: 30, score: 140, label: 'Hard landing. The gear is bent but holding.' };
      return { quality: 'crash', damage: 100, score: 0, reason: 'You slammed the runway hard enough to break the aeroplane.' };
    }
    // Off-field: only a gentle, slow arrival on kind ground counts.
    if (sink > -2.2 && f.speed < 38) return { quality: 'field', damage: 12, score: 90, label: 'A field landing — walk away, then walk back for fuel.' };
    return { quality: 'crash', damage: 100, score: 0, reason: 'Off-field arrivals need a feather touch. That was not one.' };
  }
})();

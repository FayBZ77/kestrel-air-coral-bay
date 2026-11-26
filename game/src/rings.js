// The ring course: nine gates strung around the island — out over the bay,
// past the lighthouse, back across the city, and home to the field. Only the
// amber next ring counts; fly through it and it turns green behind you.
(function () {
  const COURSE = [
    { x: 0, y: 105, z: -560, face: 0 },
    { x: -420, y: 150, z: -1380, face: -0.5 },
    { x: -1180, y: 185, z: -1960, face: -0.9 },
    { x: -1930, y: 205, z: -1380, face: -2.2 },
    { x: -1050, y: 185, z: -560, face: -2.9 },
    { x: 120, y: 165, z: -880, face: 2.6 },
    { x: 1250, y: 225, z: -380, face: 1.8 },
    { x: 1560, y: 175, z: 620, face: 2.9 },
    { x: 420, y: 120, z: 60, face: -2.6 },
  ];
  const RING_RADIUS = 15;

  KA.buildRings = function (scene) {
    const group = new THREE.Group();
    const rings = COURSE.map((c, i) => {
      const mat = new THREE.MeshPhongMaterial({
        color: 0x5d707c, emissive: 0x223038, transparent: true, opacity: 0.85, shininess: 80,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_RADIUS, 1.5, 10, 28), mat);
      ring.position.set(c.x, c.y, c.z);
      ring.rotation.y = c.face;
      group.add(ring);
      return { mesh: ring, mat, center: new THREE.Vector3(c.x, c.y, c.z), done: false };
    });

    // A pillar of light marks the next ring so it can be found from afar.
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 300, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false })
    );
    group.add(beacon);
    scene.add(group);

    const state = { rings, next: 0, beacon, pulse: 0 };

    KA.updateRings = function (dt, planePos, prevPos) {
      state.pulse += dt;
      rings.forEach((r, i) => {
        if (r.done) {
          r.mat.color.setHex(0x2fae4e); r.mat.emissive.setHex(0x0d5c26); r.mat.opacity = 0.95;
        } else if (i === state.next) {
          const s = 0.75 + Math.sin(state.pulse * 5) * 0.25;
          r.mat.color.setHex(0xffb03a); r.mat.emissive.setHex(0xa86400);
          r.mat.emissiveIntensity = s;
          r.mat.opacity = 1;
        } else {
          r.mat.color.setHex(0x5d707c); r.mat.emissive.setHex(0x223038); r.mat.opacity = 0.8;
        }
      });
      const target = rings[state.next];
      if (!target) { beacon.visible = false; return null; }
      beacon.visible = true;
      beacon.position.set(target.center.x, target.center.y, target.center.z);
      beacon.material.opacity = 0.085 + Math.sin(state.pulse * 5) * 0.035;

      // A pass is the segment prev->now crossing the ring's plane inside it.
      const n = new THREE.Vector3(0, 0, 1).applyEuler(target.mesh.rotation);
      const dPrev = prevPos.clone().sub(target.center).dot(n);
      const dNow = planePos.clone().sub(target.center).dot(n);
      if ((dPrev > 0 && dNow <= 0) || (dPrev < 0 && dNow >= 0)) {
        const t = dPrev / (dPrev - dNow || 1);
        const cross = prevPos.clone().lerp(planePos, t);
        if (cross.distanceTo(target.center) < RING_RADIUS * 0.95) {
          target.done = true;
          state.next += 1;
          return { index: state.next, total: rings.length, finished: state.next >= rings.length };
        }
      }
      return null;
    };

    KA.resetRings = function () {
      rings.forEach((r) => { r.done = false; });
      state.next = 0;
    };
    KA.ringsState = state;
    return state;
  };
})();

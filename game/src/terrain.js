// Terrain: one island built from a deterministic height function, so the
// mesh, the scenery placement and the flight model's ground collision all
// sample exactly the same ground.
(function () {
  const W = KA.WORLD;

  // Small deterministic value-noise: hashed lattice points, smooth steps.
  function hash2(ix, iz) {
    let n = ix * 374761393 + iz * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }
  function smoothNoise(x, z, cell) {
    const fx = x / cell, fz = z / cell;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const tx = fx - ix, tz = fz - iz;
    const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
    const a = hash2(ix, iz), b = hash2(ix + 1, iz);
    const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
    return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) * 2 - 1;
  }
  function fbm(x, z) {
    return smoothNoise(x, z, 900) * 0.55 + smoothNoise(x, z, 380) * 0.3 + smoothNoise(x, z, 150) * 0.15;
  }

  // The island's shape: a dome that falls into the sea on every side, a
  // river channel cut down the west, hills in the north-east, and a flat
  // apron blended in around the airfield.
  KA.terrainHeight = function (x, z) {
    const d = Math.sqrt(x * x + z * z);
    const falloff = Math.max(0, 1 - Math.pow(d / (W.size * 0.52), 3));
    let h = 6 + fbm(x + 900, z - 400) * 34 * falloff + falloff * 26;
    // North-east hills rise higher.
    const hill = Math.max(0, 1 - Math.hypot(x - 1500, z + 1500) / 1500);
    h += hill * hill * 95;
    // River channel: a curving line down the west side.
    const riverCenter = W.riverX + Math.sin(z * 0.0011) * 130;
    const rd = Math.abs(x - riverCenter);
    if (rd < 90) h = Math.min(h, 1.2 + rd * 0.012);
    // The west shore drops away into Coral Bay.
    if (x < -1250) h -= (-1250 - x) * 0.016;
    // Flatten for the airfield.
    const ad = Math.hypot(x - W.airportCenter.x, z - W.airportCenter.z);
    if (ad < W.airportRadius) {
      const t = Math.min(1, Math.max(0, (ad - W.airportRadius * 0.45) / (W.airportRadius * 0.55)));
      const s = t * t * (3 - 2 * t);
      h = W.airportElevation * (1 - s) + h * s;
    }
    return h;
  };

  function vertexColor(h, x, z) {
    const P = KA.PALETTE;
    const c = new THREE.Color();
    if (h < 1.6) c.setHex(P.sand);
    else if (h < 16) c.setHex(P.grass);
    else if (h < 34) c.setHex(P.meadow);
    else if (h < 62) c.setHex(P.forest);
    else if (h < 105) c.setHex(P.rock);
    else c.setHex(P.snow);
    // Dry patches and shore wetness break up the bands.
    const n = smoothNoise(x * 1.7, z * 1.7, 210) * 0.09;
    c.offsetHSL(0, 0, n);
    if (h < 0.4) c.lerp(new THREE.Color(P.sea), 0.35);
    return c;
  }

  KA.buildTerrain = function (scene) {
    const segs = 150;
    const geo = new THREE.PlaneGeometry(W.size, W.size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = KA.terrainHeight(x, z);
      pos.setY(i, h);
      const c = vertexColor(h, x, z);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    ground.receiveShadow = true;
    scene.add(ground);

    // The bay itself: a calm disc of sea out to the horizon.
    const sea = new THREE.Mesh(
      new THREE.CircleGeometry(W.size * 1.6, 48),
      new THREE.MeshPhongMaterial({ color: KA.PALETTE.sea, shininess: 180, specular: 0xbfe8ff, transparent: true, opacity: 0.94 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = W.seaLevel;
    scene.add(sea);

    // River ribbon: a darker wet strip following the channel.
    const riverMat = new THREE.MeshPhongMaterial({ color: 0x2b7ea6, shininess: 160, specular: 0xbfe8ff });
    const riverPts = [];
    for (let z = -2600; z <= 2600; z += 130) {
      riverPts.push(new THREE.Vector3(W.riverX + Math.sin(z * 0.0011) * 130, 1.35, z));
    }
    const riverGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPts), 60, 26, 6, false);
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.scale.y = 0.12;
    scene.add(river);

    buildSkyAndClouds(scene);
    buildTrees(scene);
    return ground;
  };

  function buildSkyAndClouds(scene) {
    // A gradient dome painted on a canvas: horizon haze up to deep zenith.
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 256;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#2f7fc4');
    grad.addColorStop(0.45, '#7cc0e4');
    grad.addColorStop(0.72, '#cfeefb');
    grad.addColorStop(0.8, '#eaf6fb');
    grad.addColorStop(1, '#eaf6fb');
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(cv);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(W.size * 1.9, 24, 14),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
    );
    scene.add(dome);

    // Puffball clouds: flattened white clusters drifting slowly east.
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
    const clouds = new THREE.Group();
    for (let i = 0; i < 26; i++) {
      const cl = new THREE.Group();
      const puffs = 3 + Math.floor(hash2(i, 7) * 3);
      for (let p = 0; p < puffs; p++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(28 + hash2(i, p) * 46, 10, 8), cloudMat);
        s.position.set(p * 42 - puffs * 20, hash2(p, i) * 12, hash2(i * 3, p) * 40 - 20);
        s.scale.y = 0.42;
        cl.add(s);
      }
      cl.position.set((hash2(i, 1) - 0.5) * 7000, 330 + hash2(i, 2) * 190, (hash2(i, 3) - 0.5) * 7000);
      clouds.add(cl);
    }
    clouds.name = 'clouds';
    scene.add(clouds);
    KA.clouds = clouds;
  }

  function buildTrees(scene) {
    // Two instanced meshes (trunks, canopies) scattered where the ground is
    // green and dry, kept off the airfield and the city.
    const spots = [];
    for (let i = 0; i < 2600 && spots.length < 520; i++) {
      const x = (hash2(i, 11) - 0.5) * 5600;
      const z = (hash2(i, 13) - 0.5) * 5600;
      const h = KA.terrainHeight(x, z);
      if (h < 3 || h > 58) continue;
      if (Math.hypot(x - W.airportCenter.x, z - W.airportCenter.z) < W.airportRadius + 60) continue;
      if (Math.hypot(x - W.cityCenter.x, z - W.cityCenter.z) < 620) continue;
      if (Math.abs(x - (W.riverX + Math.sin(z * 0.0011) * 130)) < 60) continue;
      spots.push({ x, z, h, s: 0.8 + hash2(i, 17) * 0.9 });
    }
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 5, 5);
    const coneGeo = new THREE.ConeGeometry(4.6, 11, 7);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x6b4a2c }), spots.length);
    const cones = new THREE.InstancedMesh(coneGeo, new THREE.MeshLambertMaterial({ color: KA.PALETTE.forest }), spots.length);
    const m = new THREE.Matrix4();
    spots.forEach((t, i) => {
      m.makeScale(t.s, t.s, t.s).setPosition(t.x, t.h + 2.2 * t.s, t.z);
      trunks.setMatrixAt(i, m);
      m.makeScale(t.s, t.s, t.s).setPosition(t.x, t.h + (5 + 5.5) * t.s, t.z);
      cones.setMatrixAt(i, m);
    });
    cones.castShadow = true;
    scene.add(trunks, cones);
  }
})();

// Coral Bay field: the runway with its painted markings and edge lights,
// PAPI glide-slope lights, a taxiway, terminal, tower, hangars and windsock.
(function () {
  const W = KA.WORLD;
  const cx = W.airportCenter.x, cz = W.airportCenter.z, gy = W.airportElevation;

  function runwayTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 2048;
    const g = cv.getContext('2d');
    g.fillStyle = '#33373b';
    g.fillRect(0, 0, 256, 2048);
    // Worn rubber streaks down the touchdown zones.
    g.fillStyle = 'rgba(12,12,14,0.35)';
    g.fillRect(88, 180, 80, 420);
    g.fillRect(88, 1450, 80, 420);
    // Threshold piano keys at both ends.
    g.fillStyle = '#e8e6df';
    for (const y0 of [26, 2048 - 26 - 130]) {
      for (let i = 0; i < 6; i++) g.fillRect(28 + i * 36, y0, 20, 130);
    }
    // Centreline dashes.
    for (let y = 260; y < 1790; y += 128) g.fillRect(121, y, 14, 74);
    // Runway numbers: 36 at the south end, 18 at the north.
    g.fillStyle = '#f2f0e8';
    g.font = 'bold 92px Verdana, sans-serif';
    g.textAlign = 'center';
    g.fillText('36', 128, 330);
    g.save();
    g.translate(128, 2048 - 240);
    g.rotate(Math.PI);
    g.fillText('18', 0, 0);
    g.restore();
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return tex;
  }

  KA.buildAirport = function (scene) {
    const group = new THREE.Group();

    // Apron slab the buildings sit on.
    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(560, 1180),
      new THREE.MeshLambertMaterial({ color: 0x9aa0a2 })
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(cx, gy + 0.06, cz);
    apron.receiveShadow = true;
    group.add(apron);

    // The runway itself, running north-south, numbers at each end.
    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(W.runwayWidth, W.runwayLength),
      new THREE.MeshLambertMaterial({ map: runwayTexture() })
    );
    runway.rotation.x = -Math.PI / 2;
    runway.rotation.z = Math.PI; // numbers read correctly for a northbound pilot
    runway.position.set(cx, gy + 0.14, cz);
    runway.receiveShadow = true;
    group.add(runway);

    // Edge lights: two rows of small warm lamps.
    const lampGeo = new THREE.SphereGeometry(0.55, 6, 5);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
    const n = Math.floor(W.runwayLength / 60);
    const lamps = new THREE.InstancedMesh(lampGeo, lampMat, n * 2);
    const m = new THREE.Matrix4();
    let li = 0;
    for (let i = 0; i < n; i++) {
      const z = cz - W.runwayLength / 2 + 30 + i * 60;
      m.identity().setPosition(cx - W.runwayWidth / 2 - 2.5, gy + 0.7, z);
      lamps.setMatrixAt(li++, m);
      m.identity().setPosition(cx + W.runwayWidth / 2 + 2.5, gy + 0.7, z);
      lamps.setMatrixAt(li++, m);
    }
    group.add(lamps);

    // PAPI lights beside the south threshold: white over red on the slope.
    const papi = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.8, 0.8),
        new THREE.MeshBasicMaterial({ color: i < 2 ? 0xffffff : 0xff3b30 })
      );
      box.position.set(cx - W.runwayWidth / 2 - 9, gy + 0.8, cz + W.runwayLength / 2 + 14 + i * 3.4);
      papi.add(box);
    }
    group.add(papi);
    KA.papi = papi;

    // Taxiway from the runway midpoint to the apron buildings.
    const taxi = new THREE.Mesh(
      new THREE.PlaneGeometry(210, 15),
      new THREE.MeshLambertMaterial({ color: 0x3c4147 })
    );
    taxi.rotation.x = -Math.PI / 2;
    taxi.position.set(cx + 128, gy + 0.12, cz + 60);
    group.add(taxi);

    buildBuildings(group);
    scene.add(group);
    return group;
  };

  function buildBuildings(group) {
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xd9d2c2 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x7a4a34 });
    const glassMat = new THREE.MeshPhongMaterial({ color: 0x2c5d74, shininess: 120, specular: 0xcfeefb });

    // Terminal: a low block with a glass front facing the apron.
    const terminal = new THREE.Group();
    const hall = new THREE.Mesh(new THREE.BoxGeometry(86, 13, 30), wallMat);
    hall.position.y = 6.5;
    hall.castShadow = true;
    terminal.add(hall);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(80, 8, 1.2), glassMat);
    glass.position.set(0, 5.4, -15.4);
    terminal.add(glass);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(92, 1.6, 36), roofMat);
    roof.position.y = 13.6;
    terminal.add(roof);
    terminal.position.set(cx + 265, gy, cz + 60);
    group.add(terminal);

    // Control tower next to it.
    const tower = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 34, 10), wallMat);
    shaft.position.y = 17;
    shaft.castShadow = true;
    tower.add(shaft);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 6.2, 5.4, 10), glassMat);
    cab.position.y = 36.4;
    tower.add(cab);
    const capTop = new THREE.Mesh(new THREE.ConeGeometry(7.8, 3.4, 10), roofMat);
    capTop.position.y = 40.8;
    tower.add(capTop);
    tower.position.set(cx + 215, gy, cz - 38);
    group.add(tower);

    // Two hangars with curved roofs.
    for (let i = 0; i < 2; i++) {
      const hangar = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(44, 11, 38),
        new THREE.MeshLambertMaterial({ color: i ? 0xb9c0b4 : 0xc4b49a }));
      body.position.y = 5.5;
      body.castShadow = true;
      hangar.add(body);
      const roofH = new THREE.Mesh(new THREE.CylinderGeometry(22.5, 22.5, 38, 12, 1, false, 0, Math.PI),
        new THREE.MeshLambertMaterial({ color: 0x5d707c }));
      roofH.rotation.z = Math.PI / 2;
      roofH.rotation.y = Math.PI / 2;
      roofH.position.y = 11;
      roofH.scale.set(1, 0.42, 1);
      hangar.add(roofH);
      hangar.position.set(cx + 268, gy, cz - 190 - i * 120);
      group.add(hangar);
    }

    // Windsock: pole plus an orange cone that main.js swings with the wind.
    const sock = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 9, 6),
      new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
    pole.position.y = 4.5;
    sock.add(pole);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5.4, 8, 1, true),
      new THREE.MeshLambertMaterial({ color: 0xe8641e, side: THREE.DoubleSide }));
    cone.rotation.z = Math.PI / 2 - 0.18;
    cone.position.set(3.1, 8.6, 0);
    sock.add(cone);
    sock.position.set(cx + 90, gy, cz + 330);
    group.add(sock);
    KA.windsock = cone;
  }
})();

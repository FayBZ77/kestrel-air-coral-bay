// The Kestrel K-1: a high-wing trainer built from primitives — fuselage,
// wing, tail, spinning propeller, fixed gear — plus a cockpit panel whose
// canvas texture the instruments draw on when you sit inside.
(function () {
  const P = KA.PALETTE;

  KA.buildAircraft = function () {
    const plane = new THREE.Group();
    const paint = new THREE.MeshPhongMaterial({ color: P.livery, shininess: 60, specular: 0x888888 });
    const accent = new THREE.MeshPhongMaterial({ color: P.liveryAccent, shininess: 60, specular: 0x664422 });
    const darkMetal = new THREE.MeshPhongMaterial({ color: 0x2c3136, shininess: 90 });
    const glassMat = new THREE.MeshPhongMaterial({ color: 0x18384a, shininess: 160, specular: 0xd8f4ff, transparent: true, opacity: 0.82 });

    // Fuselage: a tapered tube along Z, nose toward -Z.
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.02, 7.6, 12), paint);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    plane.add(fuselage);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.64, 12, 10), accent);
    nose.position.z = -3.8;
    nose.scale.z = 1.3;
    plane.add(nose);
    // Belly stripe.
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 0.86, 2.6, 12, 1, true, 0, Math.PI), accent);
    stripe.rotation.x = Math.PI / 2;
    stripe.rotation.y = Math.PI;
    stripe.position.z = -0.6;
    plane.add(stripe);

    // Cabin glass.
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.92, 12, 10), glassMat);
    canopy.position.set(0, 0.72, -0.7);
    canopy.scale.set(0.82, 0.62, 1.5);
    plane.add(canopy);

    // High wing with orange tips, slight dihedral built from three boxes.
    const wingMat = paint;
    const wingC = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 1.7), wingMat);
    wingC.position.set(0, 1.06, -0.7);
    wingC.castShadow = true;
    plane.add(wingC);
    for (const s of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 1.62), accent);
      tip.position.set(s * 3.95, 1.22, -0.7);
      tip.rotation.z = s * -0.06;
      tip.castShadow = true;
      plane.add(tip);
      // Wing struts down to the fuselage.
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 5), darkMetal);
      strut.position.set(s * 1.7, 0.45, -0.7);
      strut.rotation.z = s * 0.6;
      plane.add(strut);
    }

    // Tail: horizontal stabiliser and a tall fin with an orange rudder.
    const stab = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.12, 1.05), paint);
    stab.position.set(0, 0.28, 3.55);
    plane.add(stab);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 1.25), paint);
    fin.position.set(0, 0.95, 3.5);
    plane.add(fin);
    const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.5, 0.55), accent);
    rudder.position.set(0, 0.9, 4.05);
    plane.add(rudder);

    // Propeller: spinner and two blades, spun by the flight model.
    const prop = new THREE.Group();
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 10), accent);
    spinner.rotation.x = -Math.PI / 2;
    prop.add(spinner);
    const bladeMat = new THREE.MeshPhongMaterial({ color: 0x22262a, shininess: 40 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.9, 0.06), bladeMat);
    prop.add(blade);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.22, 0.06), bladeMat);
    blade2.visible = false; // the cross shows only as motion blur at speed
    prop.add(blade2);
    prop.position.z = -4.35;
    plane.add(prop);

    // Fixed tricycle gear.
    const gearMat = darkMetal;
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x15181a });
    function wheel(x, y, z) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      plane.add(w);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 5), gearMat);
      leg.position.set(x, y + 0.55, z);
      plane.add(leg);
    }
    wheel(0, -1.5, -2.5);
    wheel(-1.05, -1.5, 0.4);
    wheel(1.05, -1.5, 0.4);

    // Navigation lights: red left, green right, white tail.
    const navL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff2a20 }));
    navL.position.set(-5.6, 1.24, -0.7);
    plane.add(navL);
    const navR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), new THREE.MeshBasicMaterial({ color: 0x2aff5a }));
    navR.position.set(5.6, 1.24, -0.7);
    plane.add(navR);

    // Cockpit interior: glareshield and an instrument panel carrying a live
    // canvas texture. Only visible from the cockpit camera.
    const cockpit = new THREE.Group();
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = 1024;
    panelCanvas.height = 400;
    const panelTex = new THREE.CanvasTexture(panelCanvas);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 0.82, 0.12),
      new THREE.MeshBasicMaterial({ map: panelTex })
    );
    panel.position.set(0, 0.28, -1.62);
    panel.rotation.x = -0.16;
    cockpit.add(panel);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.55),
      new THREE.MeshPhongMaterial({ color: 0x1c2126 }));
    shield.position.set(0, 0.74, -1.5);
    shield.rotation.x = 0.35;
    cockpit.add(shield);
    // Two control yokes.
    for (const s of [-1, 1]) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 6), darkMetal);
      column.position.set(s * 0.5, -0.05, -1.35);
      column.rotation.x = 0.7;
      cockpit.add(column);
      const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 12, Math.PI), darkMetal);
      yoke.position.set(s * 0.5, 0.14, -1.5);
      yoke.rotation.z = Math.PI;
      cockpit.add(yoke);
    }
    cockpit.visible = false;
    plane.add(cockpit);

    plane.userData = { prop, blade2, canopy, cockpit, panelCanvas, panelTex };
    return plane;
  };
})();

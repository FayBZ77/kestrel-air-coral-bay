// Cameras: a chase view that trails behind the tail without fighting the
// pilot, a cockpit view bolted to the pilot's head, and a slow orbit of the
// field for the menu. Press C to swap chase and cockpit.
(function () {
  KA.createCameraRig = function (camera, plane) {
    const rig = {
      mode: 'orbit', // orbit | chase | cockpit
      smoothed: new THREE.Vector3(0, 90, 900),
      toggle() {
        this.mode = this.mode === 'chase' ? 'cockpit' : 'chase';
        return this.mode;
      },
      update(dt, f, now) {
        const ud = plane.userData;
        if (this.mode === 'cockpit') {
          ud.cockpit.visible = true;
          ud.canopy.visible = false;
          // The pilot sits inside the fuselage tube, so the tube and its
          // belly stripe are hidden from this seat — what remains in view
          // is the panel, the glareshield, the wing above and the nose.
          ud.fuselage.visible = false;
          ud.stripe.visible = false;
          ud.wingGroup.visible = false;
          ud.blade.visible = false;
          ud.blade2.visible = false;
          ud.blurDisc.visible = true;
          // The head offset is rotated by the airframe's quaternion and
          // added to the flight position directly — never taken from
          // plane.matrixWorld, which is one rendered frame stale and
          // leaves the camera trailing behind the aeroplane.
          const head = new THREE.Vector3(0.42, 0.98, 0.0).applyQuaternion(plane.quaternion).add(f.pos);
          camera.position.copy(head);
          camera.quaternion.copy(plane.quaternion);
          camera.rotateX(-0.055); // a pilot's gaze rests a touch below the horizon, on the panel
          return;
        }
        ud.cockpit.visible = false;
        ud.canopy.visible = true;
        ud.fuselage.visible = true;
        ud.stripe.visible = true;
        ud.wingGroup.visible = true;
        ud.blade.visible = true;
        ud.blurDisc.visible = false;
        if (this.mode === 'orbit') {
          const t = now * 0.00005;
          const cx = KA.WORLD.airportCenter.x, cz = KA.WORLD.airportCenter.z;
          camera.position.set(cx + Math.sin(t) * 330, 105, cz + Math.cos(t) * 330);
          camera.lookAt(cx, KA.WORLD.airportElevation + 6, cz - 60);
          return;
        }
        // Chase: stay behind the tail in heading space, smoothed so banks
        // swing the view gently instead of snapping with the airframe.
        // Forward in xz is (sin h, -cos h), so behind is the opposite.
        const back = new THREE.Vector3(-Math.sin(f.heading) * 11.5, 3.4, Math.cos(f.heading) * 11.5);
        const desired = f.pos.clone().add(back);
        const groundY = KA.terrainHeight(desired.x, desired.z) + 2.2;
        if (desired.y < groundY) desired.y = groundY;
        const k = 1 - Math.exp(-dt * 3.6);
        this.smoothed.lerp(desired, k);
        camera.position.copy(this.smoothed);
        const look = f.pos.clone();
        look.y += 1.1;
        look.x += Math.sin(f.heading) * 14;
        look.z += -Math.cos(f.heading) * 14;
        camera.lookAt(look);
      },
      snapBehind(f) {
        this.smoothed.set(
          f.pos.x - Math.sin(f.heading) * 11.5,
          f.pos.y + 3.4,
          f.pos.z + Math.cos(f.heading) * 11.5
        );
      },
    };
    return rig;
  };
})();

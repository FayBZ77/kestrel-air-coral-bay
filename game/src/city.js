// The town of Coral Bay: a street grid of slab buildings with lit windows,
// a harbour pier on the west shore, and the lighthouse every pilot steers by.
(function () {
  const W = KA.WORLD;

  function windowTexture() {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#b9c4c9';
    g.fillRect(0, 0, 128, 256);
    for (let y = 10; y < 240; y += 18) {
      for (let x = 9; x < 118; x += 16) {
        const lit = ((x * 7 + y * 13) % 9) < 3;
        g.fillStyle = lit ? '#ffd98a' : '#5d707c';
        g.fillRect(x, y, 10, 11);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  KA.buildCity = function (scene) {
    const group = new THREE.Group();
    const tex = windowTexture();
    const block = 118, gap = 34;
    const cols = 7, rows = 6;
    const heights = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const cx = W.cityCenter.x + (i - (cols - 1) / 2) * (block + gap);
        const cz = W.cityCenter.z + (j - (rows - 1) / 2) * (block + gap);
        const downtown = 1 - Math.hypot(i - 3, j - 2.5) / 5.2;
        const h = 18 + downtown * 74 + ((i * 31 + j * 17) % 13);
        heights.push({ x: cx, z: cz, h });
      }
    }
    const geo = new THREE.BoxGeometry(block * 0.72, 1, block * 0.72);
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const mesh = new THREE.InstancedMesh(geo, mat, heights.length);
    const m = new THREE.Matrix4();
    heights.forEach((b, i) => {
      const gy = KA.terrainHeight(b.x, b.z);
      m.makeScale(1, b.h, 1).setPosition(b.x, gy + b.h / 2 - 1, b.z);
      mesh.setMatrixAt(i, m);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Streets: dark ribbons under the grid.
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a4046 });
    for (let i = 0; i <= cols; i++) {
      const x = W.cityCenter.x + (i - cols / 2) * (block + gap) + gap / 2 - block / 2 + 8;
      const road = new THREE.Mesh(new THREE.PlaneGeometry(gap + 6, rows * (block + gap)), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, KA.terrainHeight(x, W.cityCenter.z) + 0.25, W.cityCenter.z);
      group.add(road);
    }
    for (let j = 0; j <= rows; j++) {
      const z = W.cityCenter.z + (j - rows / 2) * (block + gap) + gap / 2 - block / 2 + 8;
      const road = new THREE.Mesh(new THREE.PlaneGeometry(cols * (block + gap), gap + 6), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(W.cityCenter.x, KA.terrainHeight(W.cityCenter.x, z) + 0.25, z);
      group.add(road);
    }

    // Harbour pier and a couple of moored boats on the west shore.
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
    const pier = new THREE.Mesh(new THREE.BoxGeometry(150, 3, 16), pierMat);
    const shoreX = -1560, shoreZ = -980;
    pier.position.set(shoreX - 60, 1.8, shoreZ);
    group.add(pier);
    const hullMat = new THREE.MeshLambertMaterial({ color: 0xd8542e });
    const mastMat = new THREE.MeshLambertMaterial({ color: 0xe8e4da });
    for (let i = 0; i < 3; i++) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.1, 11, 6), hullMat);
      hull.rotation.z = Math.PI / 2;
      hull.scale.z = 0.55;
      boat.add(hull);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 9, 5), mastMat);
      mast.position.y = 4.6;
      boat.add(mast);
      boat.position.set(shoreX - 120 - i * 26, 0.7, shoreZ - 26 + i * 30);
      boat.rotation.y = i * 0.7;
      group.add(boat);
    }

    buildLighthouse(group);
    scene.add(group);
    return group;
  };

  function buildLighthouse(group) {
    const { x, z } = KA.WORLD.lighthouse;
    const gy = Math.max(KA.terrainHeight(x, z), 2);
    const lh = new THREE.Group();
    const white = new THREE.MeshLambertMaterial({ color: 0xf4f1e8 });
    const red = new THREE.MeshLambertMaterial({ color: 0xc93a2e });
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(4.6 - i * 0.55, 5.1 - i * 0.55, 7, 12), i % 2 ? white : red);
      band.position.y = 3.5 + i * 7;
      band.castShadow = true;
      lh.add(band);
    }
    const lampRoom = new THREE.Mesh(
      new THREE.CylinderGeometry(3.1, 3.1, 4.4, 10),
      new THREE.MeshPhongMaterial({ color: 0x333a40, emissive: 0xffc46b, emissiveIntensity: 0.9 })
    );
    lampRoom.position.y = 23.4;
    lh.add(lampRoom);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(3.9, 3.2, 10), red);
    cap.position.y = 27.2;
    lh.add(cap);
    const beam = new THREE.PointLight(0xffc46b, 1.4, 900);
    beam.position.y = 23.4;
    lh.add(beam);
    lh.position.set(x, gy, z);
    group.add(lh);
  }
})();

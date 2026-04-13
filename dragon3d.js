/**
 * dragon3d.js – Rồng Á Đông 3D bằng Three.js
 * Engine: Three.js r160
 * Thân rồng: TubeGeometry theo CatmullRomCurve3
 * Vảy: ConeGeometry dọc thân
 * Đầu: SphereGeometry + sừng + mắt + răng + bờm
 * Tương tác: mousemove/click/touch
 */

(function startDragon3D() {
  // Three.js is already loaded synchronously before this script
  // DOM is ready since this script is at end of body
  // Call main() directly with a small delay to ensure canvas is in DOM
  setTimeout(main, 0);

  /* ════════════════════════════════════════════════════
     MAIN
  ════════════════════════════════════════════════════ */
  function main() {
    const THREE = window.THREE;
    if (!THREE) return;

    /* ── Canvas ── */
    const canvas = document.getElementById('dragon3dCanvas');
    if (!canvas) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    /* ── Scene & Camera ── */
    const scene = new THREE.Scene();
    const W = window.innerWidth, H = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(50, W / H, 1, 8000);
    camera.position.set(0, 0, 700);
    camera.lookAt(0, 0, 0);

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0x334455, 8));
    const greenLight = new THREE.PointLight(0x22c55e, 12, 1800);
    greenLight.position.set(0, 300, 400);
    scene.add(greenLight);
    const fillLight = new THREE.PointLight(0x6699ff, 4, 1200);
    fillLight.position.set(-300, -200, 300);
    scene.add(fillLight);

    /* ── Constants ── */
    const N     = 36;     // đốt sống
    const DIST  = 38;     // khoảng cách đốt
    const R     = 22;     // bán kính thân
    const SPD   = 1.8;
    const TURN  = 0.025;

    /* ── Materials ── */
    const matBody = new THREE.MeshPhongMaterial({
      color: 0x1a2a3a,
      emissive: 0x0a1520,
      emissiveIntensity: 1,
      specular: new THREE.Color(0x22c55e).multiplyScalar(0.6),
      shininess: 120,
    });
    const matScale = new THREE.MeshPhongMaterial({
      color: 0x1e3048,
      emissive: 0x0c1a28,
      emissiveIntensity: 1,
      specular: new THREE.Color(0x22c55e).multiplyScalar(0.4),
      shininess: 80,
      side: THREE.DoubleSide,
    });
    const matGlow = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.9,
    });
    const matHead = new THREE.MeshPhongMaterial({
      color: 0x0c1525,
      emissive: 0x060c18,
      specular: new THREE.Color(0x22c55e).multiplyScalar(0.3),
      shininess: 100,
    });
    const matHorn = new THREE.MeshPhongMaterial({
      color: 0x080e1a,
      emissive: 0x030810,
      shininess: 70,
    });
    const matTooth = new THREE.MeshPhongMaterial({
      color: 0xcccccc,
      shininess: 200,
    });
    const matWhisker = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.55,
    });
    const matFire = new THREE.PointsMaterial({
      color: 0x4ade80,
      size: 8,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    /* ── Spine nodes ── */
    let spine = [];
    for (let i = 0; i < N; i++) {
      spine.push(new THREE.Vector3(-i * DIST, 0, 0));
    }
    let headAngle = 0;
    let targetAngle = 0;
    let wanderT = 0;
    let boosted = false;
    let boostTimer = 0;

    /* ── Build body tube ── */
    let curve = new THREE.CatmullRomCurve3(spine.map(v => v.clone()));
    let tubeGeo = new THREE.TubeGeometry(curve, N * 3, R, 10, false);
    let tubeMesh = new THREE.Mesh(tubeGeo, matBody);
    scene.add(tubeMesh);

    /* ── Build scales ── */
    const scales = [];
    const SCALE_ROWS = N * 2;
    for (let row = 0; row < SCALE_ROWS; row++) {
      const t = row / SCALE_ROWS;
      const br = R * (1 - t * 0.62);
      for (let j = 0; j < 5; j++) {
        const ang = (j / 5) * Math.PI * 2;
        const geo = new THREE.ConeGeometry(br * 0.45, br * 0.6, 4);
        geo.rotateX(Math.PI / 2);
        const m = new THREE.Mesh(geo, matScale);
        m.userData = { t, ang };
        scene.add(m);
        scales.push(m);
      }
    }

    /* ── Build head group ── */
    const headGroup = new THREE.Group();
    scene.add(headGroup);

    // Đầu chính
    const headGeo = new THREE.SphereGeometry(R * 1.9, 16, 12);
    headGeo.scale(1.55, 0.95, 1.05);
    headGroup.add(new THREE.Mesh(headGeo, matHead));

    // Mõm
    const snoutGeo = new THREE.SphereGeometry(R * 1.1, 12, 8);
    snoutGeo.scale(1.9, 0.65, 0.82);
    const snout = new THREE.Mesh(snoutGeo, matHead);
    snout.position.set(R * 2.3, 0, 0);
    headGroup.add(snout);

    // Sừng (2 cặp)
    for (const sy of [-1, 1]) {
      const h1 = new THREE.Mesh(new THREE.ConeGeometry(R * 0.2, R * 2.4, 5), matHorn);
      h1.position.set(R * 0.4, R * 1.6 * sy, R * 0.3);
      h1.rotation.z = -0.5 * sy;
      h1.rotation.x = 0.18;
      headGroup.add(h1);

      const h2 = new THREE.Mesh(new THREE.ConeGeometry(R * 0.12, R * 1.3, 4), matHorn);
      h2.position.set(R * 1.3, R * 1.25 * sy, R * 0.2);
      h2.rotation.z = -0.65 * sy;
      headGroup.add(h2);
    }

    // Bờm (6 dải)
    for (let b = 0; b < 7; b++) {
      const ba = (b / 7) * Math.PI - Math.PI * 0.1;
      const bg = new THREE.ConeGeometry(R * 0.32, R * 2.0, 3);
      const bm = new THREE.Mesh(bg, matHorn);
      bm.position.set(
        -R * 0.4 + Math.cos(ba) * R * 1.5,
        Math.sin(ba) * R * 1.7,
        (Math.random() - 0.5) * R * 0.7
      );
      bm.rotation.z = ba + Math.PI / 2;
      bm.scale.set(1, 1, 0.28);
      headGroup.add(bm);
    }

    // Mắt (2 cái)
    for (const sy of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(R * 0.44, 10, 8), matHorn);
      socket.position.set(R * 0.55, R * 0.58 * sy, R * 0.92);
      headGroup.add(socket);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(R * 0.22, 8, 8), matGlow);
      pupil.position.set(R * 0.55, R * 0.58 * sy, R * 1.3);
      headGroup.add(pupil);

      const eyeLight = new THREE.PointLight(0x22c55e, 1.2, 150);
      eyeLight.position.copy(pupil.position);
      headGroup.add(eyeLight);
    }

    // Răng
    for (let t = 0; t < 6; t++) {
      const tx = R * 1.4 + t * R * 0.38;
      for (const sy of [-1, 1]) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(R * 0.1, R * 0.5, 4), matTooth);
        tooth.position.set(tx, R * 0.5 * sy, 0);
        tooth.rotation.z = sy * 0.4;
        headGroup.add(tooth);
      }
    }

    // Râu (2 tube Bezier)
    for (const sy of [-1, 1]) {
      const wPts = [
        new THREE.Vector3(R * 2.6, R * 0.3 * sy, 0),
        new THREE.Vector3(R * 4.8, R * 1.3 * sy, R * 0.6),
        new THREE.Vector3(R * 7.0, R * 0.7 * sy, R * 1.1),
        new THREE.Vector3(R * 8.5, R * 2.0 * sy, R * 0.4),
      ];
      const wCurve = new THREE.CatmullRomCurve3(wPts);
      const wGeo = new THREE.TubeGeometry(wCurve, 14, R * 0.065, 5, false);
      headGroup.add(new THREE.Mesh(wGeo, matWhisker));
    }

    /* ── Fire particles ── */
    const N_FIRE = 150;
    const firePos = new Float32Array(N_FIRE * 3);
    const fireGeo = new THREE.BufferGeometry();
    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    const firePts = new THREE.Points(fireGeo, matFire);
    scene.add(firePts);

    const fireData = Array.from({ length: N_FIRE }, () => ({
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      life: 99, maxLife: 1,
    }));
    let fireActive = false;

    /* ── Input ── */
    let mouseNDC = new THREE.Vector2(0, 0);
    let mouseActive = false;

    document.addEventListener('mousemove', e => {
      mouseNDC.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseNDC.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      mouseActive = true;
    });
    document.addEventListener('touchmove', e => {
      mouseNDC.x = (e.touches[0].clientX / window.innerWidth  - 0.5) * 2;
      mouseNDC.y = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
      mouseActive = true;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { mouseActive = false; });

    function triggerBoost(ex, ey) {
      const tx = (ex / window.innerWidth  - 0.5) * 2;
      const ty = -(ey / window.innerHeight - 0.5) * 2;
      targetAngle = Math.atan2(ty, tx);
      boosted = true;
      boostTimer = 90;
      // Kích hoạt lửa
      fireActive = true;
      matFire.opacity = 0.9;
      const tail = spine[N - 1];
      fireData.forEach(p => {
        p.x = tail.x; p.y = tail.y; p.z = tail.z;
        const spd = 5 + Math.random() * 10;
        const a = Math.random() * Math.PI * 2;
        p.vx = Math.cos(a) * spd;
        p.vy = Math.sin(a) * spd + 3;
        p.vz = (Math.random() - 0.5) * spd;
        p.life = 0;
        p.maxLife = 0.5 + Math.random() * 0.9;
      });
    }

    document.addEventListener('click', e => triggerBoost(e.clientX, e.clientY));
    document.addEventListener('touchstart', e => {
      triggerBoost(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    /* ── Resize ── */
    window.addEventListener('resize', () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });

    /* ── Update spine ── */
    const HW = () => window.innerWidth  / 2;
    const HH = () => window.innerHeight / 2;

    function updateSpine(dt) {
      wanderT += 0.013;

      if (mouseActive) {
        const wx = mouseNDC.x * HW();
        const wy = mouseNDC.y * HH();
        const dx = wx - spine[0].x, dy = wy - spine[0].y;
        if (Math.hypot(dx, dy) > 40) targetAngle = Math.atan2(dy, dx);
      } else {
        targetAngle = headAngle
          + Math.sin(wanderT * 0.9) * 0.055
          + Math.cos(wanderT * 0.42) * 0.025
          + 0.005;
      }

      let spd = SPD;
      if (boosted) {
        spd *= 4.0;
        boostTimer--;
        if (boostTimer <= 0) boosted = false;
      }

      let diff = targetAngle - headAngle;
      while (diff >  Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const ts = boosted ? TURN * 3.2 : TURN;
      headAngle += Math.sign(diff) * Math.min(Math.abs(diff), ts);

      // Di chuyển đầu
      let nx = spine[0].x + Math.cos(headAngle) * spd;
      let ny = spine[0].y + Math.sin(headAngle) * spd;
      const nz = Math.sin(wanderT * 1.4) * 35;

      // Wrap
      const mw = HW() + DIST * 4, mh = HH() + DIST * 4;
      if (nx < -mw) nx =  mw * 0.5;
      if (nx >  mw) nx = -mw * 0.5;
      if (ny < -mh) ny =  mh * 0.5;
      if (ny >  mh) ny = -mh * 0.5;

      spine[0].set(nx, ny, nz);

      // Chain
      for (let i = 1; i < N; i++) {
        const prev = spine[i - 1], cur = spine[i];
        const dx = prev.x - cur.x, dy = prev.y - cur.y, dz = prev.z - cur.z;
        const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (d > DIST) {
          const r = (d - DIST) / d;
          cur.x += dx * r;
          cur.y += dy * r;
          cur.z += dz * r;
        }
      }
    }

    /* ── Update body mesh ── */
    function updateBody() {
      // Rebuild curve & tube
      curve = new THREE.CatmullRomCurve3(spine.map(v => v.clone()));
      scene.remove(tubeMesh);
      tubeGeo.dispose();
      tubeGeo = new THREE.TubeGeometry(curve, N * 3, R, 10, false);
      tubeMesh = new THREE.Mesh(tubeGeo, matBody);
      scene.add(tubeMesh);

      // Update scales
      const up = new THREE.Vector3(0, 1, 0);
      scales.forEach(m => {
        const { t, ang } = m.userData;
        const pt  = curve.getPoint(t);
        const tan = curve.getTangent(t).normalize();
        const bi  = new THREE.Vector3().crossVectors(tan, up).normalize();
        const nor = new THREE.Vector3().crossVectors(bi, tan).normalize();
        const br = R * (1 - t * 0.62);
        const ox = (Math.cos(ang) * nor.x + Math.sin(ang) * bi.x) * br;
        const oy = (Math.cos(ang) * nor.y + Math.sin(ang) * bi.y) * br;
        const oz = (Math.cos(ang) * nor.z + Math.sin(ang) * bi.z) * br;
        m.position.set(pt.x + ox, pt.y + oy, pt.z + oz);
        m.lookAt(pt.x + ox * 2.5, pt.y + oy * 2.5, pt.z + oz * 2.5);
      });

      // Update head
      const hp = curve.getPoint(0);
      const ht = curve.getTangent(0).normalize();
      headGroup.position.copy(hp);
      headGroup.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), ht);
    }

    /* ── Update fire ── */
    function updateFire(dt) {
      if (!fireActive) return;
      let allDead = true;
      fireData.forEach((p, i) => {
        p.life += dt;
        if (p.life < p.maxLife) {
          allDead = false;
          p.x += p.vx * dt * 55;
          p.y += p.vy * dt * 55;
          p.z += p.vz * dt * 55;
          p.vy -= 0.12;
        }
        firePos[i * 3]     = p.x;
        firePos[i * 3 + 1] = p.y;
        firePos[i * 3 + 2] = p.z;
      });
      fireGeo.attributes.position.needsUpdate = true;
      if (allDead) {
        fireActive = false;
        matFire.opacity = 0;
      } else {
        matFire.opacity = Math.max(0, matFire.opacity - 0.015);
      }
    }

    /* ── Camera drift ── */
    function updateCamera() {
      if (mouseActive) {
        camera.position.x += (mouseNDC.x * 50 - camera.position.x) * 0.035;
        camera.position.y += (mouseNDC.y * 30 - camera.position.y) * 0.035;
      } else {
        camera.position.x *= 0.98;
        camera.position.y *= 0.98;
      }
      camera.lookAt(0, 0, 0);
    }

    /* ── Animate ── */
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      updateSpine(dt);
      updateBody();
      updateFire(dt);
      updateCamera();
      renderer.render(scene, camera);
    }
    animate();

    console.log('[Dragon3D] Initialized successfully ✓');
  }

})();

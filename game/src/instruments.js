// Instruments: the HUD chips and compass tape in the page, and the six
// steam gauges drawn onto the cockpit panel's canvas texture — airspeed,
// attitude, altimeter, heading, vertical speed, and power with fuel.
(function () {
  const KT = 1.94384, FT = 3.28084;
  let els = null;
  let panelCtx = null, panelTex = null, lastPanelDraw = 0;

  function cacheDom() {
    if (els) return els;
    const byId = (id) => document.getElementById(id);
    els = {
      alt: byId('hud-alt').querySelector('.value'),
      spd: byId('hud-spd').querySelector('.value'),
      hdg: byId('hud-hdg').querySelector('.value'),
      vsi: byId('hud-vsi').querySelector('.value'),
      thr: byId('hud-thr').querySelector('.value'),
      fuel: byId('hud-fuel').querySelector('.value'),
      fuelChip: byId('hud-fuel'),
      msg: byId('hud-msg'),
      sub: byId('hud-sub'),
      score: document.querySelector('#hud-score .score'),
      rings: document.querySelector('#hud-score .rings'),
      compass: byId('hud-compass'),
    };
    return els;
  }

  function headingDeg(f) {
    let d = Math.round(THREE.MathUtils.radToDeg(f.heading) % 360);
    if (d <= 0) d += 360;
    return d;
  }

  function compassTape(deg) {
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    const parts = [];
    for (let off = -45; off <= 45; off += 15) {
      let d = (deg + off + 360) % 360;
      const label = names[d] || String(Math.floor(d / 10)).padStart(2, '0');
      parts.push(off === 0 ? `[${label}]` : label);
    }
    return parts.join(' · ');
  }

  KA.updateHud = function (f, score, ringsDone, ringsTotal, msg, sub) {
    const e = cacheDom();
    e.alt.textContent = Math.max(0, Math.round((f.pos.y - KA.WORLD.seaLevel) * FT));
    e.spd.textContent = Math.round(f.speed * KT);
    e.hdg.textContent = headingDeg(f);
    e.vsi.textContent = Math.round(f.verticalSpeed * FT * 60);
    e.thr.textContent = Math.round(f.throttle * 100);
    e.fuel.textContent = Math.round(f.fuel);
    e.fuelChip.classList.toggle('low', f.fuel < 25);
    e.score.textContent = score;
    e.rings.textContent = `RINGS ${ringsDone} / ${ringsTotal}`;
    e.compass.textContent = compassTape(headingDeg(f));
    if (msg !== undefined) e.msg.textContent = msg;
    if (sub !== undefined) e.sub.textContent = sub;
  };

  // ---- Cockpit panel gauges (drawn on the aircraft's panel canvas) ----

  KA.bindPanel = function (plane) {
    panelCtx = plane.userData.panelCanvas.getContext('2d');
    panelTex = plane.userData.panelTex;
  };

  function dialFace(g, x, y, r, label) {
    g.save();
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = '#0d1b24';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#46565f';
    g.stroke();
    g.beginPath();
    g.arc(x, y, r - 3, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(159,212,232,0.25)';
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = '#9fd4e8';
    g.font = `600 ${Math.round(r * 0.22)}px Verdana, sans-serif`;
    g.textAlign = 'center';
    g.fillText(label, x, y + r * 0.62);
    g.restore();
  }

  function needle(g, x, y, r, angle, color) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.beginPath();
    g.moveTo(-r * 0.12, 0);
    g.lineTo(0, -r * 0.86);
    g.lineTo(r * 0.12, 0);
    g.closePath();
    g.fillStyle = color || '#ff8c42';
    g.fill();
    g.beginPath();
    g.arc(0, 0, r * 0.1, 0, Math.PI * 2);
    g.fillStyle = '#d8dee2';
    g.fill();
    g.restore();
  }

  function ticks(g, x, y, r, count, a0, a1, labels, fmt) {
    g.save();
    g.strokeStyle = '#e8f2f6';
    g.fillStyle = '#e8f2f6';
    g.font = `600 ${Math.round(r * 0.24)}px Verdana, sans-serif`;
    g.textAlign = 'center';
    for (let i = 0; i < count; i++) {
      const a = a0 + (a1 - a0) * (i / (count - 1));
      const x1 = x + Math.sin(a) * (r * 0.78), y1 = y - Math.cos(a) * (r * 0.78);
      const x2 = x + Math.sin(a) * (r * 0.92), y2 = y - Math.cos(a) * (r * 0.92);
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineWidth = 2.4; g.stroke();
      if (labels) {
        const lx = x + Math.sin(a) * (r * 0.55), ly = y - Math.cos(a) * (r * 0.55) + r * 0.09;
        g.fillText(fmt(i), lx, ly);
      }
    }
    g.restore();
  }

  KA.drawPanel = function (f, now) {
    if (!panelCtx || now - lastPanelDraw < 66) return;
    lastPanelDraw = now;
    const g = panelCtx;
    const W = 1024, H = 400;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#232d33');
    grad.addColorStop(1, '#141a1e');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffd98a';
    g.font = '700 25px Verdana, sans-serif';
    g.textAlign = 'center';
    g.fillText('KESTREL K-1', W / 2, 36);

    const R = 74;
    const spdKt = f.speed * KT;
    const altFt = Math.max(0, (f.pos.y - KA.WORLD.seaLevel) * FT);
    const vsFpm = f.verticalSpeed * FT * 60;
    const hdg = headingDeg(f);

    // Airspeed: 0..140 kt over 300 degrees.
    let x = 128, y = 128;
    dialFace(g, x, y, R, 'AIRSPEED');
    ticks(g, x, y, R, 8, -Math.PI * 0.83, Math.PI * 0.83, true, (i) => String(i * 20));
    needle(g, x, y, R, -Math.PI * 0.83 + (Math.min(spdKt, 140) / 140) * Math.PI * 1.66);

    // Attitude: a rolling horizon with a pitch ladder.
    x = 384;
    dialFace(g, x, y, R, 'ATTITUDE');
    g.save();
    g.beginPath(); g.arc(x, y, R - 5, 0, Math.PI * 2); g.clip();
    g.translate(x, y);
    g.rotate(-f.bank);
    const po = THREE.MathUtils.clamp(f.pitch, -0.6, 0.6) * 52;
    g.fillStyle = '#3a7ca8'; g.fillRect(-R, -R + po, R * 2, R * 2);
    g.fillStyle = '#7a5a34'; g.fillRect(-R, po, R * 2, R * 2);
    g.strokeStyle = '#ffffff'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(-R, po); g.lineTo(R, po); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1.6;
    for (const l of [-20, -10, 10, 20]) {
      const ly = po + l * 2.6;
      g.beginPath(); g.moveTo(-16, ly); g.lineTo(16, ly); g.stroke();
    }
    g.restore();
    g.save();
    g.translate(x, y);
    g.strokeStyle = '#ffd98a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-30, 0); g.lineTo(-9, 0); g.lineTo(0, 7); g.lineTo(9, 0); g.lineTo(30, 0); g.stroke();
    g.restore();

    // Altimeter: one hand, 0..3000 ft a turn.
    x = 640;
    dialFace(g, x, y, R, 'ALTIMETER');
    ticks(g, x, y, R, 7, 0, Math.PI * 2, true, (i) => String(i * 5));
    needle(g, x, y, R, ((altFt % 3000) / 3000) * Math.PI * 2);
    g.fillStyle = '#e8f2f6';
    g.font = '600 19px Verdana, sans-serif';
    g.fillText(`${Math.round(altFt)} FT`, x, y + 34);

    // Heading compass.
    x = 896;
    dialFace(g, x, y, R, 'HEADING');
    const card = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
    g.save();
    g.fillStyle = '#e8f2f6';
    g.font = '600 17px Verdana, sans-serif';
    g.textAlign = 'center';
    for (let dgr = 0; dgr < 360; dgr += 30) {
      const a = THREE.MathUtils.degToRad(dgr - (hdg - 1) + 0) ;
      const lx = x + Math.sin(a) * (R * 0.6), ly = y - Math.cos(a) * (R * 0.6) + 6;
      g.fillText(card[dgr] || String(dgr / 10), lx, ly);
    }
    g.restore();
    needle(g, x, y, R, 0, '#ffd98a');

    // Bottom row: vertical speed, power, fuel — three compact dials.
    y = 306;
    x = 256;
    dialFace(g, x, y, 62, 'VERT SPEED');
    ticks(g, x, y, 62, 5, -Math.PI * 0.75, Math.PI * 0.75, false);
    needle(g, x, y, 62, THREE.MathUtils.clamp(vsFpm / 2000, -1, 1) * Math.PI * 0.75);

    x = 512;
    dialFace(g, x, y, 62, 'POWER %');
    ticks(g, x, y, 62, 6, -Math.PI * 0.75, Math.PI * 0.75, false);
    needle(g, x, y, 62, -Math.PI * 0.75 + f.throttle * Math.PI * 1.5);

    x = 768;
    dialFace(g, x, y, 62, 'FUEL %');
    ticks(g, x, y, 62, 5, -Math.PI * 0.75, Math.PI * 0.75, false);
    needle(g, x, y, 62, -Math.PI * 0.75 + (f.fuel / 100) * Math.PI * 1.5, f.fuel < 25 ? '#ff5030' : '#ff8c42');

    panelTex.needsUpdate = true;
  };
})();

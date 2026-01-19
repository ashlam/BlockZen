const databus = require('../../databus');
const CFG = require('./retro_racer_config');

function spawnEntities() {
  const s = databus.state.retro;
  const now = Date.now();
  if (!s.lastSpawnTs) s.lastSpawnTs = now;
  const levelCfg = (CFG && CFG.levels || []).find(l => l.id === s.level) || (CFG.levels && CFG.levels[0]);
  const stages = (levelCfg && levelCfg.stages) || [];
  let stage = null;
  for (const st of stages) { if (s.distance <= (st.untilDistance || 0)) { stage = st; break; } }
  if (!stage && stages.length) stage = stages[stages.length - 1];
  const intervalCfg = (stage && stage.interval) || (CFG && CFG.spawns) || {};
  const baseRange = intervalCfg.baseIntervalMsRange;
  const reduceRange = intervalCfg.maxIntervalReduceMsRange;
  const base = Array.isArray(baseRange) ? (baseRange[0] + Math.random() * (baseRange[1] - baseRange[0])) : (intervalCfg.baseIntervalMs || 500);
  const reduceMax = Array.isArray(reduceRange) ? (reduceRange[0] + Math.random() * (reduceRange[1] - reduceRange[0])) : (intervalCfg.maxIntervalReduceMs || 300);
  const interval = base - Math.min(reduceMax, Math.floor(s.speed));
  if (now - s.lastSpawnTs < interval) return;
  s.lastSpawnTs = now;
  const lanes = s.track.lanes;
  const lane = Math.floor(Math.random() * lanes);
  const wtypes = (stage && stage.typesWeight) || ((CFG && CFG.spawns && CFG.spawns.typesWeight) || { car: 3, sport: 1, truck: 1, oil: 1 });
  const keys = Object.keys(wtypes);
  const sum = keys.reduce((acc, k) => acc + (wtypes[k] || 0), 0) || 1;
  let r = Math.random() * sum, t = keys[0];
  for (const k of keys) { r -= (wtypes[k] || 0); if (r <= 0) { t = k; break; } }
  const wLane = Math.floor(s.track.width / lanes);
  const baseX = s.track.left + lane * wLane;
  const x = baseX + Math.floor(wLane * 0.1);
  const w = t === 'truck' ? Math.floor(wLane * 0.9) : Math.floor(wLane * 0.8);
  const h = t === 'truck' ? 60 : 40;
  const vyBase = s.speed * 0.6 + (t === 'sport' ? 12 : (t === 'interceptor' ? 16 : 0));
  s.entities.push({ type: t, x, y: s.track.top - h, w, h, vx: 0, vy: vyBase });
  if (t === 'truck') {
    const prob = (stage && stage.truckDropCrateProb) || ((CFG && CFG.spawns && CFG.spawns.truckDropCrateProb) || 0.6);
    if (Math.random() < prob) {
      const boxW = Math.floor(wLane * 0.5);
      const boxX = baseX + Math.floor((wLane - boxW) / 2);
      s.entities.push({ type: 'crate', x: boxX, y: s.track.top - h - 40, w: boxW, h: 24, vx: 0, vy: vyBase });
    }
  }
  const pickupProbRange = stage && stage.pickupProbRange;
  const pickupProb = Array.isArray(pickupProbRange) ? (pickupProbRange[0] + Math.random() * (pickupProbRange[1] - pickupProbRange[0])) : ((stage && stage.pickupProb) || ((CFG && CFG.spawns && CFG.spawns.pickupProb) || 0.25));
  if (Math.random() < pickupProb) {
    const wpick = (stage && stage.pickupsWeight) || ((CFG && CFG.spawns && CFG.spawns.pickupsWeight) || { fuel: 1, med: 1, nitro: 1 });
    const pkeys = Object.keys(wpick);
    const psum = pkeys.reduce((acc, k) => acc + (wpick[k] || 0), 0) || 1;
    let pr = Math.random() * psum, ptype = pkeys[0];
    for (const k of pkeys) { pr -= (wpick[k] || 0); if (pr <= 0) { ptype = k; break; } }
    const pl = Math.floor(Math.random() * lanes);
    const px = s.track.left + pl * wLane + Math.floor(wLane * 0.35);
    s.pickups.push({ type: ptype, x: px, y: s.track.top - 24, w: 24, h: 24, vy: s.speed * 0.6 + 6 });
  }
}

function spawnScenery() {
  const s = databus.state.retro;
  const now = Date.now();
  if (!s.lastSceneryTs) s.lastSceneryTs = now;
  const interval = 180 - Math.min(120, Math.floor(s.speed * 0.3));
  if (now - s.lastSceneryTs < interval) return;
  s.lastSceneryTs = now;
  const leftEdge = s.track.left - 18;
  const rightEdge = s.track.left + s.track.width + 2;
  const speed1 = s.speed * 0.45;
  const speed2 = s.speed * 0.65;
  if (Math.random() < 0.6) {
    s.scenery.push({ type: 'treeL', x: leftEdge, y: s.track.top - 24, w: 16, h: 24, vy: speed1 });
    s.scenery.push({ type: 'treeR', x: rightEdge, y: s.track.top - 24, w: 16, h: 24, vy: speed1 });
  } else {
    s.scenery.push({ type: 'postL', x: leftEdge + 4, y: s.track.top - 20, w: 4, h: 20, vy: speed2 });
    s.scenery.push({ type: 'postR', x: rightEdge - 8, y: s.track.top - 20, w: 4, h: 20, vy: speed2 });
  }
  if ((s.distance - s.lastMarkerDist) >= 100) {
    s.lastMarkerDist = Math.floor(s.distance / 100) * 100;
    const markerX = s.track.left + s.track.width + 40;
    s.scenery.push({ type: 'marker', x: markerX, y: s.track.top - 16, w: 28, h: 16, vy: speed2, label: `${s.lastMarkerDist}m` });
  }
}

function updateRetro(dtMs) {
  const s = databus.state.retro;
  if (!s.running || s.scene !== 'retro_game') return;
  const dt = dtMs / 1000;
  const now = Date.now();
  const invuln = (now - s.invulnTs) < 3000;
  if (s.starting) {
    const elapsed = now - (s.startCountdownTs || now);
    if (elapsed < (s.startCountdownMs || 3000)) {
      s.speed = 0;
      return;
    } else {
      s.starting = false;
    }
  }
  s.speed = Math.min(s.maxSpeed, s.speed + s.accel * dtMs);
  s.dashOffset = (s.dashOffset || 0) + (s.speed * 0.5 * dt);
  const levelCfg = (CFG && CFG.levels || []).find(l => l.id === s.level) || (CFG.levels && CFG.levels[0]);
  const drainPerSec = (levelCfg && typeof levelCfg.fuelDrainPerSec === 'number') ? levelCfg.fuelDrainPerSec : 2;
  const drain = invuln ? 0 : (drainPerSec * dt);
  s.fuel = Math.max(0, s.fuel - drain);
  s.distance += s.speed * dt;
  spawnEntities();
  spawnScenery();
  s.entities = s.entities.filter(e => e.y < s.track.top + s.track.height + 100);
  for (const e of s.entities) e.y += e.vy * dt;
  s.pickups = s.pickups.filter(p => p.y < s.track.top + s.track.height + 100);
  for (const p of s.pickups) p.y += p.vy * dt;
  s.scenery = s.scenery.filter(o => o.y < s.track.top + s.track.height + 100);
  for (const o of s.scenery) o.y += o.vy * dt;
  // lateral movement handled in input
  const player = getPlayerRect();
  for (const e of s.entities) {
    if (rectOverlap(player, e)) {
      if (!invuln) {
        if (e.type === 'crate') {
          s.hp -= 20;
        } else if (e.type === 'truck') {
          s.hp -= 40;
        } else if (e.type === 'oil') {
          s.oilUntil = now + 1000;
        } else {
          s.hp -= 20;
        }
        if (e.type !== 'oil') {
          s.fuel = Math.max(0, s.fuel - (5 + Math.random() * 5));
          s.skidTs = now;
          const playerCenterX = player.x + player.w / 2;
          const enemyCenterX = e.x + e.w / 2;
          s.skidDir = enemyCenterX < playerCenterX ? -1 : 1;
        }
      }
    } else {
      const near = rectNear(player, e, 6);
      if (near) s.nearMiss += 1;
    }
  }
  for (let i = 0; i < s.pickups.length; i++) {
    const p = s.pickups[i];
    if (rectOverlap(player, p)) {
      if (p.type === 'fuel') s.fuel = Math.min(100, s.fuel + 25);
      if (p.type === 'med') s.hp = Math.min(100, s.hp + 30);
      if (p.type === 'nitro') { s.invulnTs = now; s.speed = s.maxSpeed + 60; }
      s.pickups.splice(i, 1); i--;
    }
  }
  if (s.skidTs && now - s.skidTs < s.rescueWindowMs) {
    if (s.lastDragXDelta && Math.sign(s.lastDragXDelta) !== Math.sign(s.skidDir || s.lastDragXDelta)) {
      s.invulnTs = now;
      s.hp = Math.min(100, s.hp + 6);
      s.skidTs = 0;
    }
  }
  if (s.fuel <= 0) {
    s.speed = Math.max(0, s.speed - 20 * dtMs);
  }
  if (s.hp <= 0 || (s.fuel <= 0 && s.speed < 5 && s.distance < s.targetDistance)) {
    try { wx.showToast && wx.showToast({ title: '失败', icon: 'none', duration: 1000 }); } catch(e) {}
    s.running = false;
    s.scene = 'retro_result';
    s.result.success = false;
    s.result.timeMs = now - s.startTs;
    s.result.distance = Math.floor(s.distance);
    s.result.nearMiss = s.nearMiss;
    s.result.score = Math.floor(s.distance + s.nearMiss * 10);
  } else if (s.distance >= s.targetDistance) {
    try { wx.showToast && wx.showToast({ title: '通关', icon: 'none', duration: 1000 }); } catch(e) {}
    s.running = false;
    s.scene = 'retro_result';
    s.result.success = true;
    s.result.timeMs = now - s.startTs;
    s.result.distance = Math.floor(s.distance);
    s.result.nearMiss = s.nearMiss;
    s.result.score = Math.floor(2000 + s.nearMiss * 20 - (100 - s.fuel) * 2);
  }
}

function rectOverlap(a, b) {
  return !(a.x > b.x + b.w || a.x + a.w < b.x || a.y > b.y + b.h || a.y + a.h < b.y);
}

function rectNear(a, b, pad) {
  return !(a.x > b.x + b.w + pad || a.x + a.w < b.x - pad || a.y > b.y + b.h + pad || a.y + a.h < b.y - pad);
}

function getPlayerRect() {
  const s = databus.state.retro;
  const w = Math.floor((s.track.width / s.track.lanes) * 0.75);
  const h = 42;
  const cx = (s.playerX || (s.track.left + s.track.width / 2));
  const x = Math.max(s.track.left + 2, Math.min(cx - w / 2, s.track.left + s.track.width - w - 2));
  const y = s.track.top + s.track.height - h - 8;
  return { x, y, w, h };
}

module.exports = {
  updateRetro,
  getPlayerRect
}

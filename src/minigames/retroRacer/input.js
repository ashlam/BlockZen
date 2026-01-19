const databus = require('../../databus');
const { resetRetro } = require('./retro_racer_state');

function handleMenuTouch(t) {
  const s = databus.state.retro;
  const b1 = s.ui.startBtn;
  if (b1 && hit(t, b1)) { resetRetro(1); return true; }
  const b2 = s.ui.garageBtn;
  if (b2 && hit(t, b2)) { return true; }
  const b3 = s.ui.rankBtn;
  if (b3 && hit(t, b3)) { return true; }
  return false;
}

function handleGameTouchStart(t) {
  const s = databus.state.retro;
  const center = s.playerX || (s.track.left + s.track.width / 2);
  s.playerBaseX = center;
  s.touchStartX = t.clientX;
  s.lastDragX = t.clientX;
  s.lastDragTs = Date.now();
  s.targetX = null;
  return true;
}

function handleGameTouchMove(t) {
  const s = databus.state.retro;
  if (s.lastDragX == null) return false;
  const now = Date.now();
  const oilActive = s.oilUntil && now < s.oilUntil;
  const deltaStart = t.clientX - (s.touchStartX || t.clientX);
  const deltaStep = t.clientX - s.lastDragX;
  const dxAbs = oilActive ? -deltaStart : deltaStart;
  const dxStep = oilActive ? -deltaStep : deltaStep;
  const minX = s.track.left + 2;
  const maxX = s.track.left + s.track.width - 2;
  const candidate = (s.playerBaseX || (s.track.left + s.track.width / 2)) + dxAbs;
  if (candidate >= minX && candidate <= maxX) {
    s.playerX = candidate;
    const dt = Math.max(1, now - s.lastDragTs);
    s.lastDragXDelta = dxStep / dt;
  } else {
    s.lastDragXDelta = 0;
  }
  s.lastDragX = t.clientX;
  s.lastDragTs = now;
  return true;
}

function handleGameTouchEnd(t) {
  const s = databus.state.retro;
  s.lastDragX = null;
  s.playerBaseX = null;
  s.touchStartX = null;
  return true;
}

function handleResultTouch(t) {
  const s = databus.state.retro;
  const rb = s.ui.restartBtn;
  if (rb && hit(t, rb)) { resetRetro(s.level || 1); return true; }
  const bb = s.ui.backBtn;
  if (bb && hit(t, bb)) { databus.state.scene = 'minigame_list'; s.scene = 'retro_menu'; return true; }
  return false;
}

function hit(t, r) {
  return t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h;
}

module.exports = {
  handleMenuTouch,
  handleGameTouchStart,
  handleGameTouchMove,
  handleGameTouchEnd,
  handleResultTouch
}

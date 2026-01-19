const databus = require('../../databus');
const shared = require('../../shared');
const { accentColor } = require('../../utils/theme');
const { getPlayerRect } = require('./retro_minigame_logic');

function drawRetroMenu(ctx) {
  const sw = shared.sw, sh = shared.sh;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, sw, sh);
  ctx.fillStyle = '#fff';
  ctx.font = '28px monospace';
  const title = 'Retro Racer';
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, (sw - tw) / 2, shared.safeTop + 64);
  const btnW = 220, btnH = 48;
  const x = (sw - btnW) / 2;
  let y = shared.safeTop + 120;
  ctx.fillStyle = accentColor();
  ctx.fillRect(x, y, btnW, btnH);
  ctx.fillStyle = '#000';
  ctx.font = '22px sans-serif';
  const t1 = '开始游戏';
  ctx.fillText(t1, x + (btnW - ctx.measureText(t1).width) / 2, y + 32);
  databus.state.retro.ui.startBtn = { x, y, w: btnW, h: btnH };
}

function drawRetroGame(ctx) {
  const s = databus.state.retro;
  const track = s.track;
  ctx.fillStyle = '#101820';
  ctx.fillRect(track.left - 16, track.top - 16, track.width + 32, track.height + 32);
  // lanes
  const laneW = Math.floor(track.width / track.lanes);
  ctx.strokeStyle = '#ccc';
  ctx.setLineDash([8, 12]);
  ctx.lineWidth = 2;
  ctx.lineDashOffset = -((databus.state.retro.dashOffset || 0) % 200);
  for (let i = 1; i < track.lanes; i++) {
    const x = track.left + i * laneW;
    ctx.beginPath();
    ctx.moveTo(x, track.top);
    ctx.lineTo(x, track.top + track.height);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // roadside scenery
  for (const o of s.scenery) {
    if (o.type === 'treeL' || o.type === 'treeR') {
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, o.y + o.h / 2, Math.min(o.w, o.h) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(o.x + o.w / 2 - 2, o.y + o.h / 2, 4, Math.floor(o.h / 2));
    } else if (o.type === 'postL' || o.type === 'postR') {
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(o.x, o.y, o.w, o.h);
    } else if (o.type === 'marker') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#000000';
      ctx.font = '12px monospace';
      ctx.fillText(o.label || '', o.x + 2, o.y + 12);
    }
  }
  // entities
  for (const e of s.entities) {
    if (e.type === 'truck') ctx.fillStyle = '#4caf50';
    else if (e.type === 'sport') ctx.fillStyle = '#e53935';
    else if (e.type === 'crate') ctx.fillStyle = '#8d6e63';
    else if (e.type === 'oil') ctx.fillStyle = '#212121';
    else ctx.fillStyle = '#607d8b';
    ctx.fillRect(e.x, e.y, e.w, e.h);
  }
  for (const p of s.pickups) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    if (p.type === 'fuel') {
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(p.x + 4, p.y + 6, p.w - 8, p.h - 12);
      ctx.fillStyle = '#9e9e9e';
      ctx.fillRect(p.x + p.w - 10, p.y + 4, 6, 6);
    } else if (p.type === 'med') {
      ctx.fillStyle = '#d32f2f';
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      ctx.fillRect(cx - 2, p.y + 6, 4, p.h - 12);
      ctx.fillRect(p.x + 6, cy - 2, p.w - 12, 4);
    } else if (p.type === 'nitro') {
      ctx.fillStyle = '#1976d2';
      ctx.beginPath();
      ctx.moveTo(p.x + p.w / 2, p.y + 4);
      ctx.lineTo(p.x + p.w - 6, p.y + p.h / 2);
      ctx.lineTo(p.x + p.w / 2, p.y + p.h - 4);
      ctx.lineTo(p.x + 6, p.y + p.h / 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  // player
  const pr = getPlayerRect();
  ctx.fillStyle = '#ffee58';
  ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
  // HUD
  drawRetroHUD(ctx);
  const cz = databus.state.retro.controlZone;
  if (cz) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cz.x, cz.y, cz.w, cz.h);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cz.x, cz.y, cz.w, cz.h);
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    const txt = '操作区：左右滑动';
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, cz.x + (cz.w - tw) / 2, cz.y + 28);
    ctx.restore();
  }
  const s2 = databus.state.retro;
  if (s2.starting) {
    const now = Date.now();
    const remain = Math.max(0, (s2.startCountdownMs || 3000) - (now - (s2.startCountdownTs || now)));
    const sec = Math.ceil(remain / 1000);
    const label = sec >= 1 ? `${sec}` : '开始';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(track.left, track.top, track.width, track.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px monospace';
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, track.left + (track.width - tw) / 2, track.top + track.height / 2);
    ctx.restore();
  }
}

function drawRetroHUD(ctx) {
  const s = databus.state.retro;
  const sw = shared.sw;
  const safeTop = shared.safeTop;
  // progress
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  const prog = Math.min(1, s.distance / s.targetDistance);
  ctx.fillText(`进度 ${(prog * 100).toFixed(1)}%`, 12, safeTop + 30);
  ctx.fillStyle = '#fff'; ctx.font = '18px monospace';
  const sp = `${Math.floor(s.speed)} km/h`;
  const tw = ctx.measureText(sp).width;
  ctx.fillText(sp, (sw - tw) / 2, safeTop + 40);
  const fuelStr = `FUEL ${Math.floor(s.fuel)}%`;
  const hpStr = `HP ${Math.floor(s.hp)}`;
  ctx.font = '16px monospace';
  const rightPad = 12;
  const lineY1 = safeTop + 96;
  const lineY2 = safeTop + 118;
  const fuelW = ctx.measureText(fuelStr).width;
  const hpW = ctx.measureText(hpStr).width;
  ctx.fillStyle = s.fuel <= 10 ? '#ff5252' : '#ffeb3b';
  ctx.fillText(fuelStr, sw - rightPad - fuelW, lineY1);
  ctx.fillStyle = '#f44336';
  ctx.fillText(hpStr, sw - rightPad - hpW, lineY2);
  if (s.hp <= 30) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,0,0,0.25)';
    ctx.fillRect(0, 0, sw, shared.sh);
    ctx.restore();
  }
}

function drawRetroResult(ctx) {
  const s = databus.state.retro;
  const sw = shared.sw, sh = shared.sh;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, sw, sh);
  const w = 280, h = 200, x = (sw - w) / 2, y = (sh - h) / 2;
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#000'; ctx.font = '24px sans-serif';
  const t = s.result.success ? '通关' : '失败';
  ctx.fillText(`游戏${t}`, x + 20, y + 40);
  ctx.font = '14px sans-serif';
  ctx.fillText('选择重来或退出', x + 20, y + 62);
  ctx.font = '16px monospace';
  ctx.fillText(`距离: ${s.result.distance}m`, x + 20, y + 88);
  ctx.fillText(`NearMiss: ${s.result.nearMiss}`, x + 20, y + 112);
  ctx.fillText(`得分: ${s.result.score}`, x + 20, y + 136);
  ctx.fillStyle = accentColor();
  ctx.fillRect(x + 20, y + h - 56, 100, 36);
  ctx.fillStyle = '#000'; ctx.font = '16px sans-serif';
  ctx.fillText('重来', x + 28, y + h - 32);
  databus.state.retro.ui.restartBtn = { x: x + 20, y: y + h - 56, w: 100, h: 36 };
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(x + 140, y + h - 56, 100, 36);
  ctx.fillStyle = '#fff';
  ctx.fillText('退出', x + 168, y + h - 32);
  databus.state.retro.ui.backBtn = { x: x + 140, y: y + h - 56, w: 100, h: 36 };
}

module.exports = {
  drawRetroMenu,
  drawRetroGame,
  drawRetroResult
}

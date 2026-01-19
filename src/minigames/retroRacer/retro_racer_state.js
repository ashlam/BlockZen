const databus = require('../../databus');
const shared = require('../../shared');
const CFG = require('./retro_racer_config');

function resetRetro(level) {
  const s = databus.state.retro;
  const levelCfg = (CFG && CFG.levels || []).find(l => l.id === level) || (CFG.levels && CFG.levels[0]);
  const lanes = (levelCfg && levelCfg.lanes) || 5;
  const target = (levelCfg && levelCfg.targetDistance) || 3000;
  const b = databus.state.board;
  const laneWidth = Math.floor((b.size * 0.6) / lanes);
  const trackWidth = laneWidth * lanes;
  const left = Math.floor(b.left + (b.size - trackWidth) / 2);
  const infoH = 80;
  const controlH = Math.floor(shared.sh * 0.22);
  const trackTop = shared.safeTop + infoH;
  const trackHeight = Math.max(120, shared.sh - trackTop - controlH - 12);
  databus.state.scene = 'retro_game';
  s.scene = 'retro_game';
  s.running = true;
  s.level = level;
  s.distance = 0;
  s.targetDistance = target;
  s.speed = 80;
  s.maxSpeed = (levelCfg && levelCfg.maxSpeed) || 220;
  s.accel = (levelCfg && levelCfg.accel) || 0.45;
  s.lateralSpeed = Math.max(240, laneWidth * 6);
  s.fuel = (levelCfg && typeof levelCfg.fuelInitial === 'number') ? levelCfg.fuelInitial : 100;
  s.hp = 100;
  s.invulnTs = 0;
  s.skidTs = 0;
  s.nearMiss = 0;
  s.entities = [];
  s.pickups = [];
  s.scenery = [];
  s.lastDragX = null;
  s.lastDragTs = 0;
  s.playerX = s.playerX || (left + trackWidth / 2);
  s.targetX = s.playerX;
  s.track = { lanes, width: trackWidth, left, top: trackTop, height: trackHeight };
  s.controlZone = { x: 0, y: shared.sh - controlH, w: shared.sw, h: controlH };
  s.result = { success: false, timeMs: 0, score: 0, distance: 0, nearMiss: 0 };
  s.startTs = Date.now();
  s.lastSpawnTs = 0;
  s.lastSceneryTs = 0;
  s.lastMarkerDist = 0;
  s.starting = true;
  s.startCountdownMs = 3000;
  s.startCountdownTs = Date.now();
}

module.exports = {
  resetRetro
}

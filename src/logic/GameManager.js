const databus = require('../databus');
const gameLogic = require('./GameLogic');
const { SCORE_CFG, CHALLENGES, COIN_CFG, ITEM_START_COUNT } = require('../config');
const rngManager = require('../../miniprogram/utils/rng');

class GameManager {
  
  initChallenge(ch) {
    const grid = [];
    for(let y=0;y<9;y++){
      const row=[];
      for(let x=0;x<9;x++){
        const box = Math.floor(x/3) + 3*Math.floor(y/3);
        row.push({ state: 'empty', anchored: false, symbol: '', box });
      }
      grid.push(row);
    }
    if(ch.board && Array.isArray(ch.board.occupied)){
      for(const [x,y] of ch.board.occupied){
        const c = grid[y][x];
        grid[y][x] = { state: 'filled', anchored: false, symbol: '', box: c.box };
      }
    }
    let movesLeft = null;
    let countOnlyAllowed = null;
    if(Array.isArray(ch.restrictions)){
      for(const r of ch.restrictions){
        if(r.type==='steps_limit') movesLeft = r.steps;
        if(r.type==='count_only_pieces') countOnlyAllowed = r.allowed;
      }
    }
    databus.state.grid = grid;
    databus.state.challenge = ch;
    databus.state.movesLeft = movesLeft;
    databus.state.countOnlyAllowed = countOnlyAllowed;
    databus.state.score = 0;
    databus.state.comboT = 0;
    databus.state.comboChain = 0;
    databus.state.prevStepHadClear = false;
    databus.state.turnAreas = 0;
    databus.state.turnHadClear = false;
    databus.state.taskProgress = { score: 0, areas: 0, comboTotal: 0, maxCombo: 0 };
  }

  onPlace(piece, gx, gy, pieceIndex) {
    const ok = gameLogic.tryPlace(piece, gx, gy);
    if (!ok) return false;
    
    if (typeof pieceIndex === 'number') {
      databus.state.pieces = databus.state.pieces.slice(0, pieceIndex).concat(databus.state.pieces.slice(pieceIndex + 1));
    }
    
    if (databus.state.audioPlace) { try { databus.state.audioPlace.stop(); } catch (e) {} try { databus.state.audioPlace.play(); } catch (e) {} }
    wx.vibrateShort();
    
    const res = gameLogic.findClears();
    const areasThisStep = (res.rows || 0) + (res.cols || 0) + (res.boxes || 0);
    databus.state.lastPlacementHadClear = res.clearedCount > 0;
    
    if (databus.state.challengeEnabled) {
      if (databus.state.movesLeft !== null) { databus.state.movesLeft = databus.state.movesLeft - 1; }
    }
    
    if (res.clearedCount > 0) {
      const grid = databus.state.grid.map(row => row.slice());
      databus.state.clearing = { cells: res.cells.slice(), ts: Date.now() };
      
      this.initClearFX(res.cells);
      this.initClearBurst(res.cells);
      this.initClearFlash(res);
      
      setTimeout(() => {
        const g2 = databus.state.grid.map(row => row.slice());
        for (const [x, y] of res.cells) { const c = g2[y][x]; g2[y][x] = { state: 'empty', anchored: c.anchored, symbol: '', box: c.box }; }
        databus.state.grid = g2;
        databus.state.clearing = { cells: [], ts: 0 };
      }, 300);
      
      const newChain = (databus.state.prevStepHadClear ? databus.state.comboChain : 0) + areasThisStep;
      databus.state.comboChain = newChain;
      if (newChain > databus.state.maxChainSession) databus.state.maxChainSession = newChain;
      databus.state.prevStepHadClear = true;
      databus.state.turnAreas += areasThisStep;
      databus.state.turnHadClear = true;
      
      const comboTypes = (res.rows > 0 ? 1 : 0) + (res.cols > 0 ? 1 : 0) + (res.boxes > 0 ? 1 : 0);
      const baseClear = SCORE_CFG.clearScorePerCell * res.clearedCount;
      const typeMul = SCORE_CFG.comboTypeMultiplier[comboTypes] || 1;
      const add = baseClear * typeMul;
      
      databus.state.score = databus.state.score + SCORE_CFG.placeBaseScore + add;
      
      const bucketNow = Math.floor(databus.state.score / COIN_CFG.scorePerCoin);
      if (bucketNow > databus.state.coinScoreBucket) { databus.state.coins += (bucketNow - databus.state.coinScoreBucket); databus.state.coinScoreBucket = bucketNow; }
      if (areasThisStep >= 3) { databus.state.coins += ((COIN_CFG.stepComboCoinMap && COIN_CFG.stepComboCoinMap[areasThisStep]) || 0); }
      
      if (databus.state.challengeEnabled) {
        const allowed = !databus.state.countOnlyAllowed || (piece.id && databus.state.countOnlyAllowed.includes(piece.id));
        const tp = { ...databus.state.taskProgress };
        if (allowed) { tp.score += SCORE_CFG.placeBaseScore + add; tp.areas += areasThisStep; }
        databus.state.taskProgress = tp;
      }
      
      if (databus.state.audioClear) { try { databus.state.audioClear.stop(); } catch (e) {} try { databus.state.audioClear.play(); } catch (e) {} }
      
      databus.state.grid = grid;
      if (databus.state.pieces.length === 0) { gameLogic.nextPieces(); }
      if (newChain > 1) { databus.state.comboShow = true; databus.state.comboTs = Date.now(); databus.state.comboAnimTs = Date.now(); }
    } else {
      databus.state.comboChain = 0;
      databus.state.prevStepHadClear = false;
      databus.state.score = databus.state.score + SCORE_CFG.placeBaseScore;
      
      const bucketNow2 = Math.floor(databus.state.score / COIN_CFG.scorePerCoin);
      if (bucketNow2 > databus.state.coinScoreBucket) { databus.state.coins += (bucketNow2 - databus.state.coinScoreBucket); databus.state.coinScoreBucket = bucketNow2; }
      
      if (databus.state.challengeEnabled) {
        const allowed = !databus.state.countOnlyAllowed || (piece.id && databus.state.countOnlyAllowed.includes(piece.id));
        const tp = { ...databus.state.taskProgress };
        if (allowed) { tp.score += SCORE_CFG.placeBaseScore; }
        databus.state.taskProgress = tp;
      }
    }
    
    if (databus.state.pieces.length === 0) { this.finalizeTurn(); }
    if (databus.state.challengeEnabled) { 
      this.afterStepFinalize(); 
    } else {
      const check = () => { if (!gameLogic.anyPlacementPossible()) { this.triggerFail(); } };
      if (databus.state.lastPlacementHadClear) {
        setTimeout(check, 320);
      } else {
        check();
      }
    }
    return true;
  }

  finalizeTurn() {
    if (databus.state.challengeEnabled) {
      databus.state.turnAreas = 0;
      databus.state.turnHadClear = false;
      databus.state.scanActive = true;
      databus.state.scanTs = Date.now();
      databus.state.turnsUsed = (databus.state.turnsUsed || 0) + 1;
      gameLogic.nextPieces();
    } else {
      let T = databus.state.comboT;
      if (databus.state.turnHadClear) { T = T + 1; } else { T = 0; }
      let add = 0;
      if (T >= 2) {
        let B = SCORE_CFG.comboBaseByT[T] || 0;
        if (T > 4) { B = SCORE_CFG.comboBaseByT[4]; for (let i = 5; i <= T; i++) { B += i * SCORE_CFG.comboIncrementPerT; } }
        add = B + databus.state.turnAreas * SCORE_CFG.comboAreaBonusPerArea;
      }
      databus.state.score = databus.state.score + add;
      
      if (databus.state.ui && databus.state.ui.showPower) {
        const coinAdd = (COIN_CFG && COIN_CFG.consecutiveComboCoinMap && COIN_CFG.consecutiveComboCoinMap[T]) || 0;
        databus.state.coins += coinAdd;
      }
      
      databus.state.turnAreas = 0;
      databus.state.turnHadClear = false;
      databus.state.scanActive = true;
      databus.state.scanTs = Date.now();
      
      if (T > databus.state.maxComboSession) databus.state.maxComboSession = T;
      databus.state.turnsUsed = (databus.state.turnsUsed || 0) + 1;
      
      gameLogic.nextPieces();
      
      if (!gameLogic.anyPlacementPossible()) {
        this.triggerFail();
      }
    }
  }

  afterStepFinalize() {
    let T = databus.state.comboT;
    if (databus.state.prevStepHadClear) { T = T + 1; } else { T = 0; }
    const tp = { ...databus.state.taskProgress };
    if (databus.state.prevStepHadClear) { tp.comboTotal += 1; }
    if (T > tp.maxCombo) { tp.maxCombo = T; }
    databus.state.comboT = T;
    if (T > databus.state.maxComboSession) databus.state.maxComboSession = T;
    
    if (databus.state.ui && databus.state.ui.showPower) {
      const coinAdd = (COIN_CFG && COIN_CFG.consecutiveComboCoinMap && COIN_CFG.consecutiveComboCoinMap[T]) || 0;
      databus.state.coins += coinAdd;
    }
    
    databus.state.taskProgress = tp;
    
    if (databus.state.challengeEnabled) {
      const doCheck = () => {
        if (databus.state.movesLeft !== null && databus.state.movesLeft <= 0) { this.triggerFail(); }
        if (!gameLogic.anyPlacementPossible()) { this.triggerFail(); }
        this.checkTasksComplete();
      };
      if (databus.state.lastPlacementHadClear) {
        setTimeout(doCheck, 320);
      } else {
        doCheck();
      }
    }
  }

  checkTasksComplete() {
    const ch = databus.state.challenge;
    if (!ch || !Array.isArray(ch.tasks)) return;
    const tp = databus.state.taskProgress;
    let done = true;
    for (const t of ch.tasks) {
      if (t.type === 'score_at_least' && tp.score < t.target) done = false;
      if (t.type === 'clear_areas_total' && tp.areas < t.target) done = false;
      if (t.type === 'combo_total' && tp.comboTotal < t.target) done = false;
      if (t.type === 'combo_consecutive' && tp.maxCombo < t.target) done = false;
    }
    if (done) { this.finish(true); }
  }

  triggerFail() {
    if (databus.state.failHintActive) return;
    databus.state.failHintActive = true;
    databus.state.failHintTs = Date.now();
    setTimeout(() => {
      databus.state.failHintActive = false;
      if (databus.state.challengeEnabled) { this.finish(false); } else { this.gameOverClassic(); }
    }, 300);
  }

  gameOverClassic() {
    wx.vibrateShort();
    this.addHistoryRecord(databus.state.powerModeEnabled ? 'power' : 'classic', databus.state.score, databus.state.maxChainSession, false, databus.state.gameStartTs, Date.now(), databus.state.turnsUsed || 0);
    wx.showModal({
      title: '',
      content: '游戏结束',
      confirmText: '重来',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          gameLogic.initGrid();
          gameLogic.nextPieces();
          databus.state.score = 0;
          databus.state.comboT = 0;
          databus.state.turnAreas = 0;
          databus.state.turnHadClear = false;
          databus.state.comboChain = 0;
          
          if(databus.state.powerModeEnabled){
             this.resetPowerMode();
          }

        } else {
          databus.state.scene = 'menu';
        }
      }
    });
  }

  finish(success = false) {
    wx.vibrateShort();
    this.addHistoryRecord('challenge', databus.state.score, databus.state.maxChainSession, success, databus.state.gameStartTs, Date.now(), databus.state.turnsUsed || 0);
    wx.showModal({
      title: '',
      content: success ? '挑战成功' : '挑战结束',
      confirmText: '重试',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          const ch = databus.state.challenge || CHALLENGES[0];
          this.initChallenge(ch);
          rngManager.initLevel(ch.levelId);
          gameLogic.nextPieces();
        } else {
          const ch = CHALLENGES[0];
          this.initChallenge(ch);
          rngManager.initLevel(ch.levelId);
          gameLogic.nextPieces();
        }
      }
    });
  }

  addHistoryRecord(mode, score, maxCombo, success, startTs, endTs, turns) {
    const rec = { mode, score, maxCombo, success: !!success, ts: endTs || Date.now(), startTs: startTs || 0, endTs: endTs || Date.now(), turns: turns || 0 };
    const list = Array.isArray(databus.state.historyRecords) ? databus.state.historyRecords.slice() : [];
    list.push(rec);
    list.sort((a, b) => b.score - a.score || b.ts - a.ts);
    databus.state.historyRecords = list.slice(0, 10);
    this.saveHistory();
  }

  saveHistory() {
    try {
      wx.setStorageSync('historyRecords', databus.state.historyRecords);
    } catch (e) {}
  }
  
  loadHistory() {
    try {
      const data = wx.getStorageSync('historyRecords') || [];
      if(Array.isArray(data)) databus.state.historyRecords = data;
    } catch(e) {}
  }

  resetPowerMode() {
    databus.state.coins = 0;
    databus.state.coinScoreBucket = 0;
    databus.state.powerUsageCount = { rotate: 0, dice: 0, redraw: 0 };
    databus.state.powerBar = [
        { type: 'rotate', count: (ITEM_START_COUNT && ITEM_START_COUNT.rotate) || 0 },
        { type: 'dice', count: (ITEM_START_COUNT && ITEM_START_COUNT.dice) || 0 },
        { type: 'redraw', count: (ITEM_START_COUNT && ITEM_START_COUNT.redraw) || 0 }
    ];
    databus.state.activePower = null;
    databus.state.awaitPowerPiece = false;
  }

  initClearBurst(cells) {
    const b = databus.state.board;
    if (!cells || cells.length === 0) return;
    let sx = 0, sy = 0;
    for (const [x, y] of cells) { sx += b.left + x * b.cell + b.cell / 2; sy += b.top + y * b.cell + b.cell / 2; }
    const cx = sx / cells.length;
    const cy = sy / cells.length;
    databus.state.clearBurst = { cx, cy, ts: Date.now(), duration: 400 };
  }

  initClearFlash(res) {
    const rows = (res.rowsFull || []);
    const cols = (res.colsFull || []);
    const boxes = (res.boxesFull || []);
    databus.state.clearFlash = { rows, cols, boxes, ts: Date.now(), duration: 250 };
  }

  initClearFX(cells) {
    const b = databus.state.board;
    const parts = [];
    const now = Date.now();
    for (const [x, y] of cells) {
      const cx = b.left + x * b.cell + b.cell / 2;
      const cy = b.top + y * b.cell + b.cell / 2;
      for (let i = 0; i < 12; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = b.cell * (0.35 + Math.random() * 0.45);
        const sz = 2 + Math.floor(Math.random() * 3);
        parts.push({ cx, cy, ang, sp, sz });
      }
    }
    databus.state.clearFX = { parts, ts: now, duration: 450 };
  }
}

module.exports = new GameManager();

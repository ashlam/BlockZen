/**
 * GameManager
 * 游戏流程控制层：处理放置后结算、连击与分数、金币获得、失败判定、挑战任务完成、历史记录等。
 * 依赖 GameLogic 执行纯规则计算。
 */
const databus = require('../databus');
const gameLogic = require('./GameLogic');
const { SCORE_CFG, CHALLENGES, COIN_CFG, ITEM_START_COUNT } = require('../config');
const rngManager = require('../../miniprogram/utils/rng');

class GameManager {
  
  makeSnapshot() {
    return {
      grid: databus.state.grid.map(r => r.slice()),
      pieces: databus.state.pieces.map(p => ({ ...p, cells: p.cells.map(c => c.slice()) })),
      score: databus.state.score,
      comboT: databus.state.comboT,
      comboChain: databus.state.comboChain,
      prevStepHadClear: databus.state.prevStepHadClear,
      turnAreas: databus.state.turnAreas,
      turnHadClear: databus.state.turnHadClear,
      lastPlacementHadClear: databus.state.lastPlacementHadClear,
      coins: databus.state.coins,
      coinScoreBucket: databus.state.coinScoreBucket,
      taskProgress: { ...databus.state.taskProgress },
      movesLeft: databus.state.movesLeft,
      rngState: rngManager.getState()
    };
  }

  /**
   * 初始化挑战关卡状态
   * @param {object} ch 关卡配置
   */
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

  /**
   * 执行放置操作与结算
   * @param {object} piece 待放置零件
   * @param {number} gx 格坐标x
   * @param {number} gy 格坐标y
   * @param {number} pieceIndex 托盘索引（用于移除）
   * @returns {boolean} 是否成功放置
   */
  onPlace(piece, gx, gy, pieceIndex) {
    const prev = this.makeSnapshot();
    // 1) 规则层判定：该零件在 (gx,gy) 是否可放置，并写入到棋盘临时网格
    const ok = gameLogic.tryPlace(piece, gx, gy);
    if (!ok) return false;
    databus.state.undoPrev = prev;
    
    // 2) 从托盘移除该零件（确保后续“托盘是否为空”判断正确）
    if (typeof pieceIndex === 'number') {
      databus.state.pieces = databus.state.pieces.slice(0, pieceIndex).concat(databus.state.pieces.slice(pieceIndex + 1));
    }
    
    // 3) 落子反馈：音效与震动
    if (databus.state.audioPlace) { try { databus.state.audioPlace.stop(); } catch (e) {} try { databus.state.audioPlace.play(); } catch (e) {} }
    wx.vibrateShort();
    
    // 4) 统计本步产生的消除（行/列/3x3），并记录“本步是否有清除”
    const res = gameLogic.findClears();
    const areasThisStep = (res.rows || 0) + (res.cols || 0) + (res.boxes || 0);
    databus.state.lastPlacementHadClear = res.clearedCount > 0;
    
    // 挑战模式：每步扣减剩余步数（若有限）
    if (databus.state.challengeEnabled) {
      if (databus.state.movesLeft !== null) { databus.state.movesLeft = databus.state.movesLeft - 1; }
    }
    
    if (res.clearedCount > 0) {
      // 5) 触发清除特效：碎片、圆环、闪烁，并在 300ms 后真正把格子清空
      const grid = databus.state.grid.map(row => row.slice());
      databus.state.clearing = { cells: res.cells.slice(), ts: Date.now() };
      
      this.initClearFX(res.cells);
      this.initClearBurst(res.cells);
      this.initClearFlash(res);
      const token = (databus.state.placeToken || 0) + 1;
      databus.state.placeToken = token;
      
      setTimeout(() => {
        if (databus.state.placeToken !== token) return;
        const g2 = databus.state.grid.map(row => row.slice());
        for (const [x, y] of res.cells) { const c = g2[y][x]; g2[y][x] = { state: 'empty', anchored: c.anchored, symbol: '', box: c.box }; }
        databus.state.grid = g2;
        databus.state.clearing = { cells: [], ts: 0 };
      }, 300);
      
      // 6) 单步连击累计与回合统计（areasThisStep 累加）
      const newChain = (databus.state.prevStepHadClear ? databus.state.comboChain : 0) + areasThisStep;
      databus.state.comboChain = newChain;
      if (newChain > databus.state.maxChainSession) databus.state.maxChainSession = newChain;
      databus.state.prevStepHadClear = true;
      databus.state.turnAreas += areasThisStep;
      databus.state.turnHadClear = true;
      
      // 7) 本步得分：清除格子数 * 类型倍率 + 落子基础分
      const comboTypes = (res.rows > 0 ? 1 : 0) + (res.cols > 0 ? 1 : 0) + (res.boxes > 0 ? 1 : 0);
      const baseClear = SCORE_CFG.clearScorePerCell * res.clearedCount;
      const typeMul = SCORE_CFG.comboTypeMultiplier[comboTypes] || 1;
      const add = baseClear * typeMul;
      
      databus.state.score = databus.state.score + SCORE_CFG.placeBaseScore + add;
      
      // 8) 金币结算：按分数分桶与“步内连击”奖励增加金币
      const bucketNow = Math.floor(databus.state.score / COIN_CFG.scorePerCoin);
      if (bucketNow > databus.state.coinScoreBucket) { databus.state.coins += (bucketNow - databus.state.coinScoreBucket); databus.state.coinScoreBucket = bucketNow; }
      if (areasThisStep >= 3) { databus.state.coins += ((COIN_CFG.stepComboCoinMap && COIN_CFG.stepComboCoinMap[areasThisStep]) || 0); }
      
      // 9) 挑战模式：仅在允许计数的零件下累计任务进度
      if (databus.state.challengeEnabled) {
        const allowed = !databus.state.countOnlyAllowed || (piece.id && databus.state.countOnlyAllowed.includes(piece.id));
        const tp = { ...databus.state.taskProgress };
        if (allowed) { tp.score += SCORE_CFG.placeBaseScore + add; tp.areas += areasThisStep; }
        databus.state.taskProgress = tp;
      }
      
      // 10) 清除音效；如果托盘已空则立即补新三枚；多段连击时显示弹框特效
      if (databus.state.audioClear) { try { databus.state.audioClear.stop(); } catch (e) {} try { databus.state.audioClear.play(); } catch (e) {} }
      
      databus.state.grid = grid;
      if (databus.state.pieces.length === 0) { gameLogic.nextPieces(); }
      if (newChain > 1) { databus.state.comboShow = true; databus.state.comboTs = Date.now(); databus.state.comboAnimTs = Date.now(); }
    } else {
      // 无清除：重置本步连击链，按落子基础分计分，并处理分桶金币
      databus.state.comboChain = 0;
      databus.state.prevStepHadClear = false;
      databus.state.score = databus.state.score + SCORE_CFG.placeBaseScore;
      
      const bucketNow2 = Math.floor(databus.state.score / COIN_CFG.scorePerCoin);
      if (bucketNow2 > databus.state.coinScoreBucket) { databus.state.coins += (bucketNow2 - databus.state.coinScoreBucket); databus.state.coinScoreBucket = bucketNow2; }
      
      // 挑战模式：在允许计数的零件下累计“得分”任务
      if (databus.state.challengeEnabled) {
        const allowed = !databus.state.countOnlyAllowed || (piece.id && databus.state.countOnlyAllowed.includes(piece.id));
        const tp = { ...databus.state.taskProgress };
        if (allowed) { tp.score += SCORE_CFG.placeBaseScore; }
        databus.state.taskProgress = tp;
      }
    }
    
    // 托盘空：回合结束（跨步连击加分与金币在 finalizeTurn 中处理）
    if (databus.state.pieces.length === 0) { this.finalizeTurn(); }
    // 挑战模式：在 afterStepFinalize 中统一检查失败/完成；否则经典/道具模式立即检查是否无解
    if (databus.state.challengeEnabled) { 
      this.afterStepFinalize(); 
    } else {
      // 产生清除时延迟一段动画时间后再做无解判定；否则立即判定
      const check = () => { if (!gameLogic.anyPlacementPossible()) { this.triggerFail(); } };
      if (databus.state.lastPlacementHadClear) {
        setTimeout(check, 320);
      } else {
        check();
      }
    }
    return true;
  }

  undoLast() {
    const s = databus.state.undoPrev;
    if (!s) return;
    databus.state.grid = s.grid.map(r => r.slice());
    databus.state.pieces = s.pieces.map(p => ({ ...p, cells: p.cells.map(c => c.slice()) }));
    databus.state.score = s.score;
    databus.state.comboT = s.comboT;
    databus.state.comboChain = s.comboChain;
    databus.state.prevStepHadClear = s.prevStepHadClear;
    databus.state.turnAreas = s.turnAreas;
    databus.state.turnHadClear = s.turnHadClear;
    databus.state.lastPlacementHadClear = s.lastPlacementHadClear;
    databus.state.coins = s.coins;
    databus.state.coinScoreBucket = s.coinScoreBucket;
    databus.state.taskProgress = { ...s.taskProgress };
    databus.state.movesLeft = s.movesLeft;
    databus.state.clearing = { cells: [], ts: 0 };
    databus.state.clearFX = { parts: [], ts: 0, duration: 450 };
    databus.state.clearBurst = { cx: 0, cy: 0, ts: 0, duration: 400 };
    databus.state.clearFlash = { rows: [], cols: [], boxes: [], ts: 0, duration: 250 };
    databus.state.comboShow = false;
    databus.state.placeToken = (databus.state.placeToken || 0) + 1;
    databus.state.undoPrev = null;
    rngManager.restoreState(s.rngState);
  }
  /**
   * 回合结束：刷新托盘、处理跨步连击加分与金币
   */
  finalizeTurn() {
    // 挑战模式：只刷新托盘与进度动画，不计算跨步连击加分
    if (databus.state.challengeEnabled) {
      databus.state.turnAreas = 0;
      databus.state.turnHadClear = false;
      databus.state.scanActive = true;
      databus.state.scanTs = Date.now();
      databus.state.turnsUsed = (databus.state.turnsUsed || 0) + 1;
      gameLogic.nextPieces();
    } else {
      // 经典/道具模式：处理跨步连击 T、计算额外加分与金币
      let T = databus.state.comboT;
      if (databus.state.turnHadClear) { T = T + 1; } else { T = 0; }
      let add = 0;
      if (T >= 2) {
        // 组合公式：基础值 B + 本回合清除区域数 * 每区域加成
        let B = SCORE_CFG.comboBaseByT[T] || 0;
        if (T > 4) { B = SCORE_CFG.comboBaseByT[4]; for (let i = 5; i <= T; i++) { B += i * SCORE_CFG.comboIncrementPerT; } }
        add = B + databus.state.turnAreas * SCORE_CFG.comboAreaBonusPerArea;
      }
      databus.state.score = databus.state.score + add;
      
      // 跨步连击对应的金币奖励
      if (databus.state.ui && databus.state.ui.showPower) {
        const coinAdd = (COIN_CFG && COIN_CFG.consecutiveComboCoinMap && COIN_CFG.consecutiveComboCoinMap[T]) || 0;
        databus.state.coins += coinAdd;
      }
      
      // 重置本回合状态，开启扫描动画
      databus.state.turnAreas = 0;
      databus.state.turnHadClear = false;
      databus.state.scanActive = true;
      databus.state.scanTs = Date.now();
      
      // 记录最大跨步连击
      if (T > databus.state.maxComboSession) databus.state.maxComboSession = T;
      databus.state.turnsUsed = (databus.state.turnsUsed || 0) + 1;
      
      // 刷新三枚新零件
      gameLogic.nextPieces();
      
      // 刷新后如果仍无任何可放置位置，判定失败
      if (!gameLogic.anyPlacementPossible()) {
        this.triggerFail();
      }
    }
  }

  /**
   * 每步后更新挑战任务进度与失败判定
   */
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

  /**
   * 检查挑战任务完成
   */
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

  /**
   * 触发失败提示与结束
   */
  triggerFail() {
    if (databus.state.failHintActive) return;
    databus.state.failHintActive = true;
    databus.state.failHintTs = Date.now();
    setTimeout(() => {
      databus.state.failHintActive = false;
      if (databus.state.challengeEnabled) { this.finish(false); } else { this.gameOverClassic(); }
    }, 300);
  }

  /**
   * 经典模式结束回调与“重来”
   */
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

  /**
   * 挑战模式结束回调与“重试”
   */
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

  /**
   * 历史记录新增并持久化
   */
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

  /**
   * 重置道具模式数据（金币/使用次数/赠送库存）
   */
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

  /**
   * 清除特效（爆炸圆环中心）
   */
  initClearBurst(cells) {
    const b = databus.state.board;
    if (!cells || cells.length === 0) return;
    let sx = 0, sy = 0;
    for (const [x, y] of cells) { sx += b.left + x * b.cell + b.cell / 2; sy += b.top + y * b.cell + b.cell / 2; }
    const cx = sx / cells.length;
    const cy = sy / cells.length;
    databus.state.clearBurst = { cx, cy, ts: Date.now(), duration: 400 };
  }

  /**
   * 清除特效（行列/3x3 闪烁）
   */
  initClearFlash(res) {
    const rows = (res.rowsFull || []);
    const cols = (res.colsFull || []);
    const boxes = (res.boxesFull || []);
    databus.state.clearFlash = { rows, cols, boxes, ts: Date.now(), duration: 250 };
  }

  /**
   * 清除特效（碎片飞散）
   */
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

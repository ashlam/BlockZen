/**
 * DataBus
 * 全局状态总线（单例），用于在渲染层、输入层、逻辑层之间共享游戏状态。
 * 成员说明：
 * - state.grid: 9x9 棋盘格状态矩阵
 * - state.pieces: 托盘中的当前零件列表（最多3个）
 * - state.score/coins: 当前分数与金币
 * - state.comboT/comboChain: T 连击（跨步）、单步内连击累计
 * - state.turnAreas/turnHadClear: 当前回合产生的消除区域数与是否有消除
 * - state.scene: 当前界面（menu/game/history/settings/...）
 * - state.ui: 界面开关（是否显示道具栏/取消区等）
 * 其他字段见 reset() 初始化。
 */
const shared = require('./shared.js');

class DataBus {
  /**
   * 构造函数，初始化状态
   */
  constructor() {
    this.reset();
  }

  reset() {
    /**
     * 游戏全局状态对象
     */
    this.state = {
      grid: [],
      score: 0,
      comboT: 0,
      comboChain: 0,
      prevStepHadClear: false,
      turnAreas: 0,
      turnHadClear: false,
      pieces: [],
      dragging: false,
      drag: { x: 0, y: 0, cells: [], color: '#fff', gx: 0, gy: 0 },
      board: { left: 0, top: 0, size: 0, cell: 0 },
      tray: { rects: [] },
      comboShow: false,
      comboTs: 0,
      challengeEnabled: true,
      powerModeEnabled: false,
      challenge: null,
      movesLeft: null,
      countOnlyAllowed: null,
      taskProgress: { score: 0, areas: 0, comboTotal: 0, maxCombo: 0 },
      scene: 'menu',
      menuButtons: [],
      backButton: null,
      failHintActive: false,
      failHintTs: 0,
      scanActive: false,
      scanTs: 0,
      clearing: { cells: [], ts: 0 },
      comboAnimTs: 0,
      audioPlace: null,
      audioClear: null,
      lastPlacementHadClear: false,
      menuBg: null,
      menuBgReady: false,
      clearFX: { parts: [], ts: 0, duration: 450 },
      clearBurst: { cx: 0, cy: 0, ts: 0, duration: 400 },
      clearFlash: { rows: [], cols: [], boxes: [], ts: 0, duration: 250 },
      blinkClear: { cells: [], ts: 0, duration: 0 },
      scoreHints: [],
      moveMode: 'relative',
      howtoScroll: 0,
      howtoTouchY: null,
      historyRecords: [],
      historyScroll: 0,
      historyTouchY: null,
      maxComboSession: 0,
      maxChainSession: 0,
      historyButtons: [],
      historySelectedIndex: null,
      historyCategory: 'classic',
      historyTabBtns: [],
      gameStartTs: 0,
      turnsUsed: 0,
      historyClearBtn: null,
      cancelZone: null,
      powerBar: [],
      powerRects: [],
      activePower: null,
      awaitPowerPiece: false,
      powerDiceNew: null,
      powerOverlay: { visible: false, type: null, pieceIndex: null, tempPiece: null, diceNewPiece: null, choice: 'original', buttons: [] },
      ui: { showBoard: true, showTray: true, showPower: false, showCancel: true },
      coins: 0,
      coinScoreBucket: 0,
      rescueRerollsLeft: 0,
      powerUsageCount: { rotate: 0, dice: 0, redraw: 0 },
      powerBuyBtn: null,
      undoPrev: null,
      undoButton: null,
      placeToken: 0,
      relativeOffsetCells: { x: 0, y: 0 },
      experimentalModeEnabled: false,
      crisisActive: false,
      crisisTurnsLeft: 0,
      crisisThreshold: 0.8,
      crisisMultiplier: 3,
      bombClearing: { cells: [], ts: 0, duration: 0 }
    };

    // Link state to shared for backward compatibility during refactor
    shared.state = this.state;
    this.state.retro = {
      scene: 'retro_menu',
      running: false,
      level: 1,
      distance: 0,
      targetDistance: 3000,
      speed: 0,
      maxSpeed: 220,
      accel: 0.45,
      lateralSpeed: 9,
      fuel: 100,
      hp: 100,
      invulnTs: 0,
      skidTs: 0,
      rescueWindowMs: 500,
      nearMiss: 0,
      entities: [],
      pickups: [],
      scenery: [],
      lastDragX: null,
      lastDragTs: 0,
      targetX: null,
      oilUntil: 0,
      dashOffset: 0,
      lastSceneryTs: 0,
      lastMarkerDist: 0,
      track: { lanes: 5, width: 0, left: 0, top: 0, height: 0 },
      controlZone: null,
      ui: { startBtn: null, garageBtn: null, rankBtn: null },
      result: { success: false, timeMs: 0, score: 0, distance: 0, nearMiss: 0 }
      , starting: false
      , startCountdownMs: 3000
      , startCountdownTs: 0
    };
  }
}

const instance = new DataBus();
module.exports = instance;

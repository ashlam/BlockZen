const shared = require('./shared.js');

class DataBus {
  constructor() {
    this.reset();
  }

  reset() {
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
      powerUsageCount: { rotate: 0, dice: 0, redraw: 0 },
      powerBuyBtn: null
    };

    // Link state to shared for backward compatibility during refactor
    shared.state = this.state;
  }
}

const instance = new DataBus();
module.exports = instance;

/**
 * InputHandler
 * 输入处理器：统一处理微信触摸事件，将交互分发到菜单、关卡、设置、历史记录、道具栏与游戏拖拽。
 */
const databus = require('../databus');
const gameLogic = require('../logic/GameLogic');
const gameManager = require('../logic/GameManager');
const rngManager = require('../../miniprogram/utils/rng');
const { ITEM_BUY_CFG, ITEM_COST_CFG, CHALLENGES } = require('../config');
const { applyTheme } = require('../utils/theme');

class InputHandler {
  /**
   * 注册事件处理
   */
  init() {
    wx.onTouchStart(this.onTouchStart.bind(this));
    wx.onTouchMove(this.onTouchMove.bind(this));
    wx.onTouchEnd(this.onTouchEnd.bind(this));
  }

  /**
   * 触摸开始：优先处理弹窗/菜单/子界面/道具栏，其次进入拖拽
   */
  onTouchStart(e) {
    const t = e.changedTouches[0];
    const state = databus.state;

    // 1. Power Overlay
    if (state.powerOverlay && state.powerOverlay.visible) {
      this.handleOverlayTouch(t);
      return;
    }

    // 2. Menu Scene
    if (state.scene === 'menu') {
      this.handleMenuTouch(t);
      return;
    }

    // 3. Level Select
    if (state.scene === 'levelSelect') {
      this.handleLevelSelectTouch(t);
      return;
    }

    // 4. Settings
    if (state.scene === 'settings') {
      this.handleSettingsTouch(t);
      return;
    }

    // 5. History
    if (state.scene === 'history') {
      this.handleHistoryTouch(t);
      return;
    }

    // 6. Back Button (Global for sub-scenes)
    if (state.backButton) {
      const r = state.backButton;
      if (t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h) {
        state.scene = 'menu';
        state.howtoScroll = 0;
        return;
      }
    }

    // 7. Power Bar (In Game)
    if (state.ui && state.ui.showPower && !state.dragging && !state.awaitPowerPiece) {
      if (this.handlePowerBarTouch(t)) return;
    }

    // 8. Tray / Dragging (In Game)
    this.handleTrayTouch(t);
  }

  /**
   * 触摸移动：拖拽过程中更新格坐标（相对/普通两种模式）
   */
  onTouchMove(e) {
    const state = databus.state;
    if (!state.dragging) return;
    const t = e.changedTouches[0];
    const b = state.board;

    if (state.scene === 'howto') {
      if (state.howtoTouchY == null) state.howtoTouchY = t.clientY;
      const dy = t.clientY - state.howtoTouchY;
      state.howtoTouchY = t.clientY;
      state.howtoScroll = Math.max(0, state.howtoScroll - dy);
      return;
    }
    if (state.scene === 'history') {
      if (state.historyTouchY == null) state.historyTouchY = t.clientY;
      const dy = t.clientY - state.historyTouchY;
      state.historyTouchY = t.clientY;
      state.historyScroll = Math.max(0, state.historyScroll - dy);
      return;
    }

    let gx, gy;
    if (state.moveMode === 'relative' && state.drag.mode === 'relative') {
      const dxCells = Math.round((t.clientX - state.drag.refX) / b.cell);
      const dyCells = Math.round((t.clientY - state.drag.refY) / b.cell);
      gx = state.drag.startGx + dxCells;
      gy = state.drag.startGy + dyCells;
    } else {
      const localX = t.clientX - b.left;
      const localY = t.clientY - b.top;
      gx = Math.round(localX / b.cell) - Math.floor(state.drag.w / 2);
      gy = Math.round(localY / b.cell) - Math.floor(state.drag.h / 2);
    }
    if (gx < 0) gx = 0; if (gy < 0) gy = 0;
    if (gx > 9 - state.drag.w) gx = 9 - state.drag.w;
    if (gy > 9 - state.drag.h) gy = 9 - state.drag.h;
    state.drag.gx = gx;
    state.drag.gy = gy;
  }

  /**
   * 触摸结束：尝试放置；相对模式在取消区松手则取消拖拽
   */
  onTouchEnd(e) {
    const state = databus.state;
    if (!state.dragging) return;
    const t = e.changedTouches[0];
    const b = state.board;

    if (state.scene === 'howto') {
      state.dragging = false;
      state.howtoTouchY = null;
      state.drag = { x: 0, y: 0, cells: [] };
      return;
    }
    if (state.scene === 'history') {
      state.dragging = false;
      state.historyTouchY = null;
      state.drag = { x: 0, y: 0, cells: [] };
      return;
    }

    if (state.moveMode !== 'relative') {
      if (!(t.clientX >= b.left && t.clientX <= b.left + b.size && t.clientY >= b.top && t.clientY <= b.top + b.size)) {
        state.dragging = false; state.drag = { x: 0, y: 0, cells: [] }; return;
      }
    }

    if (state.moveMode === 'relative' && state.drag.mode === 'relative') {
      const z = state.cancelZone;
      const inCancel =
        z && t.clientX >= z.x && t.clientX <= z.x + z.w && t.clientY >= z.y && t.clientY <= z.y + z.h;
      if (inCancel) {
        state.dragging = false;
        state.drag = { x: 0, y: 0, cells: [] };
        return;
      }
    }

    const piece = state.pieces[state.drag.index];
    const ok = gameManager.onPlace(piece, state.drag.gx, state.drag.gy, state.drag.index);
    
    state.dragging = false;
    state.drag = { x: 0, y: 0, cells: [] };
  }

  // Helper methods for touch handling
  /**
   * 处理道具弹窗点击
   */
  handleOverlayTouch(t) {
    const state = databus.state;
    const ov = state.powerOverlay;
    for (const b of ov.buttons || []) {
      if (t.clientX >= b.x && t.clientX <= b.x + b.w && t.clientY >= b.y && t.clientY <= b.y + b.h) {
        if (ov.type === 'rotate') {
          if (b.type === 'rotate') {
            const p = ov.tempPiece;
            ov.tempPiece = gameLogic.rotatePiece(p);
            state.powerOverlay = ov;
            return;
          } else if (b.type === 'confirm') {
            const idx = ov.pieceIndex;
            state.pieces = state.pieces.map((q, qi) => qi === idx ? ov.tempPiece : q);
            state.powerOverlay = { visible: false, type: null, pieceIndex: null, tempPiece: null, diceNewPiece: null, choice: 'original', buttons: [] };
            state.activePower = null; state.awaitPowerPiece = false;
            if (!gameLogic.anyPlacementPossible()) { gameManager.triggerFail(); }
            return;
          }
        } else if (ov.type === 'dice') {
          if (b.type === 'choose_original') { ov.choice = 'original'; state.powerOverlay = ov; return; }
          if (b.type === 'choose_new') { ov.choice = 'new'; state.powerOverlay = ov; return; }
          if (b.type === 'confirm') {
            const idx = ov.pieceIndex;
            if (ov.choice === 'new') {
              const np = ov.diceNewPiece;
              state.pieces = state.pieces.map((q, qi) => qi === idx ? np : q);
            }
            state.powerOverlay = { visible: false, type: null, pieceIndex: null, tempPiece: null, diceNewPiece: null, choice: 'original', buttons: [] };
            state.activePower = null; state.awaitPowerPiece = false;
            if (!gameLogic.anyPlacementPossible()) { gameManager.triggerFail(); }
            return;
          }
        } else if (ov.type === 'shop') {
          if (b.type.startsWith('buy_')) {
             const type = b.type.split('_')[1];
             const price = ITEM_BUY_CFG[type];
             if (state.coins >= price) {
               state.coins -= price;
               const idx = (state.powerBar || []).findIndex(it => it.type === type);
               if (idx >= 0) { state.powerBar[idx].count = (state.powerBar[idx].count || 0) + 1; }
             } else { wx.showToast && wx.showToast({ title: '金币不足', icon: 'none', duration: 1200 }); }
             return;
          }
        }
      }
    }
  }

  /**
   * 处理菜单点击
   */
  handleMenuTouch(t) {
    const state = databus.state;
    for (const b of state.menuButtons) {
      if (t.clientX >= b.x && t.clientX <= b.x + b.w && t.clientY >= b.y && t.clientY <= b.y + b.h) {
        if (b.type === 'classic') {
          state.challengeEnabled = false;
          state.powerModeEnabled = false;
          rngManager.initLevel('classic');
          gameLogic.initGrid();
          gameLogic.nextPieces();
          state.score = 0;
          state.comboT = 0;
          state.turnAreas = 0;
          state.turnHadClear = false;
          state.comboChain = 0;
          state.coins = 0;
          state.coinScoreBucket = 0;
          state.maxComboSession = 0;
          state.maxChainSession = 0;
          state.gameStartTs = Date.now();
          state.turnsUsed = 0;
          state.ui = { showBoard: true, showTray: true, showPower: false, showCancel: true };
          state.scene = 'game';
          if (!gameLogic.anyPlacementPossible()) {
            gameManager.triggerFail();
          }
          return;
        } else if (b.type === 'levelSelect') {
          state.scene = 'levelSelect';
          return;
        } else if (b.type === 'settings') {
          state.scene = 'settings';
          return;
        } else if (b.type === 'powerMode') {
          state.challengeEnabled = false;
          state.powerModeEnabled = true;
          rngManager.initLevel('classic');
          gameLogic.initGrid();
          gameLogic.nextPieces();
          state.score = 0;
          state.maxComboSession = 0;
          state.maxChainSession = 0;
          state.gameStartTs = Date.now();
          state.turnsUsed = 0;
          gameManager.resetPowerMode();
          state.ui = { showBoard: true, showTray: true, showPower: true, showCancel: true };
          state.scene = 'game';
          if (!gameLogic.anyPlacementPossible()) {
            gameManager.triggerFail();
          }
          return;
        } else if (b.type === 'howto') {
          state.scene = 'howto';
          state.howtoScroll = 0;
          return;
        } else if (b.type === 'history') {
          state.scene = 'history';
          state.historyScroll = 0;
          return;
        }
      }
    }
  }

  /**
   * 处理关卡选择点击
   */
  handleLevelSelectTouch(t) {
    const state = databus.state;
    if (state.backButton) {
      const r = state.backButton;
      if (t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h) {
        state.scene = 'menu';
        return;
      }
    }
    for (const b of state.menuButtons) {
      if (t.clientX >= b.x && t.clientX <= b.x + b.w && t.clientY >= b.y && t.clientY <= b.y + b.h) {
        if (b.type === 'challenge') {
          const ch = CHALLENGES.find(c => c.id === b.id) || CHALLENGES[0];
          state.challengeEnabled = true;
          gameManager.initChallenge(ch);
          rngManager.initLevel(ch.levelId);
          gameLogic.nextPieces();
          state.coins = 0;
          state.coinScoreBucket = 0;
          state.maxComboSession = 0;
          state.maxChainSession = 0;
          state.gameStartTs = Date.now();
          state.turnsUsed = 0;
          state.ui = { showBoard: true, showTray: true, showPower: false, showCancel: true };
          state.scene = 'game';
          if (!gameLogic.anyPlacementPossible()) {
            gameManager.triggerFail();
          }
          return;
        }
      }
    }
  }

  /**
   * 处理设置界面点击（主题/移动方式/返回）
   */
  handleSettingsTouch(t) {
    const state = databus.state;
    if (state.backButton) {
      const r = state.backButton;
      if (t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h) {
        state.scene = 'menu';
        return;
      }
    }
    for (const b of state.menuButtons) {
      if (t.clientX >= b.x && t.clientX <= b.x + b.w && t.clientY >= b.y && t.clientY <= b.y + b.h) {
        if (b.type === 'theme') {
          applyTheme(b.id);
          try { wx.setStorageSync('themeId', b.id); } catch (e) {}
          state.scene = 'settings';
          return;
        } else if (b.type === 'moveMode') {
          state.moveMode = b.id === 'relative' ? 'relative' : 'absolute';
          try { wx.setStorageSync('moveMode', state.moveMode); } catch (e) {}
          state.scene = 'settings';
          return;
        }
      }
    }
  }

  /**
   * 处理历史记录界面点击（切换tab/清空/进入详情/返回）
   */
  handleHistoryTouch(t) {
    const state = databus.state;
    if (state.backButton) {
      const r = state.backButton;
      if (t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h) {
        state.scene = 'menu';
        return;
      }
    }
    for (const tb of state.historyTabBtns || []) {
      if (t.clientX >= tb.x && t.clientX <= tb.x + tb.w && t.clientY >= tb.y && t.clientY <= tb.y + tb.h) {
        state.historyCategory = tb.id;
        state.historyScroll = 0;
        return;
      }
    }
    if (state.historyClearBtn) {
      const r = state.historyClearBtn;
      if (t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h) {
        const cat = state.historyCategory;
        state.historyRecords = (state.historyRecords || []).filter(rec => rec.mode !== cat);
        gameManager.saveHistory();
        state.historyScroll = 0;
        return;
      }
    }
    for (const b of state.historyButtons || []) {
      if (t.clientX >= b.x && t.clientX <= b.x + b.w && t.clientY >= b.y && t.clientY <= b.y + b.h) {
        state.historySelectedIndex = b.index;
        state.scene = 'historyDetail';
        return;
      }
    }
  }

  /**
   * 处理道具栏点击（使用/购买并使用）
   */
  handlePowerBarTouch(t) {
    const state = databus.state;
    for (let i = 0; i < state.powerRects.length; i++) {
      const r = state.powerRects[i];
      if (t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h) {
        const item = state.powerBar[i];
        if (!item) break;
        const cnt = item.count || 0;
        const usage = state.powerUsageCount[item.type] || 0;
        const arr = ITEM_COST_CFG[item.type] || [1];
        const priceUse = arr[Math.min(usage, arr.length - 1)];
        if (cnt > 0) {
          this.usePowerItem(item, i, usage);
        } else {
          this.buyAndUsePowerItem(item, i, usage, priceUse);
        }
        return true;
      }
    }
    return false;
  }
  
  /**
   * 执行使用道具的动作（旋转/骰子/换牌）
   */
  usePowerItem(item, i, usage) {
    const state = databus.state;
    if (item.type === 'redraw') {
      wx.showModal({
        title: '',
        content: '更换一组新的零件？',
        confirmText: '继续',
        cancelText: '放弃',
        success: (res) => {
          if (res.confirm) {
            state.pieces = [];
            gameLogic.nextPieces();
            if (!gameLogic.anyPlacementPossible()) { gameManager.triggerFail(); }
          }
          item.count = Math.max(0, item.count - 1);
          state.powerBar[i] = item;
          state.powerUsageCount[item.type] = usage + 1;
        }
      });
    } else if (item.type === 'rotate') {
      item.count = Math.max(0, item.count - 1);
      state.powerBar[i] = item;
      state.powerUsageCount[item.type] = usage + 1;
      state.activePower = 'rotate';
      state.awaitPowerPiece = true;
      wx.showToast && wx.showToast({ title: '点选一个零件进行旋转', icon: 'none', duration: 1200 });
    } else if (item.type === 'dice') {
      item.count = Math.max(0, item.count - 1);
      state.powerBar[i] = item;
      state.powerUsageCount[item.type] = usage + 1;
      state.activePower = 'dice';
      state.awaitPowerPiece = true;
      wx.showToast && wx.showToast({ title: '点选一个零件，掷骰生成新零件', icon: 'none', duration: 1200 });
    }
  }
  
  /**
   * 购买并使用道具（金币不足给出提示）
   */
  buyAndUsePowerItem(item, i, usage, priceUse) {
    const state = databus.state;
    if (state.coins < priceUse) {
      wx.showModal && wx.showModal({
        title: '',
        content: '金币不足：使用该道具需要 ' + priceUse + ' 金币，当前金币 ' + state.coins,
        confirmText: '知道了',
        showCancel: false
      });
      return;
    }
    wx.showModal({
      title: '',
      content: '消耗金币 ' + priceUse + ' 购买一次并使用该道具？',
      success: (res) => {
        if (!res.confirm) return;
        state.coins -= priceUse;
        state.powerUsageCount[item.type] = usage + 1;
        if (item.type === 'redraw') {
          wx.showModal({
            title: '',
            content: '更换一组新的零件？',
            confirmText: '继续',
            cancelText: '放弃',
            success: (res2) => {
              if (res2.confirm) {
                state.pieces = [];
                gameLogic.nextPieces();
                if (!gameLogic.anyPlacementPossible()) { gameManager.triggerFail(); }
              }
            }
          });
        } else if (item.type === 'rotate') {
          state.activePower = 'rotate';
          state.awaitPowerPiece = true;
          wx.showToast && wx.showToast({ title: '点选一个零件进行旋转', icon: 'none', duration: 1200 });
        } else if (item.type === 'dice') {
          state.activePower = 'dice';
          state.awaitPowerPiece = true;
          wx.showToast && wx.showToast({ title: '点选一个零件，掷骰生成新零件', icon: 'none', duration: 1200 });
        }
      }
    });
  }

  /**
   * 托盘点击进入拖拽或弹窗道具流程
   */
  handleTrayTouch(t) {
    const state = databus.state;
    for (let i = 0; i < state.tray.rects.length; i++) {
      const r = state.tray.rects[i];
      if (t.clientX >= r.x && t.clientX <= r.x + r.w && t.clientY >= r.y && t.clientY <= r.y + r.h) {
        const piece = state.pieces[i];
        if (!piece) return;
        if (state.powerModeEnabled && state.awaitPowerPiece) {
          if (state.activePower === 'rotate') {
            state.powerOverlay = { visible: true, type: 'rotate', pieceIndex: i, tempPiece: { ...state.pieces[i], cells: state.pieces[i].cells.map(c => c.slice()) }, diceNewPiece: null, choice: 'original', buttons: [] };
            return;
          } else if (state.activePower === 'dice') {
            const newCfg = rngManager.nextPiece();
            const nn = gameLogic.toCells(newCfg.shape);
            const newPiece = { id: newCfg.id, name: newCfg.name, color: newCfg.color, cells: nn.cells, w: nn.w, h: nn.h };
            state.powerOverlay = { visible: true, type: 'dice', pieceIndex: i, tempPiece: { ...state.pieces[i], cells: state.pieces[i].cells.map(c => c.slice()) }, diceNewPiece: newPiece, choice: 'original', buttons: [] };
            return;
          }
          return;
        }
        state.dragging = true;
        if (state.moveMode === 'relative') {
          const b = state.board;
          const localX = t.clientX - b.left;
          const localY = t.clientY - b.top;
          let startGx = Math.round(localX / b.cell) - Math.floor(piece.w / 2);
          let startGy = Math.round(localY / b.cell) - Math.floor(piece.h / 2);
          if (startGx < 0) startGx = 0; if (startGy < 0) startGy = 0;
          if (startGx > 9 - piece.w) startGx = 9 - piece.w;
          if (startGy > 9 - piece.h) startGy = 9 - piece.h;
          state.drag = { x: t.clientX, y: t.clientY, cells: piece.cells.slice(), color: piece.color, gx: startGx, gy: startGy, index: i, w: piece.w, h: piece.h, refX: t.clientX, refY: t.clientY, startGx, startGy, mode: 'relative' };
        } else {
          state.drag = { x: t.clientX, y: t.clientY, cells: piece.cells.slice(), color: piece.color, gx: 0, gy: 0, index: i, w: piece.w, h: piece.h, mode: 'absolute' };
        }
        break;
      }
    }
  }
}

module.exports = new InputHandler();

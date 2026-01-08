/**
 * Renderer
 * 渲染器：负责布局计算与所有 Canvas 绘制，包含棋盘、托盘、HUD、特效与各子界面调用。
 */
const databus = require('../databus');
const shared = require('../shared');
const { accentColor, accentRGBA, parseColorToRGB } = require('../utils/theme');
const uiPower = require('../ui/powerBar');
const overlays = require('../ui/overlays');
const uiManager = require('../ui/UIManager');

class Renderer {
  constructor() {
    this.ctx = null;
  }

  /**
   * 初始化绘图上下文
   */
  init(ctx) {
    this.ctx = ctx;
  }

  /**
   * 计算布局：棋盘、托盘、道具栏与取消区
   */
  layout() {
    const sw = shared.sw;
    const sh = shared.sh;
    const safeTop = shared.safeTop;
    const margin = 16;
    const boardSize = Math.floor(Math.min(sw - margin * 2, sh * 0.72, sw * 0.8));
    const boardLeft = Math.floor((sw - boardSize) / 2);
    const boardTop = Math.floor(safeTop + 96);
    databus.state.board = { left: boardLeft, top: boardTop, size: boardSize, cell: boardSize / 9 };
    const trayY = Math.floor(boardTop + boardSize + 36);
    const gap = 24;
    const pieceW = Math.floor(databus.state.board.cell * 3.0);
    const totalW = pieceW * 3 + gap * 2;
    const startX = Math.floor((sw - totalW) / 2);
    databus.state.tray.rects = [
      { x: startX, y: trayY, w: pieceW, h: pieceW },
      { x: startX + pieceW + gap, y: trayY, w: pieceW, h: pieceW },
      { x: startX + pieceW * 2 + gap * 2, y: trayY, w: pieceW, h: pieceW }
    ];
    const zoneW = sw - 48;
    const zoneH = 84;
    const zoneX = 24;
    const barH = 76;
    const gap2 = 24;
    const barY = trayY + pieceW + 12;
    const slotW = Math.floor((sw - 48 - gap2 * 2) / 3);
    const slotX = 24;
    databus.state.powerRects = [
      { x: slotX, y: barY, w: slotW, h: barH },
      { x: slotX + slotW + gap2, y: barY, w: slotW, h: barH },
      { x: slotX + slotW * 2 + gap2 * 2, y: barY, w: slotW, h: barH }
    ];
    const minZoneY = barY + barH + 12;
    const zoneY = Math.min(sh - zoneH - 12, Math.max(minZoneY, sh - zoneH - 12));
    databus.state.cancelZone = { x: zoneX, y: zoneY, w: zoneW, h: zoneH };
  }

  /**
   * 主渲染入口：按场景绘制
   */
  render() {
    const ctx = this.ctx;
    const sw = shared.sw;
    const sh = shared.sh;
    
    ctx.clearRect(0, 0, sw, sh);
    
    if (databus.state.scene === 'menu') {
      uiManager.drawMenu(ctx);
      return;
    }
    if (databus.state.scene === 'levelSelect') {
      uiManager.drawLevelSelect(ctx);
      this.drawBack();
      return;
    }
    if (databus.state.scene === 'howto') {
      uiManager.drawHowto(ctx);
      this.drawBack();
      return;
    }
    if (databus.state.scene === 'history') {
      uiManager.drawHistory(ctx);
      this.drawBack();
      return;
    }
    if (databus.state.scene === 'historyDetail') {
      uiManager.drawHistoryDetail(ctx);
      this.drawBack();
      return;
    }
    if (databus.state.scene === 'settings') {
      uiManager.drawSettings(ctx);
      this.drawBack();
      return;
    }
    
    this.drawHUD();
    this.drawBack();
    this.drawBoard();
    this.drawDrag();
    this.drawClearing();
    this.drawTray();
    
    if (databus.state.ui && databus.state.ui.showPower) { uiPower.drawPowerBar(); }
    if (databus.state.ui && databus.state.ui.showCancel) { this.drawCancelZone(); }
    
    if (databus.state.powerOverlay && databus.state.powerOverlay.visible) { overlays.drawPowerOverlay(); }
    
    this.drawCombo();
    this.drawScan();
    this.drawFailHint();
    this.drawClearFX();
    this.drawClearBurst();
    this.drawClearFlash();
  }

  /**
   * 绘制棋盘与已填充格
   */
  drawBoard() {
    const ctx = this.ctx;
    const b = databus.state.board;
    const vars = shared.vars;
    
    ctx.fillStyle = vars.boardBg || '#000';
    ctx.fillRect(b.left, b.top, b.size, b.size);
    for (let by = 0; by < 3; by++) {
      for (let bx = 0; bx < 3; bx++) {
        const even = (bx + by) % 2 === 0;
        ctx.fillStyle = even ? (vars.boxEven || '#ffffff') : (vars.boxOdd || '#e8f2ff');
        ctx.fillRect(b.left + bx * 3 * b.cell, b.top + by * 3 * b.cell, 3 * b.cell, 3 * b.cell);
      }
    }
    ctx.fillStyle = vars.lineColor || 'rgba(0,0,0,0.2)';
    ctx.fillRect(b.left + 3 * b.cell - 1, b.top, 2, b.size);
    ctx.fillRect(b.left + 6 * b.cell - 1, b.top, 2, b.size);
    ctx.fillRect(b.left, b.top + 3 * b.cell - 1, b.size, 2);
    ctx.fillRect(b.left, b.top + 6 * b.cell - 1, b.size, 2);
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const c = databus.state.grid[y][x];
        if (c.state === 'filled') {
          ctx.fillStyle = vars.cellFilled || '#00c853';
          ctx.fillRect(b.left + x * b.cell + 2, b.top + y * b.cell + 2, b.cell - 4, b.cell - 4);
        }
      }
    }
  }

  /**
   * 绘制托盘中的零件缩略图与槽位
   */
  drawTray() {
    const ctx = this.ctx;
    const vars = shared.vars;
    
    for (let i = 0; i < databus.state.pieces.length; i++) {
      const r = databus.state.tray.rects[i];
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = accentColor();
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      const piece = databus.state.pieces[i];
      if (!piece) continue;
      const mini = 20;
      const ox = r.x + (r.w - mini * (piece.w)) / 2;
      const oy = r.y + (r.h - mini * (piece.h)) / 2;
      ctx.fillStyle = piece.color || (vars.cellFilled || '#00c853');
      for (const [dx, dy] of piece.cells) {
        const x = ox + dx * mini;
        const y = oy + dy * mini;
        ctx.fillRect(x, y, mini - 2, mini - 2);
      }
    }
  }

  /**
   * 绘制 HUD：挑战目标或分数/金币
   */
  drawHUD() {
    const ctx = this.ctx;
    const sw = shared.sw;
    const safeTop = shared.safeTop;
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    if (databus.state.challengeEnabled && databus.state.challenge) {
      const name = databus.state.challenge.name || '';
      const steps = databus.state.movesLeft !== null ? `${databus.state.movesLeft}` : '∞';
      const t1 = `挑战 ${name}  步数 ${steps}`;
      const m1 = ctx.measureText(t1).width;
      ctx.fillText(t1, Math.floor((sw - m1) / 2), safeTop + 48);
      const targets = {};
      for (const t of databus.state.challenge.tasks || []) {
        targets[t.type] = t.target;
      }
      const tp = databus.state.taskProgress;
      const p1 = targets['score_at_least'] ? `得分 ${tp.score}/${targets['score_at_least']}` : '';
      const p2 = targets['clear_areas_total'] ? `区域 ${tp.areas}/${targets['clear_areas_total']}` : '';
      const p3 = targets['combo_total'] ? `累计连击 ${tp.comboTotal}/${targets['combo_total']}` : '';
      const p4 = targets['combo_consecutive'] ? `最大连击 ${tp.maxCombo}/${targets['combo_consecutive']}` : '';
      const t2 = [p1, p2, p3, p4].filter(Boolean).join('  ');
      const m2 = ctx.measureText(t2).width;
      ctx.fillText(t2, Math.floor((sw - m2) / 2), safeTop + 72);
    } else {
      let t = `分数 ${databus.state.score}  连击 ${databus.state.comboChain}`;
      if (databus.state.ui && databus.state.ui.showPower) { t += `  金币 ${databus.state.coins}`; }
      const m = ctx.measureText(t).width;
      ctx.fillText(t, Math.floor((sw - m) / 2), safeTop + 64);
    }
  }

  /**
   * 绘制拖拽预览与高亮托盘槽
   */
  drawDrag() {
    if (!databus.state.dragging) return;
    const ctx = this.ctx;
    const b = databus.state.board;
    const vars = shared.vars;
    
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = databus.state.drag.color || (vars.cellFilled || '#00c853');
    for (const [dx, dy] of databus.state.drag.cells) {
      const x = b.left + (databus.state.drag.gx + dx) * b.cell;
      const y = b.top + (databus.state.drag.gy + dy) * b.cell;
      ctx.fillRect(x + 2, y + 2, b.cell - 4, b.cell - 4);
    }
    ctx.globalAlpha = 1;
    const r = databus.state.tray.rects && databus.state.tray.rects[databus.state.drag.index];
    if (r) {
      ctx.strokeStyle = accentColor();
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  /**
   * 绘制连击提示弹框与环形特效
   */
  drawCombo() {
    if (!databus.state.comboShow) return;
    const elapsed = Date.now() - databus.state.comboTs;
    if (elapsed > 900) { databus.state.comboShow = false; return; }
    
    const ctx = this.ctx;
    const sw = shared.sw;
    const sh = shared.sh;
    const vars = shared.vars;
    
    const w = 240;
    const h = 60;
    const x = (sw - w) / 2;
    const y = sh / 2 - h / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#001a0f';
    ctx.font = '28px sans-serif';
    const text = `连击 x${databus.state.comboChain}`;
    const tw = ctx.measureText(text).width;
    ctx.fillText(text, x + (w - tw) / 2, y + 40);
    const frac = Math.min(1, elapsed / 900);
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - frac);
    ctx.strokeStyle = vars.accent || '#00e676';
    ctx.lineWidth = 3;
    const cx = sw / 2, cy = sh / 2;
    for (let i = 0; i < 3; i++) {
      const r = 20 + i * 24 + frac * 30;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 绘制返回按钮
   */
  drawBack() {
    const w = 68, h = 32;
    const x = 12, y = shared.safeTop + 56;
    databus.state.backButton = { x, y, w, h };
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#000';
    ctx.font = '16px sans-serif';
    const t = '返回';
    const tw = ctx.measureText(t).width;
    ctx.fillText(t, x + (w - tw) / 2, y + 22);
  }

  /**
   * 绘制取消区
   */
  drawCancelZone() {
    if (!databus.state.cancelZone) return;
    const r = databus.state.cancelZone;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = accentColor();
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = accentColor();
    ctx.font = '14px sans-serif';
    const t = '取消区';
    const tw = ctx.measureText(t).width;
    ctx.fillText(t, r.x + (r.w - tw) / 2, r.y + 28);
    ctx.restore();
  }

  /**
   * 绘制扫描条特效
   */
  drawScan() {
    if (!databus.state.scanActive) return;
    const elapsed = Date.now() - databus.state.scanTs;
    if (elapsed > 1200) { databus.state.scanActive = false; return; }
    
    const ctx = this.ctx;
    const sw = shared.sw;
    const sh = shared.sh;
    
    const y = -120 + (sh + 120) * (elapsed / 1200);
    const grad = ctx.createLinearGradient(0, y, 0, y + 120);
    grad.addColorStop(0, accentRGBA(0.0));
    grad.addColorStop(0.5, accentRGBA(0.35));
    grad.addColorStop(1, accentRGBA(0.0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, sw, 120);
  }

  /**
   * 绘制失败红屏提示
   */
  drawFailHint() {
    if (!databus.state.failHintActive) return;
    const elapsed = Date.now() - databus.state.failHintTs;
    const frac = Math.min(1, elapsed / 300);
    const ctx = this.ctx;
    const sw = shared.sw;
    const sh = shared.sh;
    
    ctx.save();
    ctx.fillStyle = 'rgba(255,0,0,' + (0.15 + 0.35 * (1 - frac)) + ')';
    ctx.fillRect(0, 0, sw, sh);
    ctx.restore();
  }

  /**
   * 绘制清除动画（缩放淡出）
   */
  drawClearing() {
    if (!databus.state.clearing || !databus.state.clearing.cells || databus.state.clearing.cells.length === 0) return;
    const elapsed = Date.now() - databus.state.clearing.ts;
    const frac = Math.min(1, elapsed / 300);
    const alpha = 1 - frac;
    const scale = 1 + 0.08 * (1 - frac);
    const b = databus.state.board;
    const vars = shared.vars;
    const ctx = this.ctx;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = vars.cellFilled || '#00c853';
    for (const [x, y] of databus.state.clearing.cells) {
      const cx = b.left + x * b.cell + b.cell / 2;
      const cy = b.top + y * b.cell + b.cell / 2;
      const w = (b.cell - 4) * scale;
      const h = (b.cell - 4) * scale;
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    }
    ctx.restore();
  }

  /**
   * 绘制清除碎片特效
   */
  drawClearFX() {
    const fx = databus.state.clearFX;
    if (!fx || !fx.parts || fx.parts.length === 0) return;
    const elapsed = Date.now() - fx.ts;
    if (elapsed <= 0) return;
    const prog = Math.min(1, elapsed / fx.duration);
    const alpha = 1 - prog;
    const ctx = this.ctx;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = accentColor();
    for (const p of fx.parts) {
      const dx = Math.cos(p.ang) * p.sp * prog;
      const dy = Math.sin(p.ang) * p.sp * prog;
      ctx.fillRect(p.cx + dx, p.cy + dy, p.sz, p.sz);
    }
    ctx.restore();
    if (elapsed >= fx.duration) { databus.state.clearFX = { parts: [], ts: 0, duration: fx.duration }; }
  }

  /**
   * 绘制清除爆炸圆环特效
   */
  drawClearBurst() {
    const cb = databus.state.clearBurst;
    if (!cb || !cb.ts) return;
    const elapsed = Date.now() - cb.ts;
    if (elapsed <= 0) return;
    const prog = Math.min(1, elapsed / cb.duration);
    const alpha = 0.35 * (1 - prog);
    const maxR = Math.min(databus.state.board.cell * 3.2, Math.max(databus.state.board.size / 9 * 4, 72));
    const ctx = this.ctx;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = accentColor();
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const r = 14 + i * 18 + maxR * prog;
      ctx.beginPath();
      ctx.arc(cb.cx, cb.cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (elapsed >= cb.duration) { databus.state.clearBurst = { cx: 0, cy: 0, ts: 0, duration: cb.duration }; }
  }

  /**
   * 绘制清除高亮覆盖（行/列/3x3）
   */
  drawClearFlash() {
    const cf = databus.state.clearFlash;
    if (!cf || (!cf.rows.length && !cf.cols.length && !cf.boxes.length)) return;
    const elapsed = Date.now() - cf.ts;
    if (elapsed <= 0) return;
    const prog = Math.min(1, elapsed / cf.duration);
    const alpha = 0.22 * (1 - prog);
    const b = databus.state.board;
    const ctx = this.ctx;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = accentColor();
    for (const y of cf.rows) { ctx.fillRect(b.left, b.top + y * b.cell, b.size, b.cell); }
    for (const x of cf.cols) { ctx.fillRect(b.left + x * b.cell, b.top, b.cell, b.size); }
    for (const [bx, by] of cf.boxes) { ctx.fillRect(b.left + bx * 3 * b.cell, b.top + by * 3 * b.cell, 3 * b.cell, 3 * b.cell); }
    ctx.restore();
    if (elapsed >= cf.duration) { databus.state.clearFlash = { rows: [], cols: [], boxes: [], ts: 0, duration: cf.duration }; }
  }
}

module.exports = new Renderer();

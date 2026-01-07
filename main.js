const rngManager = require('./miniprogram/utils/rng');
const { SCORE_CFG } = require('./miniprogram/config/score');
const { THEMES } = require('./miniprogram/config/themes');
const { PIECES_CFG } = require('./miniprogram/config/pieces');
const { CHALLENGES } = require('./miniprogram/config/challenges');

function toCells(shape){
  const h = shape.length;
  const w = shape[0].length;
  const cells = [];
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      if(shape[y][x]===1){ cells.push([x,y]); }
    }
  }
  return { cells, w, h };
}

function initClearBurst(cells){
  const b = state.board;
  if(!cells || cells.length===0) return;
  let sx=0, sy=0;
  for(const [x,y] of cells){ sx += b.left + x*b.cell + b.cell/2; sy += b.top + y*b.cell + b.cell/2; }
  const cx = sx / cells.length;
  const cy = sy / cells.length;
  state.clearBurst = { cx, cy, ts: Date.now(), duration: 400 };
}

function drawClearBurst(){
  const cb = state.clearBurst;
  if(!cb || !cb.ts) return;
  const elapsed = Date.now() - cb.ts;
  if(elapsed <= 0) return;
  const prog = Math.min(1, elapsed / cb.duration);
  const alpha = 0.35 * (1 - prog);
  const maxR = Math.min(state.board.cell * 3.2, Math.max(state.board.size/9*4, 72));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = accentColor();
  ctx.lineWidth = 3;
  for(let i=0;i<3;i++){
    const r = 14 + i*18 + maxR * prog;
    ctx.beginPath();
    ctx.arc(cb.cx, cb.cy, r, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.restore();
  if(elapsed >= cb.duration){ state.clearBurst = { cx:0, cy:0, ts:0, duration: cb.duration }; }
}

function initClearFlash(res){
  const b = state.board;
  const rows = (res.rowsFull || []);
  const cols = (res.colsFull || []);
  const boxes = (res.boxesFull || []);
  state.clearFlash = { rows, cols, boxes, ts: Date.now(), duration: 250 };
}

function drawClearFlash(){
  const cf = state.clearFlash;
  if(!cf || (!cf.rows.length && !cf.cols.length && !cf.boxes.length)) return;
  const elapsed = Date.now() - cf.ts;
  if(elapsed <= 0) return;
  const prog = Math.min(1, elapsed / cf.duration);
  const alpha = 0.22 * (1 - prog);
  const b = state.board;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = accentColor();
  for(const y of cf.rows){ ctx.fillRect(b.left, b.top + y*b.cell, b.size, b.cell); }
  for(const x of cf.cols){ ctx.fillRect(b.left + x*b.cell, b.top, b.cell, b.size); }
  for(const [bx,by] of cf.boxes){ ctx.fillRect(b.left + bx*3*b.cell, b.top + by*3*b.cell, 3*b.cell, 3*b.cell); }
  ctx.restore();
  if(elapsed >= cf.duration){ state.clearFlash = { rows:[], cols:[], boxes:[], ts:0, duration: cf.duration }; }
}

function drawHistory(){
  drawMenuBg();
  const scroll = state.historyScroll || 0;
  const baseY = safeTop + 100 - scroll;
  state.historyButtons = [];
  state.historyTabBtns = [];
  ctx.fillStyle = '#fff';
  ctx.font = '28px sans-serif';
  const title = '历史记录';
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, Math.floor((sw - tw)/2), baseY);
  // Clear button
  const cbW = 72, cbH = 36;
  const cbX = sw - cbW - 24;
  const cbY = baseY - 10;
  drawThemedButton(cbX, cbY, cbW, cbH, 0.85);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  const ct = '清空';
  const ctw = ctx.measureText(ct).width;
  ctx.fillText(ct, cbX + (cbW - ctw)/2, cbY + 24);
  state.historyClearBtn = { x: cbX, y: cbY, w: cbW, h: cbH };
  // Tabs
  const tabs = [
    { id:'classic', label:'经典' },
    { id:'challenge', label:'挑战' },
    { id:'power', label:'道具' }
  ];
  const tabW = Math.floor((sw - 48 - 24) / 3);
  const tabH = 36;
  let tx = 24;
  const ty = baseY + 32;
  for(const tinfo of tabs){
    const active = state.historyCategory===tinfo.id;
    drawThemedButton(tx, ty, tabW, tabH, active?0.95:0.75);
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
    const lw = ctx.measureText(tinfo.label).width;
    ctx.fillText(tinfo.label, tx + (tabW - lw)/2, ty + 24);
    state.historyTabBtns.push({ id: tinfo.id, x: tx, y: ty, w: tabW, h: tabH });
    tx += tabW + 12;
  }
  ctx.font = '18px sans-serif';
  const sub = (state.historyCategory==='classic'?'经典':(state.historyCategory==='challenge'?'挑战':'道具')) + '模式前10条最高分与最大连击';
  const swid = ctx.measureText(sub).width;
  ctx.fillText(sub, Math.floor((sw - swid)/2), baseY + 24 + 36 + 12);
  let y = baseY + 24 + 36 + 12 + 28;
  const x = 24;
  const w = sw - 48;
  const rowH = 48;
  const listAll = state.historyRecords || [];
  const list = listAll.filter(r => r.mode === state.historyCategory);
  for(let i=0;i<list.length;i++){
    const rec = list[i];
    drawThemedButton(x, y, w, rowH, 0.85);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    const modeLabel = rec.mode==='classic'? '经典' : rec.mode==='power'? '道具' : '挑战';
    const left = `${i+1}. ${modeLabel}  分数 ${rec.score}`;
    ctx.fillText(left, x + 12, y + 30);
    const right = `最大连击 ${rec.maxCombo}`;
    const rw = ctx.measureText(right).width;
    ctx.fillText(right, x + w - 12 - rw, y + 30);
    state.historyButtons.push({ index: i, x, y, w, h: rowH });
    y += rowH + 10;
  }
}
const sys = wx.getSystemInfoSync();
const pr = sys.pixelRatio || 2;
const sw = sys.windowWidth;
const sh = sys.windowHeight;
const safeTop = Math.floor((sys.statusBarHeight || (sys.safeArea && sys.safeArea.top) || 0) + 8);
const canvas = wx.createCanvas();
canvas.width = Math.floor(sw * pr);
canvas.height = Math.floor(sh * pr);
const ctx = canvas.getContext('2d');
ctx.scale(pr, pr);

let vars = {};
let COIN_CFG, ITEM_COST_CFG, ITEM_BUY_CFG, ITEM_START_COUNT;
try{
  const cfg = require('./miniprogram/config/item_price.js');
  if(cfg && cfg.COIN_CFG && cfg.ITEM_COST_CFG && cfg.ITEM_BUY_CFG && cfg.ITEM_START_COUNT){
    COIN_CFG = cfg.COIN_CFG;
    ITEM_COST_CFG = cfg.ITEM_COST_CFG;
    ITEM_BUY_CFG = cfg.ITEM_BUY_CFG;
    ITEM_START_COUNT = cfg.ITEM_START_COUNT;
  } else {
    throw new Error('Invalid item_price config');
  }
}catch(e){
  COIN_CFG = { scorePerCoin: 1000, stepComboCoinMap: { 3: 1, 4: 1, 5: 2, 6: 3 }, consecutiveComboCoinMap: { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 } };
  ITEM_COST_CFG = { rotate: [1,2,3,4,5], dice: [1,2,3,4,5], redraw: [2,3,4,5,6] };
  ITEM_BUY_CFG = { rotate: 2, dice: 3, redraw: 4 };
  ITEM_START_COUNT = { rotate: 3, dice: 3, redraw: 3 };
}

const state = {
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
  powerModeEnabled: false,
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

function applyTheme(themeId){
  const theme = THEMES.list.find(t => t.id === themeId) || THEMES.list[0];
  vars = theme.variables || {};
  THEMES.currentId = theme.id;
}

function formatTs(ts){
  const d = new Date(ts || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${y}${m}${day} ${hh}:${mm}`;
}

function drawHistoryDetail(){
  drawMenuBg();
  const idx = state.historySelectedIndex;
  const rec = (state.historyRecords||[])[idx||0];
  ctx.fillStyle = '#fff';
  ctx.font = '28px sans-serif';
  const title = '详细信息';
  const tw = ctx.measureText(title).width;
  const baseY = safeTop + 100;
  ctx.fillText(title, Math.floor((sw - tw)/2), baseY);
  const cardX = 24;
  const cardY = baseY + 24;
  const cardW = sw - 48;
  const cardH = 220;
  drawThemedButton(cardX, cardY, cardW, cardH, 0.85);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  const modeLabel = rec && (rec.mode==='classic'? '经典' : rec.mode==='power'? '道具' : '挑战');
  ctx.fillText(`模式：${modeLabel||''}`, cardX + 12, cardY + 34);
  ctx.fillText(`开始时间：${rec ? formatTs(rec.startTs) : ''}`, cardX + 12, cardY + 64);
  ctx.fillText(`结束时间：${rec ? formatTs(rec.endTs) : ''}`, cardX + 12, cardY + 94);
  ctx.fillText(`得分：${rec ? rec.score : 0}`, cardX + 12, cardY + 124);
  ctx.fillText(`最高连击：${rec ? rec.maxCombo : 0}`, cardX + 12, cardY + 154);
  ctx.fillText(`回合数：${rec ? rec.turns : 0}`, cardX + 12, cardY + 184);
}

function initGrid(){
  const grid = [];
  for(let y=0;y<9;y++){
    const row=[];
    for(let x=0;x<9;x++){
      const box = Math.floor(x/3) + 3*Math.floor(y/3);
      row.push({ state: 'empty', anchored: false, symbol: '', box });
    }
    grid.push(row);
  }
  state.grid = grid;
}

function layout(){
  const margin = 16;
  const boardSize = Math.floor(Math.min(sw - margin*2, sh * 0.72, sw * 0.8));
  const boardLeft = Math.floor((sw - boardSize)/2);
  const boardTop = Math.floor(safeTop + 96);
  state.board = { left: boardLeft, top: boardTop, size: boardSize, cell: boardSize/9 };
  const trayY = Math.floor(boardTop + boardSize + 36);
  const gap = 24;
  const pieceW = Math.floor(state.board.cell * 3.0);
  const totalW = pieceW*3 + gap*2;
  const startX = Math.floor((sw - totalW)/2);
  state.tray.rects = [
    { x: startX, y: trayY, w: pieceW, h: pieceW },
    { x: startX + pieceW + gap, y: trayY, w: pieceW, h: pieceW },
    { x: startX + pieceW*2 + gap*2, y: trayY, w: pieceW, h: pieceW }
  ];
  const zoneW = sw - 48;
  const zoneH = 84;
  const zoneX = 24;
  const barH = 76;
  const gap2 = 24;
  const barY = trayY + pieceW + 12;
  const slotW = Math.floor((sw - 48 - gap2*2) / 3);
  const slotX = 24;
  state.powerRects = [
    { x: slotX, y: barY, w: slotW, h: barH },
    { x: slotX + slotW + gap2, y: barY, w: slotW, h: barH },
    { x: slotX + slotW*2 + gap2*2, y: barY, w: slotW, h: barH }
  ];
  const minZoneY = barY + barH + 12;
  const zoneY = Math.min(sh - zoneH - 12, Math.max(minZoneY, sh - zoneH - 12));
  state.cancelZone = { x: zoneX, y: zoneY, w: zoneW, h: zoneH };
}

function nextPieces(){
  const pick = () => rngManager.nextPiece();
  const pieces = [pick(), pick(), pick()].map(cfg => {
    const { cells, w, h } = toCells(cfg.shape);
    const power = '';
    return { id: cfg.id, name: cfg.name, color: cfg.color, cells, w, h, power };
  });
  state.pieces = pieces;
}

function initChallenge(ch){
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
  state.grid = grid;
  state.challenge = ch;
  state.movesLeft = movesLeft;
  state.countOnlyAllowed = countOnlyAllowed;
  state.score = 0;
  state.comboT = 0;
  state.comboChain = 0;
  state.prevStepHadClear = false;
  state.turnAreas = 0;
  state.turnHadClear = false;
  state.taskProgress = { score: 0, areas: 0, comboTotal: 0, maxCombo: 0 };
}

function drawBoard(){
  const b = state.board;
  ctx.fillStyle = vars.boardBg || '#000';
  ctx.fillRect(b.left, b.top, b.size, b.size);
  for(let by=0;by<3;by++){
    for(let bx=0;bx<3;bx++){
      const even = (bx+by)%2===0;
      ctx.fillStyle = even ? (vars.boxEven || '#ffffff') : (vars.boxOdd || '#e8f2ff');
      ctx.fillRect(b.left + bx*3*b.cell, b.top + by*3*b.cell, 3*b.cell, 3*b.cell);
    }
  }
  ctx.fillStyle = vars.lineColor || 'rgba(0,0,0,0.2)';
  ctx.fillRect(b.left + 3*b.cell - 1, b.top, 2, b.size);
  ctx.fillRect(b.left + 6*b.cell - 1, b.top, 2, b.size);
  ctx.fillRect(b.left, b.top + 3*b.cell - 1, b.size, 2);
  ctx.fillRect(b.left, b.top + 6*b.cell - 1, b.size, 2);
  for(let y=0;y<9;y++){
    for(let x=0;x<9;x++){
      const c = state.grid[y][x];
      if(c.state==='filled'){
        ctx.fillStyle = vars.cellFilled || '#00c853';
        ctx.fillRect(b.left + x*b.cell + 2, b.top + y*b.cell + 2, b.cell - 4, b.cell - 4);
      }
    }
  }
}

function drawTray(){
  for(let i=0;i<state.pieces.length;i++){
    const r = state.tray.rects[i];
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = accentColor();
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    const piece = state.pieces[i];
    if(!piece) continue;
    const mini = 20;
    const minX = Math.min(...piece.cells.map(c=>c[0]));
    const minY = Math.min(...piece.cells.map(c=>c[1]));
    const ox = r.x + (r.w - mini*(piece.w))/2;
    const oy = r.y + (r.h - mini*(piece.h))/2;
    ctx.fillStyle = piece.color || (vars.cellFilled || '#00c853');
    for(const [dx,dy] of piece.cells){
      const x = ox + dx*mini;
      const y = oy + dy*mini;
      ctx.fillRect(x, y, mini-2, mini-2);
    }
  }
}

function drawHUD(){
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  if(state.challengeEnabled && state.challenge){
    const name = state.challenge.name || '';
    const steps = state.movesLeft!==null ? `${state.movesLeft}` : '∞';
    const t1 = `挑战 ${name}  步数 ${steps}`;
    const m1 = ctx.measureText(t1).width;
    ctx.fillText(t1, Math.floor((sw - m1)/2), safeTop + 48);
    const targets = {};
    for(const t of state.challenge.tasks||[]){
      targets[t.type] = t.target;
    }
    const tp = state.taskProgress;
    const p1 = targets['score_at_least'] ? `得分 ${tp.score}/${targets['score_at_least']}` : '';
    const p2 = targets['clear_areas_total'] ? `区域 ${tp.areas}/${targets['clear_areas_total']}` : '';
    const p3 = targets['combo_total'] ? `累计连击 ${tp.comboTotal}/${targets['combo_total']}` : '';
    const p4 = targets['combo_consecutive'] ? `最大连击 ${tp.maxCombo}/${targets['combo_consecutive']}` : '';
    const t2 = [p1,p2,p3,p4].filter(Boolean).join('  ');
    const m2 = ctx.measureText(t2).width;
    ctx.fillText(t2, Math.floor((sw - m2)/2), safeTop + 72);
  } else {
    let t = `分数 ${state.score}  连击 ${state.comboChain}`;
    if(state.ui && state.ui.showPower){ t += `  金币 ${state.coins}`; }
    const m = ctx.measureText(t).width;
    ctx.fillText(t, Math.floor((sw - m)/2), safeTop + 64);
  }
}

function drawDrag(){
  if(!state.dragging) return;
  const b = state.board;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = state.drag.color || (vars.cellFilled || '#00c853');
  for(const [dx,dy] of state.drag.cells){
    const x = b.left + (state.drag.gx + dx)*b.cell;
    const y = b.top + (state.drag.gy + dy)*b.cell;
    ctx.fillRect(x + 2, y + 2, b.cell - 4, b.cell - 4);
  }
  ctx.globalAlpha = 1;
  const r = state.tray.rects && state.tray.rects[state.drag.index];
  if(r){
    ctx.strokeStyle = accentColor();
    ctx.lineWidth = 3;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
}

function drawCombo(){
  if(!state.comboShow) return;
  const elapsed = Date.now() - state.comboTs;
  if(elapsed > 900){ state.comboShow = false; return; }
  const w = 240;
  const h = 60;
  const x = (sw - w)/2;
  const y = sh/2 - h/2;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#001a0f';
  ctx.font = '28px sans-serif';
  const text = `连击 x${state.comboChain}`;
  const tw = ctx.measureText(text).width;
  ctx.fillText(text, x + (w - tw)/2, y + 40);
  const frac = Math.min(1, elapsed / 900);
  ctx.save();
  ctx.globalAlpha = 0.35 * (1 - frac);
  ctx.strokeStyle = vars.accent || '#00e676';
  ctx.lineWidth = 3;
  const cx = sw/2, cy = sh/2;
  for(let i=0;i<3;i++){
    const r = 20 + i*24 + frac*30;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBack(){
  const w = 68, h = 32;
  const x = 12, y = safeTop + 56;
  state.backButton = { x, y, w, h };
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#000';
  ctx.font = '16px sans-serif';
  const t = '返回';
  const tw = ctx.measureText(t).width;
  ctx.fillText(t, x + (w - tw)/2, y + 22);
}

function drawMenu(){
  state.menuButtons = [];
  drawMenuBg();
  ctx.fillStyle = '#fff';
  ctx.font = '28px sans-serif';
  const title = '哔哔消除';
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, Math.floor((sw - tw)/2), safeTop + 96);
  const btnW = Math.floor(sw * 0.7);
  const btnH = 56;
  let y = safeTop + 160;
  const x = Math.floor((sw - btnW)/2);
  drawThemedButton(x, y, btnW, btnH, 0.85);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  const ct = '经典模式';
  const ctw = ctx.measureText(ct).width;
  ctx.fillText(ct, x + (btnW - ctw)/2, y + 36);
  state.menuButtons.push({ type:'classic', x, y, w: btnW, h: btnH });
  y += btnH + 20;
  drawThemedButton(x, y, btnW, btnH, 0.85);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  const ct2 = '挑战模式';
  const ct2w = ctx.measureText(ct2).width;
  ctx.fillText(ct2, x + (btnW - ct2w)/2, y + 36);
  state.menuButtons.push({ type:'levelSelect', x, y, w: btnW, h: btnH });
  // Power Mode button
  y += btnH + 20;
  drawThemedButton(x, y, btnW, btnH, 0.85);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  const ct3 = '道具模式';
  const ct3w = ctx.measureText(ct3).width;
  ctx.fillText(ct3, x + (btnW - ct3w)/2, y + 36);
  state.menuButtons.push({ type:'powerMode', x, y, w: btnW, h: btnH });
  // How-to button
  y += btnH + 20;
  drawThemedButton(x, y, btnW, btnH, 0.85);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  const ct4 = '玩法说明';
  const ct4w = ctx.measureText(ct4).width;
  ctx.fillText(ct4, x + (btnW - ct4w)/2, y + 36);
  state.menuButtons.push({ type:'howto', x, y, w: btnW, h: btnH });
  // History button
  y += btnH + 20;
  drawThemedButton(x, y, btnW, btnH, 0.85);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  const ct5 = '历史记录';
  const ct5w = ctx.measureText(ct5).width;
  ctx.fillText(ct5, x + (btnW - ct5w)/2, y + 36);
  state.menuButtons.push({ type:'history', x, y, w: btnW, h: btnH });
  // Settings button (gear)
  const gw = 44, gh = 44;
  const gx = sw - gw - 12, gy = safeTop + 56;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(gx, gy, gw, gh);
  ctx.strokeStyle = accentColor();
  ctx.lineWidth = 3;
  const gcx = gx + gw/2, gcy = gy + gh/2;
  for(let i=0;i<6;i++){
    const a = i * Math.PI/3;
    const x1 = gcx + Math.cos(a) * 10;
    const y1 = gcy + Math.sin(a) * 10;
    ctx.beginPath(); ctx.moveTo(gcx, gcy); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(gcx, gcy, 8, 0, Math.PI*2); ctx.stroke();
  state.menuButtons.push({ type:'settings', x: gx, y: gy, w: gw, h: gh });
}

function drawLevelSelect(){
  state.menuButtons = [];
  drawMenuBg();
  ctx.fillStyle = '#fff';
  ctx.font = '26px sans-serif';
  const title = '挑战关卡';
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, Math.floor((sw - tw)/2), safeTop + 64);
  const btnW = Math.floor(sw * 0.85);
  const btnH = 60;
  let y = safeTop + 120;
  const x = Math.floor((sw - btnW)/2);
  for(const ch of CHALLENGES){
    drawThemedButton(x, y, btnW, btnH, 0.85);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    const tt = `${ch.id}. ${ch.name}`;
    ctx.fillText(tt, x + 12, y + 26);
    ctx.font = '14px sans-serif';
    const tasks = [];
    for(const t of ch.tasks||[]){
      if(t.type==='score_at_least') tasks.push(`得分≥${t.target}`);
      if(t.type==='clear_areas_total') tasks.push(`区域≥${t.target}`);
      if(t.type==='combo_total') tasks.push(`累计连击≥${t.target}`);
      if(t.type==='combo_consecutive') tasks.push(`最大连击≥${t.target}`);
    }
    const subt = tasks.join('、');
    ctx.fillText(subt, x + 12, y + 46);
    state.menuButtons.push({ type:'challenge', id: ch.id, x, y, w: btnW, h: btnH });
    y += btnH + 14;
  }
}

function render(){
  ctx.clearRect(0,0,sw,sh);
  if(state.scene==='menu'){
    drawMenu();
    return;
  }
  if(state.scene==='levelSelect'){
    drawLevelSelect();
    drawBack();
    return;
  }
  if(state.scene==='howto'){
    drawHowto();
    drawBack();
    return;
  }
  if(state.scene==='history'){
    drawHistory();
    drawBack();
    return;
  }
  if(state.scene==='historyDetail'){
    drawHistoryDetail();
    drawBack();
    return;
  }
  if(state.scene==='settings'){
    drawSettings();
    drawBack();
    return;
  }
  drawHUD();
  drawBack();
  drawBoard();
  drawDrag();
  drawClearing();
  drawTray();
  if(state.ui && state.ui.showPower){ drawPowerBar(); }
  if(state.ui && state.ui.showCancel){ drawCancelZone(); }
  if(state.powerOverlay && state.powerOverlay.visible){ drawPowerOverlay(); }
  drawCombo();
  drawScan();
  drawFailHint();
  drawClearFX();
  drawClearBurst();
  drawClearFlash();
}

function drawMenuBg(){
  if(state.menuBgReady && state.menuBg){
    const img = state.menuBg;
    const iw = img.width, ih = img.height;
    const scale = Math.max(sw/iw, sh/ih);
    const dw = Math.floor(iw*scale), dh = Math.floor(ih*scale);
    const dx = Math.floor((sw - dw)/2), dy = Math.floor((sh - dh)/2);
    ctx.drawImage(img, dx, dy, dw, dh);
    // Vignette
    const grad = ctx.createRadialGradient(sw/2, sh/2, Math.min(sw,sh)/6, sw/2, sh/2, Math.max(sw,sh)/1.2);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,sw,sh);
  } else {
    // Fallback Pip-Boy style background
    ctx.fillStyle = vars.boardBg || '#130d06';
    ctx.fillRect(0,0,sw,sh);
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = vars.accent || '#ff9800';
    for(let y=0;y<sh;y+=16){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(sw,y); ctx.stroke(); }
    for(let x=0;x<sw;x+=16){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,sh); ctx.stroke(); }
    ctx.restore();
    // Simple silhouette
    ctx.save();
    ctx.strokeStyle = vars.accent || '#ff9800';
    ctx.lineWidth = 2;
    const cx = sw*0.72, cy = sh*0.55;
    ctx.beginPath(); ctx.arc(cx, cy-60, 28, 0, Math.PI*2); ctx.stroke(); // head
    ctx.beginPath(); ctx.moveTo(cx, cy-32); ctx.lineTo(cx, cy+28); ctx.stroke(); // torso
    ctx.beginPath(); ctx.moveTo(cx, cy-12); ctx.lineTo(cx-32, cy+12); ctx.stroke(); // left arm
    ctx.beginPath(); ctx.moveTo(cx, cy-12); ctx.lineTo(cx+30, cy+10); ctx.stroke(); // right arm
    ctx.beginPath(); ctx.moveTo(cx, cy+28); ctx.lineTo(cx-20, cy+64); ctx.stroke(); // left leg
    ctx.beginPath(); ctx.moveTo(cx, cy+28); ctx.lineTo(cx+20, cy+64); ctx.stroke(); // right leg
    ctx.restore();
  }
}

function drawCancelZone(){
  if(!state.cancelZone) return;
  const r = state.cancelZone;
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
  ctx.fillText(t, r.x + (r.w - tw)/2, r.y + 28);
  ctx.restore();
}

function drawPowerBar(){
  const rects = state.powerRects || [];
  const items = state.powerBar || [];
  for(let i=0;i<rects.length;i++){
    const r = rects[i];
    const item = items[i];
    ctx.save();
    ctx.strokeStyle = accentColor();
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    const label = item ? (item.type==='rotate'?'旋转': item.type==='dice'?'骰子':'换牌') : '';
    ctx.fillText(label, r.x + 8, r.y + 20);
    const cntNum = item ? (item.count||0) : 0;
    const usage = (state.powerUsageCount && item) ? (state.powerUsageCount[item.type]||0) : 0;
    const arr = (ITEM_COST_CFG && item) ? (ITEM_COST_CFG[item.type]||[]) : [];
    const price = arr.length ? arr[Math.min(usage, arr.length-1)] : 0;
    const iconY = r.y + 36;
    const iconX = r.x + 8;
    ctx.strokeStyle = accentColor();
    ctx.lineWidth = 2;
    if(item && item.type==='rotate'){
      const cx = iconX + 14, cy = iconY;
      ctx.beginPath(); ctx.moveTo(cx, cy-10); ctx.lineTo(cx+10, cy); ctx.lineTo(cx, cy+10); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 12, Math.PI*0.5, Math.PI*1.5); ctx.stroke();
    } else if(item && item.type==='dice'){
      const x = iconX, y = iconY - 12;
      ctx.strokeRect(x, y, 24, 24);
      ctx.fillStyle = accentColor();
      ctx.fillRect(x+5, y+5, 4, 4); ctx.fillRect(x+15, y+15, 4, 4); ctx.fillRect(x+15, y+5, 4, 4);
    } else if(item && item.type==='redraw'){
      const x = iconX - 2, y = iconY - 10;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+32, y); ctx.lineTo(x+26, y+20); ctx.lineTo(x-6, y+20); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+6, y+6); ctx.lineTo(x+26, y+6); ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    const cntText = 'x ' + cntNum;
    ctx.fillText(cntText, iconX + 40, r.y + 40);
    ctx.font = '14px sans-serif';
    const priceText = '价格: ' + price + '金币';
    ctx.fillText(priceText, r.x + 8, r.y + 58);
    ctx.restore();
  }
}

function drawPiecePreview(p, bx, by, cell){
  ctx.fillStyle = p.color || (vars.cellFilled || '#00c853');
  for(const [dx,dy] of p.cells){
    const x = bx + dx*cell;
    const y = by + dy*cell;
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
  }
}

function drawPowerOverlay(){
  const ov = state.powerOverlay;
  if(!ov || !ov.visible) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0,0,sw,sh);
  const cardW = Math.floor(sw * 0.86);
  const cardH = Math.floor(sh * 0.56);
  const cardX = Math.floor((sw - cardW)/2);
  const cardY = Math.floor((sh - cardH)/2);
  ctx.fillStyle = vars.boardBg || '#061b12';
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = accentColor();
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardW, cardH);
  ov.buttons = [];
  if(ov.type==='rotate'){
    const cell = 20;
    const pw = cell * ov.tempPiece.w;
    const ph = cell * ov.tempPiece.h;
    const px = cardX + Math.floor((cardW - pw)/2);
    const py = cardY + Math.floor((cardH - ph)/2) - 20;
    drawPiecePreview(ov.tempPiece, px, py, cell);
    const bw = 120, bh = 44;
    const rx = cardX + 40, ry = cardY + cardH - bh - 20;
    const cx = cardX + cardW - bw - 40, cy = ry;
    drawThemedButton(rx, ry, bw, bh, 0.85);
    drawThemedButton(cx, cy, bw, bh, 0.85);
    ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
    const rt = '旋转', ct = '确认';
    const rtw = ctx.measureText(rt).width, ctw = ctx.measureText(ct).width;
    ctx.fillText(rt, rx + (bw - rtw)/2, ry + 28);
    ctx.fillText(ct, cx + (bw - ctw)/2, cy + 28);
    ov.buttons.push({ type:'rotate', x: rx, y: ry, w: bw, h: bh });
    ov.buttons.push({ type:'confirm', x: cx, y: cy, w: bw, h: bh });
  } else if(ov.type==='dice'){
    const left = { x: cardX + 40, y: cardY + 40, w: Math.floor((cardW - 120)/2), h: cardH - 140 };
    const right = { x: left.x + left.w + 40, y: left.y, w: left.w, h: left.h };
    const lc = 20, rc = 20;
    drawPiecePreview(ov.tempPiece, left.x, left.y, lc);
    drawPiecePreview(ov.diceNewPiece, right.x, right.y, rc);
    ctx.strokeStyle = accentColor(); ctx.lineWidth = 3;
    if(ov.choice==='original'){ ctx.strokeRect(left.x, left.y, left.w, left.h); } else { ctx.strokeRect(right.x, right.y, right.w, right.h); }
    const bw = 160, bh = 44;
    const cx = cardX + Math.floor((cardW - bw)/2), cy = cardY + cardH - bh - 20;
    drawThemedButton(cx, cy, bw, bh, 0.85);
    ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
    const ct = '确认'; const ctw = ctx.measureText(ct).width; ctx.fillText(ct, cx + (bw - ctw)/2, cy + 28);
    ov.buttons.push({ type:'choose_original', x: left.x, y: left.y, w: left.w, h: left.h });
    ov.buttons.push({ type:'choose_new', x: right.x, y: right.y, w: right.w, h: right.h });
    ov.buttons.push({ type:'confirm', x: cx, y: cy, w: bw, h: bh });
  } else if(ov.type==='shop'){
    const items = [
      { id:'rotate', label:'旋转', price: ITEM_BUY_CFG.rotate },
      { id:'dice', label:'骰子', price: ITEM_BUY_CFG.dice },
      { id:'redraw', label:'换牌', price: ITEM_BUY_CFG.redraw }
    ];
    const colW = Math.floor((cardW - 80)/3);
    const colH = cardH - 120;
    let sx = cardX + 40;
    const sy = cardY + 40;
    for(const it of items){
      ctx.strokeStyle = accentColor(); ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, colW, colH);
      ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
      const lw = ctx.measureText(it.label).width;
      ctx.fillText(it.label, sx + (colW - lw)/2, sy + 28);
      ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
      const pw = ctx.measureText('价格 ' + it.price).width;
      ctx.fillText('价格 ' + it.price, sx + (colW - pw)/2, sy + 56);
      const bw = 120, bh = 40;
      const bx = sx + (colW - bw)/2, by = sy + colH - bh - 16;
      drawThemedButton(bx, by, bw, bh, 0.85);
      ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
      const bt = '购买'; const btw = ctx.measureText(bt).width;
      ctx.fillText(bt, bx + (bw - btw)/2, by + 26);
      ov.buttons.push({ type:'buy_' + it.id, x: bx, y: by, w: bw, h: bh });
      sx += colW + 20;
    }
  }
  ctx.restore();
  state.powerOverlay = ov;
}

function tryPlace(piece, gx, gy){
  if(gx<0||gy<0||gx+piece.w>9||gy+piece.h>9) return false;
  for(const [dx,dy] of piece.cells){
    if(state.grid[gy+dy][gx+dx].state !== 'empty') return false;
  }
  const grid = state.grid.map(row => row.slice());
  for(const [dx,dy] of piece.cells){
    const c = grid[gy+dy][gx+dx];
    grid[gy+dy][gx+dx] = { state: 'filled', anchored: c.anchored, symbol: c.symbol, box: c.box };
  }
  state.grid = grid;
  return true;
}

function rotatePiece(p){
  const w = p.w, h = p.h;
  const cells = p.cells.map(([x,y]) => [y, w-1 - x]);
  return { ...p, cells, w: h, h: w };
}

function findClears(){
  const grid = state.grid;
  const rowsCount = Array(9).fill(0);
  const colsCount = Array(9).fill(0);
  const boxesCount = Array(9).fill(0);
  for(let y=0;y<9;y++){
    for(let x=0;x<9;x++){
      const st = grid[y][x].state;
      if(st==='filled'){
        rowsCount[y]++;
        colsCount[x]++;
        const b = Math.floor(x/3) + 3*Math.floor(y/3);
        boxesCount[b]++;
      }
    }
  }
  const rowsFull = [];
  const colsFull = [];
  const boxesFull = [];
  for(let y=0;y<9;y++){ if(rowsCount[y]===9) rowsFull.push(y); }
  for(let x=0;x<9;x++){ if(colsCount[x]===9) colsFull.push(x); }
  for(let b=0;b<9;b++){ if(boxesCount[b]===9) boxesFull.push([b%3, Math.floor(b/3)]); }
  const set = {};
  for(const y of rowsFull){ for(let x=0;x<9;x++){ set[`${x},${y}`]=true; } }
  for(const x of colsFull){ for(let y=0;y<9;y++){ set[`${x},${y}`]=true; } }
  for(const [bx,by] of boxesFull){ for(let y=by*3;y<by*3+3;y++) for(let x=bx*3;x<bx*3+3;x++){ set[`${x},${y}`]=true; } }
  const cells = Object.keys(set).map(k => k.split(',').map(n=>Number(n)));
  return { rows: rowsFull.length, cols: colsFull.length, boxes: boxesFull.length, clearedCount: cells.length, cells, rowsFull, colsFull, boxesFull };
}

function finalizeTurn(){
  if(state.challengeEnabled){
    state.turnAreas = 0;
    state.turnHadClear = false;
    state.scanActive = true;
    state.scanTs = Date.now();
    state.turnsUsed = (state.turnsUsed || 0) + 1;
    nextPieces();
  } else {
    let T = state.comboT;
    if(state.turnHadClear){ T = T + 1; } else { T = 0; }
    let add = 0;
    if(T>=2){
      let B = SCORE_CFG.comboBaseByT[T] || 0;
      if(T>4){ B = SCORE_CFG.comboBaseByT[4]; for(let i=5;i<=T;i++){ B += i * SCORE_CFG.comboIncrementPerT; } }
      add = B + state.turnAreas * SCORE_CFG.comboAreaBonusPerArea;
    }
    state.score = state.score + add;
    if(state.ui && state.ui.showPower){
      const coinAdd = (COIN_CFG && COIN_CFG.consecutiveComboCoinMap && COIN_CFG.consecutiveComboCoinMap[T]) || 0;
      state.coins += coinAdd;
    }
    state.turnAreas = 0;
    state.turnHadClear = false;
    state.scanActive = true;
    state.scanTs = Date.now();
    if(T > state.maxComboSession) state.maxComboSession = T;
    state.turnsUsed = (state.turnsUsed || 0) + 1;
    nextPieces();
    if(!anyPlacementPossible()){
      triggerFail();
    }
  }
}

function afterStepFinalize(){
  let T = state.comboT;
  if(state.prevStepHadClear){ T = T + 1; } else { T = 0; }
  const tp = { ...state.taskProgress };
  if(state.prevStepHadClear){ tp.comboTotal += 1; }
  if(T > tp.maxCombo){ tp.maxCombo = T; }
  state.comboT = T;
  if(T > state.maxComboSession) state.maxComboSession = T;
  if(state.ui && state.ui.showPower){
    const coinAdd = (COIN_CFG && COIN_CFG.consecutiveComboCoinMap && COIN_CFG.consecutiveComboCoinMap[T]) || 0;
    state.coins += coinAdd;
  }
  state.taskProgress = tp;
  if(state.challengeEnabled){
    const doCheck = () => {
      if(state.movesLeft!==null && state.movesLeft<=0){ triggerFail(); }
      if(!anyPlacementPossible()){ triggerFail(); }
      checkTasksComplete();
    };
    if(state.lastPlacementHadClear){
      setTimeout(doCheck, 320);
    } else {
      doCheck();
    }
  }
}

function checkTasksComplete(){
  const ch = state.challenge;
  if(!ch || !Array.isArray(ch.tasks)) return;
  const tp = state.taskProgress;
  let done = true;
  for(const t of ch.tasks){
    if(t.type==='score_at_least' && tp.score < t.target) done=false;
    if(t.type==='clear_areas_total' && tp.areas < t.target) done=false;
    if(t.type==='combo_total' && tp.comboTotal < t.target) done=false;
    if(t.type==='combo_consecutive' && tp.maxCombo < t.target) done=false;
  }
  if(done){ finish(true); }
}

function finish(success=false){
  wx.vibrateShort();
  addHistoryRecord('challenge', state.score, state.maxChainSession, success, state.gameStartTs, Date.now(), state.turnsUsed || 0);
  wx.showModal({
    title: '',
    content: success? '挑战成功' : '挑战结束',
    confirmText: '重试',
    cancelText: '返回',
    success: (res) => {
      if(res.confirm){
        const ch = state.challenge || CHALLENGES[0];
        initChallenge(ch);
        rngManager.initLevel(ch.levelId);
        nextPieces();
      } else {
        const ch = CHALLENGES[0];
        initChallenge(ch);
        rngManager.initLevel(ch.levelId);
        nextPieces();
      }
    }
  });
}

function triggerFail(){
  if(state.failHintActive) return;
  state.failHintActive = true;
  state.failHintTs = Date.now();
  setTimeout(() => {
    state.failHintActive = false;
    if(state.challengeEnabled){ finish(false); } else { gameOverClassic(); }
  }, 300);
}

function gameOverClassic(){
  wx.vibrateShort();
  addHistoryRecord(state.powerModeEnabled? 'power' : 'classic', state.score, state.maxChainSession, false, state.gameStartTs, Date.now(), state.turnsUsed || 0);
  wx.showModal({
    title: '',
    content: '游戏结束',
    confirmText: '重来',
    cancelText: '返回',
    success: (res) => {
      if(res.confirm){
        initGrid();
        nextPieces();
        state.score = 0;
        state.comboT = 0;
        state.turnAreas = 0;
        state.turnHadClear = false;
        state.comboChain = 0;
      } else {
        state.scene = 'menu';
      }
    }
  });
}

function onPlace(piece, gx, gy){
  const ok = tryPlace(piece, gx, gy);
  if(!ok) return false;
  if(state.audioPlace){ try{ state.audioPlace.stop(); }catch(e){} try{ state.audioPlace.play(); }catch(e){} }
  wx.vibrateShort();
  const res = findClears();
  const areasThisStep = (res.rows||0) + (res.cols||0) + (res.boxes||0);
  state.lastPlacementHadClear = res.clearedCount>0;
  if(state.challengeEnabled){
    if(state.movesLeft!==null){ state.movesLeft = state.movesLeft - 1; }
  }
  if(res.clearedCount>0){
    const grid = state.grid.map(row => row.slice());
    state.clearing = { cells: res.cells.slice(), ts: Date.now() };
    initClearFX(res.cells);
    initClearBurst(res.cells);
    initClearFlash(res);
    setTimeout(() => {
      const g2 = state.grid.map(row => row.slice());
      for(const [x,y] of res.cells){ const c = g2[y][x]; g2[y][x] = { state: 'empty', anchored: c.anchored, symbol: '', box: c.box }; }
      state.grid = g2;
      state.clearing = { cells: [], ts: 0 };
    }, 300);
    const newChain = (state.prevStepHadClear ? state.comboChain : 0) + areasThisStep;
    state.comboChain = newChain;
    if(newChain > state.maxChainSession) state.maxChainSession = newChain;
    state.prevStepHadClear = true;
    state.turnAreas += areasThisStep;
    state.turnHadClear = true;
    const comboTypes = (res.rows>0?1:0) + (res.cols>0?1:0) + (res.boxes>0?1:0);
    const baseClear = SCORE_CFG.clearScorePerCell * res.clearedCount;
    const typeMul = SCORE_CFG.comboTypeMultiplier[comboTypes] || 1;
    const add = baseClear * typeMul;
    state.score = state.score + SCORE_CFG.placeBaseScore + add;
    const bucketNow = Math.floor(state.score / COIN_CFG.scorePerCoin);
    if(bucketNow > state.coinScoreBucket){ state.coins += (bucketNow - state.coinScoreBucket); state.coinScoreBucket = bucketNow; }
    if(areasThisStep >= 3){ state.coins += ((COIN_CFG.stepComboCoinMap && COIN_CFG.stepComboCoinMap[areasThisStep]) || 0); }
    if(state.challengeEnabled){
      const allowed = !state.countOnlyAllowed || (piece.id && state.countOnlyAllowed.includes(piece.id));
      const tp = { ...state.taskProgress };
      if(allowed){ tp.score += SCORE_CFG.placeBaseScore + add; tp.areas += areasThisStep; }
      state.taskProgress = tp;
    }
    if(state.audioClear){ try{ state.audioClear.stop(); }catch(e){} try{ state.audioClear.play(); }catch(e){} }
    state.grid = grid;
    if(state.pieces.length===0){ nextPieces(); }
    if(newChain>1){ state.comboShow = true; state.comboTs = Date.now(); state.comboAnimTs = Date.now(); }
  } else {
    state.comboChain = 0;
    state.prevStepHadClear = false;
    state.score = state.score + SCORE_CFG.placeBaseScore;
    const bucketNow2 = Math.floor(state.score / COIN_CFG.scorePerCoin);
    if(bucketNow2 > state.coinScoreBucket){ state.coins += (bucketNow2 - state.coinScoreBucket); state.coinScoreBucket = bucketNow2; }
    if(state.challengeEnabled){
      const allowed = !state.countOnlyAllowed || (piece.id && state.countOnlyAllowed.includes(piece.id));
      const tp = { ...state.taskProgress };
      if(allowed){ tp.score += SCORE_CFG.placeBaseScore; }
      state.taskProgress = tp;
    }
  }
  if(state.pieces.length===0){ finalizeTurn(); }
  if(state.challengeEnabled){ afterStepFinalize(); }
  return true;
}

function anyPlacementPossible(){
  for(const piece of state.pieces){
    for(let gy=0;gy<=9-piece.h;gy++){
      for(let gx=0;gx<=9-piece.w;gx++){
        let ok=true;
        for(const [dx,dy] of piece.cells){
          if(state.grid[gy+dy][gx+dx].state!=='empty'){ ok=false; break; }
        }
        if(ok) return true;
      }
    }
  }
  return false;
}

function removePieceByIndex(idx){
  state.pieces = state.pieces.slice(0, idx).concat(state.pieces.slice(idx+1));
}

wx.onTouchStart(function(e){
  const t = e.changedTouches[0];
  if(state.powerOverlay && state.powerOverlay.visible){
    const ov = state.powerOverlay;
    for(const b of ov.buttons||[]){
      if(t.clientX>=b.x && t.clientX<=b.x+b.w && t.clientY>=b.y && t.clientY<=b.y+b.h){
        if(ov.type==='rotate'){
          if(b.type==='rotate'){
            const p = ov.tempPiece;
            ov.tempPiece = rotatePiece(p);
            state.powerOverlay = ov;
            return;
          } else if(b.type==='confirm'){
            const idx = ov.pieceIndex;
            state.pieces = state.pieces.map((q,qi)=> qi===idx ? ov.tempPiece : q);
            state.powerOverlay = { visible:false, type:null, pieceIndex:null, tempPiece:null, diceNewPiece:null, choice:'original', buttons:[] };
            state.activePower = null; state.awaitPowerPiece = false;
            if(!anyPlacementPossible()){ triggerFail(); }
            return;
          }
        } else if(ov.type==='dice'){
          if(b.type==='choose_original'){ ov.choice = 'original'; state.powerOverlay = ov; return; }
          if(b.type==='choose_new'){ ov.choice = 'new'; state.powerOverlay = ov; return; }
          if(b.type==='confirm'){
            const idx = ov.pieceIndex;
            if(ov.choice==='new'){
              const np = ov.diceNewPiece;
              state.pieces = state.pieces.map((q,qi)=> qi===idx ? np : q);
            }
            state.powerOverlay = { visible:false, type:null, pieceIndex:null, tempPiece:null, diceNewPiece:null, choice:'original', buttons:[] };
            state.activePower = null; state.awaitPowerPiece = false;
            if(!anyPlacementPossible()){ triggerFail(); }
            return;
          }
        } else if(ov.type==='shop'){
          if(b.type==='buy_rotate'){
            const price = ITEM_BUY_CFG.rotate;
            if(state.coins >= price){
              state.coins -= price;
              const idx = (state.powerBar||[]).findIndex(it=>it.type==='rotate');
              if(idx>=0){ state.powerBar[idx].count = (state.powerBar[idx].count||0)+1; }
            } else { wx.showToast && wx.showToast({ title: '金币不足', icon: 'none', duration: 1200 }); }
            return;
          }
          if(b.type==='buy_dice'){
            const price = ITEM_BUY_CFG.dice;
            if(state.coins >= price){
              state.coins -= price;
              const idx = (state.powerBar||[]).findIndex(it=>it.type==='dice');
              if(idx>=0){ state.powerBar[idx].count = (state.powerBar[idx].count||0)+1; }
            } else { wx.showToast && wx.showToast({ title: '金币不足', icon: 'none', duration: 1200 }); }
            return;
          }
          if(b.type==='buy_redraw'){
            const price = ITEM_BUY_CFG.redraw;
            if(state.coins >= price){
              state.coins -= price;
              const idx = (state.powerBar||[]).findIndex(it=>it.type==='redraw');
              if(idx>=0){ state.powerBar[idx].count = (state.powerBar[idx].count||0)+1; }
            } else { wx.showToast && wx.showToast({ title: '金币不足', icon: 'none', duration: 1200 }); }
            return;
          }
        }
      }
    }
    return;
  }
  if(state.scene==='menu'){
    for(const b of state.menuButtons){
      if(t.clientX>=b.x && t.clientX<=b.x+b.w && t.clientY>=b.y && t.clientY<=b.y+b.h){
        if(b.type==='classic'){
          state.challengeEnabled = false;
          state.powerModeEnabled = false;
          rngManager.initLevel('classic');
          initGrid();
          nextPieces();
          state.maxComboSession = 0;
          state.maxChainSession = 0;
          state.gameStartTs = Date.now();
          state.turnsUsed = 0;
          state.ui = { showBoard: true, showTray: true, showPower: false, showCancel: true };
          state.scene = 'game';
          if(!anyPlacementPossible()){
            triggerFail();
          }
          return;
        } else if(b.type==='levelSelect'){
          state.scene = 'levelSelect';
          return;
        } else if(b.type==='settings'){
          state.scene = 'settings';
          return;
        } else if(b.type==='powerMode'){
          state.challengeEnabled = false;
          state.powerModeEnabled = true;
          rngManager.initLevel('classic');
          initGrid();
          nextPieces();
          state.maxComboSession = 0;
          state.maxChainSession = 0;
          state.gameStartTs = Date.now();
          state.turnsUsed = 0;
          state.coins = 0;
          state.coinScoreBucket = 0;
          state.powerUsageCount = { rotate: 0, dice: 0, redraw: 0 };
          state.powerBar = [
            { type: 'rotate', count: (ITEM_START_COUNT && ITEM_START_COUNT.rotate) || 0 },
            { type: 'dice', count: (ITEM_START_COUNT && ITEM_START_COUNT.dice) || 0 },
            { type: 'redraw', count: (ITEM_START_COUNT && ITEM_START_COUNT.redraw) || 0 }
          ];
          state.activePower = null;
          state.awaitPowerPiece = false;
          state.ui = { showBoard: true, showTray: true, showPower: true, showCancel: true };
          state.scene = 'game';
          if(!anyPlacementPossible()){
            triggerFail();
          }
          return;
        } else if(b.type==='howto'){
          state.scene = 'howto';
          state.howtoScroll = 0;
          return;
        } else if(b.type==='history'){
          state.scene = 'history';
          state.historyScroll = 0;
          return;
        }
      }
    }
    return;
  }
  if(state.scene==='levelSelect'){
    if(state.backButton){
      const r = state.backButton;
      if(t.clientX>=r.x && t.clientX<=r.x+r.w && t.clientY>=r.y && t.clientY<=r.y+r.h){
        state.scene = 'menu';
        return;
      }
    }
    for(const b of state.menuButtons){
      if(t.clientX>=b.x && t.clientX<=b.x+b.w && t.clientY>=b.y && t.clientY<=b.y+b.h){
        if(b.type==='challenge'){
          const ch = CHALLENGES.find(c => c.id===b.id) || CHALLENGES[0];
          state.challengeEnabled = true;
          initChallenge(ch);
          rngManager.initLevel(ch.levelId);
          nextPieces();
          state.maxComboSession = 0;
          state.maxChainSession = 0;
          state.gameStartTs = Date.now();
          state.turnsUsed = 0;
          state.ui = { showBoard: true, showTray: true, showPower: false, showCancel: true };
          state.scene = 'game';
          if(!anyPlacementPossible()){
            triggerFail();
          }
          return;
        }
      }
    }
    return;
  }
  if(state.scene==='settings'){
    if(state.backButton){
      const r = state.backButton;
      if(t.clientX>=r.x && t.clientX<=r.x+r.w && t.clientY>=r.y && t.clientY<=r.y+r.h){
        state.scene = 'menu';
        return;
      }
    }
    for(const b of state.menuButtons){
      if(t.clientX>=b.x && t.clientX<=b.x+b.w && t.clientY>=b.y && t.clientY<=b.y+b.h){
        if(b.type==='theme'){
          applyTheme(b.id);
          try{ wx.setStorageSync('themeId', b.id); }catch(e){}
          state.scene = 'settings';
          return;
        } else if(b.type==='moveMode'){
          state.moveMode = b.id === 'relative' ? 'relative' : 'absolute';
          try{ wx.setStorageSync('moveMode', state.moveMode); }catch(e){}
          state.scene = 'settings';
          return;
        }
      }
    }
    return;
  }
  if(state.scene==='history'){
    if(state.backButton){
      const r = state.backButton;
      if(t.clientX>=r.x && t.clientX<=r.x+r.w && t.clientY>=r.y && t.clientY<=r.y+r.h){
        state.scene = 'menu';
        return;
      }
    }
    for(const tb of state.historyTabBtns||[]){
      if(t.clientX>=tb.x && t.clientX<=tb.x+tb.w && t.clientY>=tb.y && t.clientY<=tb.y+tb.h){
        state.historyCategory = tb.id;
        state.historyScroll = 0;
        return;
      }
    }
    if(state.historyClearBtn){
      const r = state.historyClearBtn;
      if(t.clientX>=r.x && t.clientX<=r.x+r.w && t.clientY>=r.y && t.clientY<=r.y+r.h){
        const cat = state.historyCategory;
        state.historyRecords = (state.historyRecords||[]).filter(rec => rec.mode !== cat);
        saveHistory();
        state.historyScroll = 0;
        return;
      }
    }
    for(const b of state.historyButtons||[]){
      if(t.clientX>=b.x && t.clientX<=b.x+b.w && t.clientY>=b.y && t.clientY<=b.y+b.h){
        state.historySelectedIndex = b.index;
        state.scene = 'historyDetail';
        return;
      }
    }
    return;
  }
  if(state.backButton){
    const r = state.backButton;
    if(t.clientX>=r.x && t.clientX<=r.x+r.w && t.clientY>=r.y && t.clientY<=r.y+r.h){
      state.scene = 'menu';
      state.howtoScroll = 0;
      return;
    }
  }
  if(state.ui && state.ui.showPower && !state.dragging && !state.awaitPowerPiece){
    for(let i=0;i<state.powerRects.length;i++){
      const r = state.powerRects[i];
      if(t.clientX>=r.x && t.clientX<=r.x+r.w && t.clientY>=r.y && t.clientY<=r.y+r.h){
        const item = state.powerBar[i];
        if(!item) break;
        const cnt = item.count||0;
        const usage = state.powerUsageCount[item.type]||0;
        const arr = ITEM_COST_CFG[item.type]||[1];
        const priceUse = arr[Math.min(usage, arr.length-1)];
        if(cnt > 0){
          if(item.type==='redraw'){
            wx.showModal({
              title: '',
              content: '更换一组新的零件？',
              confirmText: '继续',
              cancelText: '放弃',
              success: (res) => {
                if(res.confirm){
                  state.pieces = [];
                  nextPieces();
                  if(!anyPlacementPossible()){ triggerFail(); }
                }
                item.count = Math.max(0, cnt - 1);
                state.powerBar[i] = item;
                state.powerUsageCount[item.type] = usage + 1;
              }
            });
          } else if(item.type==='rotate'){
            item.count = Math.max(0, cnt - 1);
            state.powerBar[i] = item;
            state.powerUsageCount[item.type] = usage + 1;
            state.activePower = 'rotate';
            state.awaitPowerPiece = true;
            wx.showToast && wx.showToast({ title: '点选一个零件进行旋转', icon: 'none', duration: 1200 });
          } else if(item.type==='dice'){
            item.count = Math.max(0, cnt - 1);
            state.powerBar[i] = item;
            state.powerUsageCount[item.type] = usage + 1;
            state.activePower = 'dice';
            state.awaitPowerPiece = true;
            wx.showToast && wx.showToast({ title: '点选一个零件，掷骰生成新零件', icon: 'none', duration: 1200 });
          }
        } else {
          if(state.coins < priceUse){
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
              if(!res.confirm) return;
              state.coins -= priceUse;
              state.powerUsageCount[item.type] = usage + 1;
              if(item.type==='redraw'){
                wx.showModal({
                  title: '',
                  content: '更换一组新的零件？',
                  confirmText: '继续',
                  cancelText: '放弃',
                  success: (res2) => {
                    if(res2.confirm){
                      state.pieces = [];
                      nextPieces();
                      if(!anyPlacementPossible()){ triggerFail(); }
                    }
                  }
                });
              } else if(item.type==='rotate'){
                state.activePower = 'rotate';
                state.awaitPowerPiece = true;
                wx.showToast && wx.showToast({ title: '点选一个零件进行旋转', icon: 'none', duration: 1200 });
              } else if(item.type==='dice'){
                state.activePower = 'dice';
                state.awaitPowerPiece = true;
                wx.showToast && wx.showToast({ title: '点选一个零件，掷骰生成新零件', icon: 'none', duration: 1200 });
              }
            }
          });
        }
        return;
      }
    }
  }
  for(let i=0;i<state.tray.rects.length;i++){
    const r = state.tray.rects[i];
    if(t.clientX>=r.x && t.clientX<=r.x+r.w && t.clientY>=r.y && t.clientY<=r.y+r.h){
      const piece = state.pieces[i];
      if(!piece) return;
      if(state.powerModeEnabled && state.awaitPowerPiece){
        if(state.activePower==='rotate'){
          state.powerOverlay = { visible: true, type: 'rotate', pieceIndex: i, tempPiece: { ...state.pieces[i], cells: state.pieces[i].cells.map(c=>c.slice()) }, diceNewPiece: null, choice: 'original', buttons: [] };
          return;
        } else if(state.activePower==='dice'){
          const newCfg = rngManager.nextPiece();
          const nn = toCells(newCfg.shape);
          const newPiece = { id: newCfg.id, name: newCfg.name, color: newCfg.color, cells: nn.cells, w: nn.w, h: nn.h };
          state.powerOverlay = { visible: true, type: 'dice', pieceIndex: i, tempPiece: { ...state.pieces[i], cells: state.pieces[i].cells.map(c=>c.slice()) }, diceNewPiece: newPiece, choice: 'original', buttons: [] };
          return;
        }
        return;
      }
      state.dragging = true;
      if(state.moveMode==='relative'){
        const b = state.board;
        const localX = t.clientX - b.left;
        const localY = t.clientY - b.top;
        let startGx = Math.round(localX / b.cell) - Math.floor(piece.w / 2);
        let startGy = Math.round(localY / b.cell) - Math.floor(piece.h / 2);
        if(startGx < 0) startGx = 0; if(startGy < 0) startGy = 0;
        if(startGx > 9 - piece.w) startGx = 9 - piece.w;
        if(startGy > 9 - piece.h) startGy = 9 - piece.h;
        state.drag = { x: t.clientX, y: t.clientY, cells: piece.cells.slice(), color: piece.color, gx: startGx, gy: startGy, index: i, w: piece.w, h: piece.h, refX: t.clientX, refY: t.clientY, startGx, startGy, mode: 'relative' };
      } else {
        state.drag = { x: t.clientX, y: t.clientY, cells: piece.cells.slice(), color: piece.color, gx: 0, gy: 0, index: i, w: piece.w, h: piece.h, mode: 'absolute' };
      }
      break;
    }
  }
});

wx.onTouchMove(function(e){
  if(!state.dragging) return;
  const t = e.changedTouches[0];
  const b = state.board;
  if(state.scene==='howto'){
    if(state.howtoTouchY==null) state.howtoTouchY = t.clientY;
    const dy = t.clientY - state.howtoTouchY;
    state.howtoTouchY = t.clientY;
    state.howtoScroll = Math.max(0, state.howtoScroll - dy);
    return;
  }
  if(state.scene==='history'){
    if(state.historyTouchY==null) state.historyTouchY = t.clientY;
    const dy = t.clientY - state.historyTouchY;
    state.historyTouchY = t.clientY;
    state.historyScroll = Math.max(0, state.historyScroll - dy);
    return;
  }
  let gx, gy;
  if(state.moveMode==='relative' && state.drag.mode==='relative'){
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
  if(gx < 0) gx = 0; if(gy < 0) gy = 0;
  if(gx > 9 - state.drag.w) gx = 9 - state.drag.w;
  if(gy > 9 - state.drag.h) gy = 9 - state.drag.h;
  state.drag.gx = gx;
  state.drag.gy = gy;
});

wx.onTouchEnd(function(e){
  if(!state.dragging) return;
  const t = e.changedTouches[0];
  const b = state.board;
  if(state.scene==='howto'){
    state.dragging = false;
    state.howtoTouchY = null;
    state.drag = { x:0,y:0,cells:[] };
    return;
  }
  if(state.scene==='history'){
    state.dragging = false;
    state.historyTouchY = null;
    state.drag = { x:0,y:0,cells:[] };
    return;
  }
  if(state.moveMode!=='relative'){
    if(!(t.clientX>=b.left && t.clientX<=b.left+b.size && t.clientY>=b.top && t.clientY<=b.top+b.size)){
      state.dragging = false; state.drag = { x:0,y:0,cells:[] }; return;
    }
  }
  if(state.moveMode==='relative' && state.drag.mode==='relative'){
    const z = state.cancelZone;
    const inCancel =
      z && t.clientX>=z.x && t.clientX<=z.x+z.w && t.clientY>=z.y && t.clientY<=z.y+z.h;
    if(inCancel){
      state.dragging = false;
      state.drag = { x:0,y:0,cells:[] };
      return;
    }
  }
  const piece = state.pieces[state.drag.index];
  const ok = onPlace(piece, state.drag.gx, state.drag.gy);
  if(ok){
    removePieceByIndex(state.drag.index);
    if(state.pieces.length===0){
      finalizeTurn();
    } else {
      if(state.lastPlacementHadClear){
        setTimeout(() => {
          if(!anyPlacementPossible()){
            triggerFail();
          }
        }, 320);
      } else {
        if(!anyPlacementPossible()){
          triggerFail();
        }
      }
    }
  }
  state.dragging = false;
  state.drag = { x:0,y:0,cells:[] };
});

function tick(){
  render();
}

function init(){
  state.scene = 'menu';
  try{
    const saved = wx.getStorageSync('themeId');
    applyTheme(saved || (THEMES.currentId || (THEMES.current && THEMES.current.id)));
  }catch(e){
    applyTheme(THEMES.currentId || (THEMES.current && THEMES.current.id));
  }
  try{
    const savedMode = wx.getStorageSync('moveMode');
    if(savedMode==='relative' || savedMode==='absolute'){ state.moveMode = savedMode; }
  }catch(e){}
  loadHistory();
  layout();
  setInterval(tick, 16);
  ensureAudio();
  ensureMenuBg();
}

function drawFailHint(){
  if(!state.failHintActive) return;
  const elapsed = Date.now() - state.failHintTs;
  const frac = Math.min(1, elapsed / 300);
  ctx.save();
  ctx.fillStyle = 'rgba(255,0,0,' + (0.15 + 0.35 * (1 - frac)) + ')';
  ctx.fillRect(0,0,sw,sh);
  ctx.restore();
}

function drawScan(){
  if(!state.scanActive) return;
  const elapsed = Date.now() - state.scanTs;
  if(elapsed > 1200){ state.scanActive = false; return; }
  const y = -120 + (sh + 120) * (elapsed / 1200);
  const grad = ctx.createLinearGradient(0, y, 0, y + 120);
  grad.addColorStop(0, accentRGBA(0.0));
  grad.addColorStop(0.5, accentRGBA(0.35));
  grad.addColorStop(1, accentRGBA(0.0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, sw, 120);
}

function drawClearing(){
  if(!state.clearing || !state.clearing.cells || state.clearing.cells.length===0) return;
  const elapsed = Date.now() - state.clearing.ts;
  const frac = Math.min(1, elapsed / 300);
  const alpha = 1 - frac;
  const scale = 1 + 0.08 * (1 - frac);
  const b = state.board;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = vars.cellFilled || '#00c853';
  for(const [x,y] of state.clearing.cells){
    const cx = b.left + x*b.cell + b.cell/2;
    const cy = b.top + y*b.cell + b.cell/2;
    const w = (b.cell - 4) * scale;
    const h = (b.cell - 4) * scale;
    ctx.fillRect(cx - w/2, cy - h/2, w, h);
  }
  ctx.restore();
}

function ensureAudio(){
  try{
    const fs = wx.getFileSystemManager();
    const placePath = `${wx.env.USER_DATA_PATH}/beep_place.wav`;
    const clearPath = `${wx.env.USER_DATA_PATH}/beep_clear.wav`;
    const placeBuf = generateBeepWav(220, 120);
    const clearBuf = generateBeepWav(440, 140);
    fs.writeFileSync(placePath, placeBuf);
    fs.writeFileSync(clearPath, clearBuf);
    state.audioPlace = wx.createInnerAudioContext();
    state.audioPlace.src = placePath;
    state.audioPlace.volume = 0.6;
    state.audioClear = wx.createInnerAudioContext();
    state.audioClear.src = clearPath;
    state.audioClear.volume = 0.7;
  }catch(e){
    console.warn('Audio init failed', e);
  }
}

function ensureMenuBg(){
  try{
    const img = wx.createImage ? wx.createImage() : new Image();
    img.onload = function(){ state.menuBg = img; state.menuBgReady = true; };
    img.onerror = function(){ state.menuBgReady = false; };
    // Try common paths; replace with your actual asset path if different
    img.src = '/miniprogram/assets/pipboy_bg.png';
    // Fallback
    setTimeout(() => {
      if(!state.menuBgReady){ img.src = '/assets/pipboy_bg.png'; }
    }, 500);
  }catch(e){
    state.menuBgReady = false;
  }
}

function loadHistory(){
  try{
    const data = wx.getStorageSync('historyRecords') || [];
    if(Array.isArray(data)) state.historyRecords = data;
  }catch(e){}
}

function saveHistory(){
  try{
    wx.setStorageSync('historyRecords', state.historyRecords);
  }catch(e){}
}

function addHistoryRecord(mode, score, maxCombo, success, startTs, endTs, turns){
  const rec = { mode, score, maxCombo, success: !!success, ts: endTs || Date.now(), startTs: startTs || 0, endTs: endTs || Date.now(), turns: turns || 0 };
  const list = Array.isArray(state.historyRecords) ? state.historyRecords.slice() : [];
  list.push(rec);
  list.sort((a,b)=> b.score - a.score || b.ts - a.ts);
  state.historyRecords = list.slice(0,10);
  saveHistory();
}

function drawBoardThumbnail(x, y, size, highlight){
  const cell = size / 9;
  ctx.save();
  ctx.fillStyle = vars.boardBg || '#061b12';
  ctx.fillRect(x, y, size, size);
  for(let by=0; by<3; by++){
    for(let bx=0; bx<3; bx++){
      const even = (bx+by)%2===0;
      ctx.fillStyle = even ? (vars.boxEven || '#ffffff') : (vars.boxOdd || '#e8f2ff');
      ctx.fillRect(x + bx*3*cell, y + by*3*cell, 3*cell, 3*cell);
    }
  }
  ctx.fillStyle = vars.lineColor || 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 3*cell - 1, y, 2, size);
  ctx.fillRect(x + 6*cell - 1, y, 2, size);
  ctx.fillRect(x, y + 3*cell - 1, size, 2);
  ctx.fillRect(x, y + 6*cell - 1, size, 2);
  if(highlight){
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = accentColor();
    if(highlight.row != null){ ctx.fillRect(x, y + highlight.row*cell, size, cell); }
    if(highlight.col != null){ ctx.fillRect(x + highlight.col*cell, y, cell, size); }
    if(highlight.box){ const bx=highlight.box[0], by=highlight.box[1]; ctx.fillRect(x + bx*3*cell, y + by*3*cell, 3*cell, 3*cell); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawWrappedText(text, x, y, maxWidth, lineHeight){
  let line = '';
  for(let i=0;i<text.length;i++){
    const ch = text[i];
    const test = line + ch;
    if(ctx.measureText(test).width > maxWidth && line.length>0){
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = ch;
    } else {
      line = test;
    }
  }
  if(line.length>0){
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawHowto(){
  const scroll = state.howtoScroll || 0;
  const baseY = safeTop + 100 - scroll;
  drawMenuBg();
  ctx.fillStyle = '#fff';
  ctx.font = '28px sans-serif';
  const title = '玩法说明';
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, Math.floor((sw - tw)/2), baseY);
  let y = baseY + 24;
  ctx.font = '18px sans-serif';
  y = drawWrappedText('棋盘与目标：在9×9棋盘上填充方块，消除整行、整列或3×3区域。', 24, y, sw - 48, 24);
  const size = Math.min(sw - 48, 260);
  const x = Math.floor((sw - size)/2);
  drawBoardThumbnail(x, y + 4, size, { row: 4, col: 2, box: [1,1] });
  y += size + 12;
  y = drawWrappedText('放置操作：拖动托盘中的零件至棋盘，松手放置。', 24, y, sw - 48, 24);
  y = drawWrappedText('连击与得分：连续产生消除可累计连击并获得额外加分。', 24, y, sw - 48, 24);
  y = drawWrappedText('模式：经典模式、挑战模式、道具模式（随机能力零件）。', 24, y, sw - 48, 24);
  y = drawWrappedText('移动方式：设置中可选择普通/相对移动，避免手指遮挡棋盘。', 24, y, sw - 48, 24);
  y = drawWrappedText('提示：无解时会给出红色闪烁提示并结束当前局/挑战。', 24, y, sw - 48, 24);
}

function drawSettings(){
  state.menuButtons = [];
  drawMenuBg();
  ctx.fillStyle = '#fff';
  ctx.font = '26px sans-serif';
  const title = '设置';
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, Math.floor((sw - tw)/2), safeTop + 64);
  ctx.font = '20px sans-serif';
  const sub = '主题配色';
  const swid = ctx.measureText(sub).width;
  ctx.fillText(sub, Math.floor((sw - swid)/2), safeTop + 96);
  const btnW = Math.floor(sw * 0.85);
  const btnH = 54;
  let y = safeTop + 130;
  const x = Math.floor((sw - btnW)/2);
  for(const th of THEMES.list){
    const active = th.id === THEMES.currentId;
    drawThemedButton(x, y, btnW, btnH, active ? 0.95 : 0.75);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText(`${th.name}`, x + 12, y + 32);
    state.menuButtons.push({ type:'theme', id: th.id, x, y, w: btnW, h: btnH });
    y += btnH + 12;
  }
  // Move mode
  ctx.font = '20px sans-serif';
  const sub2 = '移动方式';
  const swid2 = ctx.measureText(sub2).width;
  ctx.fillText(sub2, Math.floor((sw - swid2)/2), y + 20);
  y += 36;
  const halfW = Math.floor((btnW - 12) / 2);
  const activeAbs = state.moveMode==='absolute';
  const activeRel = state.moveMode==='relative';
  drawThemedButton(x, y, halfW, btnH, activeAbs ? 0.95 : 0.75);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText(`普通`, x + 12, y + 32);
  state.menuButtons.push({ type:'moveMode', id: 'absolute', x, y, w: halfW, h: btnH });
  drawThemedButton(x + halfW + 12, y, halfW, btnH, activeRel ? 0.95 : 0.75);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText(`相对`, x + halfW + 12 + 12, y + 32);
  state.menuButtons.push({ type:'moveMode', id: 'relative', x: x + halfW + 12, y, w: halfW, h: btnH });
}

function initClearFX(cells){
  const b = state.board;
  const parts = [];
  const now = Date.now();
  for(const [x,y] of cells){
    const cx = b.left + x*b.cell + b.cell/2;
    const cy = b.top + y*b.cell + b.cell/2;
    for(let i=0;i<12;i++){
      const ang = Math.random() * Math.PI * 2;
      const sp = b.cell * (0.35 + Math.random() * 0.45);
      const sz = 2 + Math.floor(Math.random() * 3);
      parts.push({ cx, cy, ang, sp, sz });
    }
  }
  state.clearFX = { parts, ts: now, duration: 450 };
}

function drawClearFX(){
  const fx = state.clearFX;
  if(!fx || !fx.parts || fx.parts.length===0) return;
  const elapsed = Date.now() - fx.ts;
  if(elapsed <= 0) return;
  const prog = Math.min(1, elapsed / fx.duration);
  const alpha = 1 - prog;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = accentColor();
  for(const p of fx.parts){
    const dx = Math.cos(p.ang) * p.sp * prog;
    const dy = Math.sin(p.ang) * p.sp * prog;
    ctx.fillRect(p.cx + dx, p.cy + dy, p.sz, p.sz);
  }
  ctx.restore();
  if(elapsed >= fx.duration){ state.clearFX = { parts: [], ts: 0, duration: fx.duration }; }
}

function accentColor(){
  return vars.accent || '#ff9800';
}

function accentRGBA(a){
  const [r,g,b] = parseColorToRGB(accentColor());
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

function parseColorToRGB(c){
  if(!c) return [255,153,0];
  if(c.startsWith('#')){
    const hex = c.slice(1);
    if(hex.length===3){
      const r = parseInt(hex[0]+hex[0],16);
      const g = parseInt(hex[1]+hex[1],16);
      const b = parseInt(hex[2]+hex[2],16);
      return [r,g,b];
    }
    if(hex.length>=6){
      const r = parseInt(hex.slice(0,2),16);
      const g = parseInt(hex.slice(2,4),16);
      const b = parseInt(hex.slice(4,6),16);
      return [r,g,b];
    }
  }
  const m = c.match(/rgba?\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
  if(m){
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  return [255,153,0];
}

function drawThemedButton(x, y, w, h, alpha){
  ctx.save();
  ctx.globalAlpha = alpha == null ? 0.85 : alpha;
  ctx.fillStyle = accentColor();
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = Math.min(1, (alpha == null ? 0.85 : alpha) + 0.1);
  ctx.strokeStyle = accentColor();
  ctx.lineWidth = 2;
  ctx.strokeRect(x+1, y+1, w-2, h-2);
  ctx.restore();
}

function generateBeepWav(freq, durationMs){
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const amplitude = 0.3;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  function writeString(offset, str){
    for(let i=0;i<str.length;i++){ view.setUint8(offset+i, str.charCodeAt(i)); }
  }
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for(let i=0;i<numSamples;i++){
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t) * amplitude;
    view.setInt16(44 + i*2, Math.max(-1, Math.min(1, sample)) * 0x7FFF, true);
  }
  return buffer;
}
init();

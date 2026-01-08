const shared = require('../shared.js');
const { ITEM_BUY_CFG } = require('../../miniprogram/config/item_price.js');

function accentColor(){
  const v = shared.vars || {};
  return v.accent || '#00e676';
}

function drawPiecePreview(p, bx, by, cell){
  const ctx = shared.ctx;
  const v = shared.vars || {};
  ctx.fillStyle = p.color || (v.cellFilled || '#00c853');
  for(const [dx,dy] of p.cells){
    const x = bx + dx*cell;
    const y = by + dy*cell;
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
  }
}

function drawPowerOverlay(){
  const state = shared.state;
  const ctx = shared.ctx;
  const sw = shared.sw, sh = shared.sh;
  const v = shared.vars || {};
  const ov = state.powerOverlay;
  if(!ov || !ov.visible) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0,0,sw,sh);
  const cardW = Math.floor(sw * 0.86);
  const cardH = Math.floor(sh * 0.56);
  const cardX = Math.floor((sw - cardW)/2);
  const cardY = Math.floor((sh - cardH)/2);
  ctx.fillStyle = v.boardBg || '#061b12';
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
    ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
    const rt = '旋转', ct = '确认';
    const rtw = ctx.measureText(rt).width, ctw = ctx.measureText(ct).width;
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(rx, ry, bw, bh); ctx.fillRect(cx, cy, bw, bh);
    ctx.fillStyle = '#fff';
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
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(cx, cy, bw, bh);
    ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
    const ct = '确认'; const ctw = ctx.measureText(ct).width; ctx.fillText(ct, cx + (bw - ctw)/2, cy + 28);
    ov.buttons.push({ type:'choose_original', x: left.x, y: left.y, w: left.w, h: left.h });
    ov.buttons.push({ type:'choose_new', x: right.x, y: right.y, w: right.w, h: right.h });
    ov.buttons.push({ type:'confirm', x: cx, y: cy, w: bw, h: bh });
  }
  ctx.restore();
  state.powerOverlay = ov;
}

module.exports = { drawPowerOverlay, drawPiecePreview };


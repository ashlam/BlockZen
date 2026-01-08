const shared = require('../shared.js');
const { ITEM_COST_CFG } = require('../../miniprogram/config/item_price.js');

function accentColor(){
  const v = shared.vars || {};
  return v.accent || '#00e676';
}

function drawPowerBar(){
  const state = shared.state;
  const ctx = shared.ctx;
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

module.exports = { drawPowerBar };


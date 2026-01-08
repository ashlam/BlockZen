const databus = require('../databus');
const shared = require('../shared');
const { CHALLENGES, THEMES } = require('../config');
const { accentColor } = require('../utils/theme');
const { formatTs } = require('../utils/helpers');
const styles = require('../render/styles');

class UIManager {
  drawMenu(ctx) {
    const sw = shared.sw;
    const safeTop = shared.safeTop;
    databus.state.menuButtons = [];
    this.drawMenuBg(ctx);
    
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    const title = '哔哔消除';
    const tw = ctx.measureText(title).width;
    ctx.fillText(title, Math.floor((sw - tw)/2), safeTop + 96);
    const btnW = Math.floor(sw * 0.7);
    const btnH = 56;
    let y = safeTop + 160;
    const x = Math.floor((sw - btnW)/2);
    
    styles.drawThemedButton(ctx, x, y, btnW, btnH, 0.85);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    const ct = '经典模式';
    const ctw = ctx.measureText(ct).width;
    ctx.fillText(ct, x + (btnW - ctw)/2, y + 36);
    databus.state.menuButtons.push({ type:'classic', x, y, w: btnW, h: btnH });
    y += btnH + 20;
    
    styles.drawThemedButton(ctx, x, y, btnW, btnH, 0.85);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    const ct2 = '挑战模式';
    const ct2w = ctx.measureText(ct2).width;
    ctx.fillText(ct2, x + (btnW - ct2w)/2, y + 36);
    databus.state.menuButtons.push({ type:'levelSelect', x, y, w: btnW, h: btnH });
    y += btnH + 20;
    
    styles.drawThemedButton(ctx, x, y, btnW, btnH, 0.85);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    const ct3 = '道具模式';
    const ct3w = ctx.measureText(ct3).width;
    ctx.fillText(ct3, x + (btnW - ct3w)/2, y + 36);
    databus.state.menuButtons.push({ type:'powerMode', x, y, w: btnW, h: btnH });
    y += btnH + 20;
    
    styles.drawThemedButton(ctx, x, y, btnW, btnH, 0.85);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    const ct4 = '玩法说明';
    const ct4w = ctx.measureText(ct4).width;
    ctx.fillText(ct4, x + (btnW - ct4w)/2, y + 36);
    databus.state.menuButtons.push({ type:'howto', x, y, w: btnW, h: btnH });
    y += btnH + 20;

    styles.drawThemedButton(ctx, x, y, btnW, btnH, 0.85);
    ctx.fillStyle = '#fff';
    ctx.font = '22px sans-serif';
    const ct5 = '历史记录';
    const ct5w = ctx.measureText(ct5).width;
    ctx.fillText(ct5, x + (btnW - ct5w)/2, y + 36);
    databus.state.menuButtons.push({ type:'history', x, y, w: btnW, h: btnH });
    
    // Settings button
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
    databus.state.menuButtons.push({ type:'settings', x: gx, y: gy, w: gw, h: gh });
  }

  drawLevelSelect(ctx) {
    const sw = shared.sw;
    const safeTop = shared.safeTop;
    databus.state.menuButtons = [];
    this.drawMenuBg(ctx);
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
      styles.drawThemedButton(ctx, x, y, btnW, btnH, 0.85);
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
      databus.state.menuButtons.push({ type:'challenge', id: ch.id, x, y, w: btnW, h: btnH });
      y += btnH + 14;
    }
  }

  drawHistory(ctx) {
    this.drawMenuBg(ctx);
    const sw = shared.sw;
    const safeTop = shared.safeTop;
    const scroll = databus.state.historyScroll || 0;
    const baseY = safeTop + 100 - scroll;
    databus.state.historyButtons = [];
    databus.state.historyTabBtns = [];
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    const title = '历史记录';
    const tw = ctx.measureText(title).width;
    ctx.fillText(title, Math.floor((sw - tw)/2), baseY);
    // Clear button
    const cbW = 72, cbH = 36;
    const cbX = sw - cbW - 24;
    const cbY = baseY - 10;
    styles.drawThemedButton(ctx, cbX, cbY, cbW, cbH, 0.85);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    const ct = '清空';
    const ctw = ctx.measureText(ct).width;
    ctx.fillText(ct, cbX + (cbW - ctw)/2, cbY + 24);
    databus.state.historyClearBtn = { x: cbX, y: cbY, w: cbW, h: cbH };
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
      const active = databus.state.historyCategory===tinfo.id;
      styles.drawThemedButton(ctx, tx, ty, tabW, tabH, active?0.95:0.75);
      ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
      const lw = ctx.measureText(tinfo.label).width;
      ctx.fillText(tinfo.label, tx + (tabW - lw)/2, ty + 24);
      databus.state.historyTabBtns.push({ id: tinfo.id, x: tx, y: ty, w: tabW, h: tabH });
      tx += tabW + 12;
    }
    ctx.font = '18px sans-serif';
    const sub = (databus.state.historyCategory==='classic'?'经典':(databus.state.historyCategory==='challenge'?'挑战':'道具')) + '模式前10条最高分与最大连击';
    const swid = ctx.measureText(sub).width;
    ctx.fillText(sub, Math.floor((sw - swid)/2), baseY + 24 + 36 + 12);
    let y = baseY + 24 + 36 + 12 + 28;
    const x = 24;
    const w = sw - 48;
    const rowH = 48;
    const listAll = databus.state.historyRecords || [];
    const list = listAll.filter(r => r.mode === databus.state.historyCategory);
    for(let i=0;i<list.length;i++){
      const rec = list[i];
      styles.drawThemedButton(ctx, x, y, w, rowH, 0.85);
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      const modeLabel = rec.mode==='classic'? '经典' : rec.mode==='power'? '道具' : '挑战';
      const left = `${i+1}. ${modeLabel}  分数 ${rec.score}`;
      ctx.fillText(left, x + 12, y + 30);
      const right = `最大连击 ${rec.maxCombo}`;
      const rw = ctx.measureText(right).width;
      ctx.fillText(right, x + w - 12 - rw, y + 30);
      databus.state.historyButtons.push({ index: i, x, y, w, h: rowH });
      y += rowH + 10;
    }
  }

  drawHistoryDetail(ctx) {
    this.drawMenuBg(ctx);
    const sw = shared.sw;
    const safeTop = shared.safeTop;
    const idx = databus.state.historySelectedIndex;
    const rec = (databus.state.historyRecords||[])[idx||0];
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
    styles.drawThemedButton(ctx, cardX, cardY, cardW, cardH, 0.85);
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

  drawSettings(ctx) {
    databus.state.menuButtons = [];
    this.drawMenuBg(ctx);
    const sw = shared.sw;
    const safeTop = shared.safeTop;
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
      styles.drawThemedButton(ctx, x, y, btnW, btnH, active ? 0.95 : 0.75);
      ctx.fillStyle = '#fff';
      ctx.font = '18px sans-serif';
      ctx.fillText(`${th.name}`, x + 12, y + 32);
      databus.state.menuButtons.push({ type:'theme', id: th.id, x, y, w: btnW, h: btnH });
      y += btnH + 12;
    }
    // Move mode
    ctx.font = '20px sans-serif';
    const sub2 = '移动方式';
    const swid2 = ctx.measureText(sub2).width;
    ctx.fillText(sub2, Math.floor((sw - swid2)/2), y + 20);
    y += 36;
    const halfW = Math.floor((btnW - 12) / 2);
    const activeAbs = databus.state.moveMode==='absolute';
    const activeRel = databus.state.moveMode==='relative';
    styles.drawThemedButton(ctx, x, y, halfW, btnH, activeAbs ? 0.95 : 0.75);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText(`普通`, x + 12, y + 32);
    databus.state.menuButtons.push({ type:'moveMode', id: 'absolute', x, y, w: halfW, h: btnH });
    styles.drawThemedButton(ctx, x + halfW + 12, y, halfW, btnH, activeRel ? 0.95 : 0.75);
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.fillText(`相对`, x + halfW + 12 + 12, y + 32);
    databus.state.menuButtons.push({ type:'moveMode', id: 'relative', x: x + halfW + 12, y, w: halfW, h: btnH });
  }

  drawHowto(ctx) {
    const sw = shared.sw;
    const safeTop = shared.safeTop;
    const scroll = databus.state.howtoScroll || 0;
    const baseY = safeTop + 100 - scroll;
    this.drawMenuBg(ctx);
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    const title = '玩法说明';
    const tw = ctx.measureText(title).width;
    ctx.fillText(title, Math.floor((sw - tw)/2), baseY);
    let y = baseY + 24;
    ctx.font = '18px sans-serif';
    y = styles.drawWrappedText(ctx, '棋盘与目标：在9×9棋盘上填充方块，消除整行、整列或3×3区域。', 24, y, sw - 48, 24);
    const size = Math.min(sw - 48, 260);
    const x = Math.floor((sw - size)/2);
    styles.drawBoardThumbnail(ctx, x, y + 4, size, { row: 4, col: 2, box: [1,1] });
    y += size + 12;
    y = styles.drawWrappedText(ctx, '放置操作：拖动托盘中的零件至棋盘，松手放置。', 24, y, sw - 48, 24);
    y = styles.drawWrappedText(ctx, '连击与得分：连续产生消除可累计连击并获得额外加分。', 24, y, sw - 48, 24);
    y = styles.drawWrappedText(ctx, '模式：经典模式、挑战模式、道具模式（随机能力零件）。', 24, y, sw - 48, 24);
    y = styles.drawWrappedText(ctx, '移动方式：设置中可选择普通/相对移动，避免手指遮挡棋盘。', 24, y, sw - 48, 24);
    y = styles.drawWrappedText(ctx, '提示：无解时会给出红色闪烁提示并结束当前局/挑战。', 24, y, sw - 48, 24);
  }

  drawMenuBg(ctx) {
    const sw = shared.sw;
    const sh = shared.sh;
    const vars = shared.vars;
    
    if (databus.state.menuBgReady && databus.state.menuBg) {
      const img = databus.state.menuBg;
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
      // Fallback
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

  ensureMenuBg() {
     try{
        const img = wx.createImage ? wx.createImage() : new Image();
        img.onload = function(){ databus.state.menuBg = img; databus.state.menuBgReady = true; };
        img.onerror = function(){ databus.state.menuBgReady = false; };
        img.src = '/miniprogram/assets/pipboy_bg.png';
        setTimeout(() => {
          if(!databus.state.menuBgReady){ img.src = '/assets/pipboy_bg.png'; }
        }, 500);
      }catch(e){
        databus.state.menuBgReady = false;
      }
  }
}

module.exports = new UIManager();

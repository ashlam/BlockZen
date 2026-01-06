const { PIECES_CFG } = require('../../config/pieces');
const { SCORE_CFG } = require('../../config/score');
const { CHALLENGES } = require('../../config/challenges');
const { THEMES } = require('../../config/themes');
const rngManager = require('../../utils/rng');

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

Page({
  data: {
    grid: [],
    score: 0,
    pieces: [],
    dragging: false,
    drag: { x: 0, y: 0, cells: [] },
    cellPx: 0,
    miniPx: 20,
    boardRect: null,
    movesLeft: null,
    goalProgress: 0,
    levelId: 1,
    challenge: null,
    taskProgress: { score: 0, areas: 0, comboTotal: 0, maxCombo: 0 },
    comboT: 0,
    prevStepHadClear: false,
    countOnlyAllowed: null,
    boxCoords: [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],
    axisLetters: ['A','B','C','D','E','F','G','H','I'],
    axisNumbers: [1,2,3,4,5,6,7,8,9]
    ,logs: []
    ,logsView: []
    ,tasksView: []
    ,restrictionsView: []
    ,themeClass: 'theme-matrix'
    ,themeLayers: []
    ,themeStyle: ''
    ,showAxis: false
  },
  onReady(options){
    const levelId = Number((options && options.levelId) || 1);
    const challenge = CHALLENGES.find(c => c.id === levelId) || CHALLENGES[0];
    this.setData({ levelId: challenge.levelId, challenge });
    const themeId = THEMES.currentId || (THEMES.current && THEMES.current.id);
    const theme = THEMES.list.find(t => t.id === themeId) || THEMES.list[0];
    const vars = theme.variables || {};
    let style = `--board-size:${vars.boardSize||'640rpx'};--axis-width:${this.data.showAxis? 'calc(var(--board-size)/9)' : '0rpx'};--board-bg:${vars.boardBg};--cell-empty:${vars.cellEmpty};--cell-filled:${vars.cellFilled};--cell-clearing:${vars.cellClearing};--accent:${vars.accent};--line-color:${vars.lineColor};--box-even:${vars.boxEven};--box-odd:${vars.boxOdd};--cell-border:${vars.cellBorder};--hud-text:${vars.hudText};--axis-text:${vars.axisText};--coord-text:${vars.coordText};--placed-glow-outer:${vars.placedGlowOuter};--placed-glow-inner:${vars.placedGlowInner};--drag-glow-outer:${vars.dragGlowOuter};--drag-glow-inner:${vars.dragGlowInner};--anchor-outline:${vars.anchorOutline};`;
    const avail = 750 - 48 - 8;
    const boardRpx = Math.floor(avail * 0.9);
    style = style.replace(/--board-size:[^;]*/, `--board-size:${boardRpx}rpx`);
    style = style.replace(/--axis-width:[^;]*/, `--axis-width:${this.data.showAxis? 'calc(var(--board-size)/9)' : '0rpx'}`);
    this.setData({ themeClass: theme.className, themeLayers: theme.layers || [], themeStyle: style });
    rngManager.initLevel(challenge.levelId);
    this.initFromChallenge(challenge);
    this.nextPieces();
    const q = wx.createSelectorQuery();
    q.select('#board').boundingClientRect(rect => {
      const cellPx = rect.width / 9;
      this.setData({ boardRect: rect, cellPx });
    }).exec();
  },
  goHome() {
    wx.reLaunch({ url: '/pages/index/index' });
  },
  noop(){},
  initFromChallenge(ch){
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
      for(const [x,y] of ch.board.occupied){ const c = grid[y][x]; grid[y][x] = { state:'filled', anchored:false, symbol:'', box: c.box }; }
    }
    let movesLeft = null;
    let countOnlyAllowed = null;
    if(Array.isArray(ch.restrictions)){
      for(const r of ch.restrictions){
        if(r.type==='steps_limit') movesLeft = r.steps;
        if(r.type==='count_only_pieces') countOnlyAllowed = r.allowed;
      }
    }
    this.setData({ grid, movesLeft, countOnlyAllowed, score:0, goalProgress:0, taskProgress: { score:0, areas:0, comboTotal:0, maxCombo:0 }, comboT:0, prevStepHadClear:false });
    this.computeTaskViews();
  },
  nextPieces(){
    const pick = () => rngManager.nextPiece();
    const pieces = [pick(), pick(), pick()].map(cfg => {
      const { cells, w, h } = toCells(cfg.shape);
      return { id: cfg.id, name: cfg.name, color: cfg.color, cells, w, h, power: '' };
    });
    this.setData({ pieces });
  },
  onPieceStart(e){
    const idx = Number(e.currentTarget.dataset.index);
    const piece = this.data.pieces[idx];
    const touch = e.changedTouches[0];
    this.setData({ dragging: true, drag: { x: touch.pageX, y: touch.pageY, cells: piece.cells, color: piece.color }, dragIndex: idx });
  },
  onPieceMove(e){
    const t = e.changedTouches[0];
    const rect = this.data.boardRect;
    const cellPx = this.data.cellPx;
    const piece = this.data.pieces[this.data.dragIndex];
    if(!rect || !piece) return;
    const localX = t.pageX - rect.left;
    const localY = t.pageY - rect.top;
    let gx = Math.round(localX / cellPx) - Math.floor(piece.w / 2);
    let gy = Math.round(localY / cellPx) - Math.floor(piece.h / 2);
    if(gx < 0) gx = 0; if(gy < 0) gy = 0;
    if(gx > 9 - piece.w) gx = 9 - piece.w;
    if(gy > 9 - piece.h) gy = 9 - piece.h;
    const drag = this.data.drag;
    drag.shadowLeft = gx * cellPx;
    drag.shadowTop = gy * cellPx;
    drag.cells = piece.cells;
    drag.gx = gx;
    drag.gy = gy;
    this.setData({ drag });
  },
  onPieceEnd(e){
    const t = e.changedTouches[0];
    const rect = this.data.boardRect;
    const piece = this.data.pieces[this.data.dragIndex];
    if(!rect || !piece){ this.cancelDrag(); return; }
    if(t.pageX < rect.left || t.pageX > rect.right || t.pageY < rect.top || t.pageY > rect.bottom){ this.cancelDrag(); return; }
    const preGrid = this.data.grid.map(row => row.map(c => ({...c})));
    const prePieces = this.data.pieces.map(p => ({ cells: p.cells.map(([x,y])=>[x,y]), w: p.w, h: p.h, power: p.power }));
    const preMoves = this.data.movesLeft;
    const preGoal = this.data.goalProgress;
    const preScore = this.data.score;
    const gx = this.data.drag.gx;
    const gy = this.data.drag.gy;
    const ok = this.tryPlace(piece, gx, gy);
    if(!ok){ this.cancelDrag(); return; }
    wx.vibrateShort();
    const left = this.data.pieces.slice(0, this.data.dragIndex).concat(this.data.pieces.slice(this.data.dragIndex+1));
    this.setData({ pieces: left });
    this.cancelDrag();
    this.afterPlace(piece, gx, gy, { preGrid, prePieces, preMoves, preGoal, preScore });
  },
  cancelDrag(){ this.setData({ dragging:false, drag:{x:0,y:0,cells:[]} , dragIndex: null }); },
  tryPlace(piece, gx, gy){
    if(gx<0||gy<0||gx+piece.w>9||gy+piece.h>9) return false;
    for(const [dx,dy] of piece.cells){ if(this.data.grid[gy+dy][gx+dx].state !== 'empty') return false; }
    const grid = this.data.grid.map(row => row.slice());
    for(const [dx,dy] of piece.cells){
      const c = grid[gy+dy][gx+dx];
      grid[gy+dy][gx+dx] = { state: 'filled', anchored: c.anchored, symbol: c.symbol, box: c.box };
    }
    if(piece.power === 'anchor'){
      for(const [dx,dy] of piece.cells){
        const x = gx+dx, y = gy+dy;
        grid[y][x].anchored = true;
        for(let oy=-1; oy<=1; oy++) for(let ox=-1; ox<=1; ox++){
          const nx=x+ox, ny=y+oy; if(nx>=0&&nx<9&&ny>=0&&ny<9){ grid[ny][nx].anchored = true; }
        }
      }
    }
    this.setData({ grid });
    return true;
  },
  afterPlace(piece, gx, gy, snapshot){
    if(piece.power === 'nuke'){
      const grid = this.data.grid.map(row => row.slice());
      for(const [dx,dy] of piece.cells){
        const cx = gx+dx, cy = gy+dy;
        for(let oy=-1; oy<=1; oy++) for(let ox=-1; ox<=1; ox++){
          const nx=cx+ox, ny=cy+oy;
          if(nx>=0&&nx<9&&ny>=0&&ny<9){
            if(nx===cx && ny===cy) continue;
            if(!grid[ny][nx].anchored){ const c = grid[ny][nx]; grid[ny][nx] = { state: 'empty', anchored: false, symbol: '', box: c.box }; }
          }
        }
      }
      this.setData({ grid });
    }
    if(piece.power === 'converter'){
      const grid = this.data.grid.map(row => row.slice());
      let done=false;
      for(const [dx,dy] of piece.cells){
        const cx=gx+dx, cy=gy+dy;
        const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
        for(const [ox,oy] of dirs){
          const nx=cx+ox, ny=cy+oy;
          if(nx>=0&&nx<9&&ny>=0&&ny<9){ if(grid[ny][nx].state==='filled'){ grid[ny][nx].symbol='conv'; done=true; break; } }
        }
        if(done) break;
      }
      this.setData({ grid });
    }
    const res = this.findClears();
    if(this.data.movesLeft!==null){ this.setData({ movesLeft: this.data.movesLeft - 1 }); }
    if(res.clearedCount>0){
      const grid = this.data.grid.map(row => row.slice());
      for(const [x,y] of res.cells){ grid[y][x].state = 'clearing'; }
      this.setData({ grid });
      setTimeout(() => {
        const grid2 = this.data.grid.map(row => row.slice());
        for(const [x,y] of res.cells){ const c = grid2[y][x]; grid2[y][x] = { state:'empty', anchored:false, symbol:'', box: c.box }; }
        const areasThisStep = (res.rows||0) + (res.cols||0) + (res.boxes||0);
        const typeMul = res.rows+res.cols+res.boxes >= 2 ? 2 : 1;
        const add = SCORE_CFG.placeBaseScore + SCORE_CFG.clearScorePerCell * res.clearedCount * typeMul;
        const score = this.data.score + add;
        const allowed = !this.data.countOnlyAllowed || (piece.id && this.data.countOnlyAllowed.includes(piece.id));
        const tp = { ...this.data.taskProgress };
        if(allowed){ tp.score += add; tp.areas += areasThisStep; }
        const newChain = (this.data.prevStepHadClear ? (this.data.comboChain||0) : 0) + areasThisStep;
        this.setData({ grid: grid2, score, taskProgress: tp, comboChain: newChain, prevStepHadClear: true });
        if(newChain>1){ this.setData({ comboShow: true, comboBanner: `连击 x${newChain}` }); setTimeout(()=>{ this.setData({ comboShow:false, comboBanner:'' }); }, 900); }
        if(this.data.pieces.length===0){ this.nextPieces(); }
        const postPieces = this.data.pieces.map(p => ({ cells: p.cells.map(([x,y])=>[x,y]), w: p.w, h: p.h, power: p.power }));
      const logs = this.data.logs.concat([{ step: this.data.logs.length + 1, type:'place', gx, gy, power: piece.power || '', clears: res, preGrid: snapshot.preGrid, postGrid: grid2, prePieces: snapshot.prePieces, postPieces, preMoves: snapshot.preMoves, postMoves: this.data.movesLeft, preGoal: snapshot.preGoal, postGoal: this.data.goalProgress, preScore: snapshot.preScore, postScore: score, ts: Date.now() }]);
      this.setData({ logs });
      this.updateLogsView();
      this.logLastToConsole();
      this.afterStepFinalize();
      this.computeTaskViews();
      }, 300);
    } else {
      const score = this.data.score + SCORE_CFG.placeBaseScore;
      const allowed = !this.data.countOnlyAllowed || (piece.id && this.data.countOnlyAllowed.includes(piece.id));
      const tp = { ...this.data.taskProgress };
      if(allowed){ tp.score += SCORE_CFG.placeBaseScore; }
      this.setData({ score, taskProgress: tp, comboChain: 0, prevStepHadClear: false });
      if(this.data.pieces.length===0){ this.nextPieces(); }
      const postPieces = this.data.pieces.map(p => ({ cells: p.cells.map(([x,y])=>[x,y]), w: p.w, h: p.h, power: p.power }));
      const logs = this.data.logs.concat([{ step: this.data.logs.length + 1, type:'place', gx, gy, power: piece.power || '', clears: { rows:0, cols:0, boxes:0, clearedCount:0, cells:[] }, preGrid: snapshot.preGrid, postGrid: this.data.grid.map(row => row.map(c=>({...c}))), prePieces: snapshot.prePieces, postPieces, preMoves: snapshot.preMoves, postMoves: this.data.movesLeft, preGoal: snapshot.preGoal, postGoal: this.data.goalProgress, preScore: snapshot.preScore, postScore: score, ts: Date.now() }]);
      this.setData({ logs });
      this.updateLogsView();
      this.logLastToConsole();
      this.afterStepFinalize();
      this.computeTaskViews();
    }
  },
  afterStepFinalize(){
    let T = this.data.comboT;
    if(this.data.prevStepHadClear){ T = T + 1; } else { T = 0; }
    const tp = { ...this.data.taskProgress };
    if(this.data.prevStepHadClear){ tp.comboTotal += 1; }
    if(T > tp.maxCombo){ tp.maxCombo = T; }
    this.setData({ comboT: T, taskProgress: tp });
    if(this.data.movesLeft!==null && this.data.movesLeft<=0){ this.finish(); }
    if(!this.anyPlacementPossible()){ this.finish(); }
    this.checkTasksComplete();
  },
  checkTasksComplete(){
    const ch = this.data.challenge;
    if(!ch || !Array.isArray(ch.tasks)) return;
    const tp = this.data.taskProgress;
    let done = true;
    for(const t of ch.tasks){
      if(t.type==='score_at_least' && tp.score < t.target) done=false;
      if(t.type==='clear_areas_total' && tp.areas < t.target) done=false;
      if(t.type==='combo_total' && tp.comboTotal < t.target) done=false;
      if(t.type==='combo_consecutive' && tp.maxCombo < t.target) done=false;
    }
    if(done){ this.finish(true); }
  },
  computeTaskViews(){
    const ch = this.data.challenge;
    if(!ch) return;
    const tp = this.data.taskProgress || { score:0, areas:0, comboTotal:0, maxCombo:0 };
    const tasksView = [];
    for(const t of ch.tasks||[]){
      if(t.type==='score_at_least') tasksView.push({ label: '得分', progress: `${tp.score}/${t.target}`, done: tp.score>=t.target });
      if(t.type==='clear_areas_total') tasksView.push({ label: '消除区域', progress: `${tp.areas}/${t.target}`, done: tp.areas>=t.target });
      if(t.type==='combo_total') tasksView.push({ label: '累计连击回合', progress: `${tp.comboTotal}/${t.target}`, done: tp.comboTotal>=t.target });
      if(t.type==='combo_consecutive') tasksView.push({ label: '最大连续连击', progress: `${tp.maxCombo}/${t.target}`, done: tp.maxCombo>=t.target });
    }
    const restrictionsView = [];
    if(this.data.movesLeft!==null) restrictionsView.push({ label:'步数限制', value: `${this.data.movesLeft} 步剩余` });
    if(this.data.countOnlyAllowed){
      const names = this.data.countOnlyAllowed.map(id => {
        const p = PIECES_CFG.find(x => x.id===id); return p? p.name : `#${id}`;
      }).join('、');
      restrictionsView.push({ label:'仅计指定零件', value: names });
    }
    this.setData({ tasksView, restrictionsView });
  },
  undoLast(){
    const logs = this.data.logs.slice();
    if(logs.length===0) return;
    const last = logs.pop();
    const grid = last.preGrid.map(row => row.map(c=>({...c})));
    const pieces = last.prePieces.map(p => ({ cells: p.cells.map(([x,y])=>[x,y]), w: p.w, h: p.h, power: p.power }));
    this.setData({ grid, pieces, movesLeft: last.preMoves, goalProgress: last.preGoal, logs, dragging:false, drag:{x:0,y:0,cells:[]} });
    this.updateLogsView();
  },
  updateLogsView(){
    const logs = this.data.logs;
    const start = Math.max(0, logs.length - 30);
    this.setData({ logsView: logs.slice(start) });
  },
  logLastToConsole(){
    const logs = this.data.logs;
    if(logs.length===0) return;
    const last = logs[logs.length-1];
    const pos = `${this.data.axisLetters[last.gx]}${last.gy+1}`;
    const summary = { step: logs.length, type: last.type, pos, power: last.power, clears: last.clears, postMoves: last.postMoves };
    console.log('BlockZen challenge step summary:', summary);
    console.log('BlockZen challenge step detail:', last);
  },
  exportLogs(){
    const fs = wx.getFileSystemManager();
    const path = `${wx.env.USER_DATA_PATH}/blockzen_challenge_logs_${Date.now()}.json`;
    const data = JSON.stringify(this.data.logs, null, 2);
    try{
      fs.writeFileSync(path, data, 'utf8');
      wx.setClipboardData({ data });
      wx.showModal({ title:'', content:'日志已导出到用户数据目录，并已复制日志内容。请在开发者工具-文件面板查看 USER_DATA_PATH。', confirmText:'好的' });
    }catch(err){
      wx.showModal({ title:'', content:'日志导出失败', confirmText:'知道了' });
    }
  },
  getBoardBinary(){
    const grid = this.data.grid;
    const arr = [];
    for(let y=0;y<9;y++){
      const row = [];
      for(let x=0;x<9;x++){
        row.push(grid[y][x].state==='filled'?1:0);
      }
      arr.push(row);
    }
    return arr;
  },
  exportBoard(){
    const arr = this.getBoardBinary();
    const data = JSON.stringify(arr);
    try{
      wx.setClipboardData({ data });
      console.log('BlockZen challenge board binary:', arr);
      wx.showToast({ title:'棋盘已复制', icon:'none' });
    }catch(e){
      wx.showModal({ title:'', content:'复制失败', confirmText:'知道了' });
    }
  },
  findClears(){
    const grid = this.data.grid;
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
    return { rows: rowsFull.length, cols: colsFull.length, boxes: boxesFull.length, clearedCount: cells.length, cells };
  },
  anyPlacementPossible(){
    for(const piece of this.data.pieces){
      for(let gy=0;gy<=9-piece.h;gy++){
        for(let gx=0;gx<=9-piece.w;gx++){
          let ok=true;
          for(const [dx,dy] of piece.cells){ if(this.data.grid[gy+dy][gx+dx].state!=='empty'){ ok=false; break; } }
          if(ok) return true;
        }
      }
    }
    return false;
  },
  finish(success=false){
    wx.vibrateShort();
    wx.showModal({ title:'', content: success? '挑战成功' : '挑战结束', confirmText:'重试', cancelText:'返回', success:(res)=>{
      if(res.confirm){ this.initFromChallenge(this.data.challenge); this.nextPieces(); }
      else { wx.navigateBack({ delta:1 }); }
    }});
  }
});

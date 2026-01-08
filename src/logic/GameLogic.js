const databus = require('../databus');
const rngManager = require('../../miniprogram/utils/rng');

class GameLogic {
  toCells(shape) {
    const h = shape.length;
    const w = shape[0].length;
    const cells = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (shape[y][x] === 1) { cells.push([x, y]); }
      }
    }
    return { cells, w, h };
  }

  initGrid() {
    const grid = [];
    for (let y = 0; y < 9; y++) {
      const row = [];
      for (let x = 0; x < 9; x++) {
        const box = Math.floor(x / 3) + 3 * Math.floor(y / 3);
        row.push({ state: 'empty', anchored: false, symbol: '', box });
      }
      grid.push(row);
    }
    databus.state.grid = grid;
  }

  nextPieces() {
    const pick = () => rngManager.nextPiece();
    const pieces = [pick(), pick(), pick()].map(cfg => {
      const { cells, w, h } = this.toCells(cfg.shape);
      const power = '';
      return { id: cfg.id, name: cfg.name, color: cfg.color, cells, w, h, power };
    });
    databus.state.pieces = pieces;
  }

  tryPlace(piece, gx, gy) {
    if (gx < 0 || gy < 0 || gx + piece.w > 9 || gy + piece.h > 9) return false;
    for (const [dx, dy] of piece.cells) {
      if (databus.state.grid[gy + dy][gx + dx].state !== 'empty') return false;
    }
    const grid = databus.state.grid.map(row => row.slice());
    for (const [dx, dy] of piece.cells) {
      const c = grid[gy + dy][gx + dx];
      grid[gy + dy][gx + dx] = { state: 'filled', anchored: c.anchored, symbol: c.symbol, box: c.box };
    }
    databus.state.grid = grid;
    return true;
  }

  rotatePiece(p) {
    const w = p.w, h = p.h;
    const cells = p.cells.map(([x, y]) => [y, w - 1 - x]);
    return { ...p, cells, w: h, h: w };
  }

  findClears() {
    const grid = databus.state.grid;
    const rowsCount = Array(9).fill(0);
    const colsCount = Array(9).fill(0);
    const boxesCount = Array(9).fill(0);
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const st = grid[y][x].state;
        if (st === 'filled') {
          rowsCount[y]++;
          colsCount[x]++;
          const b = Math.floor(x / 3) + 3 * Math.floor(y / 3);
          boxesCount[b]++;
        }
      }
    }
    const rowsFull = [];
    const colsFull = [];
    const boxesFull = [];
    for (let y = 0; y < 9; y++) { if (rowsCount[y] === 9) rowsFull.push(y); }
    for (let x = 0; x < 9; x++) { if (colsCount[x] === 9) colsFull.push(x); }
    for (let b = 0; b < 9; b++) { if (boxesCount[b] === 9) boxesFull.push([b % 3, Math.floor(b / 3)]); }
    const set = {};
    for (const y of rowsFull) { for (let x = 0; x < 9; x++) { set[`${x},${y}`] = true; } }
    for (const x of colsFull) { for (let y = 0; y < 9; y++) { set[`${x},${y}`] = true; } }
    for (const [bx, by] of boxesFull) { for (let y = by * 3; y < by * 3 + 3; y++) for (let x = bx * 3; x < bx * 3 + 3; x++) { set[`${x},${y}`] = true; } }
    const cells = Object.keys(set).map(k => k.split(',').map(n => Number(n)));
    return { rows: rowsFull.length, cols: colsFull.length, boxes: boxesFull.length, clearedCount: cells.length, cells, rowsFull, colsFull, boxesFull };
  }

  anyPlacementPossible() {
    for (const piece of databus.state.pieces) {
      for (let gy = 0; gy <= 9 - piece.h; gy++) {
        for (let gx = 0; gx <= 9 - piece.w; gx++) {
          let ok = true;
          for (const [dx, dy] of piece.cells) {
            if (databus.state.grid[gy + dy][gx + dx].state !== 'empty') { ok = false; break; }
          }
          if (ok) return true;
        }
      }
    }
    return false;
  }
}

module.exports = new GameLogic();

/**
 * GameLogic
 * 纯规则层：棋盘初始化、可放置判定、消除计算、旋转变换、生成新零件。
 * 不含分数/金币结算与回合控制。
 */
const databus = require('../databus');
const { RESCUE_CFG } = require('../config');
const rngManager = require('../../miniprogram/utils/rng');

class GameLogic {
  /**
   * 将零件形状矩阵转为 cell 列表与尺寸
   * @param {number[][]} shape 0/1 矩阵
   * @returns {{cells:number[][], w:number, h:number}}
   */
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

  /**
   * 初始化 9x9 棋盘为空
   */
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

  /**
   * 生成新的三枚零件到托盘
   */
  nextPieces() {
    const canPlaceWith = (pcs) => {
      for (const piece of pcs) {
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
    };
    const pickOne = () => {
      const cfg = rngManager.nextPiece();
      const { cells, w, h } = this.toCells(cfg.shape);
      return { id: cfg.id, name: cfg.name, color: cfg.color, cells, w, h, power: '' };
    };
    const makeThree = () => [pickOne(), pickOne(), pickOne()];
    let pieces = makeThree();
    if (!canPlaceWith(pieces)) {
      let left = typeof databus.state.rescueRerollsLeft === 'number' ? databus.state.rescueRerollsLeft : 0;
      const maxLoop = Math.min(left, (RESCUE_CFG && RESCUE_CFG.maxRerollsPerSession) || 10);
      for (let i = 0; i < maxLoop; i++) {
        const cand = makeThree();
        left = Math.max(0, left - 1);
        if (canPlaceWith(cand)) { pieces = cand; databus.state.rescueRerollsLeft = left; break; }
        databus.state.rescueRerollsLeft = left;
      }
    }
    databus.state.pieces = pieces;
  }

  /**
   * 检查指定零件是否可放置并写入到棋盘临时网格
   * @param {object} piece 零件
   * @param {number} gx 左上角格坐标x
   * @param {number} gy 左上角格坐标y
   * @returns {boolean} 是否放置成功
   */
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

  /**
   * 顺时针旋转零件90度
   * @param {object} p 零件
   * @returns {object} 新零件
   */
  rotatePiece(p) {
    const w = p.w, h = p.h;
    const cells = p.cells.map(([x, y]) => [y, w - 1 - x]);
    return { ...p, cells, w: h, h: w };
  }

  /**
   * 统计整行/整列/3x3区域满并返回应清除的格子集合
   * @returns {{rows:number,cols:number,boxes:number,clearedCount:number,cells:number[][],rowsFull:number[],colsFull:number[],boxesFull:number[][]}}
   */
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

  /**
   * 检查当前托盘是否存在任何可放置位置
   * @returns {boolean}
   */
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

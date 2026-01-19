/**
 * 配置聚合模块
 * 统一从 miniprogram/config 下加载各类配置（记分、主题、零件、关卡、金币与道具价格）。
 * 如果 item_price.js 加载失败，则使用内置默认值，保证道具模式可用。
 *
 * 用法：
 * - 从此模块导入需要的配置对象，例如 { SCORE_CFG, THEMES, COIN_CFG, ITEM_COST_CFG }。
 * - 经济相关配置字段的意义详见 miniprogram/config/item_price.js 顶部注释。
 */
const { SCORE_CFG } = require('../miniprogram/config/score');
const { THEMES } = require('../miniprogram/config/themes');
const { PIECES_CFG } = require('../miniprogram/config/pieces');
const { CHALLENGES } = require('../miniprogram/config/challenges');

let COIN_CFG, ITEM_COST_CFG, ITEM_BUY_CFG, ITEM_START_COUNT;
let CRISIS_CFG, BOMB_CFG;
let RESCUE_CFG;

try {
  const cfg = require('../miniprogram/config/item_price.js');
  if (cfg && cfg.COIN_CFG && cfg.ITEM_COST_CFG && cfg.ITEM_BUY_CFG && cfg.ITEM_START_COUNT) {
    COIN_CFG = cfg.COIN_CFG;
    ITEM_COST_CFG = cfg.ITEM_COST_CFG;
    ITEM_BUY_CFG = cfg.ITEM_BUY_CFG;
    ITEM_START_COUNT = cfg.ITEM_START_COUNT;
  } else {
    throw new Error('Invalid item_price config');
  }
} catch (e) {
  console.warn('Config load failed, using defaults', e);
  COIN_CFG = { scorePerCoin: 1000, stepComboCoinMap: { 3: 1, 4: 1, 5: 2, 6: 3 }, consecutiveComboCoinMap: { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 } };
  ITEM_COST_CFG = { rotate: [1, 2, 3, 4, 5], dice: [1, 2, 3, 4, 5], redraw: [2, 3, 4, 5, 6] };
  ITEM_BUY_CFG = { rotate: 2, dice: 3, redraw: 4 };
  ITEM_START_COUNT = { rotate: 3, dice: 3, redraw: 3 };
}

try {
  const exp = require('../miniprogram/config/experimental.js');
  CRISIS_CFG = exp.CRISIS_CFG;
  BOMB_CFG = exp.BOMB_CFG;
} catch (e) {
  CRISIS_CFG = { threshold: 0.8, duration: 3, multiplier: 3, overlay: 'rgba(255,0,0,0.6)' };
  BOMB_CFG = { spawn: { everyNTurns: 3, minCombo: 2, scoreModulo: 500, scoreWindow: 100 }, explosion: { pattern: 'cross' }, fx: { duration: 280, color: 'rgba(255,200,0,0.35)' } };
}

try {
  const rescue = require('../miniprogram/config/rescue.js');
  RESCUE_CFG = rescue.RESCUE_CFG;
} catch (e) {
  RESCUE_CFG = { maxRerollsPerSession: 10 };
}

module.exports = {
  SCORE_CFG,
  THEMES,
  PIECES_CFG,
  CHALLENGES,
  COIN_CFG,
  ITEM_COST_CFG,
  ITEM_BUY_CFG,
  ITEM_START_COUNT,
  CRISIS_CFG,
  BOMB_CFG,
  RESCUE_CFG
};

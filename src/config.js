const { SCORE_CFG } = require('../miniprogram/config/score');
const { THEMES } = require('../miniprogram/config/themes');
const { PIECES_CFG } = require('../miniprogram/config/pieces');
const { CHALLENGES } = require('../miniprogram/config/challenges');

let COIN_CFG, ITEM_COST_CFG, ITEM_BUY_CFG, ITEM_START_COUNT;

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

module.exports = {
  SCORE_CFG,
  THEMES,
  PIECES_CFG,
  CHALLENGES,
  COIN_CFG,
  ITEM_COST_CFG,
  ITEM_BUY_CFG,
  ITEM_START_COUNT
};

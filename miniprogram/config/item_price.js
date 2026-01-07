// 金币与道具价格配置
// 字段说明：
// - COIN_CFG.scorePerCoin: 每积累多少分获得1金币
// - COIN_CFG.stepComboCoinMap: 单步内连击（一次落子消除的区域数）对应的金币奖励
// - COIN_CFG.consecutiveComboCoinMap: 多步连续连击（跨多次落子连续产生消除的长度T）对应的金币奖励
//
// - ITEM_COST_CFG: 使用道具的阶梯价格，按该道具已使用次数递增，取数组下标min(usage, len-1)
// - ITEM_BUY_CFG: 购买道具的固定单价
//
// 用法参考：
// - 记分时按 COIN_CFG.scorePerCoin 把累计分数转为金币
// - onPlace 中按 stepComboCoinMap[areasThisStep] 增加金币
// - afterStepFinalize/finalizeTurn 中按 consecutiveComboCoinMap[T] 增加金币
// - 使用道具前读取 ITEM_COST_CFG[type] 计算本次价格并检查金币是否足够
// - 商店购买按 ITEM_BUY_CFG[type] 扣除金币并增加库存
const COIN_CFG = {
  scorePerCoin: 100,
  stepComboCoinMap: { 3: 1, 4: 1, 5: 2, 6: 3 },
  consecutiveComboCoinMap: {3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 4, 9: 5, 10: 5 }
};

const ITEM_COST_CFG = {
  rotate: [2,2,3,3,3,4,4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6],
  dice: [1,2,3,4,5],
  redraw: [1,1,1,1,2,2,2,2,3,3,3,3,3,4,4,4,4],
};

const ITEM_BUY_CFG = {
  rotate: 3,
  dice: 3,
  redraw: 2
};

// 道具模式开局赠送的道具库存数量
// 可按需要调整，未出现的类型默认为0
const ITEM_START_COUNT = {
  rotate: 1,
  dice: 0,
  redraw: 0
};

module.exports = {
  COIN_CFG,
  ITEM_COST_CFG,
  ITEM_BUY_CFG,
  ITEM_START_COUNT
};

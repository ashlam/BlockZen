
const { PIECES_CFG } = require('./pieces');

// 基础权重配置（默认所有零件权重相同）
const DEFAULT_WEIGHTS = {};
PIECES_CFG.forEach(p => DEFAULT_WEIGHTS[p.id] = 100);

// 关卡配置表
const LEVEL_CONFIG = {
  // 示例：关卡1，特定零件权重调整
  1: {
    weights: {
      ...DEFAULT_WEIGHTS,
      1: 500, // 4格直线概率增加
      11: 500 // 5格直线概率增加
    }
  },
  // 示例：关卡2，禁用某些零件
  2: {
    weights: {
      ...DEFAULT_WEIGHTS,
      4: 0, // 禁用2x2方块
      10: 0 // 禁用十字形
    }
  }
};

module.exports = {
  DEFAULT_WEIGHTS,
  LEVEL_CONFIG
};

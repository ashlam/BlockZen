
const { PIECES_CFG } = require('../config/pieces');
const { DEFAULT_WEIGHTS, LEVEL_CONFIG } = require('../config/levels');

// Simple Mulberry32 PRNG
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// String hash for seeding
function xmur3(str) {
  for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
}

class RNGManager {
  constructor() {
    this.rng = null;
    this.currentSeed = null;
    this.levelId = 1;
    this.weights = DEFAULT_WEIGHTS;
  }

  // 初始化关卡RNG
  initLevel(levelId, seed = null) {
    this.levelId = levelId;
    this.currentSeed = seed || new Date().getTime().toString();
    
    // Create PRNG from seed
    const seedFunc = xmur3(this.currentSeed.toString());
    this.rng = mulberry32(seedFunc());
    
    // 加载权重配置
    const levelCfg = LEVEL_CONFIG[levelId];
    this.weights = levelCfg ? { ...DEFAULT_WEIGHTS, ...levelCfg.weights } : DEFAULT_WEIGHTS;
    
    console.log(`[RNG] Level ${levelId} initialized with seed: ${this.currentSeed}`);
  }

  // 获取下一个零件
  nextPiece() {
    if (!this.rng) {
      console.warn('[RNG] Not initialized, using default init');
      this.initLevel('default');
    }

    // 计算总权重
    let totalWeight = 0;
    const pool = [];
    
    // 构建权重池
    PIECES_CFG.forEach(piece => {
      const weight = this.weights[piece.id] || 0;
      if (weight > 0) {
        totalWeight += weight;
        pool.push({ piece, weight });
      }
    });

    if (pool.length === 0) {
      console.error('[RNG] No available pieces in pool!');
      return PIECES_CFG[0]; // Fallback
    }

    // 生成 [0, totalWeight) 之间的随机数
    const r = this.rng() * totalWeight;
    
    // 权重判定
    let current = 0;
    for (const item of pool) {
      current += item.weight;
      if (r < current) {
        return item.piece;
      }
    }
    
    return pool[pool.length - 1].piece;
  }

  // 获取当前种子（用于存档）
  getSeed() {
    return this.currentSeed;
  }
}

module.exports = new RNGManager();

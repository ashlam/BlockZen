/**
 * Retro Racer 配置
 *
 * 用法：
 * - levels：定义每个关卡的基础参数；resetRetro(level) 会读取对应 id 的条目。
 * - spawns：定义障碍与奖励的生成参数与权重；生成器会按此配置进行随机选择。
 *
 * 字段说明：
 * levels[].lanes            车道数（影响赛道宽度与拥挤程度）
 * levels[].targetDistance   关卡目标距离（米）
 * levels[].maxSpeed         最高速度（数值越大越快）
 * levels[].accel            加速度（用于逐步提速）
 *
 * spawns.baseIntervalMs          基础生成间隔（毫秒），越小越密集
 * spawns.maxIntervalReduceMs     间隔随速度最多缩短的毫秒数
 * spawns.typesWeight             障碍类型权重（值越大概率越高）
 * spawns.truckDropCrateProb      卡车掉落木箱的概率 [0,1]
 * spawns.pickupProb              在一次障碍生成后同时生成奖励物的概率 [0,1]
 * spawns.pickupsWeight           奖励类型权重（值越大概率越高）
 */
module.exports = {
  levels: [
    /**
     * stages：分阶段难度配置（按距离切换阶段）
     * - untilDistance：该阶段持续到的累计距离（米）
     * - interval.baseIntervalMs / baseIntervalMsRange：[min,max] 或固定值
     * - interval.maxIntervalReduceMs / maxIntervalReduceMsRange：同上
     * - typesWeight：障碍类型权重（可引入新类型，如 interceptor）
     * - pickupProb / pickupProbRange：奖励生成概率
     * - pickupsWeight：奖励类型权重
     */
    { id: 1, name: '城市大道', lanes: 5, targetDistance: 30000, maxSpeed: 220, accel: 0.45, fuelInitial: 10000, fuelDrainPerSec: 2,
      stages: [
        /**
         * 例子讲解（以本阶段为例）：
         * - baseIntervalMsRange: [520,560]
         *   表示“基础生成间隔”的随机范围（毫秒）。进入该阶段时会在 520~560ms 之间随机取一个值，记为 base。
         * - maxIntervalReduceMsRange: [240,280]
         *   表示“随着车速缩短的最大幅度”的随机范围。会在 240~280ms 之间随机取一个值，记为 reduceMax。
         * - 实际生成间隔 interval 的计算：
         *   interval = base - min(reduceMax, floor(speed))
         *   其中 speed 为当前车辆的垂直移动速度（单位与内部数值一致）。
         *   随着车速上升，interval 会逐渐降低，直到最多降低 reduceMax 毫秒，不会无限缩短。
         * - 表现效果：
         *   在该阶段初期，障碍生成较稀疏；随着车速提升，生成变得更密集，但密集度受 reduceMax 上限控制。
         * - typesWeight: { car: 4, sport: 0, truck: 0, oil: 0 }
         *   障碍类型的权重，数值越大出现概率越高。本阶段仅出现普通轿车（car），其他类型为 0，表示不出现。
         * - pickupProbRange: [0.20, 0.25]
         *   表示“奖励生成概率”的随机范围。每次生成障碍后，会以 20%~25% 的概率附带一个奖励物。
         * - pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
         *   奖励类型权重，三种奖励出现概率相同；可通过调整权重偏向某一类奖励。
         */
        { untilDistance: 4000,
          interval: { baseIntervalMsRange: [2000, 4000], maxIntervalReduceMsRange: [240, 280] },
          typesWeight: { car: 4, sport: 0, truck: 0, oil: 0 },
          pickupProbRange: [0, 0],
          pickupsWeight: { fuel: 1, med: 1, nitro: 0 }
        },
        { untilDistance: 18000,
          interval: { baseIntervalMsRange: [2000, 3000], maxIntervalReduceMsRange: [260, 300] },
          typesWeight: { car: 3, sport: 0, truck: 0, oil: 1 },
          pickupProbRange: [0, 0],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        },
        { untilDistance: 24000,
          interval: { baseIntervalMsRange: [1000, 3000], maxIntervalReduceMsRange: [260, 300] },
          typesWeight: { car: 3, sport: 1, truck: 0, oil: 1 },
          pickupProbRange: [0, 0],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        },
        { untilDistance: 30000,
          interval: { baseIntervalMsRange: [440, 1500], maxIntervalReduceMsRange: [280, 320] },
          typesWeight: { car: 3, sport: 2, truck: 3, oil: 1 },
          pickupProbRange: [0, 0],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        }
      ]
    },
    { id: 2, name: '跨海大桥', lanes: 3, targetDistance: 5000, maxSpeed: 250, accel: 0.55, fuelInitial: 100, fuelDrainPerSec: 2,
      stages: [
        { untilDistance: 1500,
          interval: { baseIntervalMsRange: [520, 560], maxIntervalReduceMsRange: [240, 280] },
          typesWeight: { car: 3, sport: 0, truck: 1, oil: 0 },
          pickupProbRange: [0.20, 0.25],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        },
        { untilDistance: 3500,
          interval: { baseIntervalMsRange: [480, 520], maxIntervalReduceMsRange: [260, 300] },
          typesWeight: { car: 2, sport: 1, truck: 1, oil: 1 },
          pickupProbRange: [0.20, 0.30],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        },
        { untilDistance: 5000,
          interval: { baseIntervalMsRange: [440, 500], maxIntervalReduceMsRange: [280, 320] },
          typesWeight: { car: 2, sport: 2, truck: 1, oil: 1 },
          pickupProbRange: [0.25, 0.35],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        }
      ]
    },
    { id: 3, name: '午夜森林', lanes: 5, targetDistance: 7000, maxSpeed: 260, accel: 0.60, fuelInitial: 100, fuelDrainPerSec: 2,
      stages: [
        { untilDistance: 2500,
          interval: { baseIntervalMsRange: [520, 560], maxIntervalReduceMsRange: [240, 280] },
          typesWeight: { car: 3, sport: 1, truck: 0, oil: 1 },
          pickupProbRange: [0.20, 0.25],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        },
        { untilDistance: 5000,
          interval: { baseIntervalMsRange: [480, 520], maxIntervalReduceMsRange: [260, 300] },
          typesWeight: { car: 2, sport: 2, truck: 1, oil: 1 },
          pickupProbRange: [0.25, 0.35],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        },
        { untilDistance: 7000,
          interval: { baseIntervalMsRange: [440, 500], maxIntervalReduceMsRange: [280, 320] },
          typesWeight: { car: 2, sport: 2, interceptor: 1, truck: 1, oil: 1 },
          pickupProbRange: [0.25, 0.35],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        }
      ]
    },
    { id: 4, name: '高架高速', lanes: 5, targetDistance: 10000, maxSpeed: 280, accel: 0.65, fuelInitial: 100, fuelDrainPerSec: 2,
      stages: [
        { untilDistance: 3000,
          interval: { baseIntervalMsRange: [500, 540], maxIntervalReduceMsRange: [260, 300] },
          typesWeight: { car: 2, sport: 1, truck: 1, oil: 1 },
          pickupProbRange: [0.20, 0.25],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        },
        { untilDistance: 7000,
          interval: { baseIntervalMsRange: [460, 500], maxIntervalReduceMsRange: [280, 320] },
          typesWeight: { car: 2, sport: 2, interceptor: 1, truck: 1, oil: 1 },
          pickupProbRange: [0.25, 0.35],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        },
        { untilDistance: 10000,
          interval: { baseIntervalMsRange: [420, 480], maxIntervalReduceMsRange: [300, 340] },
          typesWeight: { car: 1, sport: 2, interceptor: 2, truck: 1, oil: 1 },
          pickupProbRange: [0.25, 0.40],
          pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
        }
      ]
    }
  ],
  spawns: {
    baseIntervalMs: 500,
    maxIntervalReduceMs: 300,
    typesWeight: { car: 3, sport: 1, truck: 1, oil: 1 },
    truckDropCrateProb: 0.6,
    pickupProb: 0.25,
    pickupsWeight: { fuel: 1, med: 1, nitro: 1 }
  }
};

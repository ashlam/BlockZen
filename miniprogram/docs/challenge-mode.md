# 挑战模式配置与实现说明（V1）

## 配置表
- 文件：`miniprogram/config/challenges.js`
- 结构：
```
{
  id: number,
  name: string,
  levelId: number,               // 关联 `config/levels.js` 的权重配置
  board: { occupied: Array<[x,y]> },
  tasks: Array<Task>,
  restrictions: Array<Restriction>
}
```
- Task：
```
{ type: 'score_at_least', target: number }
{ type: 'clear_areas_total', target: number }
{ type: 'combo_total', target: number }
{ type: 'combo_consecutive', target: number }
```
- Restriction：
```
{ type: 'steps_limit', steps: number }
{ type: 'count_only_pieces', allowed: number[] } // 仅在使用这些 piece.id 时计入任务进度
```
- 示例：见 `config/challenges.js` 内的 id=1/2

## 关卡权重
- 文件：`miniprogram/config/levels.js`
- 字段：`DEFAULT_WEIGHTS`、`LEVEL_CONFIG[levelId].weights`
- 用法：`utils/rng.js` 的 `initLevel(levelId)` 会加载对应权重生成零件

## 页面路由
- 页面：`miniprogram/pages/challenge/challenge`
- 入参：`levelId`（可选，默认 1）
- 示例：`/pages/challenge/challenge?levelId=2`

## 运行时指标
- 计分：`config/score.js`（每步落子基础分与按清除单元格数累加）
- 清除统计：每步计算 `rows+cols+boxes` 作为“区域数”，用于任务进度与步内连击（chain）
- 连击：
  - 步内连击（chain）：当步中有清除时累加；用于弹出提示
  - 回合连击（T）：在托盘清空后按是否有清除递增；用于 `combo_total` 与 `combo_consecutive`

## 规则实现摘要
- 障碍物：`board.occupied` 的坐标在关卡初始化时置为 `filled`
- 任务进度：
  - `score_at_least` 累加分数（若限制 `count_only_pieces` 则仅在允许的 piece.id 下累加）
  - `clear_areas_total` 累加每步的区域数（同上限制）
  - `combo_total` 在每个有清除的回合结束时 +1
  - `combo_consecutive` 记录整个挑战过程中的最大连击 T
- 限制：
  - `steps_limit` 下每步 `movesLeft` 递减至 0 时结束
  - `count_only_pieces` 仅在允许的 piece.id 下统计进度（不影响放置与得分展示）

## 成功与结束
- 判定：满足所有任务 -> 弹窗“挑战成功”；否则在步数耗尽或不可再放置时结束（失败）
- 重试：弹窗确认后重置当前关卡并重新刷新托盘

## 拓展指南
- 添加新关卡：向 `CHALLENGES` 追加条目并选择 `levelId`；需要不同零件概率时在 `LEVEL_CONFIG` 中添加或修改对应 `levelId`
- 新任务类型：在 `challenge.js` 的 `checkTasksComplete` 中扩展类型判断，并在 `afterStepFinalize`/步内处理逻辑累加对应指标
- 新限制类型：在 `initFromChallenge` 读取限制字段，在步内或回合结束处应用规则

## 字段详解与坐标
- `id`：关卡唯一标识，整数，路由参数 `levelId` 传入同值
- `name`：关卡名称，用于展示
- `levelId`：零件权重配置编号，关联 `config/levels.js` 的 `LEVEL_CONFIG`
- `board.occupied`：起始障碍坐标列表，坐标为 `[x,y]`，0 基，左上角为 `(0,0)`，`x` 向右递增（0..8），`y` 向下递增（0..8）
- `tasks[]`：任务清单，见下文“任务配置说明”
- `restrictions[]`：限制清单，见下文“限制配置说明”
- `piece.id`：零件 ID 来自 `config/pieces.js`，用于 `count_only_pieces`

## 任务配置说明
- 得分目标：`{ type: 'score_at_least', target: 500 }`
  - 说明：累计的“任务分数”达到目标值即完成；当存在 `count_only_pieces` 限制时，仅允许的零件产生的分数会计入“任务分数”
- 消除区域总数：`{ type: 'clear_areas_total', target: 10 }`
  - 说明：每步同时统计被清除的“区域数”（行/列/3x3）。该目标累计步内的区域数，满足则完成
- 累计有消除的回合数：`{ type: 'combo_total', target: 5 }`
  - 说明：每清空一次托盘后，只要该回合内至少有一次消除，则累计 +1；达到目标即完成（不要求连续）
- 连续连击最大值：`{ type: 'combo_consecutive', target: 3 }`
  - 说明：在挑战过程中记录最大的连续回合连击 T；达到目标即完成

## 限制配置说明
- 无限制：不写 `restrictions` 或留空数组 `[]`
- 步数限制：`{ type: 'steps_limit', steps: 20 }`
  - 说明：每步落子后 `movesLeft` 递减；减至 0 时结束挑战（未完成任务则失败）
- 指定零件才计入任务：`{ type: 'count_only_pieces', allowed: [1,11] }`
  - 说明：只有当当前落子的 `piece.id` 在 `allowed` 内时，“任务分数”和“消除区域数”等任务进度才会累计；不影响可放置与可得分的显示（只影响是否计入任务）

## 零件权重与出件概率
- 入口：`config/levels.js`
- 默认权重：`DEFAULT_WEIGHTS`，对所有 `piece.id` 赋值（示例为 100）
- 关卡权重覆盖：在 `LEVEL_CONFIG[levelId].weights` 中针对某些 `piece.id` 赋值（0 表示禁用；数值越大概率越高）
- 关联：在关卡配置 `levelId` 绑定到对应权重集；页面初始化时 `rng.initLevel(levelId)` 应用该权重

## 示例：新增一个关卡（从 0 到 1）
```
// 1. 在 config/challenges.js 追加：
{
  id: 3,
  name: '连击大师',
  levelId: 3,
  board: { occupied: [[1,1],[7,7],[4,4]] },
  tasks: [
    { type: 'score_at_least', target: 800 },
    { type: 'clear_areas_total', target: 12 },
    { type: 'combo_consecutive', target: 4 }
  ],
  restrictions: [
    { type: 'steps_limit', steps: 30 },
    { type: 'count_only_pieces', allowed: [4,5,6] }
  ]
}

// 2. 在 config/levels.js 添加 levelId=3 的权重：
LEVEL_CONFIG[3] = {
  weights: {
    ...DEFAULT_WEIGHTS,
    4: 300, // 2x2 提高
    5: 250,
    6: 250,
    1: 80,  // 4格直线略降
    11: 80
  }
}

// 3. 路由进入：
/pages/challenge/challenge?levelId=3
```

## 常见修改清单
- 修改障碍：编辑 `board.occupied` 坐标数组；支持任意分布
- 修改目标：调整 `tasks` 中的 `target` 数值或增加/删除条目
- 修改限制：在 `restrictions` 中添加或移除对应项
- 修改概率：在 `levels.js` 的权重中调整各 `piece.id` 的数值或设置为 0 禁用

## 验证建议
- 进入页面后观察 HUD 的步数、分数与“步内连击弹出”是否符合预期
- 使用日志面板与控制台输出核对每步的：落子坐标、清除区域数、计分增量与任务进度累计
- 在存在 `count_only_pieces` 时，尝试使用非允许零件进行得分，确认任务进度不变化

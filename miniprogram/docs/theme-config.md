# 主题风格配置与使用说明（V2）

## 文件与结构
- 文件：`miniprogram/config/themes.js`
- 结构：
```
{
  list: [
    { id: 'classic', name: '经典', className: 'theme-wood', layers: [], effects: { refreshScan: false }, variables: { boardBg: '#130d06', accent: '#ff9800' } },
    { id: 'matrix', name: '黑客帝国', className: 'theme-matrix', layers: [{ node: 'matrix-bg', enabled: true }], effects: { refreshScan: true }, variables: { boardBg: '#001a0f', accent: '#00e676' } }
  ],
  currentId: 'matrix'
}
```

## 各字段含义
- `id`：主题唯一标识，字符串
- `name`：主题中文名，用于展示
- `className`：注入到页面根视图的 CSS 类名（需在 `app.wxss` 中定义对应变量与样式）
- `layers`：页面根部渲染的图层数组；每项 `node` 为类名，`enabled` 控制其是否显示（用于扩展各类背景/叠加层）
- `effects`：主题关联的可视效果开关，如 `refreshScan`
- `variables`：主题变量集合（颜色与样式数值），用于覆盖渲染层的视觉参数
- `currentId`：当前主题的 id；页面初始化按该 id 选择主题

## 页面应用
- 根视图类名绑定：
  - 将页面根视图的类名改为 `{{themeClass}} game-root`
  - 在页面初始化读取配置：
    - `const { THEMES } = require('../../config/themes')`
    - `const themeId = THEMES.currentId`
    - `const theme = THEMES.list.find(t=>t.id===themeId) || THEMES.list[0]`
    - `this.setData({ themeClass: theme.className, themeLayers: theme.layers || [], themeEffects: theme.effects || {} })`
  - 背景层渲染：
    - `wxml` 根下：
      ```
      <block wx:for="{{themeLayers}}" wx:key="node" wx:for-item="layer">
        <view class="{{layer.node}}" wx:if="{{layer.enabled}}"></view>
      </block>
      ```
- 已接入页面：
  - 经典模式：`pages/game/game.{wxml,wxss,js}`
  - 挑战模式：`pages/challenge/challenge.{wxml,wxss,js}`

## 主题样式来源
- `app.wxss` 中包含：
  - `.theme-wood`、`.theme-matrix` 等基础类；也可只保留通用样式，全部颜色通过主题变量覆盖
- 页面样式通过 CSS 变量与类名实现切换；变量由 `theme.variables` 注入到根视图的 `style` 中

## 变量键建议
- `boardBg` → `--board-bg`
- `cellEmpty` → `--cell-empty`
- `cellFilled` → `--cell-filled`
- `cellClearing` → `--cell-clearing`
- `accent` → `--accent`
- `lineColor` → `--line-color`
- `boxEven` → `--box-even`
- `boxOdd` → `--box-odd`
- `cellBorder` → `--cell-border`
- `hudText` → `--hud-text`
- `axisText` → `--axis-text`
- `coordText` → `--coord-text`

## 切换示例
```
// 将当前主题切到经典
const { THEMES } = require('../../config/themes');
THEMES.currentId = 'classic'
// 页面 onReady 内读取后即可生效
```

## 新增主题
- 在 `list` 中添加项（设置 `id`、`name`、`className`，并扩展 `layers` 与 `effects`）
- 在 `app.wxss` 中为该 `className` 定义变量与基础样式
- 页面无需改动，初始化时按 `current` 自动加载

## 注意
- 若主题背景需要额外层（如“代码雨”），在该主题的 `layers` 中追加一个 `{ node: 'your-bg-class', enabled: true }`，并在页面样式中定义该类
- 变量注入：渲染层通过 `shared.vars` 读取主题变量，影响棋盘/格子/强调色绘制；详见 `src/utils/theme.js` 与 `src/render/Renderer.js`

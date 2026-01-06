const THEMES = {
  list: [
    {
      id: 'classic',
      name: '经典',
      className: 'theme-wood',
      layers: [],
      effects: { refreshScan: false },
      variables: {
        boardSize: '640rpx',
        boardBg: '#e9dfd1',
        cellEmpty: 'transparent',
        cellFilled: '#9e7f63',
        cellClearing: '#c6a384',
        accent: '#6b4f3b',
        lineColor: 'rgba(107,79,59,0.35)',
        boxEven: '#ffffff',
        boxOdd: '#e8f2ff',
        cellBorder: 'rgba(0,0,0,0.04)',
        hudText: '#fff',
        axisText: 'rgba(0,0,0,0.45)',
        coordText: 'rgba(0,0,0,0.35)',
        placedGlowOuter: 'rgba(107,79,59,0.35)',
        placedGlowInner: 'rgba(107,79,59,0.25)',
        dragGlowOuter: 'rgba(107,79,59,0.45)',
        dragGlowInner: 'rgba(107,79,59,0.30)',
        anchorOutline: 'rgba(107,79,59,0.6)'
      }
    },
    {
      id: 'matrix',
      name: '黑客帝国',
      className: 'theme-matrix',
      layers: [{ node: 'matrix-bg', enabled: true }],
      effects: { refreshScan: true },
      variables: {
        boardSize: '640rpx',
        boardBg: '#061b12',
        cellEmpty: 'transparent',
        cellFilled: '#00c853',
        cellClearing: '#00e676',
        accent: '#00e676',
        lineColor: 'rgba(0,255,128,0.25)',
        boxEven: 'rgba(0,255,128,0.05)',
        boxOdd: 'rgba(0,255,128,0.08)',
        cellBorder: 'rgba(0,255,128,0.06)',
        hudText: '#001a0f',
        axisText: '#00e676',
        coordText: 'rgba(0,230,118,0.6)',
        placedGlowOuter: 'rgba(0,255,128,0.6)',
        placedGlowInner: 'rgba(0,255,128,0.4)',
        dragGlowOuter: 'rgba(0,255,128,0.6)',
        dragGlowInner: 'rgba(0,255,128,0.4)',
        anchorOutline: 'rgba(0,255,128,0.5)'
      }
    },
    {
      id: 'fnv-orange',
      name: '新维加斯（Pip-Boy橙）',
      className: 'theme-fnv-orange',
      layers: [],
      effects: { refreshScan: true },
      variables: {
        boardSize: '640rpx',
        boardBg: '#130d06',
        cellEmpty: 'transparent',
        cellFilled: '#ffb300',
        cellClearing: '#ffc107',
        accent: '#ff9800',
        lineColor: 'rgba(255,153,0,0.30)',
        boxEven: 'rgba(255,153,0,0.06)',
        boxOdd: 'rgba(255,153,0,0.10)',
        cellBorder: 'rgba(255,153,0,0.16)',
        hudText: '#1a0d05',
        axisText: '#ffcc80',
        coordText: 'rgba(255,178,102,0.7)',
        placedGlowOuter: 'rgba(255,153,0,0.6)',
        placedGlowInner: 'rgba(255,153,0,0.4)',
        dragGlowOuter: 'rgba(255,153,0,0.6)',
        dragGlowInner: 'rgba(255,153,0,0.4)',
        anchorOutline: 'rgba(255,153,0,0.5)'
      }
    }
  ],
  currentId: 'fnv-orange'
};

module.exports = { THEMES };

module.exports = {
  CRISIS_CFG: {
    threshold: 0.8,
    duration: 3,
    multiplier: 3,
    overlay: 'rgba(255,0,0,0.6)'
  },
  BOMB_CFG: {
    spawn: {
      everyNTurns: 3,
      minCombo: 2,
      scoreModulo: 500,
      scoreWindow: 100
    },
    explosion: {
      pattern: 'cross'
    },
    fx: {
      duration: 280,
      color: 'rgba(255,200,0,0.35)'
    }
  }
}

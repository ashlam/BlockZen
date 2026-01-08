const shared = require('../shared.js');
const { THEMES } = require('../config.js');

function applyTheme(themeId) {
  const theme = THEMES.list.find(t => t.id === themeId) || THEMES.list[0];
  const vars = theme.variables || {};
  THEMES.currentId = theme.id;
  shared.vars = vars;
  return vars;
}

function accentColor() {
  return shared.vars.accent || '#ff9800';
}

function parseColorToRGB(c) {
  if (!c) return [255, 153, 0];
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b];
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return [r, g, b];
    }
  }
  const m = c.match(/rgba?\s*\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
  if (m) {
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  return [255, 153, 0];
}

function accentRGBA(a) {
  const [r, g, b] = parseColorToRGB(accentColor());
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

module.exports = {
  applyTheme,
  accentColor,
  accentRGBA,
  parseColorToRGB
};

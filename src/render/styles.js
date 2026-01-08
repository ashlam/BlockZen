/**
 * 样式绘制辅助
 * - drawThemedButton: 绘制主题按钮（填充+描边）
 * - drawWrappedText: 简单自动换行文本
 * - drawBoardThumbnail: 绘制棋盘缩略图，可选择高亮行/列/3x3区域
 */
const { accentColor } = require('../utils/theme');
const shared = require('../shared');

/**
 * 绘制主题按钮
 */
function drawThemedButton(ctx, x, y, w, h, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha == null ? 0.85 : alpha;
  ctx.fillStyle = accentColor();
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = Math.min(1, (alpha == null ? 0.85 : alpha) + 0.1);
  ctx.strokeStyle = accentColor();
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

/**
 * 自动换行绘制文本
 * @returns {number} 末行绘制后的 y 值
 */
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = ch;
    } else {
      line = test;
    }
  }
  if (line.length > 0) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

/**
 * 绘制棋盘缩略图，支持高亮
 */
function drawBoardThumbnail(ctx, x, y, size, highlight) {
  const cell = size / 9;
  const vars = shared.vars;
  
  ctx.save();
  ctx.fillStyle = vars.boardBg || '#061b12';
  ctx.fillRect(x, y, size, size);
  for (let by = 0; by < 3; by++) {
    for (let bx = 0; bx < 3; bx++) {
      const even = (bx + by) % 2 === 0;
      ctx.fillStyle = even ? (vars.boxEven || '#ffffff') : (vars.boxOdd || '#e8f2ff');
      ctx.fillRect(x + bx * 3 * cell, y + by * 3 * cell, 3 * cell, 3 * cell);
    }
  }
  ctx.fillStyle = vars.lineColor || 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 3 * cell - 1, y, 2, size);
  ctx.fillRect(x + 6 * cell - 1, y, 2, size);
  ctx.fillRect(x, y + 3 * cell - 1, size, 2);
  ctx.fillRect(x, y + 6 * cell - 1, size, 2);
  if (highlight) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = accentColor();
    if (highlight.row != null) { ctx.fillRect(x, y + highlight.row * cell, size, cell); }
    if (highlight.col != null) { ctx.fillRect(x + highlight.col * cell, y, cell, size); }
    if (highlight.box) { const bx = highlight.box[0], by = highlight.box[1]; ctx.fillRect(x + bx * 3 * cell, y + by * 3 * cell, 3 * cell, 3 * cell); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

module.exports = {
  drawThemedButton,
  drawWrappedText,
  drawBoardThumbnail
};

const databus = require('./src/databus');
const shared = require('./src/shared');
const renderer = require('./src/render/Renderer');
const inputHandler = require('./src/input/InputHandler');
const { ensureAudio } = require('./src/utils/Audio');
const { applyTheme } = require('./src/utils/theme');
const { THEMES } = require('./src/config');
const gameManager = require('./src/logic/GameManager');
const uiManager = require('./src/ui/UIManager');

// System Info
const sys = wx.getSystemInfoSync();
const pr = sys.pixelRatio || 2;
const sw = sys.windowWidth;
const sh = sys.windowHeight;
const safeTop = Math.floor((sys.statusBarHeight || (sys.safeArea && sys.safeArea.top) || 0) + 8);

// Canvas Init
const canvas = wx.createCanvas();
canvas.width = Math.floor(sw * pr);
canvas.height = Math.floor(sh * pr);
const ctx = canvas.getContext('2d');
ctx.scale(pr, pr);

// Update Shared/DataBus Global Config
shared.sw = sw;
shared.sh = sh;
shared.safeTop = safeTop;
shared.ctx = ctx;
renderer.init(ctx);

function init() {
  databus.state.scene = 'menu';
  
  // Load Theme
  try {
    const saved = wx.getStorageSync('themeId');
    applyTheme(saved || (THEMES.currentId || (THEMES.current && THEMES.current.id)));
  } catch (e) {
    applyTheme(THEMES.currentId || (THEMES.current && THEMES.current.id));
  }

  // Load Move Mode
  try {
    const savedMode = wx.getStorageSync('moveMode');
    if (savedMode === 'relative' || savedMode === 'absolute') { databus.state.moveMode = savedMode; }
  } catch (e) {}

  gameManager.loadHistory();
  
  // Layout Init
  renderer.layout();
  
  // Start Loop
  setInterval(tick, 16);
  
  // Audio & Assets
  ensureAudio();
  uiManager.ensureMenuBg();
  
  // Input
  inputHandler.init();
}

function tick() {
  renderer.render();
}

init();

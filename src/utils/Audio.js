const databus = require('../databus');

function generateBeepWav(freq, durationMs) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const amplitude = 0.3;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) { view.setUint8(offset + i, str.charCodeAt(i)); }
  }
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t) * amplitude;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 0x7FFF, true);
  }
  return buffer;
}

function ensureAudio() {
  try {
    const fs = wx.getFileSystemManager();
    const placePath = `${wx.env.USER_DATA_PATH}/beep_place.wav`;
    const clearPath = `${wx.env.USER_DATA_PATH}/beep_clear.wav`;
    const placeBuf = generateBeepWav(220, 120);
    const clearBuf = generateBeepWav(440, 140);
    fs.writeFileSync(placePath, placeBuf);
    fs.writeFileSync(clearPath, clearBuf);
    databus.state.audioPlace = wx.createInnerAudioContext();
    databus.state.audioPlace.src = placePath;
    databus.state.audioPlace.volume = 0.6;
    databus.state.audioClear = wx.createInnerAudioContext();
    databus.state.audioClear.src = clearPath;
    databus.state.audioClear.volume = 0.7;
  } catch (e) {
    console.warn('Audio init failed', e);
  }
}

module.exports = {
  ensureAudio
};

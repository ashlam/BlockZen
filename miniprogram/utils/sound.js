function create(src){
  if(!src) return null;
  const a = wx.createInnerAudioContext();
  a.src = src;
  a.autoplay = true;
  a.volume = 0.6;
  return a;
}

module.exports = {
  place(){ wx.vibrateShort(); },
  clear(){ wx.vibrateShort(); },
  fail(){ wx.vibrateShort(); }
};

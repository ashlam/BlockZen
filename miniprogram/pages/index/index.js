Page({
  goClassic() {
    wx.navigateTo({
      url: '/pages/game/game'
    });
  },

  goChallenge() {
    wx.navigateTo({
      url: '/pages/challenge/challenge'
    });
  }
});

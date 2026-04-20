App({
  globalData: {
    baseUrl: 'http://localhost:3000/api',
    userId: '',
  },
  onLaunch() {
    let userId = wx.getStorageSync('userId')
    if (!userId) {
      userId = 'user_' + Date.now()
      wx.setStorageSync('userId', userId)
    }
    this.globalData.userId = userId
  },
})

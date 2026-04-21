App({
  globalData: {
    baseUrl: 'http://127.0.0.1:3000/api',
    userId: '',
  },

  onLaunch() {
    this.login()
  },

  login() {
    // 先用缓存的 openid，避免每次冷启动都走网络
    const cached = wx.getStorageSync('openid')
    if (cached) {
      this.globalData.userId = cached
      return
    }
    this._doWxLogin()
  },

  _doWxLogin() {
    wx.login({
      success: (res) => {
        if (!res.code) {
          console.error('wx.login 失败', res)
          return
        }
        wx.request({
          url: this.globalData.baseUrl + '/auth/login',
          method: 'POST',
          data: { code: res.code },
          header: { 'Content-Type': 'application/json' },
          success: (resp) => {
            if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.data.openid) {
              const openid = resp.data.openid
              this.globalData.userId = openid
              // openid 长期有效，缓存起来
              wx.setStorageSync('openid', openid)
            } else {
              console.error('登录接口异常', resp.data)
            }
          },
          fail: (err) => {
            console.error('登录请求失败', err)
          },
        })
      },
      fail: (err) => {
        console.error('wx.login 调用失败', err)
      },
    })
  },

  // 供页面主动刷新登录态（如需）
  reLogin() {
    wx.removeStorageSync('openid')
    this.globalData.userId = ''
    this._doWxLogin()
  },
})

App({
  globalData: {
    baseUrl: 'http://127.0.0.1:3000/api',
    userId: '',
    _loginCallbacks: [],
  },

  onLaunch() {
    this.login()
  },

  login() {
    const cached = wx.getStorageSync('openid')
    if (cached) {
      this.globalData.userId = cached
      this._notifyLogin(cached)
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
              wx.setStorageSync('openid', openid)
              this._notifyLogin(openid)
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

  _notifyLogin(userId) {
    const cbs = this.globalData._loginCallbacks.slice()
    this.globalData._loginCallbacks = []
    cbs.forEach(cb => cb(userId))
  },

  /**
   * 登录完成后执行回调。
   * 若已登录则立即执行；否则排队，待登录成功后执行。
   */
  whenLoginReady(cb) {
    if (this.globalData.userId) {
      cb(this.globalData.userId)
    } else {
      this.globalData._loginCallbacks.push(cb)
    }
  },

  reLogin() {
    wx.removeStorageSync('openid')
    this.globalData.userId = ''
    this._doWxLogin()
  },
})

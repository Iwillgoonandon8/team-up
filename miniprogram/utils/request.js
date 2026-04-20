const app = getApp()

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'x-user-id': app.globalData.userId,
        ...options.header,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const msg = res.data?.message || '请求失败'
          wx.showToast({ title: Array.isArray(msg) ? msg[0] : msg, icon: 'none' })
          reject(res.data)
        }
      },
      fail() {
        wx.showToast({ title: '网络错误，请检查连接', icon: 'none' })
        reject(new Error('network error'))
      },
    })
  })
}

module.exports = { request }

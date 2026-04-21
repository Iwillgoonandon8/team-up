const { request } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    activeTab: 0,
    myTeam: null,
    hasTeam: false,
    isLeader: false,
    applications: [],  // pending applications for my team (leader view)
    myApplications: [], // my own applications
    loading: false,
    userId: '',
    userIdInput: '',
  },

  onShow() {
    this.setData({ userId: app.globalData.userId, userIdInput: app.globalData.userId })
    this.loadAll()
  },

  async loadAll() {
    this.setData({ loading: true })
    try {
      // 单独捕获 /teams/my 的错误，避免它阻断后续加载
      let myTeamRes = { hasTeam: false, team: null }
      try {
        myTeamRes = await request({ url: '/teams/my' })
      } catch (e) {
        // 忽略，继续加载我的申请
      }

      const userId = app.globalData.userId
      const isLeader = myTeamRes.hasTeam && myTeamRes.team?.leader_user_id === userId

      this.setData({
        myTeam: myTeamRes.team,
        hasTeam: myTeamRes.hasTeam,
        isLeader,
      })

      // 并行加载申请数据
      const tasks = [request({ url: '/applications' }).catch(() => ({ list: [] }))]
      if (isLeader && myTeamRes.team) {
        tasks.push(
          request({ url: `/teams/${myTeamRes.team.team_id}/applications?status=pending` })
            .catch(() => ({ list: [] }))
        )
      }

      const [myAppsRes, teamAppsRes] = await Promise.all(tasks)
      this.setData({
        myApplications: myAppsRes.list || [],
        applications: teamAppsRes?.list || [],
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  switchTab(e) {
    // dataset 取出的是字符串，必须转为数字才能与 === 比较
    this.setData({ activeTab: Number(e.currentTarget.dataset.tab) })
  },

  async onQuit() {
    const { myTeam } = this.data
    wx.showModal({
      title: '退出队伍',
      content: `确认退出「${myTeam.team_name}」？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await request({ url: `/teams/${myTeam.team_id}/quit`, method: 'POST' })
          wx.showToast({ title: '已退出队伍', icon: 'success' })
          this.loadAll()
        } catch {}
      },
    })
  },

  async onApprove(e) {
    const applyId = e.currentTarget.dataset.applyId
    try {
      await request({ url: `/applications/${applyId}/approve`, method: 'POST', data: {} })
      wx.showToast({ title: '已通过', icon: 'success' })
      this.loadAll()
    } catch {}
  },

  async onReject(e) {
    const applyId = e.currentTarget.dataset.applyId
    try {
      await request({ url: `/applications/${applyId}/reject`, method: 'POST', data: {} })
      wx.showToast({ title: '已拒绝', icon: 'none' })
      this.loadAll()
    } catch {}
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/create-team/index' })
  },

  goBrowse() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onUserIdInput(e) {
    this.setData({ userIdInput: e.detail.value })
  },

  goAdmin() {
    wx.navigateTo({ url: '/pages/admin/index' })
  },

  saveUserId() {
    const uid = this.data.userIdInput.trim()
    if (!uid) return wx.showToast({ title: '用户ID不能为空', icon: 'none' })
    app.globalData.userId = uid
    wx.setStorageSync('userId', uid)
    this.setData({ userId: uid })
    wx.showToast({ title: '已保存', icon: 'success' })
    this.loadAll()
  },

  statusLabel(status) {
    return { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[status] || status
  },
})

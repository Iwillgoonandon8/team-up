const { request } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    teamId: '',
    team: null,
    myTeam: null,
    myApplications: [],
    applying: false,
    message: '',
    alreadyApplied: false,
    isMyTeam: false,
  },

  onLoad(options) {
    this.setData({ teamId: options.teamId })
    this.loadAll()
  },

  async loadAll() {
    wx.showLoading({ title: '加载中' })
    try {
      const [teamRes, myTeamRes, myAppsRes] = await Promise.all([
        this.loadTeam(),
        request({ url: '/teams/my' }),
        request({ url: '/applications' }),
      ])
      const userId = app.globalData.userId
      const isMyTeam =
        myTeamRes.hasTeam && myTeamRes.team?.team_id === this.data.teamId
      const alreadyApplied = myAppsRes.list.some(
        (a) => a.team_id === this.data.teamId && a.status === 'pending',
      )
      this.setData({ myTeam: myTeamRes, myApplications: myAppsRes.list, isMyTeam, alreadyApplied })
    } finally {
      wx.hideLoading()
    }
  },

  async loadTeam() {
    const res = await request({ url: `/teams?page=1&pageSize=100` })
    const team = res.list.find((t) => t.team_id === this.data.teamId)
    this.setData({ team })
    return team
  },

  onMessageInput(e) {
    this.setData({ message: e.detail.value })
  },

  async onApply() {
    if (!this.data.message.trim()) {
      wx.showToast({ title: '请填写申请留言', icon: 'none' })
      return
    }
    this.setData({ applying: true })
    try {
      await request({
        url: '/applications',
        method: 'POST',
        data: { teamId: this.data.teamId, message: this.data.message },
      })
      wx.showToast({ title: '申请成功！', icon: 'success' })
      this.setData({ alreadyApplied: true, message: '' })
    } finally {
      this.setData({ applying: false })
    }
  },
})

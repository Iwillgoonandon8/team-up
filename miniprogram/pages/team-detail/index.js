const { request } = require('../../utils/request')

Page({
  data: {
    teamId: '',
    team: null,
    myTeam: null,
    applying: false,
    message: '',
    alreadyApplied: false,
    isMyTeam: false,
    checkins: [],
    checkinPage: 1,
    checkinHasMore: true,
    loadingCheckins: false,
  },

  onLoad(options) {
    this.setData({ teamId: options.teamId })
    this.loadAll()
  },

  onShow() {
    // 打完卡返回时刷新动态
    if (this.data.team) this.loadCheckins(true)
  },

  async loadAll() {
    wx.showLoading({ title: '加载中' })
    try {
      const [teamsRes, myTeamRes, myAppsRes] = await Promise.all([
        request({ url: `/teams?page=1&pageSize=100` }),
        request({ url: '/teams/my' }).catch(() => ({ hasTeam: false, team: null })),
        request({ url: '/applications' }).catch(() => ({ list: [] })),
      ])
      const team = teamsRes.list.find(t => t.team_id === this.data.teamId)
      const isMyTeam = myTeamRes.hasTeam && myTeamRes.team?.team_id === this.data.teamId
      const alreadyApplied = myAppsRes.list.some(
        a => a.team_id === this.data.teamId && a.status === 'pending',
      )
      this.setData({ team, myTeam: myTeamRes, isMyTeam, alreadyApplied })
    } finally {
      wx.hideLoading()
    }
    this.loadCheckins(true)
  },

  async loadCheckins(reset = false) {
    if (this.data.loadingCheckins) return
    if (!reset && !this.data.checkinHasMore) return
    const page = reset ? 1 : this.data.checkinPage
    this.setData({ loadingCheckins: true })
    try {
      const res = await request({
        url: `/checkins/team/${this.data.teamId}?page=${page}&pageSize=10`,
      })
      const list = reset ? res.list : [...this.data.checkins, ...res.list]
      this.setData({
        checkins: list,
        checkinPage: page + 1,
        checkinHasMore: list.length < res.total,
      })
    } catch (e) {
      // 打卡表未配置时静默失败
    } finally {
      this.setData({ loadingCheckins: false })
    }
  },

  onLoadMoreCheckins() {
    this.loadCheckins(false)
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

  goCheckin() {
    const { teamId, team } = this.data
    wx.navigateTo({
      url: `/pages/checkin/index?teamId=${teamId}&teamName=${encodeURIComponent(team.team_name)}`,
    })
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(Number(ts))
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },
})

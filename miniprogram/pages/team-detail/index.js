const { request } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    teamId: '',
    team: null,
    myTeam: null,
    applying: false,
    message: '',
    alreadyApplied: false,
    isMyTeam: false,
    isLeader: false,
    fromShare: false,
    loginPending: false,
    checkins: [],
    checkinPage: 1,
    checkinHasMore: true,
    loadingCheckins: false,
  },

  onLoad(options) {
    const fromShare = options.fromShare === '1'
    this.setData({ teamId: options.teamId, fromShare })

    if (app.globalData.userId) {
      // 已登录，直接加载
      this.loadAll()
    } else {
      // 登录中：先加载公开队伍信息，登录完成后刷新申请状态
      this.setData({ loginPending: true })
      this.loadTeamInfo()
      app.whenLoginReady(() => {
        this.setData({ loginPending: false })
        this.loadAll()
      })
    }
  },

  onShow() {
    if (this.data.team) this.loadCheckins(true)
  },

  /** 仅加载公开队伍信息（无需登录） */
  async loadTeamInfo() {
    try {
      const res = await request({ url: `/teams?page=1&pageSize=100` })
      const team = res.list.find(t => t.team_id === this.data.teamId)
      this.setData({ team: team || null })
      if (team) this.loadCheckins(true)
    } catch (e) {}
  },

  async loadAll() {
    wx.showLoading({ title: '加载中' })
    try {
      const results = await Promise.all([
        request({ url: `/teams?page=1&pageSize=100` }),
        request({ url: '/teams/my' }).catch(() => ({ hasTeam: false, team: null })),
        request({ url: '/applications' }).catch(() => ({ list: [] })),
      ])
      const teamsRes = results[0]
      const myTeamRes = results[1]
      const myAppsRes = results[2]

      const team = teamsRes.list.find(t => t.team_id === this.data.teamId)
      const userId = app.globalData.userId
      const isMyTeam = myTeamRes.hasTeam && myTeamRes.team && myTeamRes.team.team_id === this.data.teamId
      const isLeader = !!(team && team.leader_user_id === userId)
      const alreadyApplied = myAppsRes.list.some(
        function(a) { return a.team_id === this.data.teamId && a.status === 'pending' },
        this
      )
      this.setData({ team, myTeam: myTeamRes, isMyTeam, isLeader, alreadyApplied })
    } finally {
      wx.hideLoading()
    }
    this.loadCheckins(true)
  },

  async loadCheckins(reset) {
    if (this.data.loadingCheckins) return
    if (!reset && !this.data.checkinHasMore) return
    const page = reset ? 1 : this.data.checkinPage
    this.setData({ loadingCheckins: true })
    try {
      const res = await request({
        url: `/checkins/team/${this.data.teamId}?page=${page}&pageSize=10`,
      })
      const list = reset ? res.list : this.data.checkins.concat(res.list)
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

  onShare() {
    // 触发原生分享面板（button open-type="share" 会自动调用 onShareAppMessage）
  },

  onShareAppMessage() {
    const { team, teamId } = this.data
    return {
      title: team ? `邀请你加入「${team.team_name}」` : '加入我的学习小队',
      path: `/pages/team-detail/index?teamId=${teamId}&fromShare=1`,
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

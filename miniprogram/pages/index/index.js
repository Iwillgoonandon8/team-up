const { request } = require('../../utils/request')

Page({
  data: {
    teams: [],
    total: 0,
    page: 1,
    loading: false,
    hasMore: true,
    filterTeamName: '',
    filterStatus: '',
    filterStage: '',
    teamNameInput: '',
    stages: [],
    siteConfig: null,
  },

  onShow() {
    this.loadSiteConfig()
    this.reload()
  },

  async loadSiteConfig() {
    try {
      const cfg = await request({ url: '/site-config' })
      const stages = (cfg.stagesConfig || []).map(function(s) { return s.name })
      this.setData({ siteConfig: cfg, stages })
    } catch {}
  },

  reload() {
    this.setData({ page: 1, teams: [], hasMore: true })
    this.loadTeams()
  },

  async loadTeams() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true })
    try {
      const { page, filterTeamName, filterStatus, filterStage } = this.data
      let query = `page=${page}&pageSize=20`
      if (filterTeamName) query += `&teamName=${encodeURIComponent(filterTeamName)}`
      if (filterStatus) query += `&status=${filterStatus}`
      if (filterStage) query += `&stage=${encodeURIComponent(filterStage)}`
      const res = await request({ url: `/teams?${query}` })
      const newList = this.data.page === 1 ? res.list : this.data.teams.concat(res.list)
      this.setData({
        teams: newList,
        total: res.total,
        hasMore: newList.length < res.total,
        page: page + 1,
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  onReachBottom() {
    this.loadTeams()
  },

  onTeamNameInput(e) {
    this.setData({ teamNameInput: e.detail.value })
  },

  onTeamNameSearch() {
    this.setData({ filterTeamName: this.data.teamNameInput })
    this.reload()
  },

  onStatusChange(e) {
    this.setData({ filterStatus: e.currentTarget.dataset.status })
    this.reload()
  },

  onStageChange(e) {
    this.setData({ filterStage: e.currentTarget.dataset.stage })
    this.reload()
  },

  goDetail(e) {
    const teamId = e.currentTarget.dataset.teamId
    wx.navigateTo({ url: `/pages/team-detail/index?teamId=${teamId}` })
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/create-team/index' })
  },
})

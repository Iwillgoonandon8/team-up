const { request } = require('../../utils/request')

const STAGES = ['F1_基础', 'F2_基础', 'F_加强', 'E1_基础', 'E2_基础', 'E_加强']

Page({
  data: {
    teams: [],
    total: 0,
    page: 1,
    loading: false,
    hasMore: true,
    filterTopic: '',
    filterStatus: '',
    filterStage: '',
    topicInput: '',
    stages: STAGES,
    siteConfig: null,
  },

  onShow() {
    this.loadSiteConfig()
    this.reload()
  },

  async loadSiteConfig() {
    try {
      const cfg = await request({ url: '/site-config' })
      this.setData({ siteConfig: cfg })
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
      const { page, filterTopic, filterStatus, filterStage } = this.data
      let query = `page=${page}&pageSize=20`
      if (filterTopic) query += `&topic=${encodeURIComponent(filterTopic)}`
      if (filterStatus) query += `&status=${filterStatus}`
      if (filterStage) query += `&stage=${encodeURIComponent(filterStage)}`
      const res = await request({ url: `/teams?${query}` })
      const newList = this.data.page === 1 ? res.list : [...this.data.teams, ...res.list]
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

  onTopicInput(e) {
    this.setData({ topicInput: e.detail.value })
  },

  onTopicSearch() {
    this.setData({ filterTopic: this.data.topicInput })
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

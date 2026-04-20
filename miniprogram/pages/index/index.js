const { request } = require('../../utils/request')

Page({
  data: {
    teams: [],
    total: 0,
    page: 1,
    loading: false,
    hasMore: true,
    filterTopic: '',
    filterStatus: 'open',
    topicInput: '',
  },

  onShow() {
    this.reload()
  },

  reload() {
    this.setData({ page: 1, teams: [], hasMore: true })
    this.loadTeams()
  },

  async loadTeams() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true })
    try {
      const { page, filterTopic, filterStatus } = this.data
      const params = new URLSearchParams({ page, pageSize: 20 })
      if (filterTopic) params.append('topic', filterTopic)
      if (filterStatus) params.append('status', filterStatus)
      const res = await request({ url: `/teams?${params}` })
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

  goDetail(e) {
    const teamId = e.currentTarget.dataset.teamId
    wx.navigateTo({ url: `/pages/team-detail/index?teamId=${teamId}` })
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/create-team/index' })
  },
})

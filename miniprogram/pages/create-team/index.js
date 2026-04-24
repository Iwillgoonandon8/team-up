const { request } = require('../../utils/request')

Page({
  data: {
    teamName: '',
    stages: [],
    stageIndex: 0,
    topic: '',
    maxMembers: 4,
    submitting: false,
    teamRegOpen: true,
  },

  async onLoad() {
    try {
      const cfg = await request({ url: '/site-config' })
      const stages = (cfg.stagesConfig || []).map(function(s) { return s.name })
      this.setData({ teamRegOpen: cfg.teamRegOpen !== false, stages })
    } catch {}
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  onStageChange(e) {
    this.setData({ stageIndex: Number(e.detail.value) })
  },

  onMembersChange(e) {
    this.setData({ maxMembers: Number(e.detail.value) })
  },

  async onSubmit() {
    if (!this.data.teamRegOpen) {
      return wx.showToast({ title: '组队报名当前已关闭', icon: 'none' })
    }
    const { teamName, stages, stageIndex, topic, maxMembers } = this.data
    if (!teamName.trim()) return wx.showToast({ title: '请填写队伍名称', icon: 'none' })
    if (!topic.trim()) return wx.showToast({ title: '请填写话题', icon: 'none' })

    this.setData({ submitting: true })
    try {
      await request({
        url: '/teams',
        method: 'POST',
        data: {
          teamName: teamName.trim(),
          stage: stages[stageIndex],
          topic: topic.trim(),
          maxMembers,
        },
      })
      wx.showToast({ title: '创建成功！', icon: 'success' })
      setTimeout(() => wx.switchTab({ url: '/pages/mine/index' }), 1000)
    } finally {
      this.setData({ submitting: false })
    }
  },
})

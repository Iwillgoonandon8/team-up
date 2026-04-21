const { request } = require('../../utils/request')

const STAGES = ['F1_基础', 'F2_基础', 'F_加强', 'E1_基础', 'E2_基础', 'E_加强']

Page({
  data: {
    teamId: '',
    teamName: '',
    stages: STAGES,
    stageIndex: 0,
    milestone: '',
    content: '',
    blockedBy: '',
    submitting: false,
  },

  onLoad(options) {
    this.setData({
      teamId: options.teamId || '',
      teamName: options.teamName || '',
    })
  },

  onStageChange(e) {
    this.setData({ stageIndex: Number(e.detail.value) })
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  async onSubmit() {
    const { teamId, stages, stageIndex, milestone, content, blockedBy } = this.data
    if (!milestone.trim()) return wx.showToast({ title: '请填写完成的里程碑', icon: 'none' })
    if (!content.trim()) return wx.showToast({ title: '请填写打卡内容', icon: 'none' })

    this.setData({ submitting: true })
    try {
      await request({
        url: '/checkins',
        method: 'POST',
        data: {
          teamId,
          stage: stages[stageIndex],
          milestone: milestone.trim(),
          content: content.trim(),
          blockedBy: blockedBy.trim(),
        },
      })
      wx.showToast({ title: '打卡成功 🎉', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1200)
    } finally {
      this.setData({ submitting: false })
    }
  },
})

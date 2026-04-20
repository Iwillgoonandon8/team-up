const { request } = require('../../utils/request')

Page({
  data: {
    teamName: '',
    topic: '',
    maxMembers: 4,
    submitting: false,
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },

  onMembersChange(e) {
    this.setData({ maxMembers: Number(e.detail.value) })
  },

  async onSubmit() {
    const { teamName, topic, maxMembers } = this.data
    if (!teamName.trim()) return wx.showToast({ title: '请填写队伍名称', icon: 'none' })
    if (!topic.trim()) return wx.showToast({ title: '请填写话题', icon: 'none' })

    this.setData({ submitting: true })
    try {
      await request({
        url: '/teams',
        method: 'POST',
        data: { teamName: teamName.trim(), topic: topic.trim(), maxMembers },
      })
      wx.showToast({ title: '创建成功！', icon: 'success' })
      setTimeout(() => wx.switchTab({ url: '/pages/mine/index' }), 1000)
    } finally {
      this.setData({ submitting: false })
    }
  },
})

const { request } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    unlocked: false,
    keyInput: '',
    showKey: false,
    cfg: null,
    saving: false,
    archiving: false,

    // 表单字段
    teamRegEnabled: true,
    teamRegOpenDate: '',
    teamRegCloseDate: '',
    checkinEnabled: true,
    checkinOpenDate: '',
    checkinCloseDate: '',
    notice: '',

    // 阶段配置
    stagesConfig: [],
    newStageName: '',
    newStageMax: 10,
  },

  onLoad() {
    // 仅预填输入框，不自动解锁，避免转场动画期间提前渲染配置面板
    const saved = wx.getStorageSync('adminKey')
    if (saved) {
      this.setData({ keyInput: saved })
    }
  },

  onKeyInput(e) {
    this.setData({ keyInput: e.detail.value })
  },

  toggleShowKey() {
    this.setData({ showKey: !this.data.showKey })
  },

  async unlock() {
    const key = this.data.keyInput.trim()
    if (!key) return wx.showToast({ title: '请输入管理员密钥', icon: 'none' })
    try {
      await this.apiPut({})
      wx.setStorageSync('adminKey', key)
      this.setData({ unlocked: true })
      this.loadConfig()
    } catch {
      wx.showToast({ title: '密钥错误', icon: 'none' })
    }
  },

  async loadConfig() {
    try {
      const cfg = await request({ url: '/site-config' })
      this.setData({
        cfg,
        teamRegEnabled: cfg.teamRegEnabled,
        teamRegOpenDate: cfg.teamRegOpenDate ? this.tsToDate(cfg.teamRegOpenDate) : '',
        teamRegCloseDate: cfg.teamRegCloseDate ? this.tsToDate(cfg.teamRegCloseDate) : '',
        checkinEnabled: cfg.checkinEnabled,
        checkinOpenDate: cfg.checkinOpenDate ? this.tsToDate(cfg.checkinOpenDate) : '',
        checkinCloseDate: cfg.checkinCloseDate ? this.tsToDate(cfg.checkinCloseDate) : '',
        notice: cfg.notice || '',
        stagesConfig: cfg.stagesConfig || [],
      })
    } catch {
      wx.showToast({ title: '加载配置失败', icon: 'none' })
    }
  },

  onToggle(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: !this.data[field] })
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  onNoticeInput(e) {
    this.setData({ notice: e.detail.value })
  },

  // 阶段名称编辑
  onStageNameInput(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ ['stagesConfig[' + idx + '].name']: e.detail.value })
  },

  // 阶段上限编辑
  onStageMaxInput(e) {
    const idx = e.currentTarget.dataset.index
    const val = Number(e.detail.value)
    this.setData({ ['stagesConfig[' + idx + '].maxTeams']: val > 0 ? val : 1 })
  },

  // 删除某个阶段
  onDeleteStage(e) {
    const idx = e.currentTarget.dataset.index
    const stages = this.data.stagesConfig.filter(function(_, i) { return i !== idx })
    this.setData({ stagesConfig: stages })
  },

  onNewStageNameInput(e) {
    this.setData({ newStageName: e.detail.value })
  },

  onNewStageMaxInput(e) {
    this.setData({ newStageMax: Number(e.detail.value) || 10 })
  },

  // 添加新阶段
  onAddStage() {
    const name = this.data.newStageName.trim()
    if (!name) return wx.showToast({ title: '请填写阶段名称', icon: 'none' })
    const exists = this.data.stagesConfig.some(function(s) { return s.name === name })
    if (exists) return wx.showToast({ title: '阶段名称已存在', icon: 'none' })
    const stages = this.data.stagesConfig.concat([{ name: name, maxTeams: this.data.newStageMax }])
    this.setData({ stagesConfig: stages, newStageName: '', newStageMax: 10 })
  },

  async onSave() {
    this.setData({ saving: true })
    try {
      const d = this.data
      await this.apiPut({
        teamRegEnabled: d.teamRegEnabled,
        teamRegOpenDate: d.teamRegOpenDate ? this.dateToTs(d.teamRegOpenDate) : 0,
        teamRegCloseDate: d.teamRegCloseDate ? this.dateToTs(d.teamRegCloseDate) : 0,
        checkinEnabled: d.checkinEnabled,
        checkinOpenDate: d.checkinOpenDate ? this.dateToTs(d.checkinOpenDate) : 0,
        checkinCloseDate: d.checkinCloseDate ? this.dateToTs(d.checkinCloseDate) : 0,
        notice: d.notice,
        stagesConfig: d.stagesConfig,
      })
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.loadConfig()
    } finally {
      this.setData({ saving: false })
    }
  },

  onArchiveTeams() {
    wx.showModal({
      title: '确认存档',
      content: '将存档所有现有队伍，学员可重新组队。此操作不可撤销，是否继续？',
      confirmText: '确认存档',
      confirmColor: '#e53935',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ archiving: true })
        this.apiPost('/site-config/archive-teams').then((result) => {
          wx.showToast({ title: '已存档 ' + result.archivedCount + ' 支队伍', icon: 'success' })
        }).catch(() => {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }).then(() => {
          this.setData({ archiving: false })
        })
      }
    })
  },

  apiPost(path) {
    const adminKey = this.data.keyInput.trim() || wx.getStorageSync('adminKey')
    return new Promise((resolve, reject) => {
      wx.request({
        url: app.globalData.baseUrl + path,
        method: 'POST',
        data: {},
        header: {
          'Content-Type': 'application/json',
          'x-user-id': app.globalData.userId,
          'x-admin-key': adminKey,
        },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
          else reject(res.data)
        },
        fail: reject,
      })
    })
  },

  apiPut(body) {
    const adminKey = this.data.keyInput.trim() || wx.getStorageSync('adminKey')
    return new Promise((resolve, reject) => {
      wx.request({
        url: app.globalData.baseUrl + '/site-config',
        method: 'PUT',
        data: body,
        header: {
          'Content-Type': 'application/json',
          'x-user-id': app.globalData.userId,
          'x-admin-key': adminKey,
        },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
          else reject(res.data)
        },
        fail: reject,
      })
    })
  },

  tsToDate(ts) {
    const d = new Date(ts)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  dateToTs(str) {
    return new Date(str).getTime()
  },

  logout() {
    wx.removeStorageSync('adminKey')
    this.setData({ unlocked: false, keyInput: '' })
  },
})

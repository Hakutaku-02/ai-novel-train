/**
 * 写作技巧学习模块 API 接口
 */
import request from '../utils/request'

// ==================== 分类相关 ====================

/**
 * 获取技巧分类列表
 */
export function getCategories() {
  return request.get('/skills/categories')
}

// ==================== 知识点管理 ====================

/**
 * 获取知识点列表
 * @param {Object} params - 查询参数
 * @param {string} params.category - 分类筛选
 * @param {string} params.difficulty - 难度筛选
 * @param {string} params.source - 来源筛选
 * @param {string} params.search - 搜索关键词
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 */
export function getSkills(params) {
  return request.get('/skills', { params })
}

/**
 * 获取单个知识点详情
 * @param {number} id - 知识点ID
 */
export function getSkill(id) {
  return request.get(`/skills/${id}`)
}

/**
 * 创建知识点
 * @param {Object} data - 知识点数据
 */
export function createSkill(data) {
  return request.post('/skills', data)
}

/**
 * 更新知识点
 * @param {number} id - 知识点ID
 * @param {Object} data - 更新数据
 */
export function updateSkill(id, data) {
  return request.put(`/skills/${id}`, data)
}

/**
 * 删除知识点
 * @param {number} id - 知识点ID
 */
export function deleteSkill(id) {
  return request.delete(`/skills/${id}`)
}

/**
 * AI 生成知识点
 * @param {Object} data - 生成参数
 * @param {string} data.skillName - 技巧名称
 * @param {string} data.category - 可选，指定分类
 */
export function generateSkill(data) {
  return request.post('/skills/generate', data)
}

/**
 * 记录学习
 * @param {number} id - 知识点ID
 * @param {Object} data - 学习数据
 * @param {number} data.duration - 学习时长（秒）
 * @param {boolean} data.completed - 是否完成
 */
export function recordStudy(id, data) {
  return request.post(`/skills/${id}/study`, data)
}

// ==================== 练习相关 ====================

/**
 * 生成练习题
 * @param {number} skillId - 知识点ID
 * @param {Object} options - 生成选项
 * @param {string} options.keywords - 关键词或元素
 * @param {string} options.description - 题目描述要求
 * @param {boolean} options.saveToBank - 是否保存到题库，默认 true
 */
export function generatePractice(skillId, options = {}) {
  return request.post(`/skills/${skillId}/practice/generate`, options)
}

/**
 * 创建练习
 * @param {number} skillId - 知识点ID
 * @param {Object} data - 练习数据
 * @param {string} data.questionTitle - 题目标题
 * @param {Object} data.questionContent - 题目内容
 */
export function createPractice(skillId, data) {
  return request.post(`/skills/${skillId}/practice`, data)
}

/**
 * 获取知识点的练习列表
 * @param {number} skillId - 知识点ID
 * @param {Object} params - 查询参数
 */
export function getSkillPractices(skillId, params) {
  return request.get(`/skills/${skillId}/practices`, { params })
}

/**
 * 获取练习详情
 * @param {number} practiceId - 练习ID
 */
export function getPractice(practiceId) {
  return request.get(`/skills/practices/${practiceId}`)
}

/**
 * 更新练习（保存草稿）
 * @param {number} practiceId - 练习ID
 * @param {Object} data - 更新数据
 * @param {string} data.userAnswer - 用户答案
 * @param {number} data.timeSpent - 用时（秒）
 */
export function updatePractice(practiceId, data) {
  return request.put(`/skills/practices/${practiceId}`, data)
}

/**
 * 提交练习
 * @param {number} practiceId - 练习ID
 * @param {Object} data - 提交数据
 * @param {string} data.userAnswer - 用户答案
 * @param {number} data.timeSpent - 用时（秒）
 */
export function submitPractice(practiceId, data) {
  return request.post(`/skills/practices/${practiceId}/submit`, data)
}

/**
 * AI 评审练习
 * @param {number} practiceId - 练习ID
 */
export function evaluatePractice(practiceId) {
  return request.post(`/skills/practices/${practiceId}/evaluate`)
}

/**
 * 删除练习记录
 * @param {number} practiceId - 练习ID
 */
export function deletePractice(practiceId) {
  return request.delete(`/skills/practices/${practiceId}`)
}

// ==================== 统计相关 ====================

/**
 * 获取学习统计概览
 */
export function getStatisticsOverview() {
  return request.get('/skills/statistics/overview')
}

// ==================== 默认技巧相关 ====================

/**
 * 获取预设技巧初始化状态
 */
export function getPresetStatus() {
  return request.get('/skills/preset/status')
}

/**
 * 初始化默认技巧
 * @param {Object} options - 选项
 * @param {boolean} options.force - 是否强制重新初始化
 */
export function initPresetSkills(options = {}) {
  return request.post('/skills/preset/init', options)
}

/**
 * 获取可用的默认技巧列表
 */
export function getPresetList() {
  return request.get('/skills/preset/list')
}

// ==================== 导入导出相关 ====================

/**
 * 导出知识点
 * @param {Object} params - 导出参数
 * @param {string} params.ids - 要导出的知识点ID，逗号分隔
 * @param {string} params.category - 按分类导出
 * @param {boolean} params.all - 是否导出全部（包含预设）
 */
export function exportSkills(params = {}) {
  return request.get('/skills/export', { params })
}

/**
 * 导入知识点
 * @param {Object} data - 导入数据
 * @param {Array} data.skills - 知识点数组
 * @param {boolean} data.overwrite - 是否覆盖已存在的知识点
 */
export function importSkills(data) {
  return request.post('/skills/import', data)
}

// ==================== 题库相关 ====================

/**
 * 获取知识点的题库列表
 * @param {number} skillId - 知识点ID
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 */
export function getQuestionBank(skillId, params = {}) {
  return request.get(`/skills/${skillId}/questions`, { params })
}

/**
 * 删除题库中的题目
 * @param {number} questionId - 题目ID
 */
export function deleteQuestion(questionId) {
  return request.delete(`/skills/questions/${questionId}`)
}

/**
 * 从题库选择题目创建练习
 * @param {number} questionId - 题目ID
 */
export function useQuestion(questionId) {
  return request.post(`/skills/questions/${questionId}/use`)
}

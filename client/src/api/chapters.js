import request from '../utils/request'

// 获取片段类型列表
export function getSegmentTypes() {
  return request.get('/chapters/segment-types')
}

// 获取文风类型列表
export function getWritingStyles() {
  return request.get('/chapters/writing-styles')
}

// 获取所有小说名列表
export function getNovelNames() {
  return request.get('/chapters/novel-names')
}

// 获取章节列表
export function getChapters(params) {
  return request.get('/chapters', { params })
}

// 获取单个章节详情
export function getChapter(id) {
  return request.get(`/chapters/${id}`)
}

// 创建章节
export function createChapter(data) {
  return request.post('/chapters', data)
}

// 更新章节
export function updateChapter(id, data) {
  return request.put(`/chapters/${id}`, data)
}

// 删除章节
export function deleteChapter(id) {
  return request.delete(`/chapters/${id}`)
}

// AI分析章节
export function analyzeChapter(id) {
  return request.post(`/chapters/${id}/analyze`)
}

// 上传小说文件
export function uploadNovel(formData) {
  return request.post('/chapters/upload-novel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// AI生成章节标题正则表达式
export function generateChapterRegex(sampleText) {
  return request.post('/chapters/generate-chapter-regex', { sample_text: sampleText })
}

// 拆分章节预览
export function splitChaptersPreview(data) {
  return request.post('/chapters/split-chapters-preview', data)
}

// 批量插入章节
export function batchInsertChapters(chapters) {
  return request.post('/chapters/batch-insert', { chapters })
}

// 获取片段列表
export function getSegments(params) {
  return request.get('/chapters/segments/list', { params })
}

// 手动添加片段
export function addSegment(chapterId, data) {
  return request.post(`/chapters/${chapterId}/segments`, data)
}

// 更新片段
export function updateSegment(segmentId, data) {
  return request.put(`/chapters/segments/${segmentId}`, data)
}

// 删除片段
export function deleteSegment(segmentId) {
  return request.delete(`/chapters/segments/${segmentId}`)
}

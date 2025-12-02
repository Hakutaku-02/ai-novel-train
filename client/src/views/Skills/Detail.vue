<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Edit, Delete } from '@element-plus/icons-vue'
import { getSkill, recordStudy, getSkillPractices, getQuestionBank, deleteQuestion, useQuestion, createPractice } from '../../api/skills'
import { marked } from 'marked'

const router = useRouter()
const route = useRoute()

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

// 状态
const loading = ref(true)
const skill = ref(null)
const practices = ref([])
const activeTab = ref('content')
const studyStartTime = ref(null)

// 题库相关
const questionBank = ref([])
const questionBankLoading = ref(false)
const questionBankTotal = ref(0)
const questionBankPage = ref(1)
const usingQuestion = ref(false)
const restartingPractice = ref(false)

// 难度配置
const difficultyMap = {
  easy: { label: '简单', type: 'success' },
  medium: { label: '中等', type: 'warning' },
  hard: { label: '困难', type: 'danger' }
}

// 分类配置
const categoryMap = {
  opening: { name: '开篇技巧', icon: '🚀' },
  dialogue: { name: '对白技巧', icon: '💬' },
  description: { name: '描写技巧', icon: '🎨' },
  narrative: { name: '叙事技巧', icon: '📖' },
  structure: { name: '结构技巧', icon: '🏗️' },
  emotion: { name: '情感技巧', icon: '❤️' },
  comprehensive: { name: '综合技巧', icon: '⭐' }
}

// 渲染 Markdown
const renderedContent = computed(() => {
  if (!skill.value?.content) return ''
  return marked(skill.value.content)
})

// 加载知识点详情
const loadSkill = async () => {
  loading.value = true
  try {
    const res = await getSkill(route.params.id)
    skill.value = res.data
    
    // 加载练习记录
    const practicesRes = await getSkillPractices(route.params.id, { pageSize: 5 })
    practices.value = practicesRes.data
    
    // 加载题库
    loadQuestionBank()
    
    // 开始计时
    studyStartTime.value = Date.now()
  } catch (error) {
    ElMessage.error('加载知识点失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 加载题库
const loadQuestionBank = async () => {
  questionBankLoading.value = true
  try {
    const res = await getQuestionBank(route.params.id, {
      page: questionBankPage.value,
      pageSize: 10
    })
    questionBank.value = res.data.list
    questionBankTotal.value = res.data.total
  } catch (error) {
    console.error('加载题库失败:', error)
  } finally {
    questionBankLoading.value = false
  }
}

// 从题库选择题目开始练习
const handleUseQuestion = async (question) => {
  usingQuestion.value = true
  try {
    const res = await useQuestion(question.id)
    ElMessage.success('练习创建成功')
    // 跳转到练习页面，带上 practiceId 参数
    router.push(`/skills/${skill.value.id}/practice?practiceId=${res.data.practiceId}`)
  } catch (error) {
    ElMessage.error('创建练习失败: ' + (error.message || '未知错误'))
  } finally {
    usingQuestion.value = false
  }
}

// 删除题库题目
const handleDeleteQuestion = async (question) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除题目「${question.content?.title || question.title}」吗？`,
      '删除确认',
      { type: 'warning' }
    )
    
    await deleteQuestion(question.id)
    ElMessage.success('删除成功')
    loadQuestionBank()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 继续练习（继续编辑草稿）
const continuePractice = (practice) => {
  router.push(`/skills/${skill.value.id}/practice?practiceId=${practice.id}`)
}

// 重新练习（使用相同题目开启新练习）
const restartPractice = async (practice, event) => {
  event.stopPropagation()
  restartingPractice.value = true
  try {
    // 解析原有题目内容
    let questionContent = practice.question_content
    if (typeof questionContent === 'string') {
      questionContent = JSON.parse(questionContent)
    }
    
    // 创建新的练习记录
    const res = await createPractice(skill.value.id, {
      questionTitle: practice.question_title,
      questionContent: questionContent
    })
    
    ElMessage.success('已创建新练习')
    // 跳转到新练习页面
    router.push(`/skills/${skill.value.id}/practice?practiceId=${res.data.id}`)
  } catch (error) {
    ElMessage.error('创建练习失败: ' + (error.message || '未知错误'))
  } finally {
    restartingPractice.value = false
  }
}

// 记录学习时长
const saveStudyRecord = async () => {
  if (!studyStartTime.value || !skill.value) return
  
  const duration = Math.floor((Date.now() - studyStartTime.value) / 1000)
  if (duration < 10) return // 少于10秒不记录
  
  try {
    await recordStudy(skill.value.id, {
      duration,
      completed: true
    })
  } catch (error) {
    console.error('保存学习记录失败:', error)
  }
}

// 返回列表
const goBack = () => {
  saveStudyRecord()
  router.push('/skills')
}

// 开始练习
const startPractice = () => {
  saveStudyRecord()
  router.push(`/skills/${skill.value.id}/practice`)
}

// 查看练习详情
const viewPractice = (practice) => {
  router.push(`/skills/practice/${practice.id}`)
}

// 获取状态配置
const getStatusConfig = (status) => {
  const map = {
    draft: { label: '草稿', type: 'info' },
    submitted: { label: '已提交', type: 'warning' },
    evaluated: { label: '已评审', type: 'success' }
  }
  return map[status] || { label: status, type: 'info' }
}

onMounted(() => {
  loadSkill()
})

onUnmounted(() => {
  saveStudyRecord()
})
</script>

<template>
  <div class="skill-detail-page" v-loading="loading">
    <!-- 返回按钮 -->
    <div class="back-bar">
      <el-button :icon="ArrowLeft" text @click="goBack">返回技巧库</el-button>
    </div>
    
    <template v-if="skill">
      <!-- 头部信息 -->
      <div class="skill-header">
        <div class="header-main">
          <div class="skill-meta">
            <span class="category">
              {{ categoryMap[skill.category]?.icon }} {{ categoryMap[skill.category]?.name }}
            </span>
            <el-tag :type="difficultyMap[skill.difficulty]?.type" size="small">
              {{ difficultyMap[skill.difficulty]?.label }}
            </el-tag>
            <el-tag v-if="skill.source === 'ai'" size="small" type="warning">AI生成</el-tag>
            <el-tag v-else-if="skill.source === 'user'" size="small" type="info">自定义</el-tag>
          </div>
          
          <h1 class="skill-name">{{ skill.name }}</h1>
          <p class="skill-summary">{{ skill.summary }}</p>
          
          <div class="skill-stats">
            <span>📖 已学习 {{ skill.study_count }} 次</span>
            <span>✍️ 已练习 {{ skill.practice_count }} 次</span>
            <span v-if="skill.avg_score > 0">⭐ 平均得分 {{ skill.avg_score.toFixed(1) }}</span>
          </div>
        </div>
        
        <div class="header-actions">
          <el-button type="primary" size="large" @click="startPractice">
            开始练习
          </el-button>
        </div>
      </div>
      
      <!-- 内容标签页 -->
      <el-tabs v-model="activeTab" class="content-tabs">
        <el-tab-pane label="技巧讲解" name="content">
          <!-- 核心要点 -->
          <el-card class="key-points-card" v-if="skill.key_points?.length">
            <template #header>
              <span>💡 核心要点</span>
            </template>
            <ul class="key-points-list">
              <li v-for="(point, index) in skill.key_points" :key="index">
                {{ point }}
              </li>
            </ul>
          </el-card>
          
          <!-- 详细讲解 -->
          <el-card class="content-card">
            <template #header>
              <span>📚 详细讲解</span>
            </template>
            <div class="markdown-content" v-html="renderedContent"></div>
          </el-card>
          
          <!-- 练习建议 -->
          <el-card class="advice-card" v-if="skill.practice_advice">
            <template #header>
              <span>🎯 练习建议</span>
            </template>
            <p>{{ skill.practice_advice }}</p>
          </el-card>
        </el-tab-pane>
        
        <el-tab-pane label="示例分析" name="examples">
          <div class="examples-list" v-if="skill.examples?.length">
            <el-card v-for="(example, index) in skill.examples" :key="index" class="example-card">
              <template #header>
                <span>📝 {{ example.title || `示例 ${index + 1}` }}</span>
              </template>
              
              <div class="example-content">
                <p class="example-text">{{ example.content }}</p>
              </div>
              
              <div class="example-analysis" v-if="example.analysis">
                <h4>💬 分析</h4>
                <p>{{ example.analysis }}</p>
              </div>
            </el-card>
          </div>
          
          <el-empty v-else description="暂无示例" />
        </el-tab-pane>
        
        <el-tab-pane label="常见错误" name="mistakes">
          <div class="mistakes-list" v-if="skill.common_mistakes?.length">
            <el-card v-for="(mistake, index) in skill.common_mistakes" :key="index" class="mistake-card">
              <div class="mistake-header">
                <span class="mistake-icon">❌</span>
                <span class="mistake-title">{{ mistake.mistake }}</span>
              </div>
              
              <div class="mistake-reason">
                <h4>为什么是错误的？</h4>
                <p>{{ mistake.reason }}</p>
              </div>
              
              <div class="mistake-correction" v-if="mistake.correction">
                <h4>✅ 正确做法</h4>
                <p>{{ mistake.correction }}</p>
              </div>
            </el-card>
          </div>
          
          <el-empty v-else description="暂无常见错误" />
        </el-tab-pane>
        
        <el-tab-pane label="练习记录" name="practices">
          <div class="practices-list" v-if="practices.length">
            <el-card 
              v-for="practice in practices" 
              :key="practice.id" 
              class="practice-record-card"
            >
              <div class="practice-info" @click="viewPractice(practice)">
                <div class="practice-title">
                  {{ practice.question_title || '练习' }}
                </div>
                <div class="practice-meta">
                  <span>{{ new Date(practice.created_at).toLocaleDateString() }}</span>
                  <span>{{ practice.word_count }} 字</span>
                  <el-tag :type="getStatusConfig(practice.status).type" size="small">
                    {{ getStatusConfig(practice.status).label }}
                  </el-tag>
                </div>
              </div>
              <div class="practice-actions">
                <el-button 
                  v-if="practice.status === 'draft'"
                  type="primary" 
                  size="small"
                  @click="continuePractice(practice)"
                >
                  继续练习
                </el-button>
                <el-button 
                  v-else
                  size="small"
                  @click="viewPractice(practice)"
                >
                  查看详情
                </el-button>
                <el-button 
                  type="success" 
                  size="small"
                  plain
                  :loading="restartingPractice"
                  @click="restartPractice(practice, $event)"
                >
                  重新练习
                </el-button>
              </div>
            </el-card>
            
            <el-button type="primary" plain @click="startPractice">
              开始新练习
            </el-button>
          </div>
          
          <el-empty v-else description="暂无练习记录">
            <el-button type="primary" @click="startPractice">开始第一次练习</el-button>
          </el-empty>
        </el-tab-pane>
        
        <el-tab-pane :label="`题库(${questionBankTotal})`" name="questionBank">
          <div class="question-bank-header">
            <p class="question-bank-tip">
              题库中保存了之前生成的练习题，可以直接选用，避免重复生成
            </p>
            <div class="question-bank-header-actions">
              <el-button type="primary" @click="startPractice">生成新题目</el-button>
            </div>
          </div>
          
          <div v-loading="questionBankLoading">
            <div class="question-bank-list" v-if="questionBank.length">
              <el-card 
                v-for="question in questionBank" 
                :key="question.id" 
                class="question-bank-card"
              >
                <div class="question-bank-info">
                  <div class="question-bank-title">
                    {{ question.content?.title || question.title }}
                  </div>
                  <div class="question-bank-preview" v-if="question.content?.task">
                    {{ question.content.task }}
                  </div>
                  <div class="question-bank-meta">
                    <el-tag v-if="question.keywords" size="small" type="info">
                      {{ question.keywords }}
                    </el-tag>
                    <span class="use-count">已使用 {{ question.use_count }} 次</span>
                    <span class="create-time">
                      {{ new Date(question.created_at).toLocaleDateString() }}
                    </span>
                  </div>
                </div>
                <div class="question-bank-actions">
                  <el-button 
                    type="primary" 
                    size="small"
                    :loading="usingQuestion"
                    @click="handleUseQuestion(question)"
                  >
                    选用
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small"
                    text
                    :icon="Delete"
                    @click="handleDeleteQuestion(question)"
                  />
                </div>
              </el-card>
              
              <el-pagination
                v-if="questionBankTotal > 10"
                v-model:current-page="questionBankPage"
                :total="questionBankTotal"
                :page-size="10"
                layout="prev, pager, next"
                @current-change="loadQuestionBank"
                class="question-bank-pagination"
              />
            </div>
            
            <el-empty v-else description="题库为空">
              <el-button type="primary" @click="startPractice">
                生成第一道题目
              </el-button>
            </el-empty>
          </div>
        </el-tab-pane>
      </el-tabs>
      
      <!-- 相关技巧 -->
      <el-card class="related-skills-card" v-if="skill.relatedSkillsInfo?.length">
        <template #header>
          <span>🔗 相关技巧</span>
        </template>
        <div class="related-skills">
          <el-tag 
            v-for="related in skill.relatedSkillsInfo" 
            :key="related.id"
            class="related-tag"
            @click="router.push(`/skills/${related.id}`)"
          >
            {{ related.name }}
          </el-tag>
        </div>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.skill-detail-page {
  max-width: 900px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.back-bar {
  margin-bottom: 16px;
}

/* 头部 */
.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  margin-bottom: 24px;
}

.skill-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.category {
  font-size: 14px;
  opacity: 0.9;
}

.skill-name {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
}

.skill-summary {
  margin: 0 0 16px;
  font-size: 16px;
  opacity: 0.9;
  line-height: 1.6;
}

.skill-stats {
  display: flex;
  gap: 20px;
  font-size: 14px;
  opacity: 0.85;
}

.header-actions {
  flex-shrink: 0;
}

/* 核心要点 */
.key-points-card {
  margin-bottom: 20px;
  border-left: 4px solid #409eff;
}

.key-points-list {
  margin: 0;
  padding-left: 20px;
}

.key-points-list li {
  margin-bottom: 8px;
  font-size: 15px;
  line-height: 1.6;
}

/* 内容卡片 */
.content-card {
  margin-bottom: 20px;
}

.markdown-content {
  font-size: 15px;
  line-height: 1.8;
  color: #303133;
}

.markdown-content :deep(h2) {
  font-size: 18px;
  margin: 24px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.markdown-content :deep(h3) {
  font-size: 16px;
  margin: 20px 0 10px;
}

.markdown-content :deep(p) {
  margin-bottom: 12px;
}

.markdown-content :deep(ul), .markdown-content :deep(ol) {
  padding-left: 24px;
  margin-bottom: 12px;
}

.markdown-content :deep(li) {
  margin-bottom: 6px;
}

.markdown-content :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  background: #f5f7fa;
  border-left: 4px solid #409eff;
  color: #606266;
}

/* 建议卡片 */
.advice-card {
  margin-bottom: 20px;
  border-left: 4px solid #67c23a;
}

.advice-card p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
}

/* 示例卡片 */
.examples-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.example-card {
  margin-bottom: 0;
}

.example-content {
  margin-bottom: 16px;
}

.example-text {
  margin: 0;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.example-analysis {
  padding-top: 16px;
  border-top: 1px dashed #e0e0e0;
}

.example-analysis h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #409eff;
}

.example-analysis p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}

/* 错误卡片 */
.mistakes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mistake-card {
  border-left: 4px solid #f56c6c;
}

.mistake-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.mistake-icon {
  font-size: 18px;
}

.mistake-title {
  font-size: 16px;
  font-weight: 500;
  color: #f56c6c;
}

.mistake-reason, .mistake-correction {
  margin-top: 12px;
}

.mistake-reason h4, .mistake-correction h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #606266;
}

.mistake-reason p, .mistake-correction p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.mistake-correction {
  padding: 12px;
  background: #f0f9eb;
  border-radius: 6px;
}

.mistake-correction h4 {
  color: #67c23a;
}

/* 练习记录 */
.practices-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.practice-record-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s;
}

.practice-record-card :deep(.el-card__body) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.practice-record-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.practice-info {
  flex: 1;
  cursor: pointer;
}

.practice-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
}

.practice-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #909399;
}

.practice-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
  flex-shrink: 0;
}

/* 相关技巧 */
.related-skills-card {
  margin-top: 20px;
}

.related-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.related-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.related-tag:hover {
  background-color: #409eff;
  color: white;
}

/* 内容标签页 */
.content-tabs :deep(.el-tabs__content) {
  padding: 0;
}

/* 题库相关 */
.question-bank-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 12px;
}

.question-bank-tip {
  margin: 0;
  font-size: 14px;
  color: #606266;
  flex: 1;
}

.question-bank-header-actions {
  display: flex;
  gap: 8px;
}

.question-bank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-bank-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.question-bank-card :deep(.el-card__body) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.question-bank-info {
  flex: 1;
  min-width: 0;
}

.question-bank-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.question-bank-preview {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 500px;
}

.question-bank-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.question-bank-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: 16px;
  flex-shrink: 0;
}

.question-bank-pagination {
  margin-top: 16px;
  justify-content: center;
}
</style>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Trophy, TrendCharts } from '@element-plus/icons-vue'
import { getPractice } from '../../api/skills'

const router = useRouter()
const route = useRoute()

// 状态
const loading = ref(true)
const practice = ref(null)

// 评级颜色映射
const gradeColors = {
  S: '#ff6b6b',
  A: '#ffa502',
  B: '#2ed573',
  C: '#1e90ff',
  D: '#a4b0be'
}

// 掌握程度配置
const masteryConfig = {
  '未掌握': { color: '#f56c6c', progress: 10 },
  '初步掌握': { color: '#e6a23c', progress: 30 },
  '基本掌握': { color: '#409eff', progress: 55 },
  '熟练掌握': { color: '#67c23a', progress: 80 },
  '精通': { color: '#9c27b0', progress: 100 }
}

// 获取评级颜色
const getGradeColor = (grade) => gradeColors[grade] || '#909399'

// 获取掌握程度配置
const getMasteryConfig = (level) => masteryConfig[level] || { color: '#909399', progress: 0 }

// 加载练习详情
const loadPractice = async () => {
  loading.value = true
  try {
    const res = await getPractice(route.params.practiceId)
    practice.value = res.data
  } catch (error) {
    ElMessage.error('加载练习详情失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 返回技巧详情
const goBack = () => {
  if (practice.value?.skill_id) {
    router.push(`/skills/${practice.value.skill_id}`)
  } else {
    router.push('/skills')
  }
}

// 重新练习
const retryPractice = () => {
  if (practice.value?.skill_id) {
    router.push(`/skills/${practice.value.skill_id}/practice`)
  }
}

// 格式化时间
const formatTime = (seconds) => {
  if (!seconds) return '0分钟'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

onMounted(() => {
  loadPractice()
})
</script>

<template>
  <div class="evaluation-page" v-loading="loading">
    <!-- 返回按钮 -->
    <div class="back-bar">
      <el-button :icon="ArrowLeft" text @click="goBack">返回技巧详情</el-button>
    </div>
    
    <template v-if="practice && practice.evaluation">
      <!-- 评审结果头部 -->
      <div class="result-header">
        <div class="score-display">
          <div class="score-circle" :style="{ borderColor: getGradeColor(practice.evaluation.grade) }">
            <span class="score-value">{{ practice.evaluation.total_score }}</span>
            <span class="score-label">总分</span>
          </div>
          <div class="grade-badge" :style="{ backgroundColor: getGradeColor(practice.evaluation.grade) }">
            {{ practice.evaluation.grade }}
          </div>
        </div>
        
        <div class="result-info">
          <h2>{{ practice.question_title }}</h2>
          <div class="result-meta">
            <el-tag type="info">{{ practice.skill_name }}</el-tag>
            <span>{{ practice.word_count }} 字</span>
            <span>用时 {{ formatTime(practice.time_spent) }}</span>
          </div>
          
          <!-- 掌握程度 -->
          <div class="mastery-display" v-if="practice.evaluation.mastery_level">
            <span class="mastery-label">技巧掌握程度：</span>
            <span 
              class="mastery-value" 
              :style="{ color: getMasteryConfig(practice.evaluation.mastery_level).color }"
            >
              {{ practice.evaluation.mastery_level }}
            </span>
            <el-progress 
              :percentage="getMasteryConfig(practice.evaluation.mastery_level).progress"
              :color="getMasteryConfig(practice.evaluation.mastery_level).color"
              :show-text="false"
              style="width: 150px; margin-left: 12px"
            />
          </div>
        </div>
      </div>
      
      <!-- 维度得分 -->
      <el-card class="dimensions-card">
        <template #header>
          <span>📊 各维度评分</span>
        </template>
        
        <div class="dimensions-grid">
          <div 
            v-for="(dim, key) in practice.evaluation.dimension_scores" 
            :key="key"
            class="dimension-item"
          >
            <div class="dim-header">
              <span class="dim-name">{{ getDimensionName(key) }}</span>
              <span class="dim-score">{{ dim.score }}/{{ getDimensionMax(key) }}</span>
            </div>
            <el-progress 
              :percentage="(dim.score / getDimensionMax(key)) * 100"
              :color="getScoreColor(dim.score / getDimensionMax(key))"
              :show-text="false"
            />
            <p class="dim-comment">{{ dim.comment }}</p>
          </div>
        </div>
      </el-card>
      
      <!-- 技巧分析 -->
      <el-card class="analysis-card" v-if="practice.evaluation.skill_analysis">
        <template #header>
          <span>🎯 技巧运用分析</span>
        </template>
        
        <div class="analysis-content">
          <div class="analysis-item" v-if="practice.evaluation.skill_analysis.understood">
            <h4>📖 理解程度</h4>
            <p>{{ practice.evaluation.skill_analysis.understood }}</p>
          </div>
          
          <div class="analysis-item" v-if="practice.evaluation.skill_analysis.applied">
            <h4>✅ 运用表现</h4>
            <p>{{ practice.evaluation.skill_analysis.applied }}</p>
          </div>
          
          <div class="analysis-item" v-if="practice.evaluation.skill_analysis.needsImprovement">
            <h4>📝 待改进</h4>
            <p>{{ practice.evaluation.skill_analysis.needsImprovement }}</p>
          </div>
        </div>
      </el-card>
      
      <!-- 亮点与改进 -->
      <div class="feedback-grid">
        <el-card class="highlights-card" v-if="practice.evaluation.highlights?.length">
          <template #header>
            <span>✨ 亮点</span>
          </template>
          <ul class="highlights-list">
            <li v-for="(highlight, i) in practice.evaluation.highlights" :key="i">
              {{ highlight }}
            </li>
          </ul>
        </el-card>
        
        <el-card class="improvements-card" v-if="practice.evaluation.improvements?.length">
          <template #header>
            <span>📈 改进建议</span>
          </template>
          <div class="improvements-list">
            <div v-for="(item, i) in practice.evaluation.improvements" :key="i" class="improvement-item">
              <div class="issue">
                <span class="issue-icon">⚠️</span>
                <span>{{ item.issue }}</span>
              </div>
              <div class="suggestion">
                <span class="suggestion-icon">💡</span>
                <span>{{ item.suggestion }}</span>
              </div>
              <div class="example" v-if="item.example">
                <span class="example-label">示例：</span>
                <span>{{ item.example }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </div>
      
      <!-- 总评 -->
      <el-card class="overall-card">
        <template #header>
          <span>💬 总体评价</span>
        </template>
        <p class="overall-comment">{{ practice.evaluation.overall_comment }}</p>
        
        <div class="next-step" v-if="practice.evaluation.next_step_advice">
          <h4>🚀 下一步建议</h4>
          <p>{{ practice.evaluation.next_step_advice }}</p>
        </div>
      </el-card>
      
      <!-- 用户作品 -->
      <el-card class="work-card">
        <template #header>
          <span>📝 我的作品</span>
        </template>
        <div class="user-work">
          {{ practice.user_answer }}
        </div>
      </el-card>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="goBack">返回技巧详情</el-button>
        <el-button type="primary" @click="retryPractice">再练一次</el-button>
      </div>
    </template>
    
    <!-- 未评审状态 -->
    <template v-else-if="practice && !practice.evaluation">
      <el-card class="pending-card">
        <el-empty description="该练习尚未完成评审">
          <el-button type="primary" @click="goBack">返回</el-button>
        </el-empty>
      </el-card>
    </template>
  </div>
</template>

<script>
// 辅助函数
export default {
  methods: {
    getDimensionName(key) {
      const names = {
        skillApplication: '技巧运用',
        completion: '完成度',
        writing: '文笔表现',
        overall: '整体效果'
      }
      return names[key] || key
    },
    
    getDimensionMax(key) {
      const maxScores = {
        skillApplication: 40,
        completion: 20,
        writing: 20,
        overall: 20
      }
      return maxScores[key] || 20
    },
    
    getScoreColor(ratio) {
      if (ratio >= 0.9) return '#67c23a'
      if (ratio >= 0.7) return '#409eff'
      if (ratio >= 0.5) return '#e6a23c'
      return '#f56c6c'
    }
  }
}
</script>

<style scoped>
.evaluation-page {
  max-width: 900px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.back-bar {
  margin-bottom: 16px;
}

/* 结果头部 */
.result-header {
  display: flex;
  gap: 32px;
  padding: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 24px;
}

.score-display {
  position: relative;
  flex-shrink: 0;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 6px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
}

.score-value {
  font-size: 42px;
  font-weight: bold;
  line-height: 1;
}

.score-label {
  font-size: 14px;
  opacity: 0.9;
}

.grade-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.result-info {
  flex: 1;
}

.result-info h2 {
  margin: 0 0 12px;
  font-size: 22px;
}

.result-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  opacity: 0.9;
}

.mastery-display {
  display: flex;
  align-items: center;
  margin-top: 12px;
}

.mastery-label {
  font-size: 14px;
  opacity: 0.9;
}

.mastery-value {
  font-size: 16px;
  font-weight: 600;
  margin-left: 8px;
}

/* 维度卡片 */
.dimensions-card {
  margin-bottom: 20px;
}

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.dimension-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.dim-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dim-name {
  font-weight: 500;
}

.dim-score {
  font-size: 14px;
  color: #909399;
}

.dim-comment {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
}

/* 技巧分析 */
.analysis-card {
  margin-bottom: 20px;
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.analysis-item h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #303133;
}

.analysis-item p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}

/* 亮点与改进 */
.feedback-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.highlights-card {
  border-left: 4px solid #67c23a;
}

.highlights-list {
  margin: 0;
  padding-left: 20px;
}

.highlights-list li {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.6;
}

.improvements-card {
  border-left: 4px solid #e6a23c;
}

.improvements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.improvement-item {
  padding-bottom: 16px;
  border-bottom: 1px dashed #e0e0e0;
}

.improvement-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.issue, .suggestion {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.issue-icon, .suggestion-icon {
  flex-shrink: 0;
}

.example {
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}

.example-label {
  color: #909399;
  margin-right: 4px;
}

/* 总评 */
.overall-card {
  margin-bottom: 20px;
}

.overall-comment {
  margin: 0 0 20px;
  font-size: 15px;
  line-height: 1.8;
  color: #303133;
}

.next-step {
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.next-step h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #409eff;
}

.next-step p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

/* 用户作品 */
.work-card {
  margin-bottom: 24px;
}

.user-work {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  color: #606266;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
  .result-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .dimensions-grid {
    grid-template-columns: 1fr;
  }
  
  .feedback-grid {
    grid-template-columns: 1fr;
  }
}
</style>

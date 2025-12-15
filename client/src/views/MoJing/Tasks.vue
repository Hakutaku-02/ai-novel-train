<template>
  <div class="tasks-container">
    <!-- 顶部导航 -->
    <div class="nav-header">
      <el-button :icon="ArrowLeft" text @click="goBack">返回</el-button>
      <span class="nav-title">墨境任务</span>
      <el-button text @click="refreshTasks" :loading="refreshing">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="tasks-content" v-loading="loading">
      <!-- 今日进度 -->
      <div class="today-stats">
        <div class="stat-item">
          <span class="stat-value">{{ completedCount }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-divider">/</div>
        <div class="stat-item">
          <span class="stat-value">{{ totalCount }}</span>
          <span class="stat-label">今日任务</span>
        </div>
        <div class="stat-divider">|</div>
        <div class="stat-item">
          <span class="stat-value xp">+{{ todayXP }}</span>
          <span class="stat-label">今日XP</span>
        </div>
      </div>

      <!-- 视图切换 -->
      <div class="view-tabs">
        <div 
          :class="['view-tab', { active: currentView === 'today' }]"
          @click="currentView = 'today'"
        >
          📋 今日任务
        </div>
        <div 
          :class="['view-tab', { active: currentView === 'completed' }]"
          @click="currentView = 'completed'; loadCompletedTasks()"
        >
          ✅ 已完成
        </div>
      </div>

      <!-- 今日任务视图 -->
      <div v-if="currentView === 'today'">
        <!-- 任务类型标签 -->
        <div class="task-tabs">
          <div 
            v-for="tab in taskTabs" 
            :key="tab.value"
            :class="['tab-item', { active: currentTab === tab.value }]"
            @click="currentTab = tab.value"
          >
            {{ tab.icon }} {{ tab.label }}
            <span class="tab-count">{{ getTabCount(tab.value) }}</span>
          </div>
        </div>

        <!-- 任务列表 -->
        <div class="tasks-list">
          <div 
            v-for="task in filteredTasks" 
            :key="task.id"
            :class="['task-card', { completed: task.isCompleted }]"
            @click="goToTask(task)"
          >
            <div class="task-type-badge" :class="task.task_type">
              {{ getTaskTypeIcon(task.task_type) }}
            </div>
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-desc">{{ task.description }}</div>
              <div class="task-meta">
                <span class="attr-tag" :style="{ backgroundColor: getAttrColor(task.attr_type) }">
                  {{ getAttrName(task.attr_type) }}
                </span>
                <span class="xp-tag">+{{ task.xp_reward }} XP</span>
                <span class="difficulty-tag" :class="task.difficulty">
                  {{ getDifficultyName(task.difficulty) }}
                </span>
                <span class="time-tag" v-if="task.time_limit">
                  ⏱️ {{ task.time_limit }}分钟
                </span>
              </div>
            </div>
            <div class="task-status">
              <el-icon v-if="task.isCompleted" class="completed-icon"><Check /></el-icon>
              <el-icon v-else class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="filteredTasks.length === 0 && !loading" class="empty-tasks">
            <span class="empty-icon">📝</span>
            <p>暂无{{ currentTab === 'all' ? '' : taskTabMap[currentTab] }}任务</p>
            <el-button @click="refreshTasks" :loading="refreshing">刷新任务</el-button>
          </div>
        </div>
      </div>

      <!-- 已完成任务视图 -->
      <div v-if="currentView === 'completed'" class="completed-view">
        <!-- 筛选器 -->
        <div class="filter-bar">
          <el-select v-model="completedFilter.taskType" placeholder="任务类型" size="small" @change="loadCompletedTasks">
            <el-option label="全部" value="all" />
            <el-option label="墨点" value="inkdot" />
            <el-option label="墨线" value="inkline" />
          </el-select>
          <el-select v-model="completedFilter.attrType" placeholder="属性类型" size="small" @change="loadCompletedTasks">
            <el-option label="全部属性" value="all" />
            <el-option v-for="(attr, key) in ATTR_MAP" :key="key" :label="attr.name" :value="key" />
          </el-select>
        </div>

        <!-- 已完成任务列表 -->
        <div class="tasks-list" v-loading="loadingCompleted">
          <div 
            v-for="task in completedTasks" 
            :key="task.id"
            class="task-card completed-task-card"
            @click="viewTaskHistory(task)"
          >
            <div class="task-type-badge" :class="task.task_type">
              {{ getTaskTypeIcon(task.task_type) }}
            </div>
            <div class="task-content">
              <div class="task-title">{{ task.title }}</div>
              <div class="task-desc">{{ task.description }}</div>
              <div class="task-meta">
                <span class="attr-tag" :style="{ backgroundColor: getAttrColor(task.attr_type) }">
                  {{ getAttrName(task.attr_type) }}
                </span>
                <span class="practice-count">🔄 {{ task.practice_count }}次练习</span>
                <span class="best-score">⭐ 最高分: {{ task.best_score || 'N/A' }}</span>
              </div>
              <div class="last-practice">
                最后练习: {{ formatDate(task.last_practice_at) }}
              </div>
            </div>
            <div class="task-actions">
              <el-button 
                type="primary" 
                size="small" 
                @click.stop="practiceAgain(task)"
              >
                再次练习
              </el-button>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="completedTasks.length === 0 && !loadingCompleted" class="empty-tasks">
            <span class="empty-icon">📚</span>
            <p>还没有完成任何任务</p>
            <el-button @click="currentView = 'today'">去做任务</el-button>
          </div>

          <!-- 加载更多 -->
          <div v-if="hasMoreCompleted" class="load-more">
            <el-button @click="loadMoreCompleted" :loading="loadingCompleted">
              加载更多
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务历史对话框 -->
    <el-dialog 
      v-model="historyDialogVisible" 
      title="练习历史"
      width="90%"
      :close-on-click-modal="false"
    >
      <div v-if="taskHistory" class="history-content">
        <div class="history-header">
          <h3>{{ taskHistory.task.title }}</h3>
          <div class="history-stats">
            <span>总练习: {{ taskHistory.totalPractices }}次</span>
            <span>完成: {{ taskHistory.completedPractices }}次</span>
            <span>最高分: {{ taskHistory.bestScore }}</span>
          </div>
        </div>

        <div class="history-list">
          <div v-for="(record, index) in taskHistory.records" :key="record.id" class="history-item">
            <div class="history-item-header">
              <span class="practice-number">#{{ index + 1 }}</span>
              <span class="practice-date">{{ formatDateTime(record.submitted_at) }}</span>
              <span class="practice-score" v-if="record.score">
                <el-tag :type="getScoreType(record.score)">{{ record.score }}分</el-tag>
              </span>
            </div>
            <div class="history-item-content">
              <div class="content-preview">{{ record.content?.substring(0, 200) }}...</div>
              <div class="content-stats">
                <span>字数: {{ record.word_count }}</span>
                <span>耗时: {{ formatTime(record.time_spent) }}</span>
                <span v-if="record.xp_earned">+{{ record.xp_earned }} XP</span>
              </div>
            </div>
            <div v-if="record.ai_feedback" class="history-feedback">
              <el-collapse>
                <el-collapse-item title="查看评审" :name="record.id">
                  <div v-html="formatFeedback(record.ai_feedback)"></div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, ArrowRight, ArrowLeft, Refresh } from '@element-plus/icons-vue';
import { 
  getTodayTasks, 
  triggerTaskGeneration,
  getCompletedTasks,
  getTaskPracticeHistory,
  practiceTask,
  ATTR_MAP, 
  TASK_TYPE_MAP, 
  DIFFICULTY_MAP 
} from '@/api/mojing';

const router = useRouter();
const loading = ref(false);
const refreshing = ref(false);
const allTasks = ref([]);
const currentTab = ref('all');
const currentView = ref('today');
const todayXP = ref(0);

// 已完成任务相关
const loadingCompleted = ref(false);
const completedTasks = ref([]);
const completedFilter = ref({
  taskType: 'all',
  attrType: 'all',
  limit: 20,
  offset: 0
});
const hasMoreCompleted = ref(false);
const totalCompleted = ref(0);

// 任务历史对话框
const historyDialogVisible = ref(false);
const taskHistory = ref(null);

const taskTabs = [
  { label: '全部', value: 'all', icon: '📋' },
  { label: '墨点', value: 'inkdot', icon: '🔵' },
  { label: '墨线', value: 'inkline', icon: '📝' }
];

const taskTabMap = {
  all: '',
  inkdot: '墨点',
  inkline: '墨线'
};

const filteredTasks = computed(() => {
  if (currentTab.value === 'all') return allTasks.value;
  return allTasks.value.filter(t => t.task_type === currentTab.value);
});

const totalCount = computed(() => allTasks.value.length);
const completedCount = computed(() => allTasks.value.filter(t => t.isCompleted).length);

function getTabCount(tabValue) {
  if (tabValue === 'all') return allTasks.value.length;
  return allTasks.value.filter(t => t.task_type === tabValue).length;
}

function getAttrName(attrType) {
  return ATTR_MAP[attrType]?.name || attrType;
}

function getAttrColor(attrType) {
  return ATTR_MAP[attrType]?.color || '#666';
}

function getTaskTypeIcon(taskType) {
  return TASK_TYPE_MAP[taskType]?.icon || '📝';
}

function getDifficultyName(difficulty) {
  return DIFFICULTY_MAP[difficulty]?.name || difficulty;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
}

function formatTime(seconds) {
  if (!seconds) return '0秒';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}秒`;
  return `${mins}分${secs}秒`;
}

function getScoreType(score) {
  if (score >= 90) return 'success';
  if (score >= 75) return '';
  if (score >= 60) return 'warning';
  return 'danger';
}

function formatFeedback(feedback) {
  try {
    const fb = typeof feedback === 'string' ? JSON.parse(feedback) : feedback;
    let html = '';
    
    if (fb.dimensions) {
      html += '<div class="feedback-dimensions"><h4>维度评分</h4>';
      for (const [key, value] of Object.entries(fb.dimensions)) {
        html += `<p><strong>${key}:</strong> ${value.score}/20 - ${value.comment}</p>`;
      }
      html += '</div>';
    }
    
    if (fb.highlights?.length) {
      html += '<div class="feedback-highlights"><h4>亮点</h4><ul>';
      fb.highlights.forEach(h => html += `<li>${h}</li>`);
      html += '</ul></div>';
    }
    
    if (fb.improvements?.length) {
      html += '<div class="feedback-improvements"><h4>改进建议</h4><ul>';
      fb.improvements.forEach(i => html += `<li>${i}</li>`);
      html += '</ul></div>';
    }
    
    if (fb.overall) {
      html += `<div class="feedback-overall"><h4>总评</h4><p>${fb.overall}</p></div>`;
    }
    
    return html || feedback;
  } catch (e) {
    return feedback;
  }
}

async function loadTasks() {
  loading.value = true;
  try {
    const res = await getTodayTasks('all');
    if (res.success) {
      allTasks.value = res.data.tasks || [];
      // 计算今日XP（已完成任务的XP总和）
      todayXP.value = allTasks.value
        .filter(t => t.isCompleted)
        .reduce((sum, t) => sum + (t.xp_reward || 0), 0);
    }
  } catch (error) {
    console.error('加载任务失败:', error);
    ElMessage.error('加载任务失败');
  } finally {
    loading.value = false;
  }
}

async function loadCompletedTasks() {
  loadingCompleted.value = true;
  try {
    const res = await getCompletedTasks({
      ...completedFilter.value
    });
    if (res.success) {
      completedTasks.value = res.data.tasks || [];
      totalCompleted.value = res.data.total || 0;
      hasMoreCompleted.value = (completedFilter.value.offset + completedFilter.value.limit) < totalCompleted.value;
    }
  } catch (error) {
    console.error('加载已完成任务失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loadingCompleted.value = false;
  }
}

async function loadMoreCompleted() {
  completedFilter.value.offset += completedFilter.value.limit;
  loadingCompleted.value = true;
  try {
    const res = await getCompletedTasks({
      ...completedFilter.value
    });
    if (res.success) {
      completedTasks.value.push(...(res.data.tasks || []));
      hasMoreCompleted.value = (completedFilter.value.offset + completedFilter.value.limit) < res.data.total;
    }
  } catch (error) {
    console.error('加载更多失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loadingCompleted.value = false;
  }
}

async function viewTaskHistory(task) {
  try {
    const res = await getTaskPracticeHistory(task.id);
    if (res.success) {
      taskHistory.value = res.data;
      historyDialogVisible.value = true;
    }
  } catch (error) {
    console.error('加载历史记录失败:', error);
    ElMessage.error('加载历史记录失败');
  }
}

async function practiceAgain(task) {
  try {
    await ElMessageBox.confirm(
      `确定要再次练习"${task.title}"吗？`,
      '再次练习',
      {
        confirmButtonText: '开始练习',
        cancelButtonText: '取消',
        type: 'info'
      }
    );
    
    const res = await practiceTask(task.id);
    if (res.success) {
      ElMessage.success('开始练习');
      router.push(`/mojing/task/${task.id}`);
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('开始练习失败:', error);
      ElMessage.error(error.response?.data?.error || '开始练习失败');
    }
  }
}

async function refreshTasks() {
  refreshing.value = true;
  try {
    await triggerTaskGeneration({ preset: true });
    await loadTasks();
    ElMessage.success('任务已刷新');
  } catch (error) {
    console.error('刷新任务失败:', error);
    ElMessage.error('刷新失败');
  } finally {
    refreshing.value = false;
  }
}

function goToTask(task) {
  router.push(`/mojing/task/${task.id}`);
}

function goBack() {
  router.push('/mojing');
}

onMounted(() => {
  loadTasks();
});
</script>

<style scoped>
.tasks-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.nav-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-weight: bold;
  font-size: 16px;
}

.tasks-content {
  padding: 16px;
}

/* 今日统计 */
.today-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  color: white;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-value.xp {
  color: #ffd700;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}

.stat-divider {
  font-size: 18px;
  opacity: 0.5;
}

/* 视图切换 */
.view-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.view-tab {
  flex: 1;
  padding: 12px;
  background: white;
  border-radius: 12px;
  text-align: center;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.view-tab.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

/* 任务标签 */
.task-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.task-tabs::-webkit-scrollbar {
  display: none;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 10px 16px;
  background: white;
  border-radius: 20px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-item.active {
  background: #667eea;
  color: white;
}

.tab-count {
  font-size: 11px;
  opacity: 0.7;
}

/* 筛选器 */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-bar .el-select {
  flex: 1;
}

/* 任务列表 */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: white;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:active {
  transform: scale(0.98);
}

.task-card.completed {
  opacity: 0.6;
}

.completed-task-card {
  opacity: 1;
}

.task-type-badge {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.task-type-badge.inkdot {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.task-type-badge.inkline {
  background: linear-gradient(135deg, #11998e, #38ef7d);
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-title {
  font-size: 15px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.task-desc {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.attr-tag {
  font-size: 10px;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
}

.xp-tag {
  font-size: 10px;
  color: #f39c12;
  background: #fff9e6;
  padding: 2px 8px;
  border-radius: 10px;
}

.practice-count,
.best-score {
  font-size: 10px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
}

.last-practice {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.difficulty-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
}

.difficulty-tag.easy {
  color: #27ae60;
  background: #e8f5e9;
}

.difficulty-tag.normal {
  color: #3498db;
  background: #e3f2fd;
}

.difficulty-tag.hard {
  color: #e74c3c;
  background: #ffebee;
}

.time-tag {
  font-size: 10px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.task-status {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.completed-icon {
  font-size: 20px;
  color: #27ae60;
}

.arrow-icon {
  font-size: 16px;
  color: #ccc;
}

.task-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* 空状态 */
.empty-tasks {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-tasks p {
  margin: 0 0 16px 0;
  font-size: 14px;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 16px;
}

/* 历史记录对话框 */
.history-content {
  max-height: 70vh;
  overflow-y: auto;
}

.history-header {
  margin-bottom: 20px;
}

.history-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.history-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
}

.history-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.practice-number {
  font-weight: bold;
  color: #667eea;
}

.practice-date {
  font-size: 12px;
  color: #999;
}

.content-preview {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.6;
}

.content-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.history-feedback {
  margin-top: 8px;
}
</style>

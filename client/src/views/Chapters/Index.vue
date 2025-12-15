<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, View, Refresh, Upload, Document, Search } from '@element-plus/icons-vue'
import { 
  getChapters, 
  createChapter, 
  deleteChapter, 
  analyzeChapter,
  getSegmentTypes,
  getWritingStyles,
  getNovelNames,
  uploadNovel,
  generateChapterRegex,
  splitChaptersPreview,
  batchInsertChapters
} from '../../api/chapters'

const loading = ref(false)
const chapters = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const dialogTitle = ref('添加章节')
const formData = ref({
  title: '',
  novel_name: '',
  author: '',
  content: ''
})

// 上传小说相关
const uploadDialogVisible = ref(false)
const uploadStep = ref(1) // 1: 上传文件, 2: 生成正则, 3: 预览章节
const uploadLoading = ref(false)
const novelUploadData = ref({
  novel_name: '',
  author: '',
  content: '',
  sample_text: '',
  total_length: 0
})
const regexData = ref({
  regex: '',
  description: '',
  examples: []
})
const showRegexFallback = ref(false)
const splitChapters = ref([])
const splitSummary = ref({
  total: 0,
  total_words: 0
})

const segmentTypes = ref({})
const writingStyles = ref({})
const novelNames = ref([])

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待分析' },
  { value: 'analyzing', label: '分析中' },
  { value: 'completed', label: '已分析' },
  { value: 'failed', label: '分析失败' }
]

const filterStatus = ref('')
const filterNovelName = ref('')

const statusMap = {
  pending: { text: '待分析', type: 'info' },
  analyzing: { text: '分析中', type: 'warning' },
  completed: { text: '已分析', type: 'success' },
  failed: { text: '分析失败', type: 'danger' }
}

async function loadChapters() {
  loading.value = true
  try {
    const res = await getChapters({
      page: currentPage.value,
      pageSize: pageSize.value,
      status: filterStatus.value || undefined,
      novel_name: filterNovelName.value || undefined
    })
    chapters.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载章节失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadMeta() {
  try {
    const [typesRes, stylesRes, novelsRes] = await Promise.all([
      getSegmentTypes(),
      getWritingStyles(),
      getNovelNames()
    ])
    segmentTypes.value = typesRes.data
    writingStyles.value = stylesRes.data
    novelNames.value = novelsRes.data
  } catch (error) {
    console.error('加载元数据失败:', error)
  }
}

function openAddDialog() {
  dialogTitle.value = '添加章节'
  formData.value = {
    title: '',
    novel_name: '',
    author: '',
    content: ''
  }
  dialogVisible.value = true
}

function openUploadDialog() {
  uploadStep.value = 1
  novelUploadData.value = {
    novel_name: '',
    author: '',
    content: '',
    sample_text: '',
    total_length: 0
  }
  regexData.value = {
    regex: '',
    description: '',
    examples: []
  }
  splitChapters.value = []
  splitSummary.value = { total: 0, total_words: 0 }
  uploadDialogVisible.value = true
}

async function handleFileUpload(uploadFile) {
  if (!novelUploadData.value.novel_name) {
    ElMessage.warning('请先填写小说名')
    return false
  }
  
  uploadLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', uploadFile.raw)
    formData.append('novel_name', novelUploadData.value.novel_name)
    formData.append('author', novelUploadData.value.author || '')
    
    const res = await uploadNovel(formData)
    novelUploadData.value.content = res.data.content
    novelUploadData.value.sample_text = res.data.sample_text
    novelUploadData.value.total_length = res.data.total_length
    
    ElMessage.success(`文件上传成功，共 ${res.data.total_length} 字`)
    uploadStep.value = 2
  } catch (error) {
    ElMessage.error('文件上传失败: ' + (error.message || '未知错误'))
  } finally {
    uploadLoading.value = false
  }
}

async function handleGenerateRegex() {
  if (!novelUploadData.value.sample_text) {
    ElMessage.warning('请先上传小说文件')
    return
  }
  
  uploadLoading.value = true
  try {
    const res = await generateChapterRegex(novelUploadData.value.sample_text)
    regexData.value = res.data
    // 如果后端提供了备用正则，提示用户可切换
    if (res.data.fallback_regex) {
      showRegexFallback.value = true
    } else {
      showRegexFallback.value = false
    }
    ElMessage.success('章节标题正则表达式生成成功')
  } catch (error) {
    ElMessage.error('生成正则表达式失败: ' + (error.message || '未知错误'))
  } finally {
    uploadLoading.value = false
  }
}

function applyFallbackRegex() {
  if (regexData.value?.fallback_regex) {
    regexData.value.regex = regexData.value.fallback_regex
    ElMessage.success('已使用更宽松的备用正则（\n 匹配更多位数的章节编号）')
    showRegexFallback.value = false
  }
}

async function handleSplitPreview() {
  if (!regexData.value.regex) {
    ElMessage.warning('请先生成或输入正则表达式')
    return
  }
  
  uploadLoading.value = true
  try {
    const res = await splitChaptersPreview({
      content: novelUploadData.value.content,
      regex_pattern: regexData.value.regex,
      novel_name: novelUploadData.value.novel_name,
      author: novelUploadData.value.author
    })
    // 如果后端提示有备用更宽松的正则并且命中更多章节，提示用户切换
    if (res.data.suggestion) {
      const s = res.data.suggestion
      const apply = await ElMessageBox.confirm(
        `检测到原始正则可能限制章节编号位数（当前匹配 ${res.data.total} 个章节，备用正则可匹配 ${s.suggested_count} 个章节），是否使用备用正则？\n备用正则：${s.suggested_regex}`,
        '检测到更宽松的正则',
        { confirmButtonText: '使用备用正则', cancelButtonText: '保持原样', type: 'warning' }
      ).then(() => true).catch(() => false)

      if (apply) {
        // 直接使用并重新请求预览
        regexData.value.regex = res.data.suggestion.suggested_regex
        return await handleSplitPreview()
      }
    }

    splitChapters.value = res.data.chapters
    splitSummary.value = {
      total: res.data.total,
      total_words: res.data.total_words
    }
    uploadStep.value = 3
    ElMessage.success(`成功拆分出 ${res.data.total} 个章节`)
  } catch (error) {
    ElMessage.error('章节拆分失败: ' + (error.message || '未知错误'))
  } finally {
    uploadLoading.value = false
  }
}

function handleSelectAll(selected) {
  splitChapters.value.forEach(ch => {
    ch.selected = selected
  })
}

const selectedChaptersCount = computed(() => {
  return splitChapters.value.filter(ch => ch.selected).length
})

async function handleBatchInsert() {
  const selectedChapters = splitChapters.value.filter(ch => ch.selected)
  
  if (selectedChapters.length === 0) {
    ElMessage.warning('请至少选择一个章节')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要插入选中的 ${selectedChapters.length} 个章节吗？`,
      '确认插入',
      { type: 'info' }
    )
    
    uploadLoading.value = true
    const res = await batchInsertChapters(selectedChapters)
    ElMessage.success(res.message)
    uploadDialogVisible.value = false
    loadChapters()
    loadMeta() // 刷新小说名列表
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量插入失败: ' + (error.message || '未知错误'))
    }
  } finally {
    uploadLoading.value = false
  }
}

async function handleSubmit() {
  if (!formData.value.title || !formData.value.content) {
    ElMessage.warning('请填写标题和内容')
    return
  }

  try {
    await createChapter(formData.value)
    ElMessage.success('章节添加成功')
    dialogVisible.value = false
    loadChapters()
    loadMeta()
  } catch (error) {
    console.error('添加章节失败:', error)
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定要删除这个章节吗？相关的片段也会被删除。', '提示', {
      type: 'warning'
    })
    await deleteChapter(row.id)
    ElMessage.success('删除成功')
    loadChapters()
    loadMeta()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

async function handleAnalyze(row) {
  try {
    await ElMessageBox.confirm('确定要使用AI分析这个章节吗？这将会拆分章节内容并识别文风。', '提示', {
      type: 'info'
    })
    ElMessage.info('开始分析章节，请稍候...')
    await analyzeChapter(row.id)
    ElMessage.success('章节分析完成')
    loadChapters()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('分析失败:', error)
    }
  }
}

function handlePageChange(page) {
  currentPage.value = page
  loadChapters()
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  loadChapters()
}

function handleFilterChange() {
  currentPage.value = 1
  loadChapters()
}

const wordCount = computed(() => {
  return formData.value.content.replace(/\s/g, '').length
})

onMounted(() => {
  loadChapters()
  loadMeta()
})
</script>

<template>
  <div class="chapters-page">
    <div class="page-header">
      <h1>章节管理</h1>
      <p>上传小说章节，使用AI进行内容分析和拆分</p>
    </div>

    <el-card class="filter-card">
      <div class="filter-row">
        <div class="filter-left">
          <el-select v-model="filterStatus" placeholder="状态筛选" @change="handleFilterChange" clearable>
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-select 
            v-model="filterNovelName" 
            placeholder="小说名筛选" 
            @change="handleFilterChange"
            clearable
            filterable
            style="margin-left: 10px; width: 200px;"
          >
            <el-option
              v-for="name in novelNames"
              :key="name"
              :label="name"
              :value="name"
            />
          </el-select>
        </div>
        <div class="filter-right">
          <el-button type="success" :icon="Upload" @click="openUploadDialog">
            上传小说
          </el-button>
          <el-button type="primary" :icon="Plus" @click="openAddDialog">
            添加章节
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card class="table-card" v-loading="loading">
      <el-table :data="chapters" stripe>
        <el-table-column prop="title" label="章节标题" min-width="200" />
        <el-table-column prop="novel_name" label="小说名称" width="150">
          <template #default="{ row }">
            {{ row.novel_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="100">
          <template #default="{ row }">
            {{ row.author || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="word_count" label="字数" width="100" />
        <el-table-column prop="analysis_status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.analysis_status]?.type || 'info'">
              {{ statusMap[row.analysis_status]?.text || row.analysis_status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :icon="Refresh"
              @click="handleAnalyze(row)"
              :disabled="row.analysis_status === 'analyzing'"
            >
              {{ row.analysis_status === 'completed' ? '重新分析' : 'AI分析' }}
            </el-button>
            <el-button
              type="primary"
              link
              :icon="View"
              @click="$router.push(`/chapters/${row.id}`)"
            >
              查看
            </el-button>
            <el-button
              type="danger"
              link
              :icon="Delete"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pagination"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </el-card>

    <!-- 添加章节对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="章节标题" required>
          <el-input v-model="formData.title" placeholder="请输入章节标题" />
        </el-form-item>
        <el-form-item label="小说名称">
          <el-input v-model="formData.novel_name" placeholder="可选，填写小说名称" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="formData.author" placeholder="可选，填写作者名" />
        </el-form-item>
        <el-form-item label="章节内容" required>
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="15"
            placeholder="请粘贴章节内容"
          />
          <div class="word-count">字数：{{ wordCount }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 上传小说对话框 -->
    <el-dialog 
      v-model="uploadDialogVisible" 
      title="上传整本小说" 
      width="900px"
      :close-on-click-modal="false"
    >
      <el-steps :active="uploadStep - 1" finish-status="success" style="margin-bottom: 30px;">
        <el-step title="上传文件" />
        <el-step title="生成正则" />
        <el-step title="预览章节" />
      </el-steps>

      <div v-loading="uploadLoading">
        <!-- 步骤1: 上传文件 -->
        <div v-if="uploadStep === 1">
          <el-form label-width="100px">
            <el-form-item label="小说名称" required>
              <el-input v-model="novelUploadData.novel_name" placeholder="请输入小说名称" />
            </el-form-item>
            <el-form-item label="作者">
              <el-input v-model="novelUploadData.author" placeholder="可选，填写作者名" />
            </el-form-item>
            <el-form-item label="小说文件" required>
              <el-upload
                class="upload-area"
                drag
                :auto-upload="false"
                :on-change="handleFileUpload"
                accept=".txt"
                :show-file-list="false"
              >
                <el-icon class="el-icon--upload"><Upload /></el-icon>
                <div class="el-upload__text">
                  将 TXT 文件拖到此处，或<em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip">
                    仅支持 .txt 格式文件，最大 50MB
                  </div>
                </template>
              </el-upload>
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤2: 生成正则 -->
        <div v-if="uploadStep === 2">
          <el-alert 
            title="文件上传成功" 
            :description="`共 ${novelUploadData.total_length} 字，已提取前 5000 字用于分析章节标题格式`"
            type="success" 
            style="margin-bottom: 20px;"
            :closable="false"
          />
          
          <el-form label-width="120px">
            <el-form-item label="示例文本预览">
              <el-input
                v-model="novelUploadData.sample_text"
                type="textarea"
                :rows="8"
                readonly
              />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="handleGenerateRegex" :loading="uploadLoading">
                <el-icon><Search /></el-icon>
                AI 生成章节正则
              </el-button>
            </el-form-item>
            
            <el-form-item label="正则表达式" v-if="regexData.regex">
              <el-input v-model="regexData.regex" placeholder="章节标题匹配正则表达式" />
            </el-form-item>
            <el-form-item v-if="showRegexFallback">
              <el-alert title="检测到原始正则对章节编号位数有限制，可能只匹配到最多 99 章。建议使用备用正则以匹配更多位数章节编号。" type="warning" show-icon>
                <template #description>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <div style="flex:1">备用正则：<code style="background:#f5f5f5;padding:2px 6px;border-radius:4px">{{ regexData.fallback_regex }}</code></div>
                    <el-button size="small" type="primary" @click="applyFallbackRegex">使用备用正则（\d+）</el-button>
                  </div>
                </template>
              </el-alert>
            </el-form-item>
            
            <el-form-item label="说明" v-if="regexData.description">
              <span>{{ regexData.description }}</span>
            </el-form-item>
            
            <el-form-item label="匹配示例" v-if="regexData.examples?.length">
              <el-tag v-for="(example, index) in regexData.examples" :key="index" style="margin-right: 8px;">
                {{ example }}
              </el-tag>
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤3: 预览章节 -->
        <div v-if="uploadStep === 3">
          <el-alert 
            :title="`共拆分出 ${splitSummary.total} 个章节，总计 ${splitSummary.total_words} 字`"
            type="info" 
            style="margin-bottom: 20px;"
            :closable="false"
          >
            <template #default>
              <div style="margin-top: 10px;">
                <el-checkbox 
                  :model-value="selectedChaptersCount === splitChapters.length"
                  :indeterminate="selectedChaptersCount > 0 && selectedChaptersCount < splitChapters.length"
                  @change="handleSelectAll"
                >
                  全选 (已选 {{ selectedChaptersCount }} / {{ splitChapters.length }})
                </el-checkbox>
              </div>
            </template>
          </el-alert>
          
          <el-table :data="splitChapters" height="400" stripe>
            <el-table-column width="60">
              <template #default="{ row }">
                <el-checkbox v-model="row.selected" />
              </template>
            </el-table-column>
            <el-table-column prop="index" label="序号" width="70">
              <template #default="{ row }">
                {{ row.index + 1 }}
              </template>
            </el-table-column>
            <el-table-column prop="title" label="章节标题" min-width="200" />
            <el-table-column prop="word_count" label="字数" width="100" />
            <el-table-column label="内容预览" min-width="300">
              <template #default="{ row }">
                <el-tooltip :content="row.content.substring(0, 200) + '...'" placement="top">
                  <span class="content-preview">{{ row.content.substring(0, 50) }}...</span>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button v-if="uploadStep === 2" @click="uploadStep = 1">上一步</el-button>
        <el-button v-if="uploadStep === 2 && regexData.regex" type="primary" @click="handleSplitPreview">
          预览章节拆分
        </el-button>
        <el-button v-if="uploadStep === 3" @click="uploadStep = 2">上一步</el-button>
        <el-button v-if="uploadStep === 3" type="primary" @click="handleBatchInsert" :disabled="selectedChaptersCount === 0">
          插入选中章节 ({{ selectedChaptersCount }})
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.chapters-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 24px;
  margin: 0 0 8px 0;
}

.page-header p {
  color: #909399;
  margin: 0;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-left {
  display: flex;
  align-items: center;
}

.filter-right {
  display: flex;
  gap: 10px;
}

.table-card {
  min-height: 400px;
}

.pagination {
  margin-top: 20px;
  justify-content: flex-end;
}

.word-count {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
}

.content-preview {
  color: #606266;
  font-size: 13px;
}
</style>

<template>
  <el-dialog :visible.sync="visible" width="520px" :close-on-click-modal="false">
    <template #title>
      <span>应用更新</span>
    </template>

    <div v-if="status === 'checking'">
      正在检查更新，请稍候...
    </div>

    <div v-else-if="status === 'available'">
      <div>发现新版本 {{updateInfo?.version}}</div>
      <div class="detail">{{releaseNotes}}</div>
      <div style="margin-top:12px;">
        <el-button type="primary" @click="onDownload">立即下载</el-button>
        <el-button @click="onOpenReleasePage">前往下载页面</el-button>
      </div>
    </div>

    <div v-else-if="status === 'downloading'">
      <div>正在下载更新: {{progressPercent}}%</div>
      <el-progress :percentage="progressPercent" :text-inside="true" status="success"></el-progress>
      <div class="meta">{{transferredMB}} / {{totalMB}} MB · {{speedMB}} MB/s</div>
      <div style="margin-top:12px;">
        <el-button type="danger" @click="onCancelDownload">取消</el-button>
      </div>
    </div>

    <div v-else-if="status === 'downloaded'">
      <div>更新已下载完成: {{updateInfo?.version}}</div>
      <div class="meta">{{releaseNotes}}</div>
      <div style="margin-top:12px;">
        <el-button type="primary" @click="onInstall">立即重启并安装</el-button>
        <el-button @click="onClose">稍后重启</el-button>
      </div>
    </div>
    <div v-else-if="status === 'installing'">
      <div>正在安装更新，应用将退出并自动安装更新，请保存工作。</div>
    </div>

    <div v-else-if="status === 'error'">
      <div>自动更新出错: {{errorMessage}}</div>
      <div style="margin-top:12px;">
        <el-button type="primary" @click="onOpenReleasePage">前往下载页面</el-button>
        <el-button @click="onClose">关闭</el-button>
      </div>
    </div>

    <div v-else>
      <div>当前已是最新版本</div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const visible = ref(false)
const status = ref('')
const updateInfo = ref(null)
const progressPercent = ref(0)
const transferredMB = ref('0.00')
const totalMB = ref('0.00')
const speedMB = ref('0.00')
const errorMessage = ref('')
const releaseNotes = ref('')

function resetState() {
  status.value = ''
  updateInfo.value = null
  progressPercent.value = 0
  transferredMB.value = '0.00'
  totalMB.value = '0.00'
  speedMB.value = '0.00'
  errorMessage.value = ''
  releaseNotes.value = ''
}

function onDownload() {
  if (window?.electronAPI?.downloadUpdate) {
    window.electronAPI.downloadUpdate().then(res => {
      if (res === true) {
        // 打开模态并显示下载
        visible.value = true
      }
    }).catch(err => {
      console.error('Download update request failed:', err)
      errorMessage.value = err?.message || String(err)
      status.value = 'error'
      visible.value = true
    })
  }
}

function onInstall() {
  if (window?.electronAPI?.installUpdate) {
    window.electronAPI.installUpdate()
  }
}

function onOpenReleasePage() {
  if (window?.electronAPI?.openReleasePage) {
    window.electronAPI.openReleasePage()
  }
}

function onCancelDownload() {
  // 目前 electron-updater 不提供取消 download 的 API；我们仅更新 UI 状态
  visible.value = false
}

function onClose() {
  visible.value = false
}

function onUpdateStatus(message) {
  // Update status from IPC
  status.value = message.status
  if (message.status === 'available') {
    updateInfo.value = message
    // 兼容 releaseNotes 可能是字符串或数组
    if (typeof message.releaseNotes === 'string') {
      releaseNotes.value = message.releaseNotes
    } else if (Array.isArray(message.releaseNotes)) {
      releaseNotes.value = message.releaseNotes.map(n => n.note || n).join('\n')
    } else if (message.releaseNotes && typeof message.releaseNotes.note === 'string') {
      releaseNotes.value = message.releaseNotes.note
    } else {
      releaseNotes.value = ''
    }
    visible.value = true
  } else if (message.status === 'downloading') {
    progressPercent.value = Number(message.percent?.toFixed?.(1) || 0)
    transferredMB.value = ((message.transferred || 0) / 1024 / 1024).toFixed(2)
    totalMB.value = ((message.total || 0) / 1024 / 1024).toFixed(2)
    speedMB.value = ((message.bytesPerSecond || 0) / 1024 / 1024).toFixed(2)
    visible.value = true
  } else if (message.status === 'downloaded') {
    updateInfo.value = message
    visible.value = true
  } else if (message.status === 'error') {
    errorMessage.value = message.message || '未知错误'
    visible.value = true
  }
}

onMounted(() => {
  if (window?.electronAPI?.onUpdateStatus) {
    window.electronAPI.onUpdateStatus(onUpdateStatus)
  }
  if (window?.electronAPI?.getUpdateStatus) {
    window.electronAPI.getUpdateStatus().then(res => {
      if (res && res.isDownloading) {
        status.value = 'downloading'
        progressPercent.value = res.downloadProgress || 0
        visible.value = true
      }
    }).catch(err => { /* ignore */ })
  }
})

onBeforeUnmount(() => {
  if (window?.electronAPI?.removeUpdateStatusListener) {
    window.electronAPI.removeUpdateStatusListener()
  }
})
</script>

<style scoped>
.meta {
  margin-top: 8px;
  color: #666;
}
.detail {
  margin-top: 8px;
  color: #333;
}
</style>

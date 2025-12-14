/**
 * 墨境后台调度服务
 * 负责：每日任务生成、AI任务变体生成、定时任务管理
 */

const cron = require('node-cron');
const { 
  generateDailyTasksFromTemplates, 
  generateAITaskVariants,
  getDailyChallenge 
} = require('./inkTaskService');
const { getDatabase } = require('../database/init');

const MS_5_MIN = 5 * 60 * 1000;
const MS_60_MIN = 60 * 60 * 1000;
const MAX_TASKS_PER_DAY = 20;
const MAX_TASKS_PER_DAY_FAILSAFE = 200;

let schedulerStarted = false;
let taskGenerationInterval = null;

/**
 * 启动调度器
 */
function startScheduler() {
  if (schedulerStarted) {
    console.log('调度器已在运行');
    return;
  }
  
  console.log('启动墨境调度器...');
  
  // 每天凌晨0点1分生成今日预设任务
  cron.schedule('1 0 * * *', async () => {
    console.log('[调度] 开始生成每日预设任务...');
    try {
      const result = generateDailyTasksFromTemplates();
      console.log('[调度] 预设任务生成完成:', result);
      
      // 生成每日挑战
      getDailyChallenge();
      console.log('[调度] 每日挑战生成完成');
    } catch (error) {
      console.error('[调度] 任务生成失败:', error);
    }
  }, {
    timezone: 'Asia/Shanghai'
  });
  
  // 每5分钟检查是否需要生成AI任务变体
  taskGenerationInterval = setInterval(async () => {
    await checkAndGenerateAITasks();
  }, MS_5_MIN); // 5分钟
  
  // 每天凌晨0点清理过期数据
  cron.schedule('0 0 * * *', () => {
    console.log('[调度] 开始清理过期数据...');
    cleanupOldData();
  }, {
    timezone: 'Asia/Shanghai'
  });
  
  schedulerStarted = true;
  console.log('墨境调度器启动完成');
  
  // 启动时立即检查今日任务
  setTimeout(() => {
    ensureTodayTasks();
  }, 1000);
}

/**
 * 停止调度器
 */
function stopScheduler() {
  if (taskGenerationInterval) {
    clearInterval(taskGenerationInterval);
    taskGenerationInterval = null;
  }
  schedulerStarted = false;
  console.log('墨境调度器已停止');
}

/**
 * 确保今日任务已生成
 */
function ensureTodayTasks() {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  // 检查今日任务数量
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM mojing_daily_tasks WHERE task_date = ?
  `).get(today).count;
  
  if (count === 0) {
    console.log('[调度] 今日任务为空，开始生成...');
    const result = generateDailyTasksFromTemplates();
    console.log('[调度] 预设任务生成完成:', result);
    
    // 确保每日挑战存在
    getDailyChallenge();
  } else {
    console.log(`[调度] 今日已有 ${count} 个任务`);
  }
}

/**
 * 检查并生成AI任务变体
 */
async function checkAndGenerateAITasks() {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  // 今日总任务数（包含预设 + AI）
  const todayTotalCount = db.prepare(`
    SELECT COUNT(*) as count FROM mojing_daily_tasks 
    WHERE task_date = ?
  `).get(today).count;

  // 如果今天已有任务但还没有预设任务，补齐一次预设任务（避免先生成AI导致任务数偏少）
  const todayPresetCount = db.prepare(`
    SELECT COUNT(*) as count FROM mojing_daily_tasks
    WHERE task_date = ? AND source = 'preset'
  `).get(today).count;

  if (todayTotalCount > 0 && todayPresetCount === 0) {
    try {
      const presetResult = generateDailyTasksFromTemplates();
      if (presetResult?.generated > 0) {
        console.log('[调度] 检测到缺少预设任务，已补齐:', presetResult);
      }
    } catch (error) {
      console.error('[调度] 补齐预设任务失败:', error);
    }
  }

  // 每日上限：达到20个后不再生成新任务
  if (todayTotalCount >= MAX_TASKS_PER_DAY) {
    return;
  }

  // 兜底：防止异常循环导致任务无限暴涨
  if (todayTotalCount >= MAX_TASKS_PER_DAY_FAILSAFE) {
    return;
  }

  // 检查是否有AI配置
  const hasAIConfig = db.prepare(`
    SELECT COUNT(*) as count FROM ai_config WHERE is_active = 1 OR is_default = 1
  `).get().count > 0;
  
  if (!hasAIConfig) {
    return;
  }
  

  // 当天没有生成任何任务：一次性生成至少10个（优先用预设模板；不足则用AI补齐）
  if (todayTotalCount === 0) {
    console.log('[调度] 今日任务为空：开始生成至少10个任务...');
    try {
      const presetResult = generateDailyTasksFromTemplates();
      console.log('[调度] 预设任务生成完成:', presetResult);
      // 确保每日挑战存在
      getDailyChallenge();
    } catch (error) {
      console.error('[调度] 预设任务生成失败:', error);
    }

    const afterPresetCount = db.prepare(`
      SELECT COUNT(*) as count FROM mojing_daily_tasks 
      WHERE task_date = ?
    `).get(today).count;

    const remainingSlots = Math.max(0, MAX_TASKS_PER_DAY - afterPresetCount);
    const needAI = Math.min(remainingSlots, Math.max(0, 10 - afterPresetCount));
    if (needAI > 0 && hasAIConfig) {
      try {
        const focusAttrTypes = getLeastCoveredAttrTypes(db, today, 6);
        await generateAITaskVariants('inkdot', needAI, { focusAttrTypes });
      } catch (error) {
        console.error('[调度] AI补齐任务失败:', error);
      }
    }

    return;
  }

  // 如果一个小时内没有生成新任务：生成2个新任务，确保“做不完”
  const lastTaskCreatedAt = db.prepare(`
    SELECT created_at FROM mojing_daily_tasks 
    WHERE task_date = ?
    ORDER BY datetime(created_at) DESC
    LIMIT 1
  `).get(today)?.created_at;

  if (!lastTaskCreatedAt) {
    return;
  }

  const lastCreatedMs = new Date(lastTaskCreatedAt).getTime();
  if (!Number.isFinite(lastCreatedMs)) {
    return;
  }

  const nowMs = Date.now();
  if (nowMs - lastCreatedMs < MS_60_MIN) {
    return;
  }

  if (!hasAIConfig) {
    return;
  }

  console.log('[调度] 超过1小时无新任务：生成2个AI任务...');

  try {
    const currentCount = db.prepare(`
      SELECT COUNT(*) as count FROM mojing_daily_tasks WHERE task_date = ?
    `).get(today).count;
    const generateCount = Math.min(2, Math.max(0, MAX_TASKS_PER_DAY - currentCount));
    if (generateCount <= 0) {
      return;
    }
    const focusAttrTypes = getLeastCoveredAttrTypes(db, today, 2);
    const taskType = pickTaskTypeForBackfill(db, today);
    await generateAITaskVariants(taskType, generateCount, { focusAttrTypes });
  } catch (error) {
    console.error('[调度] AI任务生成失败:', error);
  }
}

function getLeastCoveredAttrTypes(db, taskDate, pickCount) {
  const allAttrTypes = ['character', 'conflict', 'scene', 'dialogue', 'rhythm', 'style'];

  const rows = db.prepare(`
    SELECT attr_type, COUNT(*) as count
    FROM mojing_daily_tasks
    WHERE task_date = ?
    GROUP BY attr_type
  `).all(taskDate);

  const counts = new Map(rows.map(r => [r.attr_type, r.count]));

  const sorted = allAttrTypes
    .map(attr => ({ attr, count: counts.get(attr) || 0 }))
    .sort((a, b) => a.count - b.count || a.attr.localeCompare(b.attr));

  return sorted.slice(0, Math.max(1, pickCount)).map(x => x.attr);
}

function pickTaskTypeForBackfill(db, taskDate) {
  const rows = db.prepare(`
    SELECT task_type, COUNT(*) as count
    FROM mojing_daily_tasks
    WHERE task_date = ?
    GROUP BY task_type
  `).all(taskDate);

  const counts = new Map(rows.map(r => [r.task_type, r.count]));
  const inkdot = counts.get('inkdot') || 0;
  const inkline = counts.get('inkline') || 0;

  // 让墨点略多（更轻量），同时避免墨线长期缺失
  if (inkline === 0) return 'inkline';
  if (inkdot <= inkline) return 'inkdot';
  return 'inkline';
}

/**
 * 清理过期数据
 */
function cleanupOldData() {
  const db = getDatabase();
  
  // 清理30天前的每日任务（保留完成记录）
  const deletedTasks = db.prepare(`
    DELETE FROM mojing_daily_tasks 
    WHERE task_date < date('now', '-30 days')
    AND id NOT IN (SELECT task_id FROM mojing_task_records WHERE status = 'completed')
  `).run();
  
  console.log(`[清理] 删除了 ${deletedTasks.changes} 条过期任务`);
  
  // 清理90天前的XP流水
  const deletedXP = db.prepare(`
    DELETE FROM mojing_xp_transactions 
    WHERE created_at < datetime('now', '-90 days')
  `).run();
  
  console.log(`[清理] 删除了 ${deletedXP.changes} 条过期XP记录`);
}

/**
 * 手动触发任务生成
 */
async function manualGenerateTasks(options = {}) {
  const results = {};
  
  if (options.preset !== false) {
    results.preset = generateDailyTasksFromTemplates();
  }
  
  if (options.ai) {
    results.aiInkdot = await generateAITaskVariants('inkdot', options.aiCount || 3);
    results.aiInkline = await generateAITaskVariants('inkline', options.aiCount || 2);
  }
  
  if (options.challenge !== false) {
    results.challenge = getDailyChallenge();
  }
  
  return results;
}

/**
 * 获取调度器状态
 */
function getSchedulerStatus() {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const todayTaskCount = db.prepare(`
    SELECT 
      source,
      task_type,
      COUNT(*) as count
    FROM mojing_daily_tasks 
    WHERE task_date = ?
    GROUP BY source, task_type
  `).all(today);
  
  const lastAIGeneration = db.prepare(`
    SELECT created_at FROM mojing_daily_tasks 
    WHERE source = 'ai_generated' 
    ORDER BY created_at DESC LIMIT 1
  `).get();
  
  return {
    isRunning: schedulerStarted,
    todayTasks: todayTaskCount,
    lastAIGeneration: lastAIGeneration?.created_at || null
  };
}

module.exports = {
  startScheduler,
  stopScheduler,
  ensureTodayTasks,
  checkAndGenerateAITasks,
  manualGenerateTasks,
  getSchedulerStatus,
  cleanupOldData
};

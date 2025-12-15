## [v1.0.6-alpha] - 2025-12-15

### 🎯 墨境优化
- 等级经验曲线优化：按“写作量”重新缩放等级阈值，估算 Lv6≈100万字、Lv10≈5000万字（基于 0.05 XP/字）
- 任务题目类型扩展：新增“润色 / 续写”两种题目类型，并由系统掷骰子随机决定每个任务的题目类型
- 任务定时器优化（每5分钟执行一次）：
	- 若当天未生成任何任务：优先生成预设任务，不足则一次性 AI 补齐到至少10个
	- 若超过1小时未生成新任务：自动追加2个 AI 新任务，保证任务持续供给
	- AI 生成方向更均衡：根据当天任务的六维属性分布，优先补齐覆盖较少的能力
	- AI 题目去重增强：通过“随机约束词 + 随机种子”降低重复与相似
	- AI 提供商预设扩展：新增对魔搭（ModelScope）、Cerebras、OpenRouter 的默认支持（可在设置中一键选择）


## [v1.0.5-alpha] - 2025-12-11


### 🎉 本次更新重点
- 新增功能：墨境 · 写作成长系统（游戏化模块）
	- 新的写作成长玩法：六维属性（人物/冲突/场景/对话/节奏/风格）、经验值与升级、称号系统
	- 任务体系：新增墨点（短微任务）、墨线（中时长任务）、墨章（周挑战）模板与每日任务池
	- 成就系统：188+ 成就（包含里程碑、连续、品质、属性、产量及隐藏类成就）与用户成就墙
	- 每日/周挑战：支持 AI 生成任务变体、每日挑战和周挑战（墨章）提交与评审
	- AI 支持：AI 任务生成与 AI 评审锚点（mojing_task_generate / mojing_task_evaluate / mojing_weekly_evaluate）
	- 后端变更：新增 `server` 路由与服务（achievement/xp/inkTask/scheduler），并在 `app.js` 集成调度器（node-cron）
	- 数据库：新增迁移 v6，包含墨境相关表（档案、经验流水、等级配置、任务模板、每日任务、任务记录、成就、每日/周挑战、奖励、背包、连续打卡奖励等），并新增种子数据（`server/database/seeds/mojing.js`）
	- 前端：新增墨境页面与入口（导航、首页卡片、墨境独立视图、任务/详情/成就/历史/档案/周挑战）和客户端 API：`client/src/api/mojing.js`
	- 依赖：后端新增 `node-cron`（调度器）作为可选依赖
	- 兼容性：如果未安装 AI 配置，仍支持预设任务和手动触发任务生成


### 📦 下载

- **macOS (Apple Silicon)**: `AI-Novel-Trainer-1.0.5-alpha-mac-arm64.dmg`
- **macOS (Intel)**: `AI-Novel-Trainer-1.0.5-alpha-mac-x64.dmg`
- **Windows 安装程序**: `AI-Novel-Trainer-1.0.5-alpha-win-x64.exe`

## 下载（v1.0.6-alpha）

- **macOS (Apple Silicon)**: `AI-Novel-Trainer-1.0.6-alpha-mac-arm64.dmg`
- **macOS (Intel)**: `AI-Novel-Trainer-1.0.6-alpha-mac-x64.dmg`
- **Windows 安装程序**: `AI-Novel-Trainer-1.0.6-alpha-win-x64.exe`

**开发者变更（供发布审阅）**

- `client/package.json`：版本号更新为 `1.0.6-alpha`。
- `client/src/api/mojing.js`：新增客户端 API：`getCompletedTasks`、`getTaskPracticeHistory`、`practiceTask`，用于已完成任务和练习历史的查询与再次练习。
- `client/src/views/MoJing/Tasks.vue`：任务界面重构，新增“今日/已完成”视图切换、已完成任务列表与筛选、练习历史对话框与“再次练习”动作，以及若干 UI 文案/状态调整。
- `client/src/views/Chapters/Index.vue`：章节拆分增强：支持后端返回的备用正则（fallback regex）提示与一键应用逻辑，提高对不同章节编号格式的兼容性。
- `server/app.js`：增加 `express.json` 的 body size 限制至 `100mb`（提高大文本上传兼容性）。
- `server/routes/chapters.js`：改进样本提取策略（头部 + 中段抽样），并在拆分预览中尝试生成并返回更宽松的备用正则建议。
- `server/routes/mojing.js`：新增路由：`/tasks/completed`、`/tasks/:id/history`、`/tasks/:id/practice`；同时 `tasks/today` 返回合并已完成/待完成任务和 summary 信息以便前端按视图展示。
- `server/services/aiService.js`：新增 `stripThinkTags`，用于清洗 AI 返回中不必要的 <think> 标签。
- `server/services/inkTaskService.js`：增强 AI 评审错误容错（AI 异常时生成默认反馈并持久化到 `ai_feedback` 字段），并新增服务方法：`getCompletedTasks`、`getTaskPracticeHistory`、`restartCompletedTask`。
- `desktop/package.json`、`server/package.json`、`package.json`：同步版本号至 `1.0.6-alpha`。
- 产物：已在 `desktop/dist` 生成 mac x64/arm64 的 dmg/zip，同时在 `RELEASES/checksums-1.0.6-alpha.txt` 中记录了 SHA256 校验和。

注：以上变更已在工作目录修改但尚未提交为 release commit；我可以按需提交、打 tag 并创建 GitHub Draft Release（需要你的确认是否自动发布）。

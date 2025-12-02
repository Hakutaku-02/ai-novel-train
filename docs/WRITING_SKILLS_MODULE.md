# 小说写作技巧学习模块设计文档

## 一、模块概述

### 1.1 功能目标
本模块旨在帮助用户系统性地学习小说写作技巧（知识点），通过"学习-练习-评审"的闭环，持续提升写作能力。

### 1.2 核心功能
1. **知识点管理**：支持动态添加、编辑、分类管理写作技巧知识点
2. **知识点学习**：提供文本内容学习，包含讲解、要点、示例
3. **AI 练习生成**：根据知识点自动生成写作练习题目
4. **AI 评审批改**：AI 对用户作品进行针对性评审和反馈
5. **学习进度追踪**：记录学习进度和练习成绩

### 1.3 知识点来源
- **预设知识点**：系统内置的常见写作技巧
- **AI 生成**：用户输入技巧名称，AI 自动生成完整知识点
- **手动添加**：用户完全自定义知识点内容

---

## 二、数据结构设计

### 2.1 知识点表 (writing_skills)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 技巧名称 |
| category | TEXT | 分类（如：对白、描写、叙事、结构等）|
| difficulty | TEXT | 难度（easy/medium/hard）|
| summary | TEXT | 简短描述（50字以内）|
| content | TEXT | 详细讲解内容（Markdown格式）|
| key_points | TEXT | 核心要点（JSON数组）|
| examples | TEXT | 示例文本（JSON数组）|
| common_mistakes | TEXT | 常见错误（JSON数组）|
| related_skills | TEXT | 相关技巧ID（JSON数组）|
| source | TEXT | 来源（preset/ai/user）|
| is_active | BOOLEAN | 是否启用 |
| study_count | INTEGER | 学习次数 |
| practice_count | INTEGER | 练习次数 |
| avg_score | REAL | 平均得分 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 2.2 技巧练习表 (skill_practices)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| skill_id | INTEGER | 关联知识点ID |
| question_title | TEXT | 题目标题 |
| question_content | TEXT | 题目内容（JSON）|
| user_answer | TEXT | 用户答案 |
| word_count | INTEGER | 字数 |
| time_spent | INTEGER | 用时（秒）|
| status | TEXT | 状态（draft/submitted/evaluated）|
| submitted_at | DATETIME | 提交时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 2.3 技巧评审表 (skill_evaluations)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| practice_id | INTEGER | 关联练习ID |
| skill_id | INTEGER | 关联知识点ID |
| total_score | REAL | 总分 |
| dimension_scores | TEXT | 各维度得分（JSON）|
| skill_application | TEXT | 技巧运用评价 |
| highlights | TEXT | 亮点 |
| improvements | TEXT | 改进建议 |
| overall_comment | TEXT | 总评 |
| raw_response | TEXT | AI原始响应 |
| created_at | DATETIME | 创建时间 |

### 2.4 学习记录表 (skill_study_logs)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键 |
| skill_id | INTEGER | 关联知识点ID |
| study_duration | INTEGER | 学习时长（秒）|
| completed | BOOLEAN | 是否完成 |
| created_at | DATETIME | 创建时间 |

---

## 三、知识点分类体系

### 3.1 一级分类

```
写作技巧
├── 对白技巧 (dialogue)
│   ├── 潜台词运用
│   ├── 角色语言个性化
│   ├── 对白节奏控制
│   └── ...
├── 描写技巧 (description)
│   ├── 环境描写
│   ├── 人物外貌描写
│   ├── 动作描写
│   ├── 心理描写
│   └── ...
├── 叙事技巧 (narrative)
│   ├── 视角选择
│   ├── 叙事节奏
│   ├── 时间线处理
│   └── ...
├── 结构技巧 (structure)
│   ├── 开篇钩子
│   ├── 情节转折
│   ├── 高潮设计
│   ├── 伏笔铺垫
│   └── ...
├── 情感技巧 (emotion)
│   ├── 情绪渲染
│   ├── 氛围营造
│   ├── 共情触发
│   └── ...
└── 综合技巧 (comprehensive)
    ├── 人物塑造
    ├── 世界观构建
    └── ...
```

---

## 四、AI Prompt 设计

### 4.1 知识点生成 Prompt

**功能锚点**: `skill_generate`

```
你是一位专业的小说写作教练，拥有丰富的创作和教学经验。请根据用户提供的写作技巧名称，生成一份完整的学习资料。

用户想要学习的技巧：{{skillName}}
{{#category}}
所属分类：{{category}}
{{/category}}

请生成详细的知识点内容，包含以下部分：

1. **技巧概述**（50字以内）
2. **详细讲解**（500-1000字，包含原理、方法、注意事项）
3. **核心要点**（3-5条，每条20字以内）
4. **优秀示例**（2-3个，每个100-200字）
5. **常见错误**（2-3个，说明为什么是错误）
6. **练习建议**（如何针对性练习这个技巧）

请按以下 JSON 格式输出：
{
  "name": "技巧名称",
  "category": "分类（dialogue/description/narrative/structure/emotion/comprehensive）",
  "difficulty": "难度（easy/medium/hard）",
  "summary": "简短描述",
  "content": "详细讲解（Markdown格式）",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "examples": [
    {"title": "示例标题", "content": "示例内容", "analysis": "示例分析"}
  ],
  "commonMistakes": [
    {"mistake": "错误做法", "reason": "为什么是错误", "correction": "正确做法"}
  ],
  "practiceAdvice": "练习建议"
}

只输出JSON，不要有其他内容。
```

### 4.2 技巧练习题生成 Prompt

**功能锚点**: `skill_practice_generate`

```
你是一位专业的网络小说写作训练题目设计师。请根据以下写作技巧知识点，设计一道针对性的练习题。

## 技巧信息
名称：{{skillName}}
分类：{{category}}
难度：{{difficulty}}
概述：{{summary}}
核心要点：{{keyPoints}}

## 要求
请设计一道能够检验用户是否掌握这个技巧的练习题，题目要：
1. 明确要求使用该技巧
2. 提供足够的场景背景
3. 字数要求合理（根据难度 200-800 字不等）
4. 有明确的评判标准

请按以下 JSON 格式输出：
{
  "title": "题目标题",
  "skillId": {{skillId}},
  "skillName": "{{skillName}}",
  "background": "场景背景描述（100-200字）",
  "task": "具体写作任务描述",
  "requirements": ["要求1", "要求2", "要求3"],
  "skillFocus": ["需要运用的技巧要点"],
  "wordCountRange": {"min": 数字, "max": 数字},
  "evaluationCriteria": [
    {"criterion": "评判标准", "weight": 权重占比}
  ],
  "hints": ["可选提示1", "提示2"]
}

只输出JSON，不要有其他内容。
```

### 4.3 技巧练习评审 Prompt

**功能锚点**: `skill_practice_evaluate`

```
你是一位资深的网络小说编辑，请针对特定写作技巧对用户的练习作品进行专业评审。

## 练习的目标技巧
名称：{{skillName}}
核心要点：{{keyPoints}}

## 练习题目
{{questionContent}}

## 用户作品
{{userAnswer}}

请从以下角度进行评审：

1. **技巧运用度** (0-40分)
   - 是否正确理解了技巧要点
   - 是否有效运用了该技巧
   - 技巧使用是否自然恰当

2. **完成度** (0-20分)
   - 是否完成题目要求
   - 字数是否达标

3. **文笔表现** (0-20分)
   - 语言是否流畅
   - 表达是否准确

4. **整体效果** (0-20分)
   - 作品的完整性
   - 阅读体验

请按以下 JSON 格式输出评审结果：
{
  "totalScore": 总分（满分100）,
  "grade": "评级（S/A/B/C/D）",
  "dimensions": {
    "skillApplication": {
      "score": 分数,
      "comment": "技巧运用评价（重点分析是否掌握了技巧要点）"
    },
    "completion": {
      "score": 分数,
      "comment": "完成度评价"
    },
    "writing": {
      "score": 分数,
      "comment": "文笔评价"
    },
    "overall": {
      "score": 分数,
      "comment": "整体效果评价"
    }
  },
  "skillAnalysis": {
    "understood": "用户对技巧的理解程度分析",
    "applied": "技巧运用的具体表现",
    "needsImprovement": "技巧运用方面需要改进的地方"
  },
  "highlights": ["亮点1", "亮点2"],
  "improvements": [
    {"issue": "问题", "suggestion": "建议", "example": "示例"}
  ],
  "overallComment": "总体评价（150-200字）",
  "masteryLevel": "技巧掌握程度（未掌握/初步掌握/基本掌握/熟练掌握/精通）",
  "nextStepAdvice": "下一步学习建议"
}

只输出JSON，不要有其他内容。
```

---

## 五、API 设计

### 5.1 知识点管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/skills | 获取知识点列表 |
| GET | /api/skills/:id | 获取单个知识点详情 |
| POST | /api/skills | 创建知识点 |
| PUT | /api/skills/:id | 更新知识点 |
| DELETE | /api/skills/:id | 删除知识点 |
| POST | /api/skills/generate | AI生成知识点 |
| GET | /api/skills/categories | 获取分类列表 |
| POST | /api/skills/:id/study | 记录学习 |

### 5.2 技巧练习 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/skills/:id/practice/generate | 生成练习题 |
| POST | /api/skills/:id/practice | 创建练习 |
| PUT | /api/skill-practices/:id | 更新练习（保存草稿）|
| POST | /api/skill-practices/:id/submit | 提交练习 |
| POST | /api/skill-practices/:id/evaluate | AI评审 |
| GET | /api/skill-practices | 获取练习列表 |
| GET | /api/skill-practices/:id | 获取练习详情 |

### 5.3 统计 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/skills/statistics | 获取学习统计 |
| GET | /api/skills/:id/statistics | 获取单个技巧统计 |

---

## 六、前端页面设计

### 6.1 页面结构

```
技巧学习 (/skills)
├── 技巧库首页 (Index.vue) - 展示所有技巧分类和列表
├── 技巧详情 (Detail.vue) - 学习具体技巧内容
├── 技巧练习 (Practice.vue) - 做练习题
├── 评审结果 (Evaluation.vue) - 查看评审反馈
└── 技巧管理 (Manage.vue) - 添加/编辑技巧
```

### 6.2 用户流程

```
1. 用户进入技巧库首页
   ↓
2. 浏览/搜索/筛选技巧
   ↓
3. 选择感兴趣的技巧
   ↓
4. 学习技巧内容（讲解、示例、要点）
   ↓
5. 点击"开始练习"
   ↓
6. AI生成针对性练习题
   ↓
7. 用户完成写作练习
   ↓
8. 提交练习，AI评审
   ↓
9. 查看评审结果和建议
   ↓
10. 继续学习或练习其他技巧
```

---

## 七、预设知识点示例

### 7.1 对白技巧 - 潜台词运用

```json
{
  "name": "潜台词运用",
  "category": "dialogue",
  "difficulty": "medium",
  "summary": "让角色的话语中包含言外之意，增加对白的深度和张力",
  "content": "## 什么是潜台词\n\n潜台词是指角色话语表面意思之下隐藏的真实含义...\n\n## 潜台词的作用\n\n1. 增加对白的深度...\n2. 展现角色心理...\n3. 制造张力和悬念...",
  "keyPoints": [
    "话里有话，表面含义与真实意图不同",
    "通过语境、表情、动作暗示真意",
    "读者能感知到但角色未必理解"
  ],
  "examples": [
    {
      "title": "告别场景",
      "content": "她微笑着说：\"路上小心。\"声音很轻，像是怕惊醒什么。\n他点点头：\"嗯，你也早点休息。\"\n她没有动，只是看着他的背影消失在楼梯口，然后轻轻说了句：\"再见。\"",
      "analysis": "表面是普通的告别对话，但'声音很轻'、'没有动'、独自说的'再见'都暗示这是一场可能没有回头的离别"
    }
  ],
  "commonMistakes": [
    {
      "mistake": "潜台词太过隐晦，读者完全理解不了",
      "reason": "潜台词需要读者能够感知，太隐晦就失去了意义",
      "correction": "通过适当的动作、表情、环境描写提供理解线索"
    }
  ]
}
```

---

## 八、实现优先级

### P0 - 核心功能
1. 数据库表结构
2. 知识点CRUD API
3. AI生成知识点
4. AI生成练习题
5. AI评审练习

### P1 - 基础页面
1. 技巧库首页
2. 技巧详情页
3. 练习页面
4. 评审结果页

### P2 - 增强功能
1. 学习进度追踪
2. 统计分析
3. 相关技巧推荐
4. 收藏功能

---

## 九、Prompt 维护说明

所有AI相关的Prompt模板存储在 `prompt_templates` 表中，可通过以下方式维护：

1. **系统管理界面**：在"Prompt管理"页面可以查看、编辑所有Prompt
2. **数据库种子文件**：`server/database/seeds/prompts.js` 中定义默认Prompt
3. **版本控制**：每次修改Prompt会自动保存历史版本，支持回滚

### 新增的Prompt模板类型

| category | type | 说明 |
|----------|------|------|
| skill | generate | 生成知识点内容 |
| skill | practice_generate | 生成练习题 |
| skill | evaluate | 评审练习作品 |

---

## 十、后续扩展

1. **学习路径**：根据用户水平推荐学习顺序
2. **成就系统**：完成学习和练习获得成就
3. **社区分享**：用户可以分享自己创建的知识点
4. **错题本**：记录评分较低的练习，支持重做

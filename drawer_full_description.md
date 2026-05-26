# Drawer 抽屉 — 项目完整描述

> 本文档包含两个部分：
> 1. **简历用**：按老师要求的"用XXX做了XXX达成了XXX"格式
> 2. **作品集用**：待补充的 User Research 部分内容框架

---

## Part 1：简历项目经历（详细版）

### 抽屉 Drawer — AI 驱动的灵感捕捉与思维图谱工具
**独立设计 & 全栈开发 · 3个月**
*一款面向创作者和探索型用户的 AI 辅助点子管理工具，从用户调研到独立开发上线。*

---

#### 用户调研

- 针对灵感记录场景，设计了**半结构化访谈大纲**，围绕"现有记录习惯与痛点"、"与 AI 工具的交互体验"、"理想工具的期望"三个维度展开
- 对 **4 位受访者**进行了 **15–71 分钟**的深度访谈（含 1 位原型可用性测试），覆盖核心目标用户、边缘用户和反例用户三类画像，确保发现的广度与边界清晰
- 使用**亲和图（Affinity Diagram）**对访谈数据进行聚类分析，提炼出 **4 个核心聚类**（输出瓶颈 / 记录≠留住 / AI姿态问题 / 创作神圣性），并将每个聚类映射到具体的设计决策

#### 设计分析

- 从"轻重程度"和"主动性"两个维度构建了**竞品分析矩阵**，对标备忘录、Notion、Obsidian、ChatGPT/Claude 等工具，识别出"轻量+主动挖掘"象限为空白设计机会
- 基于调研发现，建立了**三层递进信息架构**（列表层→单点子层→宇宙层），对应用户的三种认知模式：扫描、深挖、发现
- 设计了**用户旅程图（User Journey Map）**，覆盖"捕捉→结晶→生长→沉淀/冷却"的完整想法生命周期
- 绘制了**系统架构图**，梳理前端（PWA）、Serverless API 代理层、LLM 推理层之间的数据流与交互逻辑

#### Prompt Engineering · 三版迭代

- **V1 挑战者**：设计了"苏格拉底式压力测试" Prompt，让 AI 频繁挑战用户观点——发现追问容易脱离用户核心思路，频繁反驳打消用户表达积极性
- **V2 速记员**：重写为"倾听+横向扩散"模式，AI 只问精准的拓展性问题——发现纯提问缺乏深度引导，无法真正帮助用户"探索"
- **V3 共谋者**：根据一位测试用户的关键反馈（AI 将荒诞小说设定拉回"传统教育观"），将 Prompt 彻底重写为**"犀利、幽默、有主见的思维搭档"**人格，赋予 AI 在离经叛道想法面前"不拉回正轨，往深处再走一步"的行为准则

#### 产品设计 · 关键设计决策

- **翻转视觉层级**：将第一版的全屏聊天界面重构为**底部滑动抽屉**，把 AI 自动蒸馏生成的"创意卡片"（含核心概念、方向标签、未解决张力）置于全屏主角位置——确立"思考产物 > 思考过程"的设计原则
- **创意卡片自动进化机制**：设计了卡片生命周期系统——用户首轮对话后 AI 自动生成卡片，每深聊 4 轮触发一次**卡片进化**（核心概念重新提炼、方向更新、张力重新定义），卡片下方沉淀"生长轨迹"时间轴
- **想法冷却系统**：超过 7 天未触碰的想法自动降级为"白矮星"状态——视觉上缩小、变暗，安静等待用户重新拾起
- **宇宙视图 · AI 思维媒人**：使用 **D3.js 力导向图（Force-Directed Graph）**构建"思维宇宙"，将所有想法渲染为可拖拽的星球节点；基于**中文 Bigram 文本匹配算法**自动发现想法之间的隐藏关联，绘制语义连线
- **超新星系统**：AI 在后台自动将所有想法两两配对，调用 LLM 分析深层交叉可能性，发现化学反应时自动生成**超新星**（蓝色脉冲动效 + Confetti 粒子特效）；用户可探索、采纳或丢弃

#### 全栈开发

- **前端**：使用原生 HTML/CSS/JavaScript 构建单页应用（SPA），总代码量 **2,000+ 行 JS + 900+ 行 CSS**；集成 **D3.js v7** 实现力导向图可视化和可拖拽交互，**canvas-confetti** 实现仪式感粒子特效
- **AI 接入层**：通过 **Netlify Edge Functions（基于 Deno 运行时）**搭建 Serverless API 代理，转发请求至 **SiliconFlow API**，调用 **Qwen2.5-72B-Instruct** 大语言模型；实现 **SSE（Server-Sent Events）流式输出**，达成打字机效果的实时 AI 回复
- **数据持久化**：采用 **localStorage** 全量存储用户数据（想法列表、对话历史、卡片状态、宇宙聊天记录），实现零后端的客户端持久化方案
- **PWA 部署**：配置 **Service Worker** 实现静态资源离线缓存（Cache First 策略）；编写 **manifest.json** 支持"添加到主屏幕"功能，实现类原生 App 的全屏运行体验
- **安全设计**：实现三层鉴权机制——用户自带 API Key 直通 / 访问码验证 / 服务端环境变量兜底，API 密钥通过 Netlify 环境变量存储，前端零泄露
- **配额管理**：设计每日 30 条免费额度的熔断机制，防止公测期间 Token 超支

#### 上线成果

- 以 **PWA** 形式部署在 **Netlify** 上（Cloudflare CDN 加速），支持手机端"添加到主屏幕"后像原生 App 一样使用
- **1,240+ 次请求**，覆盖来自 **8 个国家/地区**的访问
- **815 次独立访问**，**822 次页面浏览**
- 小范围公测中收集到定性反馈，其中一位测试用户的深度反馈直接驱动了 Prompt V3 的"共谋者"人格重塑

---

## Part 2：作品集视觉产出框架

> 以下是作品集各板块需要的视觉产出，按页面顺序排列。
> 详细英文文案见 `research/user_research_page.md`

### 1. 用户研究页（User Interview — 五列亲和图）

**对应 Figma 页**：User Research 主页面
**框架**：参照老师给的五列推导结构

```
Column 1          Column 2              Column 3           Column 4            Column 5
USER PROFILES     CONTENT               INSIGHTS           BRAINSTORM          OPPORTUNITIES
4 位受访者卡片     第一人称转写原话        4 个亲和聚类         每聚类 3 个关键词     3 个设计方向
(含 1 个反例)      每人 4-8 条便签        → 每组 1 句 insight   → 指向功能设计       → 收束为机会
```

**4 个亲和聚类**：

| 聚类 | 英文标题 | 核心 Insight |
|------|---------|-------------|
| 1. 输出瓶颈 | The Output Bottleneck | 工具要求先想清楚再记录，但灵感恰恰是"还没想清楚"的 |
| 2. 记录≠留住 | Recording ≠ Retaining | 记下来的东西缺乏结构和关联，几天后退化成噪音 |
| 3. AI没有人味 | AI Lacks Humanity | 通用 AI 的默认姿态无法胜任灵感探索场景 |
| 4. 创作的神圣性 | The Sacredness of Thinking | 不是所有创作者都愿意让 AI 参与，这个边界值得尊重 |

**3 个设计机会（Opportunities）**：
1. **Capture Without Friction** — 零表达成本的捕捉体验
2. **AI as Co-conspirator** — 专为灵感探索设计的 AI 人格
3. **From Capture to Connection** — 自动发现想法之间的隐藏联系

**底部总结**：
> While every participant shared a universal frustration — ideas that fade before they can be recorded — their needs diverge sharply in how much AI involvement they'll accept. This tension between **amplification** and **autonomy** became the central design constraint for Drawer.

### 2. 竞品分析（分两页，侧重点不同）

#### Page 1：Where Current Tools Fall Short（想法生命周期覆盖度）

**视角**：用户的想法需要经历哪些阶段，现有工具各自在哪里断掉

|  | Apple Notes | WeChat | Flomo | Notion | Obsidian | ChatGPT |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Capture** — jot it down | ✅ | ✅ | ✅ | ✗ | ✗ | ✅ |
| **Structure** — make sense of it | ✗ | ✗ | ✗ | ✅ | ✅ | ✗ |
| **Revisit** — pick up where you left off | ✗ | ✗ | ⚠️ | ✅ | ✅ | ✗ |
| **Connect** — discover links between ideas | ✗ | ✗ | ✗ | ✗ | ⚠️ manual | ✗ |

三对总结：
- **Notes + WeChat** — Captures the spark, but nothing stays.
- **Notion + Obsidian** — Organizes well, but the setup kills the spark.
- **Flomo + ChatGPT** — Each goes halfway, neither finishes the journey.

收尾：What if a tool could capture ideas while they're still warm — and grow them into something more?

#### Page 2：Competitive Positioning（2×2 四象限定位）

**视角**：工具本身的产品特性

```
                    ACTIVE
                      ↑
                      │     ChatGPT ●
                      │     Claude ●
                      │     DeepSeek ●
 HEAVYWEIGHT ─────────┼──────────── LIGHTWEIGHT
                      │
        Notion ●      │     Apple Notes ●
        Obsidian ●    │     WeChat ●
                      │     Flomo ●
                      ↓
                    PASSIVE
```

右上象限（Lightweight + Active）留空，标注 **"Design Opportunity"**

底部：No existing tool combines low-friction capture with AI-driven exploration.

### 3. 用户旅程图（User Journey Map）

**展示想法从诞生到成熟的完整生命周期**：

```
时间轴 →

捕捉 Capture          结晶 Crystallize        生长 Growth              沉淀/冷却
─────────────────────────────────────────────────────────────────────────────
用户动作：             AI动作：                 用户动作：               系统动作：
打开app，输入          后台蒸馏对话为           继续聊，每4轮           7天未碰，
一个词或一句话         "创意卡片"               触发卡片进化             自动降级为
                      （核心/方向/张力）                                白矮星
─────────────────────────────────────────────────────────────────────────────
情绪曲线：
😣 模糊焦虑 → 🤔 被引导 → 💡 看到卡片惊喜 → 🔥 越聊越深 → 😌 安心搁置
─────────────────────────────────────────────────────────────────────────────
触点：
快速捕捉输入框        点子卡片                 卡片进化动效             白矮星视觉
引导语随机切换         生长轨迹时间轴           Confetti撒花             变暗缩小
```

### 4. 系统架构图

**展示技术栈的数据流**：

```
┌─────────────────────────────────────────────────────────────┐
│  用户 (手机/桌面浏览器)                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PWA 前端 (HTML/CSS/JS)                               │   │
│  │  ┌─────────┐  ┌───────────┐  ┌──────────────────┐   │   │
│  │  │ 对话界面  │  │ 创意卡片   │  │ 宇宙视图 (D3.js) │   │   │
│  │  │ (抽屉式) │  │ (自动生成) │  │ 力导向图+超新星  │   │   │
│  │  └─────────┘  └───────────┘  └──────────────────┘   │   │
│  │                                                      │   │
│  │  localStorage (全量客户端持久化)                        │   │
│  │  Service Worker (离线缓存)                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↕ HTTPS                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Netlify Edge Functions (Deno 运行时)                  │   │
│  │  · API 代理 + 密钥隔离                                 │   │
│  │  · SSE 流式转发                                        │   │
│  │  · 三层鉴权 (自带Key/访问码/服务端兜底)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↕ HTTPS                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SiliconFlow API                                      │   │
│  │  · Qwen2.5-72B-Instruct (对话/卡片生成/超新星发现)      │   │
│  │  · OpenAI-compatible 接口                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5. 逻辑推导：从 Research Finding 到 Design Decision

**每条调研发现如何推导出具体的设计决策**：

```
Finding #1: The Output Bottleneck — 想法到文字之间有一道鸿沟
    ↓ 设计推导
    · 工具不应要求用户先想清楚再记录
    · 允许用户输入一个词就开始对话
    ↓ 落地为
    ✅ 快速捕捉输入框 + 随机引导语
    ✅ AI 主动追问"这个想法在你脑子里是什么状态？"

Finding #2: Recording ≠ Retaining — 记了，但没有真正留下来
    ↓ 设计推导
    · 碎片化记录缺乏结构，几天后退化成噪音
    · 需要自动把对话转化为可回顾的结构
    ↓ 落地为
    ✅ AI 自动蒸馏对话为创意卡片（核心/方向/张力）
    ✅ 卡片进化机制（每 4 轮对话触发更新）
    ✅ 生长轨迹时间轴

Finding #3: AI Lacks Humanity — AI 的姿态不对，太"人机"
    ↓ 设计推导
    · 灵感场景的 AI 需要专门的人格设计
    · 不是通用助手，而是"共谋者"
    ↓ 落地为
    ✅ Prompt 三版迭代（挑战者→速记员→共谋者）
    ✅ "遇到离经叛道的想法不拉回正轨"

Finding #4: From Capture to Connection — 用户要的不只是记录，是连接
    ↓ 设计推导
    · 终极价值是发现想法之间的隐藏联系
    · 人类负责深度，AI 负责广度
    ↓ 落地为
    ✅ 宇宙视图（D3.js 力导向图）
    ✅ 超新星自动发现系统
    ✅ 想法交叉对话框

Finding #5（反例）: The Sacredness of Thinking — 创作的神圣性
    ↓ 设计推导
    · Drawer 不是为所有人设计的
    · 目标用户边界：想法在被记录之前还没有形状的人
    ↓ 落地为
    ✅ 明确产品定位边界
    ✅ Next Steps 中的设计张力反思
```

### 6. 技术栈标签（简历/卡片用）

如果需要在简历或作品集卡片里列技术标签，用这些：

```
设计: Figma · 半结构化访谈 · 亲和图分析 · 竞品矩阵
前端: HTML/CSS/JS (原生SPA) · D3.js · PWA · Service Worker
后端: Netlify Edge Functions · Deno · SSE 流式输出
AI:   SiliconFlow API · Qwen2.5-72B · Prompt Engineering (3轮迭代)
部署: Netlify · Cloudflare CDN
开发工具: Claude Code (Antigravity) · Git
```

# Drawer System Map — 完整节点与流程描述（供 GPT 生图用）

## 整体结构

这是一个以用户为中心的系统架构图。最顶部是用户，用户通过三条不同的使用路径与系统交互，每条路径穿过不同的前端组件，最终汇聚到共享的中间层和 AI 层。底部是客户端数据层。

视觉风格：深色背景（#0d0b08），用户可见组件用琥珀金（#e8b86d），后台组件用灰色（#8a8479），AI 组件用冷蓝色（#6eb5ff），数据层用暖白色（#e0dcd5）。

---

## 所有节点（共 25 个）

### 顶部：用户入口

1. **User** — 人形图标，标注 "mobile / desktop"，位于图的最顶部正中央。这是整张图的起点。

### 用户的三个动机（User 下方分出三条路径）

2. **"I have an idea"** — 用户的第一个动机，文字气泡，偏左
3. **"Let me continue that thought"** — 用户的第二个动机，文字气泡，正中
4. **"Are my ideas connected?"** — 用户的第三个动机，文字气泡，偏右

### Layer 1：前端组件（PWA Frontend，琥珀金色大框包住）

路径 1 的组件（左侧）：
5. **Quick Capture Input** — 单行输入框，每次访问随机显示不同的引导语（如"你在想什么？"）
6. **Chat Drawer** — 从底部滑出的抽屉式聊天面板，用户在这里和 AI 对话
7. **AI Response (Typewriter)** — 聊天面板内，AI 的回复以 SSE 流式打字机效果逐字呈现

路径 2 的组件（中间）：
8. **Idea Card** — AI 自动从对话中蒸馏生成的结构化卡片，包含三个字段：核心概念(core)、方向标签(direction)、未解决张力(tension)
9. **Card Evolution** — 每深聊 4 轮，卡片自动进化：核心概念重新提炼、方向更新、张力重新定义
10. **Growth Timeline** — 卡片下方的时间轴，沉淀每次进化的历史版本

路径 3 的组件（右侧）：
11. **Universe View** — D3.js 力导向图构建的"思维宇宙"，所有想法渲染为可拖拽的星球节点
12. **Semantic Links** — 基于中文 Bigram 文本匹配算法自动发现的想法之间的语义关联，显示为节点之间的连线
13. **Supernova Panel** — 当 AI 发现两个想法之间有深层交叉可能性时，触发蓝色脉冲动效 + Confetti 粒子特效。用户可以探索、采纳或丢弃这个连接

共享组件：
14. **White Dwarf State** — 超过 7 天未触碰的想法自动降级：视觉上缩小、变暗，安静等待重新拾起
15. **Service Worker** — 拦截网络请求，静态资源使用 Cache First 策略实现离线缓存
16. **PWA Manifest** — manifest.json 支持"添加到主屏幕"，实现全屏无浏览器边框运行

### Layer 2：中间层（Edge Functions，灰色大框包住）

17. **API Proxy** — Netlify Edge Function（Deno 运行时），转发前端请求到 SiliconFlow API，隐藏 API 密钥
18. **3-Tier Auth Gate** — 三层鉴权机制：① 用户自带 API Key 直通 → ② 输入访问码验证 → ③ 服务端环境变量兜底
19. **Rate Limiter** — 每日 30 条免费请求配额，超出后熔断，防止公测期间 Token 超支
20. **SSE Relay** — Server-Sent Events 流式转发，将 LLM 的逐 token 输出实时推送到前端

### Layer 3：AI 推理层（AI Inference，蓝色大框包住）

21. **SiliconFlow API** — OpenAI-compatible 的外部 API 端点
22. **Qwen 2.5-72B-Instruct** — 大语言模型，处理所有 AI 任务
23. **Prompt V3: Co-conspirator** — 对话用的人格 Prompt："犀利、幽默、有主见的思维搭档"，遇到离经叛道的想法不拉回正轨，往深处再走一步
24. **Prompt: Card Distiller** — 卡片蒸馏用的 Prompt：从原始对话中提取核心概念、方向标签、未解决张力，输出结构化 JSON
25. **Prompt: Supernova Analyzer** — 超新星发现用的 Prompt：接收两个想法的卡片内容，分析深层交叉可能性，判断是否存在"化学反应"

### 底部：客户端数据层

26. **localStorage** — 浏览器本地存储，零后端设计。存储内容包括：想法列表、完整对话历史、卡片当前状态及所有历史版本、宇宙视图的节点位置和连线数据、超新星发现结果

### 外围实体

27. **Cloudflare CDN** — 静态资源全球加速分发
28. **Netlify Hosting** — 站点托管和 Edge Function 部署平台

---

## 所有箭头与连接（共 ~30 条）

### 路径 1：想法捕捉流（用户可见，实线琥珀色箭头）

1. **User → "I have an idea"** — 用户产生想法
2. **"I have an idea" → Quick Capture Input** — 用户打开 app，看到输入框和随机引导语
3. **Quick Capture Input → Chat Drawer** — 用户输入一个词或一句话，聊天抽屉自动滑出
4. **Chat Drawer → API Proxy** — 前端发送 POST 请求，body 包含 messages 数组（完整对话历史）
5. **API Proxy → 3-Tier Auth Gate** — 请求先过鉴权
6. **3-Tier Auth Gate → Rate Limiter** — 鉴权通过后检查今日配额
7. **Rate Limiter → SSE Relay** — 配额充足，准备建立 SSE 连接
8. **SSE Relay → SiliconFlow API** — 转发请求到外部 API（携带服务端 API Key，前端不可见）
9. **SiliconFlow API → Qwen 72B + Prompt V3** — 模型使用"共谋者"人格 Prompt 生成回复
10. **Qwen 72B → SSE Relay** — 模型逐 token 输出
11. **SSE Relay → Chat Drawer** — SSE 事件流实时推送到前端
12. **Chat Drawer → AI Response (Typewriter)** — 前端逐字渲染打字机效果
13. **Chat Drawer → localStorage** — 每条消息实时写入 localStorage（对话历史）

### 路径 2：卡片蒸馏流（半自动，虚线灰色箭头）

14. **Chat Drawer → [触发条件判断]** — 前端检测：首轮对话完成 或 每累计 4 轮新对话
15. **[触发条件] → API Proxy** — 自动发送蒸馏请求，body 包含完整对话历史
16. **API Proxy → SiliconFlow API** — 转发（共用同一条鉴权和限流链路）
17. **SiliconFlow API → Qwen 72B + Prompt: Card Distiller** — 模型使用蒸馏 Prompt，从对话中提取结构化信息
18. **Qwen 72B → API Proxy → Chat Drawer** — 返回 JSON：{core, direction, tension}
19. **Chat Drawer → Idea Card** — 前端渲染卡片（首次）或触发卡片进化（非首次）
20. **Idea Card → Card Evolution** — 如果是进化：旧版卡片归档，新版替换
21. **Card Evolution → Growth Timeline** — 旧版本追加到生长轨迹时间轴
22. **Idea Card → localStorage** — 卡片状态（当前版本+所有历史版本）写入 localStorage

### 路径 3：超新星发现流（完全后台，点线蓝色箭头）

23. **localStorage → [想法数量检测]** — 前端检测用户是否已积累 3 个及以上想法
24. **[想法数量检测] → 两两配对** — 将所有想法的卡片内容进行 n×(n-1)/2 的两两组合
25. **两两配对 → API Proxy** — 依次发送配对请求，body 包含两张卡片的 {core, direction, tension}
26. **API Proxy → SiliconFlow API → Qwen 72B + Prompt: Supernova Analyzer** — 模型分析两个想法的深层交叉可能性
27. **Qwen 72B → API Proxy → Universe View** — 如果发现"化学反应"：返回连接洞察描述
28. **Universe View → Supernova Panel** — 触发超新星动效（蓝色脉冲 + Confetti 粒子特效）
29. **Supernova Panel → localStorage** — 超新星发现结果写入 localStorage

### 数据持久化与离线（虚线灰色，双向箭头）

30. **localStorage ↔ Quick Capture Input** — 读取历史想法列表，显示在主界面
31. **localStorage ↔ Universe View** — 读写节点位置、连线数据、超新星状态
32. **localStorage ↔ Idea Card** — 读写卡片当前状态和历史版本
33. **Service Worker ↔ Netlify Hosting** — 首次加载时缓存所有静态资源（HTML/CSS/JS/图标）
34. **Service Worker → PWA Shell** — 离线时从缓存提供资源，app 仍可浏览历史内容
35. **Netlify Hosting → Cloudflare CDN** — 静态资源通过 CDN 全球分发

### 冷却系统（虚线灰色，单向）

36. **localStorage → [7 天未触碰检测]** — 前端定期扫描每个想法的最后交互时间
37. **[7 天未触碰] → White Dwarf State** — 符合条件的想法在 Universe View 中视觉降级：缩小、变暗

---

## 箭头旁的标注内容（写在箭头旁边的小字）

| 箭头 | 标注 |
|---|---|
| User → Capture Input | `opens PWA` |
| Capture Input → Chat Drawer | `"蓝?" (single word input)` |
| Chat Drawer → API Proxy | `POST /api/chat {messages[]}` |
| API Proxy → 3-Tier Auth | `check: user key / access code / env` |
| Auth → Rate Limiter | `check: daily quota (30/day)` |
| Rate Limiter → SSE Relay | `open SSE connection` |
| SSE Relay → SiliconFlow | `Bearer ${API_KEY} (server-side only)` |
| SiliconFlow → Qwen 72B | `model: qwen2.5-72b-instruct` |
| Qwen 72B → SSE Relay | `streaming tokens` |
| SSE Relay → Chat Drawer | `SSE: data: {"content": "..."}` |
| Chat Drawer → Idea Card | `{core, direction, tension}` |
| Card → Growth Timeline | `archived version v1, v2, v3...` |
| 两两配对 → Supernova Analyzer | `{cardA, cardB}` |
| Supernova → Universe View | `connection insight + trigger animation` |
| All → localStorage | `JSON read/write` |
| Service Worker ↔ CDN | `Cache First strategy` |

---

## 底部四张说明卡片

### Card 1: PWA Frontend
- Vanilla HTML/CSS/JS single-page app
- 2,000+ lines JS + 900+ lines CSS
- D3.js v7 for force-directed graph
- canvas-confetti for particle effects
- Zero framework overhead

### Card 2: Edge Functions
- Netlify Edge Functions on Deno runtime
- API key isolation — never touches browser
- SSE streaming for real-time AI responses
- 3-tier auth + daily rate limiting

### Card 3: Qwen 72B
- Three prompt modes: conversation / distillation / discovery
- Prompt V3 "Co-conspirator" evolved through 3 iterations
- V1 Challenger → V2 Scribe → V3 Co-conspirator
- Bilingual (Chinese-English) via SiliconFlow

### Card 4: localStorage
- Zero-backend architecture by design
- All data stays on user's device
- Privacy-first: no account, no server database
- Trade-off: no cross-device sync (intentional for MVP)

---

## 图例

| 符号 | 含义 |
|---|---|
| ── 实线琥珀色 | 用户可感知的交互流程 |
| -- 虚线灰色 | 后台数据流（用户不可见） |
| ·· 点线蓝色 | AI 处理流程（LLM 调用） |
| ↔ 双向箭头 | 数据读写（localStorage） |
| 琥珀金边框 | 用户直接看到/操作的组件 |
| 灰色边框 | 基础设施组件 |
| 蓝色边框 | AI 相关组件 |

// ── State ──
let apiKey = localStorage.getItem('drawer_api_key') || '';
let fontSize = localStorage.getItem('drawer_font_size') || 'medium';
let ideas = JSON.parse(localStorage.getItem('drawer_ideas') || '[]');
let currentId = null;
let chatHistory = [];
let loading = false;
let graphCollapsed = false;
let sim = null;
let graphFilter = 'all';
let graphQuery = '';
let universeLabelFetchPending = false;
let cardGenerating = false;
let currentLanguage = localStorage.getItem('drawer_language') || 'zh';

const CONCEPT_UNIVERSE_DISMISSED_KEY = 'drawer_concept_universe_dismissed_v1';
const CARD_BIRTH_SEEN_KEY = 'drawer_card_birth_seen_v1';
const FIRST_MESSAGE_PRIVACY_KEY = 'drawer_first_message_privacy_seen_v1';
const CONCEPT_UNIVERSE_PHASE_DURATIONS = { 1: 2800, 2: 4400, 3: 5200 };
let conceptUniverseActive = false;
let conceptUniversePhase = 0;
let conceptUniverseIdeas = [];
let conceptUniverseTimers = [];

function buildConceptUniverseIdeas(includeSupernova = false) {
  const createdAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
  const base = [
    {
      id: 'concept-needed', isConcept: true, name: '未来职业失去，稀缺的是被需要感', status: 'grow',
      card: {
        core: '真正稀缺的不是工作，而是让人感到自己仍然有用、有连接的位置。',
        origin: '如果职业不再稳定，人靠什么确认自己仍然被世界需要？',
        turningPoint: '问题从“如何不被替代”转向了“如何继续与别人发生关系”。',
        branches: ['记录三个非职业的被需要场景', '观察照顾、陪伴与小社群里的价值感'],
        tensions: '如果不再用职业衡量价值，还有什么能让这种感觉持续？',
        next: '写下三个场景',
        actions: { deeper: '回到一次被需要的现场', outline: '写成未来生活短文', echo: '寻找非职业身份', rest: '等下次价值焦虑' },
        seed: '最初种子：担心未来失去的也许不是职业，而是被需要感。'
      },
      nodes: [{ id: createdAt + 101, text: '被需要与被认可，也许根本是两件事。', keyword: '被需要', type: 'ai', time: '7/18 21:10', tasks: [] }],
      chatHistory: [
        { role: 'user', content: '未来职业消失后，人最怕失去什么？' },
        { role: 'assistant', content: '也许不是收入，而是被别人需要的位置。' }
      ],
      createdAt, updatedAt: createdAt + 7000
    },
    {
      id: 'concept-food', isConcept: true, name: '情绪价值饮食顾问', status: 'seed',
      card: {
        core: '先理解一个人为什么吃，而不只是吃了什么。',
        origin: '同一块蛋糕，在庆祝与孤独时承担的是两种完全不同的功能。',
        turningPoint: '饮食记录应该先记录情境和感受，再记录热量。',
        branches: ['识别压力进食前十分钟发生的事', '把建议改成温和的小替代'],
        tensions: '理解情绪会不会反而变成另一种规训？',
        next: '记录三次想吃的时刻',
        actions: { deeper: '追问想吃前十分钟', outline: '设计情绪记录卡', echo: '连接情绪天气', rest: '等真实触发出现' },
        seed: '最初种子：饮食建议很少问，那一口东西当时安慰了什么。'
      },
      nodes: [{ id: createdAt + 201, text: '食物也可能是一种情绪天气的读数。', keyword: '情绪读数', type: 'ai', time: '7/19 20:20', tasks: [] }],
      chatHistory: [
        { role: 'user', content: '如果饮食顾问先理解情绪价值呢？' },
        { role: 'assistant', content: '那第一句不该问吃了什么，而该问刚才发生了什么。' }
      ],
      createdAt: createdAt + 1000, updatedAt: createdAt + 8000
    },
    {
      id: 'concept-weather', isConcept: true, name: '情绪天气预报', status: 'pause',
      card: {
        core: '用一周的照片生成一张心情走势。',
        origin: '相册留下了许多情绪线索，却从来没有被放在一起看。',
        turningPoint: '照片不必判断情绪，只需要成为重新命名它的入口。',
        branches: ['从光线与拍摄对象回看一周', '让用户修正系统的情绪猜测'],
        tensions: '从照片推断心情，会不会显得武断甚至冒犯？',
        next: '选出一周七张照片',
        actions: { deeper: '对照照片与真实心情', outline: '画出一周天气卡', echo: '连接饮食情绪', rest: '攒满一周照片' },
        seed: '最初种子：如果相册能像天气图一样显出这一周的心情。'
      },
      nodes: [{ id: createdAt + 301, text: '重点不是识别准确，而是让人愿意回看并重新命名。', keyword: '重新命名', type: 'ai', time: '7/20 22:10', tasks: [] }],
      chatHistory: [
        { role: 'user', content: '我想用一周照片生成心情走势。' },
        { role: 'assistant', content: '它应该解释你，还是邀请你解释自己？' }
      ],
      createdAt: createdAt + 2000, updatedAt: createdAt + 9000
    },
    {
      id: 'concept-drawer', isConcept: true, name: '一个想法抽屉', status: 'grow',
      card: {
        core: '聊天只是抽屉，真正留下来的是会继续生长的点子卡。',
        origin: '想法聊完以后，如果只剩聊天记录，它还是很容易落灰。',
        turningPoint: '把聊天降到底部之后，思考的产物终于成为主角。',
        branches: ['让卡片在对话后自动结晶', '让旧点子在宇宙中重新相遇'],
        tensions: '结构是在照亮想法，还是过早替想法定型？',
        next: '验证第一次结晶',
        actions: { deeper: '观察第一次结晶', outline: '梳理三层宇宙', echo: '连接旧点子', rest: '等真实使用反馈' },
        seed: '最初种子：给一闪而过的念头一个能回来找到的地方。'
      },
      nodes: [{ id: createdAt + 401, text: '思考的产物应该比思考的过程占据更多视觉重心。', keyword: '产物大于过程', type: 'ai', time: '7/21 19:28', tasks: [] }],
      chatHistory: [
        { role: 'user', content: '聊天只是辅助，点子卡才是核心资产。' },
        { role: 'assistant', content: '那聊天应该像真正的抽屉，用完后把空间还给点子。' }
      ],
      createdAt: createdAt + 3000, updatedAt: createdAt + 10000
    }
  ];
  if (!includeSupernova) return base;
  return [...base, {
    id: 'concept-climate-menu', isConcept: true, type: 'supernova', status: 'seed',
    name: '情绪气候食谱', parentIds: ['concept-food', 'concept-weather'],
    card: {
      core: '把照片里的情绪天气与饮食选择放在一起，生成一份只属于个人的“气候食谱”。',
      origin: '从「情绪价值饮食顾问」与「情绪天气预报」的交叉处长出来。',
      turningPoint: '食物不再只是记录对象，而成为情绪变化的一种温柔回应。',
      branches: ['寻找天气变化与饮食选择的对应', '设计不带规训感的情绪食谱'],
      tensions: '怎样提供帮助，同时不把情绪简化成算法标签？',
      next: '画一张气候食谱',
      actions: { deeper: '找一次天气与食欲变化', outline: '画气候食谱原型', echo: '寻找情绪日记案例', rest: '保留为候选新星' },
      seed: '碰撞种子：照片里的情绪天气 × 食物承担的安慰功能。'
    },
    discovery: { kind: 'generative-collision', synergy: 88, novelty: 82, specificity: 76 },
    nodes: [],
    chatHistory: [{ role: 'assistant', content: '✦ 这颗候选新星来自两个旧点子的碰撞。它不是总结，而是一个此前不存在的新方向。' }],
    createdAt: Date.now(), updatedAt: Date.now()
  }];
}

const EMBEDDING_MODEL = 'BAAI/bge-m3';
const EMBEDDING_CACHE_VERSION = 2;
const EMBEDDING_DB_NAME = 'drawer-semantic-index';
const EMBEDDING_STORE_NAME = 'idea-embeddings';
const EMBEDDING_BATCH_SIZE = 24;
const SUPERNOVA_MAX_ACTIVE = 3;
const SUPERNOVA_REVIEW_STORAGE_KEY = 'drawer_supernova_pair_reviews_v1';
const SUPERNOVA_LAST_REVIEW_STORAGE_KEY = 'drawer_supernova_last_review_v1';
const SUPERNOVA_REVIEW_COOLDOWN = 12 * 60 * 60 * 1000;
const WHITE_DWARF_MIN_USER_TURNS = 5;
const WHITE_DWARF_INACTIVE_DAYS = 30;
const ideaEmbeddingCache = new Map();
let embeddingDbPromise = null;
let embeddingCacheHydrated = false;
let universeEmbeddingJob = null;
let universeEmbeddingState = 'idle';
let universeEmbeddingRetryAt = 0;
let supernovaReviewAttemptedThisSession = false;

function getIdeaUserTurnCount(idea) {
  return (idea?.chatHistory || []).filter(message => message.role === 'user').length;
}

function getIdeaCosmicType(idea, now = Date.now()) {
  if (idea?.type === 'supernova') return 'supernova';
  if (idea?.isConcept) return 'idea';
  const hasCard = Boolean(idea?.card?.core);
  const lastActivityAt = Number(idea?.updatedAt || idea?.createdAt || now);
  const inactiveFor = Math.max(0, now - lastActivityAt);
  const isDormant = inactiveFor >= WHITE_DWARF_INACTIVE_DAYS * 24 * 60 * 60 * 1000;
  const isAdoptedCollision = Array.isArray(idea?.parentIds) && idea.parentIds.length === 2;
  const isUnderdeveloped = !hasCard
    || (!isAdoptedCollision && getIdeaUserTurnCount(idea) < WHITE_DWARF_MIN_USER_TURNS);
  return isUnderdeveloped || isDormant ? 'dwarf' : 'idea';
}

function getCosmicTypeLabel(cosmicType) {
  if (cosmicType === 'supernova') return t('候选新星', 'Candidate supernova');
  if (cosmicType === 'dwarf') return t('白矮星', 'White dwarf');
  return t('你的点子', 'Your idea');
}

function openEmbeddingDatabase() {
  if (embeddingDbPromise) return embeddingDbPromise;
  embeddingDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(EMBEDDING_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(EMBEDDING_STORE_NAME)) {
        database.createObjectStore(EMBEDDING_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open embedding cache'));
  });
  return embeddingDbPromise;
}

async function hydrateEmbeddingCache() {
  if (embeddingCacheHydrated) return false;
  try {
    const database = await openEmbeddingDatabase();
    const records = await new Promise((resolve, reject) => {
      const request = database
        .transaction(EMBEDDING_STORE_NAME, 'readonly')
        .objectStore(EMBEDDING_STORE_NAME)
        .getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Failed to read embedding cache'));
    });
    records
      .filter(record => record.cacheVersion === EMBEDDING_CACHE_VERSION
        && record.model === EMBEDDING_MODEL
        && Array.isArray(record.vector))
      .forEach(record => ideaEmbeddingCache.set(String(record.id), record));
    embeddingCacheHydrated = true;
    return records.length > 0;
  } catch (error) {
    console.warn('Embedding cache will stay in memory:', error.message);
    embeddingCacheHydrated = true;
    return false;
  }
}

async function persistEmbeddingRecords(records) {
  if (!records.length) return;
  try {
    const database = await openEmbeddingDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(EMBEDDING_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(EMBEDDING_STORE_NAME);
      records.forEach(record => store.put(record));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Failed to save embedding cache'));
      transaction.onabort = () => reject(transaction.error || new Error('Embedding cache transaction aborted'));
    });
  } catch (error) {
    console.warn('Embedding records could not be persisted:', error.message);
  }
}

function getIdeaSemanticDescriptor(idea) {
  const text = DrawerSemanticSpace.buildIdeaText(idea);
  return {
    id: idea.id,
    text,
    fingerprint: DrawerSemanticSpace.fingerprint(text)
  };
}

function getCurrentIdeaEmbedding(idea) {
  const record = ideaEmbeddingCache.get(String(idea.id));
  if (!record
      || record.cacheVersion !== EMBEDDING_CACHE_VERSION
      || record.model !== EMBEDDING_MODEL) return null;
  const descriptor = getIdeaSemanticDescriptor(idea);
  return record.fingerprint === descriptor.fingerprint ? record : null;
}

async function requestIdeaEmbeddings(descriptors, purpose = 'idea-embedding') {
  const records = [];
  for (let offset = 0; offset < descriptors.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = descriptors.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    const headers = { 'Content-Type': 'application/json', 'X-Drawer-Purpose': purpose };
    if (apiKey) {
      headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-')
        ? `Bearer ${apiKey}`
        : apiKey;
    }
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch.map(item => item.text)
      })
    });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload.data)) {
      throw new Error(payload.error || `Embedding request failed (${response.status})`);
    }
    const ordered = [...payload.data].sort((left, right) => left.index - right.index);
    if (ordered.length !== batch.length) throw new Error('Embedding response size mismatch');
    ordered.forEach((item, index) => {
      if (!Array.isArray(item.embedding) || item.embedding.length === 0) {
        throw new Error('Embedding response contained an empty vector');
      }
      records.push({
        id: String(batch[index].id),
        cacheVersion: EMBEDDING_CACHE_VERSION,
        model: EMBEDDING_MODEL,
        fingerprint: batch[index].fingerprint,
        vector: item.embedding,
        updatedAt: Date.now()
      });
    });
  }
  return records;
}

async function refreshIdeaEmbeddings(targetIdeas) {
  const hydratedWithData = await hydrateEmbeddingCache();
  const descriptors = targetIdeas
    .map(getIdeaSemanticDescriptor)
    .filter(descriptor => descriptor.text.trim());
  const stale = descriptors.filter(descriptor => {
    const record = ideaEmbeddingCache.get(String(descriptor.id));
    return !record
      || record.cacheVersion !== EMBEDDING_CACHE_VERSION
      || record.model !== EMBEDDING_MODEL
      || record.fingerprint !== descriptor.fingerprint;
  });
  if (!stale.length) return hydratedWithData;

  const records = await requestIdeaEmbeddings(stale);
  records.forEach(record => ideaEmbeddingCache.set(String(record.id), record));
  await persistEmbeddingRecords(records);
  return records.length > 0 || hydratedWithData;
}

function getClusterReadySemanticSpace(targetIdeas = ideas.filter(idea => idea.card?.core)) {
  const items = targetIdeas.map(idea => {
    const record = getCurrentIdeaEmbedding(idea);
    return record ? { id: idea.id, vector: record.vector } : null;
  }).filter(Boolean);
  return DrawerSemanticSpace.createDistanceMatrix(items);
}

function reportLocalSemanticDiagnostics(embeddingItems, ideaCount) {
  if (!['127.0.0.1', 'localhost'].includes(window.location.hostname) || embeddingItems.length < 2) return;
  const { ids, matrix } = DrawerSemanticSpace.createDistanceMatrix(embeddingItems);
  const reviewStatuses = Object.values(loadSupernovaPairReviews()).reduce((counts, review) => {
    const status = String(review?.status || 'unknown');
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const cosmicCounts = ideas.reduce((counts, idea) => {
    const type = getIdeaCosmicType(idea);
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
  const pairs = [];
  for (let left = 0; left < ids.length; left++) {
    for (let right = left + 1; right < ids.length; right++) {
      pairs.push({
        source: ids[left],
        target: ids[right],
        similarity: 1 - matrix[left][right],
        semanticDistance: matrix[left][right]
      });
    }
  }
  pairs.sort((a, b) => b.similarity - a.similarity);
  fetch('/__dev/semantic-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      ideaCount,
      embeddedCount: embeddingItems.length,
      vectorDimension: embeddingItems[0]?.vector?.length || 0,
      activeSupernovae: ideas.filter(idea => idea.type === 'supernova').length,
      reviewStatuses,
      cosmicCounts,
      pairs
    })
  }).catch(() => {});
}

const UI_COPY = {
  '在这里，点子不是为了完成，': 'Ideas are not here to be finished,',
  '而是为了生长。': 'but to keep growing.',
  '新的点子': 'New idea',
  '进入你的思维宇宙': 'Thought universe',
  '点子': 'Ideas',
  '设置 & API': 'Settings & API',
  '想到了什么？': 'What is on your mind?',
  '回车即刻捕捉灵感': 'Press Enter to capture it',
  '或从左侧侧边栏查看过往点子': 'Or revisit an idea from the sidebar',
  '你的思维宇宙': 'Your thought universe',
  '还没有足够的点子来形成宇宙。': 'Not enough ideas to form a universe yet.',
  '至少需要 2 个有内容的点子。': 'You need at least two developed ideas.',
  '关闭': 'Close',
  '当前星体': 'CURRENT OBJECT',
  '打开点子': 'Open idea',
  '以它为中心': 'Set as focus',
  '交汇点': 'CROSSROADS',
  '带走': 'Keep it',
  '放弃': 'Discard',
  '探索这个交叉点…': 'Explore this intersection…',
  '黄色恒星 → 你展开的点子': 'Gold star → an idea you developed',
  '白矮星 → 尚未展开或长期沉寂': 'White dwarf → undeveloped or long dormant',
  '蓝色新星 → 碰撞产生的候选方向': 'Blue supernova → a collision-born candidate',
  '黄色线 → 点子之间的潜在暗线': 'Gold line → a hidden thread between ideas',
  '蓝色线 → 新星与母点子的生成血缘': 'Blue line → lineage from a new star to its parents',
  '核心点子': 'CORE IDEA',
  '点击重命名': 'Click to rename',
  '点子载入中...': 'Loading idea…',
  '进行中': 'Active',
  '创建于今天': 'Created today',
  '萌芽': 'Seed',
  '推进': 'Growing',
  '搁置': 'Parked',
  '点子卡片': 'Idea card',
  '灵感图谱': 'Idea graph',
  '聊上几句，我来帮你整理思路。': 'Talk it through, and I will shape it into a card.',
  '整理成卡片': 'Shape into a card',
  '核心观点': 'Core thought',
  '复制卡片': 'Copy card',
  '重新整理': 'Reshape',
  '可执行的下一步': 'Actionable next steps',
  '推荐优先': 'START HERE',
  '再挖深一点': 'Dig deeper',
  '变成创作提纲': 'Turn into an outline',
  '寻找旧点子的回声': 'Find an echo',
  '先放在这里': 'Leave it here',
  '还没想清楚的问题': 'Still unresolved',
  '开放问题': 'Open question',
  '最初的触发': 'Original spark',
  '思路发生了变化': 'How it evolved',
  '最初关注': 'THEN',
  '现在关注': 'NOW',
  '在这里钉入你的思维节点，': 'Pin your thoughts here,',
  '连成线，织成网。': 'connect the lines, grow a web.',
  '顺着这个点子聊': 'Keep exploring this idea',
  '继续把还没想清楚的地方往下挖': 'Follow the part that is still unresolved',
  '展开对话': 'Open chat',
  '收起对话': 'Close chat',
  '正在延续：': 'Continuing:',
  '当前点子的核心问题': 'the core question of this idea',
  '新的火花...': 'A new spark…',
  'Shift+Enter 换行 · 对话灵感可钉入图谱': 'Shift+Enter for a new line · Pin insights to the graph',
  '欢迎来到抽屉': 'Welcome to Drawer',
  '保存并开始': 'Save and begin',
  '捕捉新点子': 'Capture a new idea',
  '给这个灵感起个名字。别担心，以后随时可以改。': 'Give this spark a temporary name. You can change it anytime.',
  '点子名称...': 'Name this idea…',
  '放入抽屉': 'Put it in the drawer',
  '取消': 'Cancel',
  '应用设置': 'App settings',
  '显示字号': 'Display size',
  '偏小': 'Small',
  '适中': 'Medium',
  '偏大': 'Large',
  '保存更改': 'Save changes',
  '清空对话': 'Clear chat',
  '删除点子': 'Delete idea',
  '演变过程': 'Evolution',
  '钉入时间线': 'Pin to timeline',
  '钉为待办': 'Pin as action',
  'AI 思考过程': 'AI reasoning'
  ,'还没有点子。': 'No ideas yet.'
  ,'想到什么就加进来。': 'Drop in whatever appears.'
  ,'碰撞生成': 'Collision-born'
  ,'由两个点子碰撞产生的新方向': 'A new direction born from two colliding ideas'
  ,'刚刚捕捉、还在形成中的点子': 'Newly captured and still taking shape'
  ,'正在持续思考和发展的点子': 'An idea that is actively growing'
  ,'暂时放下，之后可以再回来': 'Set aside for now, ready to revisit'
  ,'刚刚萌芽': 'New seed'
  ,'暂时搁置': 'Parked'
  ,'推进中': 'Active'
  ,'提炼': 'Distilled'
  ,'你说的': 'You said'
  ,'整理中…': 'Shaping…'
  ,'正在随手整理思路…': 'Gathering the threads…'
  ,'✓ 已复制': '✓ Copied'
  ,'✓ 已钉入': '✓ Pinned'
  ,'提炼中…': 'Distilling…'
  ,'出了点问题': 'Something went wrong'
  ,'连接出了点问题，再试一次？': 'The connection slipped. Try again?'
  ,'⚙ 设置 & API': '⚙ Settings & API'
  ,'✦ 你的思维宇宙': '✦ Your thought universe'
  ,'✦ 交汇点': '✦ CROSSROADS'
  ,'🚀 带走': '🚀 Keep it'
  ,'🗑️ 放弃': '🗑️ Discard'
  ,'🌱 萌芽': '🌱 Seed'
  ,'🌿 推进': '🌿 Growing'
  ,'❄️ 搁置': '❄️ Parked'
  ,'点击选择 · 双击设为中心': 'Click to select · Double-click to focus'
  ,'⌁ 钉入时间线': '⌁ Pin to timeline'
  ,'✓ 钉为待办': '✓ Pin as action'
  ,'点亮一个新想法': 'LIGHT A NEW THOUGHT'
  ,'说点什么，它会成为一颗新的星…': 'Say something—it will become a new star…'
  ,'回车即时捕捉 · 无需整理，先接住再说': 'Press Enter to capture · No need to organize it yet'
  ,'开始说 = 点亮一颗新星': 'Start talking = light a new star'
  ,'点一颗旧星 = 回到那个想法': 'Choose an old star = return to that idea'
  ,'检索节点或关系…': 'Search nodes or relations…'
  ,'全部': 'All'
  ,'洞察': 'Insights'
  ,'待办': 'Actions'
  ,'推断关系': 'Inferred'
  ,'思考 / 洞察': 'Thought / insight'
  ,'明确关联': 'Explicit link'
  ,'系统推断': 'System inference'
  ,'点子摘要': 'Card summary'
  ,'起点与转变': 'Context'
  ,'重新整理整张卡片': 'Regenerate full card'
  ,'数据备份': 'Data backup'
  ,'导出或恢复全部点子、卡片、节点和聊天记录，不包含 API Key。': 'Export or restore all ideas, cards, nodes, and chats. API keys are excluded.'
  ,'导出完整备份': 'Export full backup'
  ,'从备份恢复': 'Restore from backup'
};
const UI_COPY_REVERSE = Object.fromEntries(Object.entries(UI_COPY).map(([zh, en]) => [en, zh]));

function t(zh, en) { return currentLanguage === 'en' ? en : zh; }

function refreshIconLabels() {
  const universeModeSwitch = document.getElementById('universeModeSwitch');
  if (universeModeSwitch) {
    universeModeSwitch.setAttribute('aria-label', t('宇宙视图', 'Universe views'));
  }

  const labels = {
    universeGravityModeBtn: ['星图', 'Star Map'],
    universeAtlasModeBtn: ['年鉴', 'Atlas'],
    universeWorldModeBtn: ['世界之窗', 'World Window'],
    tabCard: ['点子卡片', 'Idea card'],
    tabGraph: ['灵感图谱', 'Idea graph'],
    universeInspectorOpenBtn: ['打开点子', 'Open idea'],
    universeInspectorFocusBtn: ['以它为中心', 'Focus on this idea']
  };
  Object.entries(labels).forEach(([id, pair]) => {
    const element = document.getElementById(id);
    if (!element) return;
    const value = t(pair[0], pair[1]);
    element.setAttribute('aria-label', value);
    element.setAttribute('title', value);
  });
}

function languageDirective() {
  return currentLanguage === 'en'
    ? 'Language requirement: Respond in natural, concise English. For JSON requests, keep every requested key exactly unchanged and write every human-readable string value in English. Do not mix in Chinese unless quoting the user.'
    : '语言要求：请始终使用自然、简洁的简体中文回答。若要求返回 JSON，保持指定键名完全不变，所有面向用户的字符串值使用简体中文。除非引用用户原话，不要混用英文。';
}

function translatePattern(value, target) {
  const rules = target === 'en' ? [
    [/^点子 · (\d+)$/, 'Ideas · $1'],
    [/^已连接 (\d+) 个节点$/, '$1 nodes connected'],
    [/^创建于 (.+)$/, 'Created $1'],
    [/^(\d+) 个点子 · (\d+) 颗恒星$/, '$1 ideas · $2 stars'],
    [/^(\d+) 轮对话$/, '$1 turns'],
    [/^(\d+) 个节点$/, '$1 nodes'],
    [/^(\d+) 条连接$/, '$1 links'],
    [/^(\d+)天前$/, '$1d ago'],
    [/^(\d+)天前·(\d+)节$/, '$1d ago · $2 nodes'],
    [/^刚刚·(\d+)节$/, 'Just now · $1 nodes'],
    [/^(.+)·(\d+)节$/, '$1 · $2 nodes']
  ] : [
    [/^Ideas · (\d+)$/, '点子 · $1'],
    [/^(\d+) nodes connected$/, '已连接 $1 个节点'],
    [/^Created (.+)$/, '创建于 $1'],
    [/^(\d+) ideas · (\d+) stars$/, '$1 个点子 · $2 颗恒星'],
    [/^(\d+) turns$/, '$1 轮对话'],
    [/^(\d+) nodes$/, '$1 个节点'],
    [/^(\d+) links$/, '$1 条连接'],
    [/^(\d+)d ago$/, '$1天前'],
    [/^(\d+)d ago · (\d+) nodes$/, '$1天前·$2节'],
    [/^Just now · (\d+) nodes$/, '刚刚·$1节'],
    [/^(.+) · (\d+) nodes$/, '$1·$2节']
  ];
  for (const [pattern, replacement] of rules) if (pattern.test(value)) return value.replace(pattern, replacement);
  return value;
}

function translateValue(value, target = currentLanguage) {
  if (!value) return value;
  const leading = value.match(/^\s*/)?.[0] || '';
  const trailing = value.match(/\s*$/)?.[0] || '';
  const core = value.trim();
  if (!core) return value;
  const dictionary = target === 'en' ? UI_COPY : UI_COPY_REVERSE;
  const translated = dictionary[core] || translatePattern(core, target);
  return leading + translated + trailing;
}

function translateSubtree(root) {
  if (!root) return;
  const visit = node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const next = translateValue(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    ['placeholder', 'title', 'aria-label'].forEach(attr => {
      if (node.hasAttribute(attr)) {
        const current = node.getAttribute(attr);
        const next = translateValue(current);
        if (next !== current) node.setAttribute(attr, next);
      }
    });
    node.childNodes.forEach(visit);
  };
  visit(root);
}

let captureQuestionTimer = null;
let captureQuestionIndex = 0;
function getCaptureQuestions() {
  return currentLanguage === 'en' ? [
    'What has been circling your mind today?',
    'What idea have you not said out loud yet?',
    'What has been quietly exciting you lately?',
    'Is there something you keep returning to?',
    'What flashed through your mind just now?'
  ] : [
    '今天脑子里在转什么？', '有什么想法还没说出口？', '最近让你兴奋的事情是？',
    '有没有一件事一直在想？', '刚刚，有什么一闪而过？'
  ];
}
function refreshCaptureGreeting() {
  const greetings = getCaptureQuestions();
  const greeting = document.getElementById('captureGreeting');
  captureQuestionIndex = Math.floor(Math.random() * greetings.length);
  if (greeting) greeting.textContent = greetings[captureQuestionIndex];
}
function startCaptureQuestionRotation() {
  if (captureQuestionTimer) return;
  captureQuestionTimer = setInterval(() => {
    const greeting = document.getElementById('captureGreeting');
    if (!greeting) return;
    greeting.classList.add('is-changing');
    setTimeout(() => {
      const greetings = getCaptureQuestions();
      captureQuestionIndex = (captureQuestionIndex + 1) % greetings.length;
      greeting.textContent = greetings[captureQuestionIndex];
      greeting.classList.remove('is-changing');
    }, 380);
  }, 4400);
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage === 'en' ? 'en' : 'zh-CN';
  document.body?.classList.toggle('language-en', currentLanguage === 'en');
  document.title = t('抽屉 Drawer - 捕捉你的灵感', 'Drawer — Capture what is forming');
  const appTitle = document.querySelector('.app-title');
  if (appTitle) appTitle.innerHTML = currentLanguage === 'en' ? 'Drawer' : '抽屉 <span>Drawer</span>';
  const mobileTitle = document.querySelector('.mobile-hdr-title');
  if (mobileTitle) mobileTitle.textContent = currentLanguage === 'en' ? 'Drawer' : '抽屉 Drawer';
  const apiDesc = document.querySelector('#apiModal .modal-desc');
  if (apiDesc) apiDesc.innerHTML = currentLanguage === 'en'
    ? 'Enter the <b>access code</b> provided by the site owner, or use your own <b>SiliconFlow API Key</b>. Your data stays on this device.'
    : '请输入站长提供的 <b>访问码</b>，或填入你自己的 <b>SiliconFlow API Key</b>。数据仅存在于本地。';
  const apiNote = document.querySelector('#apiModal .modal-note');
  if (apiNote) apiNote.innerHTML = currentLanguage === 'en'
    ? 'Need a key? Get one free at <a href="https://siliconflow.cn/" target="_blank" style="color:var(--accent)">siliconflow.cn</a>.'
    : '没有 Key？去 <a href="https://siliconflow.cn/" target="_blank" style="color:var(--accent)">siliconflow.cn</a> 免费申请一个。';
  document.querySelectorAll('.msg-who').forEach(el => {
    if (['抽屉','Drawer'].includes(el.textContent.trim())) el.textContent = t('抽屉', 'Drawer');
    if (['你','You'].includes(el.textContent.trim())) el.textContent = t('你', 'You');
  });
  document.querySelectorAll('.msg-avatar-user').forEach(el => { el.textContent = t('你', 'You'); });
  document.getElementById('languageZh')?.classList.toggle('active', currentLanguage === 'zh');
  document.getElementById('languageEn')?.classList.toggle('active', currentLanguage === 'en');
  const switcher = document.getElementById('languageSwitch');
  if (switcher) switcher.setAttribute('aria-label', t('切换中英文', 'Switch Chinese / English'));
  translateSubtree(document.body);
  refreshIconLabels();
  window.DrawerWorldWindow?.refreshLanguage();
  refreshCaptureGreeting();
  startCaptureQuestionRotation();
}

function toggleLanguage() {
  currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
  localStorage.setItem('drawer_language', currentLanguage);
  renderList();
  if (currentId) {
    const idea = getIdea(currentId);
    updateIdeaHero(idea);
    renderCard();
    updateDrawerLabel(document.getElementById('drawerPanel')?.classList.contains('open'));
  }
  applyLanguage();
}

const nativeFetch = window.fetch.bind(window);
window.fetch = function bilingualFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (url.includes('/api/chat') && typeof init.body === 'string') {
    try {
      const payload = JSON.parse(init.body);
      if (Array.isArray(payload.messages)) {
        const directive = languageDirective();
        const systemIndex = payload.messages.findIndex(message => message.role === 'system');
        if (systemIndex >= 0) payload.messages[systemIndex] = { ...payload.messages[systemIndex], content: `${payload.messages[systemIndex].content}\n\n${directive}` };
        else payload.messages.unshift({ role: 'system', content: directive });
        init = { ...init, body: JSON.stringify(payload) };
      }
    } catch (_) { }
  }
  return nativeFetch(input, init);
};

let languageObserver = null;
function initLanguage() {
  applyLanguage();
  if (!languageObserver) {
    languageObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'characterData') translateSubtree(mutation.target);
        mutation.addedNodes.forEach(node => translateSubtree(node));
      });
    });
    languageObserver.observe(document.body, { childList:true, subtree:true, characterData:true });
  }
}

// ── Quota System ──
const MAX_FREE_MESSAGES = 30;
function getMessageCount() {
  const today = new Date().toDateString();
  const data = JSON.parse(localStorage.getItem('drawer_quota') || '{}');
  if (data.date !== today) return 0;
  return data.count || 0;
}
function incrementMessageCount() {
  const today = new Date().toDateString();
  const count = getMessageCount() + 1;
  localStorage.setItem('drawer_quota', JSON.stringify({ date: today, count }));
  return count;
}

// ── Init ──
window.addEventListener('load', () => {
  applyFontSize(fontSize);
  initLanguage();
  renderList();
  initTextarea();
  initQuickCapture();
  if (['universe', 'atlas', 'world'].includes(new URLSearchParams(window.location.search).get('view'))) {
    showUniverse();
  }
});

// ── Modals ──
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'settingsModal') {
    document.getElementById('newApiKeyInput').value = apiKey;
    document.getElementById('fontSizeSel').value = fontSize;
  } else {
    const inp = document.getElementById(id).querySelector('input');
    if (inp) setTimeout(() => inp.focus(), 80);
  }
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal('newIdeaModal'); closeModal('settingsModal'); }
  if (e.key === 'Enter' && !document.getElementById('newIdeaModal').classList.contains('hidden')) createIdea();
});

// ── API ──
function saveApiKey() {
  const k = document.getElementById('apiKeyInput').value.trim();
  if (!k) return;
  apiKey = k; localStorage.setItem('drawer_api_key', k); closeModal('apiModal');
  retryUniverseEmbeddingsAfterCredentialChange();
}
function saveSettings() {
  const k = document.getElementById('newApiKeyInput').value.trim();
  const fs = document.getElementById('fontSizeSel').value;
  if (k) {
    apiKey = k;
    localStorage.setItem('drawer_api_key', k);
    retryUniverseEmbeddingsAfterCredentialChange();
  }
  fontSize = fs;
  localStorage.setItem('drawer_font_size', fs);
  applyFontSize(fs);
  closeModal('settingsModal');
}

function retryUniverseEmbeddingsAfterCredentialChange() {
  universeEmbeddingRetryAt = 0;
  universeEmbeddingState = 'idle';
  if (document.getElementById('universeView')?.style.display !== 'none') {
    setTimeout(() => renderUniverse(), 0);
  }
}
function applyFontSize(size) {
  document.body.classList.remove('size-small', 'size-medium', 'size-large');
  document.body.classList.add('size-' + size);
}

// ── Layout Toggles ──
function toggleSidebar() {
  const panel = document.getElementById('listPanel');
  const overlay = document.getElementById('mobileOverlay');
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    overlay.classList.remove('show');
  } else {
    panel.classList.add('open');
    overlay.classList.add('show');
  }
}

function toggleDrawer() {
  const drawer = document.getElementById('drawerPanel');
  if (drawer.classList.contains('closed')) {
    drawer.classList.remove('closed');
    drawer.classList.add('open');
    updateDrawerLabel(true);
    settleMobileChatViewport();
  } else {
    drawer.classList.add('closed');
    drawer.classList.remove('open');
    updateDrawerLabel(false);
    document.getElementById('chatInput')?.blur();
    settleMobileChatViewport(false);
  }
}

function closeDrawer() {
  const drawer = document.getElementById('drawerPanel');
  if (!drawer || drawer.classList.contains('closed')) return;
  drawer.classList.add('closed');
  drawer.classList.remove('open');
  updateDrawerLabel(false);
  document.getElementById('chatInput')?.blur();
  settleMobileChatViewport(false);
}

function expandDrawerIfNot() {
  const drawer = document.getElementById('drawerPanel');
  if (drawer.classList.contains('closed')) {
    drawer.classList.remove('closed');
    drawer.classList.add('open');
    updateDrawerLabel(true);
  }
  settleMobileChatViewport();
}

let chatViewportFrame = 0;
let chatViewportTimers = [];

function scrollChatToLatest() {
  const messages = document.getElementById('messages');
  if (!messages) return;
  messages.scrollTop = messages.scrollHeight;
}

function syncMobileChatViewport(scrollLatest = true) {
  const root = document.documentElement;
  if (!window.matchMedia('(max-width: 768px)').matches) {
    root.style.removeProperty('--chat-keyboard-inset');
    root.style.removeProperty('--chat-open-height');
    return;
  }

  const viewport = window.visualViewport;
  const visibleHeight = viewport?.height || window.innerHeight;
  const keyboardInset = viewport
    ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
    : 0;
  root.style.setProperty('--chat-keyboard-inset', `${keyboardInset}px`);
  root.style.setProperty('--chat-open-height', `${Math.min(680, Math.round(visibleHeight * .82))}px`);

  if (scrollLatest && document.getElementById('drawerPanel')?.classList.contains('open')) {
    cancelAnimationFrame(chatViewportFrame);
    chatViewportFrame = requestAnimationFrame(scrollChatToLatest);
  }
}

function settleMobileChatViewport(scrollLatest = true) {
  chatViewportTimers.forEach(clearTimeout);
  chatViewportTimers = [0, 90, 220, 420].map(delay =>
    setTimeout(() => syncMobileChatViewport(scrollLatest), delay)
  );
}

function initTextarea() {
  const ta = document.getElementById('chatInput');
  if (!ta) return;
  ta.addEventListener('focus', () => {
    expandDrawerIfNot();
    settleMobileChatViewport();
  });
  ta.addEventListener('blur', () => {
    setTimeout(() => syncMobileChatViewport(false), 120);
  });
  ta.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
    scrollChatToLatest();
  });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => syncMobileChatViewport(true));
    window.visualViewport.addEventListener('scroll', () => syncMobileChatViewport(true));
  }
  window.addEventListener('orientationchange', () => settleMobileChatViewport(true));
  syncMobileChatViewport(false);
}

function initQuickCapture() {
  const ta = document.getElementById('quickCaptureInput');
  if (!ta) return;

  refreshCaptureGreeting();

  ta.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickCapture();
    }
  });
  // Auto focus if no idea is selected
  if (!currentId) setTimeout(() => ta.focus(), 100);
}

async function handleQuickCapture() {
  const ta = document.getElementById('quickCaptureInput');
  const text = ta.value.trim();
  if (!text) return;

  // 1. Create temporary name
  const name = text.length > 12 ? text.slice(0, 12) + '...' : text;
  
  // 2. Create the idea
  const idea = { 
    id: Date.now(), 
    name, 
    status: 'seed', 
    nodes: [], 
    chatHistory: [], 
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  };
  
  ideas.unshift(idea);
  saveIdeas();
  ta.value = '';
  
  // 3. Switch to the view
  await selectIdea(idea.id, { expandChat: true });
  
  // 4. Send the text as the first message
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.value = text;
    // We need to trigger sendMessage manually
    sendMessage();
  }
}

// ── Ideas ──
function saveIdeas() {
  localStorage.setItem('drawer_ideas', JSON.stringify(ideas));
  window.DrawerAtlasView?.invalidate();
}

function exportDrawerBackup() {
  const universeChats = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key?.startsWith('uchat_')) {
      try { universeChats[key] = JSON.parse(localStorage.getItem(key) || '[]'); }
      catch (_) { universeChats[key] = []; }
    }
  }

  const backup = {
    format: 'drawer-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      ideas,
      universeChats,
      preferences: {
        language: currentLanguage,
        fontSize
      }
    }
  };

  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `drawer-backup-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importDrawerBackup(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (!file) return;

  try {
    const backup = JSON.parse(await file.text());
    const data = backup?.data;
    if (backup?.format !== 'drawer-backup' || backup?.version !== 1 || !Array.isArray(data?.ideas)) {
      throw new Error(t('这不是有效的抽屉备份文件。', 'This is not a valid Drawer backup file.'));
    }

    const universeChats = data.universeChats;
    if (universeChats != null && (typeof universeChats !== 'object' || Array.isArray(universeChats))) {
      throw new Error(t('备份中的宇宙聊天数据无效。', 'The universe chat data in this backup is invalid.'));
    }

    const confirmed = confirm(t(
      `将用备份中的 ${data.ideas.length} 个点子替换当前浏览器里的全部抽屉数据。API Key 会保留。继续吗？`,
      `This will replace all Drawer data in this browser with ${data.ideas.length} ideas from the backup. Your API key will be kept. Continue?`
    ));
    if (!confirmed) return;

    const chatKeys = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith('uchat_')) chatKeys.push(key);
    }
    chatKeys.forEach(key => localStorage.removeItem(key));

    localStorage.setItem('drawer_ideas', JSON.stringify(data.ideas));
    Object.entries(universeChats || {}).forEach(([key, history]) => {
      if (key.startsWith('uchat_') && Array.isArray(history)) {
        localStorage.setItem(key, JSON.stringify(history));
      }
    });

    const preferences = data.preferences || {};
    if (preferences.language === 'zh' || preferences.language === 'en') {
      localStorage.setItem('drawer_language', preferences.language);
    }
    if (['small', 'medium', 'large'].includes(preferences.fontSize)) {
      localStorage.setItem('drawer_font_size', preferences.fontSize);
    }

    alert(t(
      `恢复成功：已导入 ${data.ideas.length} 个点子。`,
      `Restore complete: ${data.ideas.length} ideas imported.`
    ));
    location.reload();
  } catch (error) {
    alert(error?.message || t('备份恢复失败，请检查文件后重试。', 'Restore failed. Check the file and try again.'));
  } finally {
    input.value = '';
  }
}
function getIdea(id) {
  return ideas.find(i => i.id === id)
    || (conceptUniverseActive ? conceptUniverseIdeas.find(i => i.id === id) : null);
}

function createIdea() {
  const name = document.getElementById('newIdeaInput').value.trim();
  if (!name) return;
  const idea = { id: Date.now(), name, status: 'seed', nodes: [], chatHistory: [], createdAt: Date.now(), updatedAt: Date.now() };
  ideas.unshift(idea);
  saveIdeas();
  document.getElementById('newIdeaInput').value = '';
  closeModal('newIdeaModal');
  renderList();
  selectIdea(idea.id, { expandChat: true });
  // Close sidebar on mobile after creation
  const panel = document.getElementById('listPanel');
  if (panel && panel.classList.contains('open')) toggleSidebar();
}

function deleteCurrentIdea() {
  if (!currentId || !confirm('删掉这个整个点子？')) return;
  ideas = ideas.filter(i => i.id !== currentId);
  saveIdeas(); currentId = null; chatHistory = [];
  renderList(); showNoSel(); renderGraph();
}

function clearCurrentChat() {
  if (!currentId || !confirm('清空这个点子的所有对话历史？\n（右侧的节点图谱会保留）')) return;
  const idea = getIdea(currentId);
  if (idea) {
    idea.chatHistory = [];
    chatHistory = [];
    saveIdeas();
    selectIdea(currentId);
  }
}

function updateStatus(status) {
  const idea = getIdea(currentId);
  if (idea) { idea.status = status; idea.updatedAt = Date.now(); saveIdeas(); renderList(); updateIdeaHero(idea); }
}

function updateDrawerLabel(isOpen) {
  const btn = document.getElementById('drawerToggleBtn');
  const text = document.getElementById('drawerToggleText');
  const ideaView = document.getElementById('ideaView');
  if (ideaView) ideaView.classList.toggle('chat-open', Boolean(isOpen));
  if (text) text.textContent = isOpen ? t('收起对话', 'Close chat') : t('展开对话', 'Open chat');
  if (btn) {
    const label = isOpen ? t('收起对话', 'Close chat') : t('展开对话', 'Open chat');
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }
}

function updateIdeaHero(idea) {
  if (!idea) return;
  const summary = document.getElementById('ideaHeroSummary');
  const number = document.getElementById('ideaHeroNumber');
  const statusText = document.getElementById('ideaStatusText');
  const statusChip = document.getElementById('ideaStatusChip');
  const connectionChip = document.getElementById('ideaConnectionChip');
  const connectionCount = document.getElementById('ideaConnectionCount');
  const createdChip = document.getElementById('ideaCreatedChip');
  const createdDate = document.getElementById('ideaCreatedDate');
  const statusSelect = document.getElementById('statusSel');
  const chatSubtitle = document.getElementById('chatIdeaSubtitle');
  const chatContext = document.getElementById('chatContextText');
  const statusLabels = currentLanguage === 'en'
    ? { seed: 'New seed', grow: 'Active', pause: 'Parked' }
    : { seed: '刚刚萌芽', grow: '进行中', pause: '暂时搁置' };
  if (summary) {
    const text = idea.card?.origin || idea.card?.core || t('这个点子还在形成中，继续聊几句，让它慢慢长出轮廓。', 'This idea is still forming. Keep talking and let its shape emerge.');
    summary.textContent = text.replace(/^[“\"]|[”\"]$/g, '');
  }
  if (number) number.textContent = `· Idea #${String(idea.id).slice(-3).padStart(3, '0')}`;
  if (statusText) statusText.textContent = statusLabels[idea.status] || statusLabels.seed;
  if (statusChip) statusChip.className = `idea-meta-chip is-active status-${idea.status || 'seed'}`;
  const nodeCount = (idea.nodes || []).length;
  const nodeLabel = currentLanguage === 'en' ? `${nodeCount} nodes connected` : `已连接 ${nodeCount} 个节点`;
  if (connectionCount) connectionCount.textContent = nodeCount;
  if (connectionChip) {
    connectionChip.setAttribute('aria-label', nodeLabel);
    connectionChip.setAttribute('title', nodeLabel);
  }
  if (createdChip) {
    const created = new Date(idea.createdAt || Date.now());
    const fullCreatedLabel = currentLanguage === 'en'
      ? `Created ${created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : `创建于 ${created.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`;
    createdChip.setAttribute('aria-label', fullCreatedLabel);
    createdChip.setAttribute('title', fullCreatedLabel);
    if (createdDate) {
      createdDate.textContent = created.toLocaleDateString(currentLanguage === 'en' ? 'en-US' : 'zh-CN', {
        month: currentLanguage === 'en' ? 'short' : 'numeric',
        day: 'numeric'
      });
    }
  }
  if (statusSelect) {
    const statusLabel = statusLabels[idea.status] || statusLabels.seed;
    const accessibleStatus = `${t('点子状态', 'Idea status')}：${statusLabel}`;
    statusSelect.setAttribute('aria-label', accessibleStatus);
    statusSelect.setAttribute('title', accessibleStatus);
  }
  if (chatSubtitle) chatSubtitle.textContent = idea.name;
  if (chatContext) chatContext.textContent = idea.card?.tensions || idea.card?.next || idea.card?.core || t('当前点子的核心问题', 'the core question of this idea');
}

function startRename() {
  const idea = getIdea(currentId);
  if (!idea) return;
  const el = document.getElementById('ideaBarName');
  const inp = document.createElement('input');
  inp.className = 'idea-bar-name-input'; inp.value = idea.name;
  el.replaceWith(inp); inp.focus(); inp.select();
  const done = () => {
    if (inp.value.trim()) { idea.name = inp.value.trim(); saveIdeas(); renderList(); }
    const newEl = document.createElement('div');
    newEl.className = 'idea-bar-name'; newEl.id = 'ideaBarName';
    newEl.onclick = startRename; newEl.title = t('点击重命名', 'Click to rename');
    newEl.textContent = idea.name; inp.replaceWith(newEl);
  };
  inp.addEventListener('blur', done);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = idea.name; inp.blur(); } });
}

function addNode(text, type, keyword) {
  if (!currentId) return;
  const idea = getIdea(currentId);
  if (!idea) return;
  idea.nodes.push({
    id: Date.now(), text, type, keyword: keyword || text.slice(0, 6), tasks: [],
    time: new Date().toLocaleString(currentLanguage === 'en' ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  });
  idea.updatedAt = Date.now();
  saveIdeas(); renderList(); renderGraph();
}

// ── Select Idea ──
async function selectIdea(id, options = {}) {
  currentId = id;
  const idea = getIdea(id);
  chatHistory = idea.chatHistory || [];
  renderList(); showIdeaView(); renderGraph(); renderCard();

  document.getElementById('ideaBarName').textContent = idea.name;
  document.getElementById('statusSel').value = idea.status;
  updateIdeaHero(idea);

  // Confetti for first-time supernova viewing
  if (idea.type === 'supernova' && !idea.hasBeenViewed) {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 70, spread: 90, colors: ['#7ec8e3', '#b8d8e8', '#eee7da', '#d7a454'], origin: { y: 0.5 } });
    }
    idea.hasBeenViewed = true;
    saveIdeas();
  }

  const drawer = document.getElementById('drawerPanel');
  const drawerBtn = document.getElementById('drawerToggleBtn');
  if (options.expandChat) {
    drawer.classList.add('open');
    drawer.classList.remove('closed');
    updateDrawerLabel(true);
  } else {
    drawer.classList.add('closed');
    drawer.classList.remove('open');
    updateDrawerLabel(false);
  }

  // Seed memory (only for old ideas that lack chatHistory)
  if (idea.nodes.length > 0 && (!chatHistory || chatHistory.length === 0)) {
    const memory = idea.nodes.slice(-4).map(n => n.text).join(currentLanguage === 'en' ? '; ' : '；');
    chatHistory = [
      { role: 'user', content: currentLanguage === 'en' ? `Idea: ${idea.name}. Previous nodes: ${memory}` : `点子名：${idea.name}。之前的节点：${memory}` },
      { role: 'assistant', content: t('我记着了。', 'I remember.') }
    ];
    idea.chatHistory = chatHistory;
    saveIdeas();
  }

  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';

  if (chatHistory.length > 0) {
    // Render existing chat history
    chatHistory.forEach((msg, idx) => {
      appendMsg(
        msg.role === 'user' ? 'user' : 'ai',
        msg.content,
        msg.role !== 'user' && idx >= 2,
        idx,
        { showPrivacyNote: Boolean(msg.privacyNotice) }
      );
    });
  } else if (idea.nodes.length === 0 && chatHistory.length === 0) {
    // First time
    const initialMsg = currentLanguage === 'en'
      ? `“${idea.name}” — what shape does it have in your mind right now? Even one word is enough.`
      : `“${idea.name}”——现在在你脑子里是什么状态？哪怕一个词。`;
    appendMsg('ai', initialMsg, false);
    chatHistory.push({ role: 'assistant', content: initialMsg });
    idea.chatHistory = chatHistory;
    saveIdeas();
  } else {
    if (chatHistory.length === 0 || chatHistory[chatHistory.length - 1].role !== 'assistant') {
      appendMsg('ai', '⋯', false);
      const hook = await generateHook(idea);
      msgs.lastElementChild.remove(); // Remove the typing dots msg
      appendMsg('ai', hook, false);
      chatHistory.push({ role: 'assistant', content: hook });
      saveIdeas();
    }
  }
}

async function generateHook(idea) {
  const lastNode = idea.nodes[idea.nodes.length - 1];
  const allNodes = idea.nodes.map(n => n.text).join('；');
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let res = await fetch('/api/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 120,
        messages: [
          {
            role: 'system', content: `你帮用户重新进入一个搁置中的想法。
根据这些节点，生成一个钩子句——不是"你有什么新想法"，而是从节点里找一个未解决的张力或者悬而未决的问题，直接抛给用户。
例如："上次卡在'切入点'这里——你现在还卡着吗？"
或者："你之前说想对大写的人有用，但同时又说不能太难落地。这个矛盾解了吗？"
一句话，不超过40字，口语，直接。不要任何解释或前缀。` },
          { role: 'user', content: `点子：${idea.name}\n节点：${allNodes}\n最新节点：${lastNode.text}` }
        ]
      })
    });
    const data = await res.json();
    return data.choices[0].message.content.trim().replace(/^["「『]|["」』]$/g, '');
  } catch (e) {
    return currentLanguage === 'en'
      ? `Last time we reached “${lastNode.keyword}”. Where is that direction now?`
      : `上次聊到“${lastNode.keyword}”——那个方向现在怎么样了？`;
  }
}

function showIdeaView() {
  const noSel = document.getElementById('noSel');
  if (noSel) noSel.style.display = 'none';
  const v = document.getElementById('ideaView');
  if (v) v.style.display = 'flex';
  const u = document.getElementById('universeView');
  if (u) u.style.display = 'none';
  document.getElementById('universeSidebarBtn').classList.remove('active');
  setCardPageScroll(document.getElementById('tabCard')?.classList.contains('active'));
}
function showNoSel() {
  setCardPageScroll(false);
  const noSel = document.getElementById('noSel');
  if (noSel) noSel.style.display = 'block';
  renderHomePlanets();
  const v = document.getElementById('ideaView');
  if (v) v.style.display = 'none';
  const u = document.getElementById('universeView');
  if (u) u.style.display = 'none';
  document.getElementById('universeSidebarBtn').classList.remove('active');
}

// ── Universe View ──
let universeSim = null;
let universeFocusId = null;
let inspectedUniverseIdeaId = null;
let activeUniverseLinks = [];

function shouldOfferConceptUniverse() {
  const hasRealUniverseIdea = ideas.some(idea => idea.card?.core);
  if (hasRealUniverseIdea) return false;
  const forced = new URLSearchParams(window.location.search).get('concept') === '1';
  if (forced) return true;
  if (localStorage.getItem(CONCEPT_UNIVERSE_DISMISSED_KEY)) return false;
  return true;
}

function clearConceptUniverseTimers() {
  conceptUniverseTimers.forEach(timer => clearTimeout(timer));
  conceptUniverseTimers = [];
}

function updateConceptUniverseGuide(phase) {
  const guide = document.getElementById('conceptUniverseGuide');
  if (!guide) return;
  const title = document.getElementById('conceptGuideTitle');
  const body = document.getElementById('conceptGuideBody');
  const progress = [...guide.querySelectorAll('.concept-guide-step')];
  guide.classList.add('show');
  guide.classList.remove('phase-1', 'phase-2', 'phase-3', 'action-ready', 'guide-positioned');
  guide.classList.add(`phase-${phase}`);
  guide.setAttribute('aria-hidden', 'false');
  progress.forEach((item, index) => {
    item.classList.toggle('active', index <= phase - 1);
    item.classList.toggle('current', index === phase - 1);
    if (index === phase - 1) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  if (phase === 1) {
    title.textContent = t('先送你四颗星', 'Here are four stars');
    body.textContent = t(
      '它们和真正的点子一样，会在同一片力场里漂浮，也可以被你拖着走。',
      'They float in the same force field as real ideas, and you can drag them around.'
    );
  } else if (phase === 2) {
    title.textContent = t('连接出现了', 'A connection appeared');
    body.textContent = t(
      '点子不需要被手动归类。它们靠近时，宇宙会把藏着的联系慢慢画出来。',
      'Ideas do not need manual filing. As they draw near, the universe reveals their hidden thread.'
    );
  } else {
    title.textContent = t('第三个方向出现了', 'A third direction appeared');
    body.textContent = t(
      '「情绪价值饮食顾问」与「情绪天气预报」碰撞后，长出了一颗候选新星。',
      '“Emotional Eating Guide” and “Mood Weather” collided and grew a candidate supernova.'
    );
  }
}

function positionSceneGuideConnector(guide, targetX, targetY, guideLeft, guideTop, guideWidth) {
  if (!guide) return;
  let connector = guide.querySelector('.scene-guide-connector');
  if (!connector) {
    connector = document.createElement('i');
    connector.className = 'scene-guide-connector';
    connector.setAttribute('aria-hidden', 'true');
    guide.prepend(connector);
  }
  const targetIsLeft = targetX < guideLeft + guideWidth / 2;
  const anchorX = targetIsLeft ? 0 : guideWidth;
  const anchorY = Math.min(48, Math.max(22, guide.offsetHeight * .42));
  const dx = targetX - (guideLeft + anchorX);
  const dy = targetY - (guideTop + anchorY);
  connector.style.left = `${anchorX}px`;
  connector.style.top = `${anchorY}px`;
  connector.style.width = `${Math.max(18, Math.hypot(dx, dy))}px`;
  connector.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
}
window.positionSceneGuideConnector = positionSceneGuideConnector;

function positionConceptUniverseGuide(nodes, svgWrap) {
  const guide = document.getElementById('conceptUniverseGuide');
  if (!guide || !conceptUniverseActive || !nodes?.length || !svgWrap) return;
  const phase = conceptUniversePhase || 1;
  let targetX = svgWrap.clientWidth * .5;
  let targetY = svgWrap.clientHeight * .42;

  let connectorTargetX = targetX;
  let connectorTargetY = targetY;
  if (phase === 1) {
    const borrowed = nodes.filter(node => node.id !== 'concept-climate-menu');
    targetX = borrowed.reduce((sum, node) => sum + Number(node.x || 0), 0) / Math.max(1, borrowed.length);
    targetY = borrowed.reduce((sum, node) => sum + Number(node.y || 0), 0) / Math.max(1, borrowed.length);
    const pointedStar = nodes.find(node => node.id === 'concept-food') || borrowed[0];
    connectorTargetX = Number(pointedStar?.x || targetX);
    connectorTargetY = Number(pointedStar?.y || targetY);
  } else if (phase === 2) {
    const source = nodes.find(node => node.id === 'concept-food');
    const target = nodes.find(node => node.id === 'concept-weather');
    if (source && target) {
      targetX = (source.x + target.x) / 2;
      targetY = (source.y + target.y) / 2;
      connectorTargetX = targetX;
      connectorTargetY = targetY;
    }
  } else {
    const born = nodes.find(node => node.id === 'concept-climate-menu');
    if (born) {
      targetX = born.x;
      targetY = born.y;
      connectorTargetX = targetX;
      connectorTargetY = targetY;
    }
  }

  const guideWidth = Math.min(292, Math.max(210, svgWrap.clientWidth * .28));
  const offsetX = phase === 1 ? -guideWidth - 120 : 120;
  const offsetY = phase === 1 ? -96 : -112;
  const left = Math.max(18, Math.min(svgWrap.clientWidth - guideWidth - 18, targetX + offsetX));
  const top = Math.max(svgWrap.offsetTop + 18, Math.min(
    svgWrap.offsetTop + svgWrap.clientHeight - 132,
    svgWrap.offsetTop + targetY + offsetY
  ));
  guide.style.width = `${guideWidth}px`;
  guide.style.left = `${left}px`;
  guide.style.top = `${top}px`;
  positionSceneGuideConnector(
    guide,
    connectorTargetX,
    svgWrap.offsetTop + connectorTargetY,
    left,
    top,
    guideWidth
  );
  guide.classList.add('guide-positioned');
}

function showConceptSupernovaBirth() {
  const wrap = document.getElementById('universeSvgWrap');
  if (!wrap) return;
  const flash = document.createElement('div');
  flash.className = 'supernova-birth-flash concept-supernova-flash';
  flash.style.left = '68%';
  flash.style.top = '44%';
  wrap.appendChild(flash);
  setTimeout(() => flash.remove(), 1800);
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 34,
      spread: 88,
      startVelocity: 18,
      colors: ['#7ec8e3', '#5aa8c3', '#aedff5', '#ffffff'],
      origin: { x: 0.68, y: 0.44 },
      gravity: 0.38,
      ticks: 80
    });
  }
}

function scheduleConceptUniverseAdvance() {
  clearConceptUniverseTimers();
  if (!conceptUniverseActive) return;
  if (conceptUniversePhase >= 3) {
    conceptUniverseTimers.push(setTimeout(() => {
      if (!conceptUniverseActive) return;
      document.getElementById('conceptUniverseGuide')?.classList.add('action-ready');
    }, 2200));
    return;
  }
  conceptUniverseTimers.push(setTimeout(() => {
    if (!conceptUniverseActive || document.getElementById('universeView')?.style.display === 'none') return;
    goToConceptUniversePhase(conceptUniversePhase + 1);
  }, CONCEPT_UNIVERSE_PHASE_DURATIONS[conceptUniversePhase]));
}

function goToConceptUniversePhase(phase, options = {}) {
  const nextPhase = Math.max(1, Math.min(3, Number(phase) || 1));
  const previousPhase = conceptUniversePhase;
  clearConceptUniverseTimers();
  conceptUniverseActive = true;
  conceptUniversePhase = nextPhase;
  conceptUniverseIdeas = buildConceptUniverseIdeas(nextPhase >= 3);
  universeFocusId = conceptUniverseIdeas[0].id;
  updateConceptUniverseGuide(nextPhase);

  if (options.render !== false) {
    renderUniverse({
      skipEmbeddingSync: true,
      conceptTransition: nextPhase === 2 ? 'links' : nextPhase === 3 ? 'supernova' : 'stars'
    });
  }
  if (nextPhase === 3 && previousPhase !== 3) {
    showConceptSupernovaBirth();
  }
  scheduleConceptUniverseAdvance();
}

function startConceptUniverseTour() {
  goToConceptUniversePhase(1, { render: false });
}

function dismissConceptUniverseForRealIdea() {
  if (!ideas.some(idea => idea.card?.core)) return;
  localStorage.setItem(CONCEPT_UNIVERSE_DISMISSED_KEY, '1');
  clearConceptUniverseTimers();
  conceptUniverseActive = false;
  conceptUniversePhase = 0;
  conceptUniverseIdeas = [];
  const guide = document.getElementById('conceptUniverseGuide');
  guide?.classList.remove('show');
  guide?.setAttribute('aria-hidden', 'true');
}

function finishConceptUniverseTour() {
  localStorage.setItem(CONCEPT_UNIVERSE_DISMISSED_KEY, '1');
  clearConceptUniverseTimers();
  conceptUniverseActive = false;
  conceptUniversePhase = 0;
  conceptUniverseIdeas = [];
  const guide = document.getElementById('conceptUniverseGuide');
  guide?.classList.remove('show');
  guide?.setAttribute('aria-hidden', 'true');
  if (ideas.length >= 1) {
    universeFocusId = ideas.find(idea => idea.card?.core)?.id || ideas[0]?.id || null;
    renderUniverse();
    return;
  }
  showNoSel();
  setTimeout(() => document.getElementById('quickCaptureInput')?.focus(), 120);
}

function showUniverse() {
  setCardPageScroll(false);
  const launchConceptTour = shouldOfferConceptUniverse();
  if (launchConceptTour && !conceptUniverseActive) startConceptUniverseTour();
  universeFocusId = conceptUniverseActive
    ? conceptUniverseIdeas[0]?.id || null
    : currentId || universeFocusId || ideas.find(i => i.card && i.card.core)?.id || ideas[0]?.id || null;
  currentId = null;
  const noSel = document.getElementById('noSel');
  if (noSel) noSel.style.display = 'none';
  const v = document.getElementById('ideaView');
  if (v) v.style.display = 'none';
  const u = document.getElementById('universeView');
  if (u) u.style.display = 'flex';
  
  // Highlight sidebar button
  document.getElementById('universeSidebarBtn').classList.add('active');
  
  // Deselect ideas in list
  renderList();
  
  // Close sidebar on mobile
  const panel = document.getElementById('listPanel');
  if (panel && panel.classList.contains('open')) toggleSidebar();
  closeUniverseInspector();
  if (window.DrawerAtlasView && conceptUniverseActive) window.DrawerAtlasView.switchMode('gravity');
  else if (window.DrawerAtlasView) window.DrawerAtlasView.activate();
  else renderUniverse();
}

function openUniverseInspector(id) {
  const idea = getIdea(id);
  const panel = document.getElementById('universeInspector');
  if (!idea || !panel) return;
  inspectedUniverseIdeaId = id;
  if (typeof d3 !== 'undefined') {
    d3.selectAll('#universeSvg .universe-node').classed('selected', d => d && d.id === id);
  }
  const isFocus = id === universeFocusId;
  document.getElementById('universeInspectorKicker').textContent = isFocus ? t('当前中心', 'CURRENT FOCUS') : t('进入视野', 'IN VIEW');
  document.getElementById('universeInspectorTitle').textContent = idea.name;
  document.getElementById('universeInspectorCore').textContent = idea.card?.core || t('这个点子还没有被展开。打开它，聊几句，让轮廓慢慢出现。', 'This idea has not been unfolded yet. Open it and let its shape emerge.');
  const relation = activeUniverseLinks.find(link => {
    const sourceId = link.source?.id || link.source;
    const targetId = link.target?.id || link.target;
    return (sourceId === universeFocusId && targetId === id) || (targetId === universeFocusId && sourceId === id);
  });
  const reasonEl = document.getElementById('universeInspectorReason');
  if (id === universeFocusId) {
    reasonEl.textContent = t('这是当前的引力中心。周围的点子由它牵引进入视野。', 'This is the current center of gravity. Nearby ideas are pulled into view around it.');
  } else if (relation) {
    const label = relation.relation === 'collision'
      ? t('生成血缘', 'Generative lineage')
      : relation.sourceType === 'embedding'
        ? t('潜在暗线', 'Hidden thread')
        : t('回声', 'Echo');
    const fallback = relation.sourceType === 'embedding'
      ? t('把它们放在一起看，也许会出现第三种方向。', 'Put them side by side; a third direction may appear.')
      : (currentLanguage === 'en' ? `Both touch “${relation.sharedChars}”` : `共同触及「${relation.sharedChars}」`);
    reasonEl.textContent = `${label} · ${relation.aiReason || fallback}`;
  } else {
    reasonEl.textContent = t('它暂时没有与中心形成足够清晰的联系。', 'Its connection to the center is not clear enough yet.');
  }
  const nextEl = document.getElementById('universeInspectorNext');
  nextEl.textContent = idea.card?.next ? (currentLanguage === 'en' ? `Continue with: ${idea.card.next}` : `可以继续：${idea.card.next}`) : '';
  nextEl.style.display = idea.card?.next ? 'block' : 'none';
  const nodeCount = (idea.nodes || []).length;
  const chatCount = (idea.chatHistory || []).filter(m => m.role === 'user').length;
  const cosmicTypeLabel = getCosmicTypeLabel(getIdeaCosmicType(idea));
  document.getElementById('universeInspectorMeta').textContent = currentLanguage === 'en'
    ? `${chatCount} turns · ${nodeCount} growth nodes · ${cosmicTypeLabel}`
    : `${chatCount} 轮对话 · ${nodeCount} 个生长节点 · ${cosmicTypeLabel}`;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
}

function closeUniverseInspector() {
  const panel = document.getElementById('universeInspector');
  if (panel) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }
  inspectedUniverseIdeaId = null;
  if (typeof d3 !== 'undefined') d3.selectAll('#universeSvg .universe-node').classed('selected', false);
}

function showUniverseNodePreview(event, node) {
  const preview = document.getElementById('universeNodePreview');
  const wrap = document.getElementById('universeSvgWrap');
  if (!preview || !wrap || !node) return;
  const idea = getIdea(node.id);
  if (!idea) return;
  const rect = wrap.getBoundingClientRect();
  const x = Math.max(142, Math.min(rect.width - 142, event.clientX - rect.left));
  const rawY = event.clientY - rect.top;
  const placeBelow = rawY < 210;
  const y = placeBelow ? rawY + 34 : rawY - 28;
  const cosmicType = getIdeaCosmicType(idea);
  const cosmicTypeLabel = getCosmicTypeLabel(cosmicType);
  const date = new Date(idea.updatedAt || idea.createdAt || Date.now()).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  const userTurns = (idea.chatHistory || []).filter(message => message.role === 'user').length;
  const relationCount = activeUniverseLinks.filter(link => {
    const source = link.source?.id || link.source;
    const target = link.target?.id || link.target;
    return source === idea.id || target === idea.id;
  }).length;
  const teaser = idea.card?.core || idea.card?.origin || t('这个点子还没有展开，和它聊几句就会慢慢亮起来。', 'This idea is still dim. Talk with it and let it light up.');
  preview.className = `universe-node-preview ${placeBelow ? 'is-below' : 'is-above'}`;
  preview.style.left = `${x}px`;
  preview.style.top = `${y}px`;
  preview.innerHTML = `
    <div class="universe-preview-row"><span class="universe-preview-status cosmic-${cosmicType}"><i></i>${cosmicTypeLabel}</span><span class="universe-preview-date">${date}</span></div>
    <div class="universe-preview-title">${esc(idea.name)}</div>
    <div class="universe-preview-teaser">${esc(teaser)}</div>
    <div class="universe-preview-meta"><span>${userTurns} 轮对话</span><span>${(idea.nodes || []).length} 个节点</span><span>${relationCount} 条连接</span></div>
    <div class="universe-preview-hint">点击选择 · 双击设为中心</div>`;
  preview.classList.add('show');
  preview.setAttribute('aria-hidden', 'false');
}

function hideUniverseNodePreview() {
  const preview = document.getElementById('universeNodePreview');
  if (!preview) return;
  preview.classList.remove('show');
  preview.setAttribute('aria-hidden', 'true');
}

function openInspectedIdea() {
  if (!inspectedUniverseIdeaId) return;
  const id = inspectedUniverseIdeaId;
  closeUniverseInspector();
  selectIdea(id);
}

function focusInspectedIdea() {
  if (!inspectedUniverseIdeaId) return;
  universeFocusId = inspectedUniverseIdeaId;
  closeUniverseInspector();
  renderUniverse();
}

// ── Universe Chatbox ──
let uChatContext = null; // { idA, idB, history: [] }

function getUChatKey(idA, idB) {
  return `uchat_${[idA, idB].sort().join('_')}`;
}

function openUChat(idA, idB) {
  const ideaA = getIdea(idA);
  const ideaB = getIdea(idB);
  if (!ideaA || !ideaB) return;
  closeUniverseInspector();

  const key = getUChatKey(idA, idB);
  const isConceptPair = Boolean(ideaA.isConcept || ideaB.isConcept);
  const saved = isConceptPair ? null : localStorage.getItem(key);
  const history = saved ? JSON.parse(saved) : [];

  uChatContext = { idA, idB, key, history, transient: isConceptPair };

  // Set title
  document.getElementById('uChatTitle').textContent = `✦ ${ideaA.name} × ${ideaB.name}`;

  // Show adopt/discard button if a supernova exists for this pair
  const adoptBtn = document.getElementById('uChatAdopt');
  const discardBtn = document.getElementById('uChatDiscard');
  const pairKey = stableIdeaPairKey(idA, idB);
  const supernova = ideas.find(i => 
    i.type === 'supernova' && i.parentIds && 
    stableIdeaPairKey(i.parentIds[0], i.parentIds[1]) === pairKey
  );
  if (adoptBtn) adoptBtn.style.display = supernova ? 'inline-block' : 'none';
  if (discardBtn) discardBtn.style.display = supernova ? 'inline-block' : 'none';

  // Render messages
  const msgEl = document.getElementById('uChatMessages');
  msgEl.innerHTML = '';

  if (history.length === 0) {
    // Generate an opening line
    const ctxA = getIdeaFullContext(ideaA);
    const ctxB = getIdeaFullContext(ideaB);
    const opener = currentLanguage === 'en'
      ? `This is where “${ideaA.name}” and “${ideaB.name}” intersect. Explore what becomes possible between them.\n\nSay anything, and I will help you dig deeper.`
      : `这是「${ideaA.name}」和「${ideaB.name}」的交汇空间。你可以在这里探索它们之间的可能性。\n\n说点什么，我来帮你挖深。`;
    appendUMsg('ai', opener);
    history.push({ role: 'assistant', content: opener });
    uChatContext.history = history;
    if (!isConceptPair) localStorage.setItem(key, JSON.stringify(history));
  } else {
    history.forEach(m => appendUMsg(m.role === 'user' ? 'user' : 'ai', m.content));
  }

  // Open panel
  document.getElementById('uChat').classList.add('open');

  // Focus input
  setTimeout(() => document.getElementById('uChatInput').focus(), 350);
}

function closeUChat() {
  document.getElementById('uChat').classList.remove('open');
  uChatContext = null;
}

// Graduate a supernova into a normal idea
function adoptSupernova() {
  if (!uChatContext) return;
  const { idA, idB, history } = uChatContext;
  
  const pairKey = stableIdeaPairKey(idA, idB);
  const supernova = ideas.find(i => 
    i.type === 'supernova' && i.parentIds && 
    stableIdeaPairKey(i.parentIds[0], i.parentIds[1]) === pairKey
  );
  if (!supernova) return;

  // Graduate: remove supernova type, keep everything else
  delete supernova.type;
  supernova.status = 'seed';
  supernova.updatedAt = Date.now();

  // Merge uchat history into the idea's chatHistory
  // Keep existing chatHistory (the AI opener from supernova creation) 
  // and append uchat exchanges
  const existingChat = supernova.chatHistory || [];
  const uChatMsgs = history.filter(m => 
    // Skip if it's the generic opener we auto-generated
    !(m.role === 'assistant' && m.content.includes('交汇空间'))
  );
  supernova.chatHistory = [...existingChat, ...uChatMsgs];

  saveIdeas();

  // Close uchat first
  closeUChat();
  
  // Confetti celebration — gold theme for graduation
  if (typeof confetti === 'function') {
    confetti({ particleCount: 60, spread: 80, colors: ['#d7a454', '#e8c987', '#eee7da', '#a96d3b'], origin: { y: 0.45 } });
  }

  // Brief pause to let user absorb the transition, then navigate
  const sId = supernova.id;
  setTimeout(() => {
    selectIdea(sId);
    renderList();
  }, 800);
}

// Discard a supernova entirely
function discardSupernova() {
  if (!uChatContext) return;
  const { idA, idB, key } = uChatContext;
  
  const pairKey = stableIdeaPairKey(idA, idB);
  const supernovaIndex = ideas.findIndex(i => 
    i.type === 'supernova' && i.parentIds && 
    stableIdeaPairKey(i.parentIds[0], i.parentIds[1]) === pairKey
  );
  if (supernovaIndex === -1) return;

  // Remove the supernova
  const discardedSupernova = ideas[supernovaIndex];
  const parentA = getIdea(idA);
  const parentB = getIdea(idB);
  if (parentA && parentB) rememberSupernovaPairReview(parentA, parentB, 'dismissed');
  ideas.splice(supernovaIndex, 1);
  ideaEmbeddingCache.delete(String(discardedSupernova.id));
  saveIdeas();
  
  // Clear chat history for this pair
  localStorage.removeItem(key);

  closeUChat();
  renderUniverse();
}

function appendUMsg(type, text) {
  const msgEl = document.getElementById('uChatMessages');
  const div = document.createElement('div');
  div.className = `uchat-msg ${type}`;
  const label = type === 'ai' ? '✦ 思维合成' : '你';
  
  // Parse bold markdown and newlines
  let parsedText = esc(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text);font-weight:600">$1</strong>')
    .replace(/\n/g, '<br>');
    
  div.innerHTML = `<div class="uchat-label">${label}</div><div class="uchat-bubble">${parsedText}</div>`;
  msgEl.appendChild(div);
  msgEl.scrollTop = msgEl.scrollHeight;
  return div;
}

async function sendUChatMsg() {
  if (!uChatContext) return;
  const input = document.getElementById('uChatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  // Add user message
  appendUMsg('user', text);
  uChatContext.history.push({ role: 'user', content: text });

  // Typing indicator
  const typing = appendUMsg('ai', '⋯');

  const ideaA = getIdea(uChatContext.idA);
  const ideaB = getIdea(uChatContext.idB);
  const ctxA = getIdeaFullContext(ideaA);
  const ctxB = getIdeaFullContext(ideaB);

  const systemPrompt = `你是"抽屉"的思维交叉探索器。用户正在探索两个想法的交叉空间。

想法A的完整上下文：
${ctxA}

想法B的完整上下文：
${ctxB}

你的任务：
- 基于用户的提问，深入分析两个想法交叉后能产生什么
- 不要重复用户已知的内容，要挖出新的角度或指出矛盾
- 极度口语化，像一个聪明的合伙人
- 【排版要求】：不要输出一整块密密麻麻的文字。使用分段、短句，重要观点用加粗（**文字**），适当使用换行让层次清晰。每次回答控制在150字以内。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...uChatContext.history.slice(-8) // keep last 8 messages for context
  ];

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-') ? `Bearer ${apiKey}` : apiKey;
    }
    const res = await fetch('/api/chat', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 200,
        messages
      })
    });
    const data = await res.json();
    const reply = data.choices[0].message.content.trim();
    typing.remove();
    appendUMsg('ai', reply);
    uChatContext.history.push({ role: 'assistant', content: reply });
  } catch(err) {
    typing.remove();
    appendUMsg('ai', t('连接出了点问题，再试一次？', 'The connection slipped. Try again?'));
  }

  if (!uChatContext.transient) {
    localStorage.setItem(uChatContext.key, JSON.stringify(uChatContext.history));
  }
}

// Wire up input
document.addEventListener('DOMContentLoaded', () => {
  const uInput = document.getElementById('uChatInput');
  if (uInput) {
    uInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUChatMsg();
      }
    });
    uInput.addEventListener('input', () => {
      uInput.style.height = 'auto';
      uInput.style.height = Math.min(uInput.scrollHeight, 100) + 'px';
    });
  }
});

function compactUniverseLabel(idea) {
  const name = String(idea?.name || '').trim();
  if (!name) return t('未命名', 'Untitled');

  const english = name.match(/[A-Za-z][A-Za-z'-]*/g);
  if (english?.length) {
    const stop = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'and', 'or', 'with', 'about', 'my']);
    const words = english.filter(word => !stop.has(word.toLowerCase())).slice(0, 3);
    if (words.length) return words.join(' ');
  }

  const segments = name.split(/[，。！？、：:；;—–·|/]+/)
    .map(part => part.replace(/^(一个|一种|关于|如何|怎么|为什么|我觉得|我想|希望|可能)/, '')
      .replace(/[的是了和与及也在有把让]/g, '').trim())
    .filter(Boolean);
  const source = segments.at(-1) || name;
  const chars = [...source].filter(char => /[\u4e00-\u9fa5A-Za-z0-9]/.test(char));
  return chars.slice(-Math.min(4, chars.length)).join('') || name.slice(0, 8);
}

function updateUniverseSubtitle(ideaCount, starCount) {
  const subtitle = document.getElementById('universeSubtitle');
  if (!subtitle) return;
  const status = universeEmbeddingState === 'syncing'
    ? t(' · 正在计算语义距离…', ' · mapping semantic distance…')
    : universeEmbeddingState === 'ready'
      ? t(' · 向量空间已更新', ' · vector space ready')
      : universeEmbeddingState === 'fallback'
        ? t(' · 使用本地关系回退', ' · using local relation fallback')
        : '';
  subtitle.textContent = currentLanguage === 'en'
    ? `${ideaCount} ideas · ${starCount} stars${status}`
    : `${ideaCount} 个点子 · ${starCount} 颗恒星${status}`;
  document.getElementById('universeView')?.setAttribute('data-embedding-state', universeEmbeddingState);
}

function scheduleUniverseEmbeddingRefresh(ideasWithCards) {
  if (universeEmbeddingJob || Date.now() < universeEmbeddingRetryAt || !ideasWithCards.length) return;
  if (embeddingCacheHydrated && ideasWithCards.every(idea => getCurrentIdeaEmbedding(idea))) {
    universeEmbeddingState = 'ready';
    updateUniverseSubtitle(ideas.length, ideasWithCards.length);
    return;
  }
  universeEmbeddingState = 'syncing';
  updateUniverseSubtitle(ideas.length, ideasWithCards.length);
  universeEmbeddingJob = refreshIdeaEmbeddings(ideasWithCards)
    .then(changed => {
      universeEmbeddingState = 'ready';
      universeEmbeddingRetryAt = 0;
      if (changed && document.getElementById('universeView')?.style.display !== 'none') {
        renderUniverse({ skipEmbeddingSync: true });
      } else {
        updateUniverseSubtitle(ideas.length, ideasWithCards.length);
      }
    })
    .catch(error => {
      console.warn('Embedding space is using the local fallback:', error.message);
      universeEmbeddingState = 'fallback';
      universeEmbeddingRetryAt = Date.now() + 60_000;
      if (document.getElementById('universeView')?.style.display !== 'none') {
        renderUniverse({ skipEmbeddingSync: true });
      } else {
        updateUniverseSubtitle(ideas.length, ideasWithCards.length);
      }
    })
    .finally(() => {
      universeEmbeddingJob = null;
    });
}

function renderUniverse(options = {}) {
  if (window.DrawerAtlasView && window.DrawerAtlasView.getMode() !== 'gravity') return;
  const { skipEmbeddingSync = false, conceptTransition = '' } = options;
  const effectiveConceptTransition = conceptTransition
    || (conceptUniverseActive && conceptUniversePhase === 1 ? 'stars' : '');
  const universeIdeas = conceptUniverseActive ? conceptUniverseIdeas : ideas;
  const svg = d3.select('#universeSvg');
  svg.selectAll('*').remove();
  hideUniverseNodePreview();
  if (universeSim) { universeSim.stop(); universeSim = null; }

  const emptyEl = document.getElementById('universeEmpty');
  const svgWrap = document.getElementById('universeSvgWrap');
  const narration = document.getElementById('universeNarration');
  const subtitle = document.getElementById('universeSubtitle');

  if (universeIdeas.length < 2) {
    emptyEl.style.display = 'flex';
    svgWrap.style.display = 'none';
    narration.style.display = 'none';
    return;
  }

  const ideasWithCards = universeIdeas.filter(i => i.card && i.card.core);
  if (conceptUniverseActive) {
    subtitle.textContent = t(
      `${universeIdeas.length} 颗概念星 · 不会写入你的抽屉`,
      `${universeIdeas.length} concept stars · nothing is saved`
    );
  } else {
    updateUniverseSubtitle(universeIdeas.length, ideasWithCards.length);
  }
  if (!conceptUniverseActive && !skipEmbeddingSync) scheduleUniverseEmbeddingRefresh(ideasWithCards);

  emptyEl.style.display = 'none';
  svgWrap.style.display = 'block';

  const wrap = document.getElementById('universeSvgWrap');
  const w = wrap.clientWidth || 400;
  const h = wrap.clientHeight || 500;

  // Build nodes from all ideas. Color represents origin/type, never workflow status.
  const renderedAt = Date.now();
  const nodes = universeIdeas.map((idea, i) => {
    const hasCard = idea.card && idea.card.core;
    const chatLen = (idea.chatHistory || []).length;
    const nodeCount = (idea.nodes || []).length;
    const cosmicType = getIdeaCosmicType(idea, renderedAt);
    const isDwarf = cosmicType === 'dwarf';

    let baseSize = hasCard ? Math.max(10, Math.min(25, 6 + chatLen * 0.8 + nodeCount * 1.2)) : 4;
    if (isDwarf) baseSize = hasCard ? Math.max(7, baseSize * 0.58) : 5;

    return {
      id: idea.id,
      name: idea.name,
      displayName: currentLanguage === 'en'
        ? (idea.universeLabelEn || compactUniverseLabel(idea))
        : idea.name,
      hasCard,
      core: hasCard ? idea.card.core : '',
      branches: hasCard ? (idea.card.branches || []) : [],
      tensions: hasCard ? (idea.card.tensions || '') : '',
      status: idea.status,
      cosmicType,
      size: baseSize,
      isDwarf,
      chatLen,
      nodeCount,
      isFocus: idea.id === universeFocusId,
      index: i
    };
  });

  // Build links: only between ideas that BOTH have cards
  const links = [];
  const stopWords = new Set('我的了是在有就也都这那和或但如果一个什么会能要不没很更最到把被让用去来说做想看知道觉得感觉因为所以比如其实可以这个那个不是'.split(''));
  const stopBigrams = new Set(['用户','问题','自己','可以','可能','产生','发现','提供','方式','出现','需要','一种','成为','没有','很多','非常','比较','而且','这样','为了']);
  const stopEnglish = new Set(['the','and','that','this','with','from','into','about','what','when','where','which','your','have','has','had','will','would','could','should','not','but','for','are','was','were','been','being','its','our','their','idea','ideas','thing','things','more','very']);

  function extractConcepts(text) {
    const concepts = new Set();
    // Split text by punctuation or spaces to prevent cross-boundary bigrams
    const chunks = text.split(/[^\u4e00-\u9fa5]+/);
    for (const chunk of chunks) {
      if (chunk.length < 2) continue;
      for (let i = 0; i < chunk.length - 1; i++) {
        if (!stopWords.has(chunk[i]) && !stopWords.has(chunk[i+1])) {
          const bg = chunk[i] + chunk[i+1];
          if (!stopBigrams.has(bg)) {
            concepts.add(bg);
          }
        }
      }
    }
    const englishWords = String(text).toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
    englishWords.forEach(word => {
      const normalized = word.replace(/'s$/, '');
      if (!stopEnglish.has(normalized)) concepts.add(normalized);
    });
    return concepts;
  }

  const cardNodes = nodes.filter(n => n.hasCard);
  const embeddingItems = cardNodes.map(node => {
    const idea = universeIdeas.find(candidate => candidate.id === node.id);
    const record = idea ? getCurrentIdeaEmbedding(idea) : null;
    return record ? { id: node.id, vector: record.vector } : null;
  }).filter(Boolean);
  const semanticEdges = DrawerSemanticSpace.buildNeighborGraph(embeddingItems, {
    neighbors: cardNodes.length > 12 ? 3 : 2,
    minSimilarity: 0.34
  });
  const semanticEdgeMap = new Map(semanticEdges.map(edge => [
    [edge.source, edge.target].sort().join(':'),
    edge
  ]));
  const hasCompleteEmbeddingSpace = embeddingItems.length === cardNodes.length;

  cardNodes.forEach((a, i) => {
    const aIdea = universeIdeas.find(idea => idea.id === a.id);
    const aText = [a.name, a.core, ...a.branches, a.tensions, ...(aIdea.nodes || []).map(n => n.text)].join(' ');
    const aConcepts = extractConcepts(aText);
    
    cardNodes.forEach((b, j) => {
      if (j <= i) return;
      const bIdea = universeIdeas.find(idea => idea.id === b.id);
      
      // Check if one is a direct parent of the other (Supernova relationship)
      const isParent = (aIdea.parentIds && aIdea.parentIds.includes(b.id)) || 
                       (bIdea.parentIds && bIdea.parentIds.includes(a.id));
                       
      if (isParent) {
        // Generative lineage stays blue; adopted ideas keep their provenance with a calmer line.
        const isActiveSupernova = aIdea.type === 'supernova' || bIdea.type === 'supernova';
        const childName = aIdea.parentIds && aIdea.parentIds.includes(b.id) ? aIdea.name : bIdea.name;
        links.push({
          source: a.id, target: b.id,
          strength: isActiveSupernova ? 1.0 : 0.5,
          distance: isActiveSupernova ? 92 : 118,
          relation: 'collision',
          sharedChars: '星系纽带',
          aiReason: `血脉相连：「${childName}」的灵感源泉`
        });
        return;
      }

      // Skip text matching if either is an active supernova.
      if (aIdea.type === 'supernova' || bIdea.type === 'supernova') {
        return;
      }

      // The concept tour reveals only its planned threads, but renders them
      // through the same links and force simulation as real ideas.
      if (conceptUniverseActive) return;

      const semanticKey = [a.id, b.id].sort().join(':');
      const semanticEdge = semanticEdgeMap.get(semanticKey);
      if (semanticEdge) {
        links.push({
          source: a.id,
          target: b.id,
          strength: semanticEdge.strength,
          distance: semanticEdge.distance,
          relation: 'echo',
          sourceType: 'embedding',
          similarity: semanticEdge.similarity,
          semanticDistance: semanticEdge.semanticDistance,
          sharedChars: t('尚未展开的暗线', 'an unexplored hidden thread'),
          aiReason: null
        });
        return;
      }

      const bothHaveEmbeddings = embeddingItems.some(item => item.id === a.id)
        && embeddingItems.some(item => item.id === b.id);
      if (hasCompleteEmbeddingSpace || bothHaveEmbeddings) return;

      // Match against the full card and pinned nodes, in both Chinese and English.
      const bText = [b.name, b.core, ...b.branches, b.tensions, ...(bIdea.nodes || []).map(n => n.text)].join(' ');
      const bConcepts = extractConcepts(bText);
      const shared = [...aConcepts].filter(concept => bConcepts.has(concept));
      
      // One meaningful shared concept creates a faint echo; more evidence strengthens it.
      if (shared.length >= 1) {
        links.push({ 
          source: a.id, target: b.id, 
          strength: Math.min(0.34 + (shared.length - 1) * 0.22, 1.0),
          distance: 160,
          relation: 'echo',
          sourceType: 'keyword',
          sharedChars: shared.slice(0, 3).join('、'),
          aiReason: null 
        });
      }
    });
  });
  if (conceptUniverseActive && conceptUniversePhase >= 2) {
    const conceptLinks = [
      {
        source: 'concept-food',
        target: 'concept-weather',
        strength: 0.82,
        distance: 132,
        relation: 'echo',
        sourceType: 'concept',
        sharedChars: '情绪线索',
        aiReason: '一个从食物读情绪，一个从照片看天气——它们都在寻找生活留下的感受读数'
      },
      {
        source: 'concept-needed',
        target: 'concept-drawer',
        strength: 0.54,
        distance: 158,
        relation: 'echo',
        sourceType: 'concept',
        sharedChars: '留下位置',
        aiReason: '一个点子被保存下来，也是在确认：这个念头曾经被世界需要过'
      }
    ];
    conceptLinks.forEach(link => {
      const key = [link.source, link.target].sort().join(':');
      const exists = links.some(candidate => [
        candidate.source?.id || candidate.source,
        candidate.target?.id || candidate.target
      ].sort().join(':') === key);
      if (!exists) links.push(link);
    });
  }
  activeUniverseLinks = links;
  if (!conceptUniverseActive) reportLocalSemanticDiagnostics(embeddingItems, cardNodes.length);

  // Glow filter
  const defs = svg.append('defs');
  const filter = defs.append('filter').attr('id', 'glow');
  filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
  const merge = filter.append('feMerge');
  merge.append('feMergeNode').attr('in', 'coloredBlur');
  merge.append('feMergeNode').attr('in', 'SourceGraphic');

  // Stronger glow for link hover
  const glowStrong = defs.append('filter').attr('id', 'glowStrong');
  glowStrong.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'coloredBlur');
  const merge2 = glowStrong.append('feMerge');
  merge2.append('feMergeNode').attr('in', 'coloredBlur');
  merge2.append('feMergeNode').attr('in', 'SourceGraphic');

  // Star field background
  const starGroup = svg.append('g').attr('class', 'star-field');
  for (let i = 0; i < 160; i++) {
    starGroup.append('circle')
      .attr('cx', Math.random() * w)
      .attr('cy', Math.random() * h)
      .attr('r', Math.random() * 1.2)
      .attr('fill', '#c8b89a')
      .attr('opacity', Math.random() * 0.28 + 0.04);
  }

  const focusBackdrop = nodes.find(d => d.isFocus);
  if (focusBackdrop) {
    const orbitGroup = svg.append('g').attr('class', 'focus-orbits').attr('pointer-events', 'none');
    [62, 108, 168].forEach((radius, index) => {
      orbitGroup.append('circle')
        .attr('cx', w / 2).attr('cy', h / 2).attr('r', radius)
        .attr('fill', 'none').attr('stroke', '#d7a454')
        .attr('stroke-width', index === 0 ? 0.8 : 0.5)
        .attr('stroke-dasharray', index === 0 ? '2,6' : '1,10')
        .attr('opacity', 0.13 - index * 0.025);
    });
  }

  // Links - invisible fat hit area behind visible line
  const linkHitArea = svg.append('g').selectAll('line')
    .data(links).join('line')
    .attr('stroke', 'transparent')
    .attr('stroke-width', 20)
    .attr('cursor', 'pointer');

  // Links - visible thin line
  const linkSel = svg.append('g').selectAll('line')
    .data(links).join('line')
    .attr('class', d => `universe-link ${conceptUniverseActive ? 'concept-universe-link' : ''} relation-${d.relation}`)
    .attr('stroke', d => d.relation === 'collision' ? '#7ec8e3' : '#d7a454')
    .attr('stroke-width', d => 0.5 + d.strength * 1.5)
    .attr('stroke-dasharray', '4,4')
    .attr('stroke-dashoffset', conceptUniverseActive && effectiveConceptTransition ? 72 : 0)
    .attr('opacity', d => conceptUniverseActive && effectiveConceptTransition ? 0 : 0.12 + d.strength * 0.25)
    .attr('filter', 'url(#glow)')
    .attr('pointer-events', 'none');

  if (conceptUniverseActive && effectiveConceptTransition) {
    linkSel.transition()
      .delay(d => d.relation === 'collision' ? 520 : 180)
      .duration(d => d.relation === 'collision' ? 1250 : 1500)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0)
      .attr('opacity', d => 0.18 + d.strength * 0.34);
  }

  // Node groups
  const nodeSel = svg.append('g').selectAll('g')
    .data(nodes).join('g')
    .attr('class', d => `universe-node ${d.id === 'concept-climate-menu' ? 'concept-born-star' : ''}`)
    .attr('opacity', d => conceptUniverseActive
      && effectiveConceptTransition === 'supernova'
      && d.id === 'concept-climate-menu' ? 0 : 1)
    .attr('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) universeSim.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) universeSim.alphaTarget(0); d.fx = null; d.fy = null; }))
    .on('click', (e, d) => {
      e.stopPropagation();
      hideUniverseNodePreview();
      openUniverseInspector(d.id);
    })
    .on('dblclick', (e, d) => {
      e.stopPropagation();
      universeFocusId = d.id;
      closeUniverseInspector();
      hideUniverseNodePreview();
      renderUniverse();
    });

  // Planet rendering: gold = user's developed idea, silver = white dwarf, blue = candidate supernova.
  const cosmicColors = {
    idea: '#d7a454',
    dwarf: '#c5c9cc',
    supernova: '#7ec8e3'
  };
  function getNodeColor(d) {
    return cosmicColors[d.cosmicType] || cosmicColors.idea;
  }

  // Outer body
  nodeSel.append('circle')
    .attr('r', d => d.size + (d.isFocus ? 8 : 0))
    .attr('fill', d => getNodeColor(d) + (d.isDwarf ? '11' : '22'))
    .attr('stroke', d => getNodeColor(d))
    .attr('stroke-width', d => d.isFocus ? 2.5 : (d.isDwarf ? 1 : 1.5))
    .attr('stroke-dasharray', d => d.isDwarf && !d.hasCard ? '2,3' : null)
    .attr('filter', d => d.isDwarf ? null : 'url(#glow)');

  // Inner core
  nodeSel.append('circle')
    .attr('r', d => Math.max(2.5, (d.size + (d.isFocus ? 8 : 0)) * 0.3))
    .attr('fill', d => getNodeColor(d))
    .attr('opacity', d => d.isDwarf ? 0.6 : 0.9);

  // Labels
  nodeSel.append('text')
    .attr('y', d => d.size + (d.isFocus ? 8 : 0) + 16)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Noto Serif SC, serif')
    .attr('font-size', d => d.isDwarf ? '9px' : '11px')
    .attr('font-weight', '300')
    .attr('fill', d => d.isDwarf ? cosmicColors.dwarf : '#c8b89a')
    .attr('opacity', d => {
      if (d.isFocus) return 1;
      if (d.isDwarf) return 0.42;
      return d.size >= 16 ? 0.82 : 0.58;
    })
    .text(d => currentLanguage === 'en'
      ? d.displayName
      : (d.displayName.length > 8 ? d.displayName.slice(0, 8) + '…' : d.displayName));

  if (conceptUniverseActive && effectiveConceptTransition === 'stars') {
    nodeSel.attr('opacity', 0)
      .transition()
      .delay((d, index) => 120 + index * 190)
      .duration(720)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);
  } else if (conceptUniverseActive && effectiveConceptTransition === 'supernova') {
    nodeSel.filter(d => d.id === 'concept-climate-menu')
      .transition()
      .delay(320)
      .duration(1100)
      .ease(d3.easeBackOut.overshoot(1.2))
      .attr('opacity', 1);
  }

  // Node hover preview. Link hints continue using nodeTip below.
  const tip = document.getElementById('nodeTip');
  nodeSel
    .on('mouseenter', function(e, d) {
      d3.select(this).select('text').attr('opacity', 1);
      tip.classList.remove('show');
      showUniverseNodePreview(e, d);
    })
    .on('mouseleave', function(e, d) {
      hideUniverseNodePreview();
      const baseOpacity = d.isFocus ? 1 : (d.isDwarf ? 0.42 : (d.size >= 16 ? 0.82 : 0.58));
      d3.select(this).select('text').attr('opacity', baseOpacity);
    });

  // Link interaction via hit area - hover auto-triggers AI
  async function fetchLinkReason(d) {
    if (d.aiReason || d.aiFetching) return;
    d.aiFetching = true;
    const srcNode = nodes.find(n => n.id === (d.source.id || d.source));
    const tgtNode = nodes.find(n => n.id === (d.target.id || d.target));
    if (!srcNode || !tgtNode) return;
    try {
      const headers = { 'Content-Type': 'application/json', 'X-Drawer-Purpose': 'link-insight' };
      if (apiKey) {
        headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-') ? `Bearer ${apiKey}` : apiKey;
      }
      const res = await fetch('/api/chat', {
        method: 'POST', headers,
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 60,
          messages: [
            { role: 'system', content: `从两个想法中各取一个具体元素，写一句让人突然看见它们之间暗线的话。
15-35字，具体、有启发，但不要故作诗意。不要报告相似度，不要用“它们都 / 两者都是 / 都关于”开头，也不要只复述共同主题。
理想效果是让用户想继续追问：把这两个点子放在一起，会不会长出第三个方向？` },
            { role: 'user', content: `「${srcNode.name}」: ${srcNode.core}\n「${tgtNode.name}」: ${tgtNode.core}` }
          ]
        })
      });
      const data = await res.json();
      d.aiReason = data.choices[0].message.content.trim().replace(/^["「『]|["」』。]$/g, '');
    } catch(err) {
      d.aiReason = d.sourceType === 'embedding'
        ? t('把它们放在一起看，也许会出现第三种方向', 'Put them side by side; a third direction may appear')
        : t('文字回声：', 'Textual echo: ') + d.sharedChars;
    }
    d.aiFetching = false;
  }

  function showLinkTip(e, d) {
    const srcNode = nodes.find(n => n.id === (d.source.id || d.source));
    const tgtNode = nodes.find(n => n.id === (d.target.id || d.target));
    if (!srcNode || !tgtNode) return;

    const relationLabel = d.relation === 'collision'
      ? t('生成血缘', 'Generative lineage')
      : d.sourceType === 'embedding'
        ? t('潜在暗线', 'Hidden thread')
        : t('回声', 'Echo');
    const names = `<div style="font-size:10px;color:var(--muted);margin-bottom:6px;font-family:'Space Mono',monospace;letter-spacing:.05em">${relationLabel} · ${srcNode.name} × ${tgtNode.name}</div>`;
    const tipColor = d.relation === 'collision' ? '#7ec8e3' : '#d7a454';
    
    if (d.aiReason) {
      tip.innerHTML = `${names}<div style="color:${tipColor};font-size:14px;line-height:1.6;font-style:italic">✦ ${d.aiReason}</div><div style="margin-top:6px;font-size:9px;color:#5a7a8a;font-family:'Space Mono',monospace;letter-spacing:.05em">CLICK TO EXPLORE ↗</div>`;
    } else {
      tip.innerHTML = `${names}<div style="color:#5a7a8a;font-size:12px">✦ ${t('正在寻找它们之间的暗线…', 'Tracing the hidden thread…')}</div>`;
    }
    tip.classList.add('show');
    tip.style.left = (e.clientX + 12) + 'px';
    tip.style.top = (e.clientY - 8) + 'px';
  }

  linkHitArea
    .on('mouseenter', function(e, d) {
      const idx = links.indexOf(d);
      // Brighten the line
      d3.select(linkSel.nodes()[idx]).attr('opacity', 0.7).attr('stroke-width', 3).attr('filter', 'url(#glowStrong)');
      // Pulse connected nodes
      const srcId = d.source.id || d.source;
      const tgtId = d.target.id || d.target;
      nodeSel.filter(nd => nd.id === srcId || nd.id === tgtId)
        .selectAll('circle')
        .transition().duration(300)
        .attr('stroke-width', 3)
        .attr('filter', 'url(#glowStrong)');
      showLinkTip(e, d);
      if (!d.aiReason && !d.aiFetching) {
        fetchLinkReason(d).then(() => {
          if (tip.classList.contains('show')) showLinkTip(e, d);
        });
      }
    })
    .on('mousemove', function(e, d) {
      tip.style.left = (e.clientX + 12) + 'px';
      tip.style.top = (e.clientY - 8) + 'px';
    })
    .on('mouseleave', function(e, d) {
      const idx = links.indexOf(d);
      d3.select(linkSel.nodes()[idx]).attr('opacity', 0.12 + d.strength * 0.25).attr('stroke-width', 0.5 + d.strength * 1.5).attr('filter', 'url(#glow)');
      // Reset nodes
      const srcId = d.source.id || d.source;
      const tgtId = d.target.id || d.target;
      nodeSel.filter(nd => nd.id === srcId || nd.id === tgtId)
        .selectAll('circle')
        .transition().duration(300)
        .attr('stroke-width', 1.5)
        .attr('filter', 'url(#glow)');
      tip.classList.remove('show');
    })
    .on('click', function(e, d) {
      e.stopPropagation();
      tip.classList.remove('show');
      const srcId = d.source.id || d.source;
      const tgtId = d.target.id || d.target;
      openUChat(srcId, tgtId);
    });

  // Simulation
  universeSim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id)
      .distance(d => d.distance || 160)
      .strength(d => d.relation === 'collision' ? 0.72 : 0.2 + d.strength * 0.42))
    .force('charge', d3.forceManyBody().strength(d => d.hasCard ? -380 : -100))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('x', d3.forceX(w / 2).strength(.04))
    .force('y', d3.forceY(h / 2).strength(.04))
    .force('collision', d3.forceCollide(d => (d.hasCard ? d.size : 6) + 15));

  const focusNode = nodes.find(d => d.isFocus);
  if (focusNode) {
    focusNode.fx = w / 2;
    focusNode.fy = h / 2;
  }
  if (conceptUniverseActive && conceptUniversePhase >= 3) {
    const bornStar = nodes.find(d => d.id === 'concept-climate-menu');
    if (bornStar) {
      bornStar.fx = w * 0.68;
      bornStar.fy = h * 0.44;
    }
  }

  let conceptGuidePositioned = false;
  universeSim.on('tick', () => {
    linkSel
      .attr('x1', d => Math.max(20, Math.min(w - 20, d.source.x)))
      .attr('y1', d => Math.max(20, Math.min(h - 20, d.source.y)))
      .attr('x2', d => Math.max(20, Math.min(w - 20, d.target.x)))
      .attr('y2', d => Math.max(20, Math.min(h - 20, d.target.y)));
    linkHitArea
      .attr('x1', d => Math.max(20, Math.min(w - 20, d.source.x)))
      .attr('y1', d => Math.max(20, Math.min(h - 20, d.source.y)))
      .attr('x2', d => Math.max(20, Math.min(w - 20, d.target.x)))
      .attr('y2', d => Math.max(20, Math.min(h - 20, d.target.y)));
    nodeSel.attr('transform', d => `translate(${Math.max(20, Math.min(w - 20, d.x))},${Math.max(20, Math.min(h - 20, d.y))})`);
    if (conceptUniverseActive && !conceptGuidePositioned && universeSim.alpha() < .38) {
      positionConceptUniverseGuide(nodes, svgWrap);
      conceptGuidePositioned = true;
    }
  });

  // Generate AI narration
  if (conceptUniverseActive) {
    narration.style.display = 'none';
  } else if (links.length > 0 && universeEmbeddingState !== 'syncing') {
    generateUniverseNarration(ideasWithCards, links);
  } else if (ideasWithCards.length >= 2) {
    narration.style.display = 'block';
    document.getElementById('narrationText').textContent = currentLanguage === 'en'
      ? `✦ ${ideasWithCards.length} stars have not connected yet. Keep talking and the links will grow.`
      : `✦ ${ideasWithCards.length} 颗恒星尚未产生联系。继续聊，连线会自己长出来。`;
  } else {
    narration.style.display = 'block';
    document.getElementById('narrationText').textContent = currentLanguage === 'en'
      ? `✦ ${ideas.length} white dwarfs are waiting to grow. Revisit one and let it brighten.`
      : `✦ ${ideas.length} 颗白矮星还没有充分展开。回到其中一颗，让它慢慢亮起来。`;
  }

  // Auto-discover supernovae only after the real vector space is ready.
  if (!conceptUniverseActive && universeEmbeddingState === 'ready') autoDiscoverSupernovae(ideasWithCards);

  // First-visit guide
  const guideEl = document.getElementById('universeGuide');
  if (!conceptUniverseActive && guideEl && links.length > 0) {
    const guideStorageKey = 'drawer_universe_guide_v2';
    const hasVisited = localStorage.getItem(guideStorageKey);
    if (!hasVisited) {
      guideEl.style.display = 'flex';
      localStorage.setItem(guideStorageKey, '1');
      // Fade out after 8 seconds or on first interaction
      const fadeGuide = () => {
        guideEl.classList.add('fade-out');
        setTimeout(() => { guideEl.style.display = 'none'; }, 600);
      };
      setTimeout(fadeGuide, 8000);
      svg.on('click.guide', fadeGuide);
    }
  }

  if (!conceptUniverseActive && currentLanguage === 'en') ensureUniverseEnglishLabels();
}

async function generateUniverseNarration(ideasWithCards, links) {
  const narration = document.getElementById('universeNarration');
  const narrationText = document.getElementById('narrationText');
  
  narration.style.display = 'block';
  narrationText.textContent = t('正在观察你的思维星图…', 'Reading your thought map…');

  const summary = ideasWithCards.map(i => getIdeaFullContext(i)).join('\n---\n');
  const connectionSummary = links.slice(0, 5).map(l => {
    const src = ideasWithCards.find(i => i.id === (l.source.id || l.source));
    const tgt = ideasWithCards.find(i => i.id === (l.target.id || l.target));
    return src && tgt ? `${src.name} ↔ ${tgt.name}` : '';
  }).filter(Boolean).join(', ');

  try {
    const headers = { 'Content-Type': 'application/json', 'X-Drawer-Purpose': 'universe-narration' };
    if (apiKey) {
      headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-') ? `Bearer ${apiKey}` : apiKey;
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 120,
        messages: [
          { role: 'system', content: `你是"抽屉"的思维观察者。用户有多个点子，你发现了它们之间的隐藏联系。
用一句话（不超过50字）指出最有趣的交叉点。口语，像一个聪明的朋友轻声说的话。不要说"我发现"，直接说。` },
          { role: 'user', content: `点子：\n${summary}\n\n已发现的关联对：${connectionSummary}` }
        ]
      })
    });
    const data = await res.json();
    narrationText.textContent = '✦ ' + data.choices[0].message.content.trim().replace(/^["「『]|["」』]$/g, '');
  } catch (e) {
    narrationText.textContent = currentLanguage === 'en'
      ? `✦ ${ideasWithCards.length} ideas, ${links.length} hidden links. Click a planet to explore.`
      : `✦ ${ideasWithCards.length} 个点子，${links.length} 条隐藏联系。点击星球深入探索。`;
  }
}

// ── Rich idea data extraction ──
function getIdeaFullContext(idea) {
  let ctx = `「${idea.name}」`;
  
  // Card data
  if (idea.card && idea.card.core) {
    ctx += `\n核心: ${idea.card.core}`;
    if (idea.card.branches) ctx += `\n方向: ${idea.card.branches.join(', ')}`;
    if (idea.card.tensions) ctx += `\n张力: ${idea.card.tensions}`;
  }
  
  // Key nodes (pinned insights)
  if (idea.nodes && idea.nodes.length > 0) {
    const insights = idea.nodes.filter(n => n.type === 'ai').slice(-3).map(n => n.text);
    if (insights.length) ctx += `\nAI提炼: ${insights.join('; ')}`;
    const todos = idea.nodes.filter(n => n.type === 'todo' && !n.done).map(n => n.text);
    if (todos.length) ctx += `\n待办: ${todos.join('; ')}`;
  }
  
  // Recent chat (last 4 user messages)
  if (idea.chatHistory && idea.chatHistory.length > 0) {
    const userMsgs = idea.chatHistory.filter(m => m.role === 'user').slice(-4).map(m => m.content.slice(0, 80));
    if (userMsgs.length) ctx += `\n最近想法: ${userMsgs.join(' / ')}`;
  }
  
  return ctx;
}

// ── Supernova: AI auto-discovers deep synthesis ──
let _isDiscoveringSupernova = false;

function stableIdeaPairKey(idA, idB) {
  return [String(idA), String(idB)].sort().join(',');
}

function getSupernovaPairFingerprint(ideaA, ideaB) {
  const parts = [ideaA, ideaB].map(idea => {
    const descriptor = getIdeaSemanticDescriptor(idea);
    return `${String(idea.id)}:${descriptor.fingerprint}`;
  });
  return parts.sort().join('|');
}

function loadSupernovaPairReviews() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SUPERNOVA_REVIEW_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function rememberSupernovaPairReview(ideaA, ideaB, status) {
  const reviews = loadSupernovaPairReviews();
  const pairKey = stableIdeaPairKey(ideaA.id, ideaB.id);
  reviews[pairKey] = {
    fingerprint: getSupernovaPairFingerprint(ideaA, ideaB),
    status,
    reviewedAt: Date.now()
  };
  const trimmed = Object.fromEntries(
    Object.entries(reviews)
      .sort((left, right) => (right[1]?.reviewedAt || 0) - (left[1]?.reviewedAt || 0))
      .slice(0, 200)
  );
  localStorage.setItem(SUPERNOVA_REVIEW_STORAGE_KEY, JSON.stringify(trimmed));
}

function hasCurrentSupernovaPairReview(ideaA, ideaB) {
  const review = loadSupernovaPairReviews()[stableIdeaPairKey(ideaA.id, ideaB.id)];
  return review?.fingerprint === getSupernovaPairFingerprint(ideaA, ideaB);
}

function getSupernovaUniverseSignature(ideasWithCards) {
  return ideasWithCards
    .filter(idea => idea.type !== 'supernova')
    .map(idea => `${String(idea.id)}:${getIdeaSemanticDescriptor(idea).fingerprint}:${idea.type || 'idea'}`)
    .sort()
    .join('|');
}

function canRunSupernovaReview(ideasWithCards) {
  try {
    const previous = JSON.parse(localStorage.getItem(SUPERNOVA_LAST_REVIEW_STORAGE_KEY) || '{}');
    const signature = getSupernovaUniverseSignature(ideasWithCards);
    return previous.signature !== signature || Date.now() - Number(previous.at || 0) >= SUPERNOVA_REVIEW_COOLDOWN;
  } catch {
    return true;
  }
}

function markSupernovaReviewAttempt(ideasWithCards) {
  localStorage.setItem(SUPERNOVA_LAST_REVIEW_STORAGE_KEY, JSON.stringify({
    signature: getSupernovaUniverseSignature(ideasWithCards),
    at: Date.now()
  }));
}

function getIdeaGenerativeRichness(idea) {
  const card = idea.card || {};
  const branches = Array.isArray(card.branches) ? card.branches.filter(Boolean) : [];
  const userTurns = (idea.chatHistory || []).filter(message => message.role === 'user').length;
  const nodeCount = (idea.nodes || []).length;
  const specificPieces = branches.length
    + (card.tensions ? 1 : 0)
    + (card.next ? 1 : 0)
    + Math.min(userTurns, 2)
    + Math.min(nodeCount, 2);
  const textLength = getIdeaSemanticDescriptor(idea).text.length;
  return {
    eligible: Boolean(card.core) && textLength >= 40 && specificPieces >= 2,
    score: Math.min(1, textLength / 700) * 0.45 + Math.min(1, specificPieces / 6) * 0.55
  };
}

function buildSupernovaCandidatePairs(ideasWithCards) {
  const existingPairs = new Set(
    ideas
      .filter(idea => Array.isArray(idea.parentIds) && idea.parentIds.length === 2)
      .map(idea => stableIdeaPairKey(idea.parentIds[0], idea.parentIds[1]))
  );
  const eligible = ideasWithCards.map(idea => {
    const record = getCurrentIdeaEmbedding(idea);
    const richness = getIdeaGenerativeRichness(idea);
    return idea.type !== 'supernova' && record && richness.eligible
      ? { idea, record, richness: richness.score }
      : null;
  }).filter(Boolean);

  const allPairs = [];
  eligible.forEach((left, leftIndex) => {
    eligible.slice(leftIndex + 1).forEach(right => {
      const similarity = DrawerSemanticSpace.cosineSimilarity(left.record.vector, right.record.vector);
      if (!Number.isFinite(similarity)) return;
      allPairs.push({ left, right, similarity });
    });
  });
  if (!allPairs.length) return [];

  const sortedSimilarities = allPairs.map(pair => pair.similarity).sort((a, b) => a - b);
  const relativeFloor = sortedSimilarities[Math.floor((sortedSimilarities.length - 1) * 0.65)];
  const minimumSimilarity = Math.max(0.48, relativeFloor || 0);
  const oneDay = 24 * 60 * 60 * 1000;

  return allPairs
    .filter(pair => pair.similarity >= minimumSimilarity && pair.similarity <= 0.92)
    .filter(pair => !existingPairs.has(stableIdeaPairKey(pair.left.idea.id, pair.right.idea.id)))
    .filter(pair => !hasCurrentSupernovaPairReview(pair.left.idea, pair.right.idea))
    .map(pair => {
      const leftTime = Number(pair.left.idea.createdAt || pair.left.idea.updatedAt || 0);
      const rightTime = Number(pair.right.idea.createdAt || pair.right.idea.updatedAt || 0);
      const gapDays = leftTime && rightTime ? Math.abs(leftTime - rightTime) / oneDay : 0;
      const temporalSurprise = Math.min(1, Math.log1p(gapDays) / Math.log(91));
      return {
        ideaA: pair.left.idea,
        ideaB: pair.right.idea,
        similarity: pair.similarity,
        score: pair.similarity
          + ((pair.left.richness + pair.right.richness) / 2) * 0.04
          + temporalSurprise * 0.06
      };
    })
    .sort((left, right) => right.score - left.score);
}

async function validateSupernovaDraft(candidate, draftIdea) {
  const parentARecord = getCurrentIdeaEmbedding(candidate.ideaA);
  const parentBRecord = getCurrentIdeaEmbedding(candidate.ideaB);
  if (!parentARecord || !parentBRecord) throw new Error('Parent embedding is unavailable');

  const descriptor = getIdeaSemanticDescriptor(draftIdea);
  const [draftRecord] = await requestIdeaEmbeddings([descriptor], 'supernova-validation');
  const similarityA = DrawerSemanticSpace.cosineSimilarity(draftRecord.vector, parentARecord.vector);
  const similarityB = DrawerSemanticSpace.cosineSimilarity(draftRecord.vector, parentBRecord.vector);
  const otherSimilarities = ideas
    .filter(idea => idea.id !== candidate.ideaA.id && idea.id !== candidate.ideaB.id)
    .map(idea => getCurrentIdeaEmbedding(idea))
    .filter(Boolean)
    .map(record => DrawerSemanticSpace.cosineSimilarity(draftRecord.vector, record.vector))
    .filter(Number.isFinite);

  const parentMinimum = Math.min(similarityA, similarityB);
  const parentMaximum = Math.max(similarityA, similarityB);
  const nearestOther = otherSimilarities.length ? Math.max(...otherSimilarities) : -1;
  const minimumAnchor = Math.max(0.46, candidate.similarity - 0.18);
  const accepted = parentMinimum >= minimumAnchor
    && parentMaximum <= 0.94
    && Math.abs(similarityA - similarityB) <= 0.22
    && nearestOther <= 0.94;

  return {
    accepted,
    record: draftRecord,
    similarityA,
    similarityB,
    nearestOther
  };
}

function numericDiscoveryScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
}

async function autoDiscoverSupernovae(ideasWithCards) {
  if (_isDiscoveringSupernova || supernovaReviewAttemptedThisSession) return;
  const activeSupernovae = ideas.filter(idea => idea.type === 'supernova');
  if (activeSupernovae.length >= SUPERNOVA_MAX_ACTIVE) return;
  if (!canRunSupernovaReview(ideasWithCards)) return;

  const [candidate] = buildSupernovaCandidatePairs(ideasWithCards);
  if (!candidate) return;

  _isDiscoveringSupernova = true;
  supernovaReviewAttemptedThisSession = true;
  markSupernovaReviewAttempt(ideasWithCards);
  const narrationEl = document.getElementById('narrationText');

  try {
    const headers = { 'Content-Type': 'application/json', 'X-Drawer-Purpose': 'supernova-gate' };
    if (apiKey) {
      headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-') ? `Bearer ${apiKey}` : apiKey;
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct',
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: `你是“抽屉”的新星门槛判断器。两条想法有联系，不代表它们值得生成第三条想法。

只有同时满足以下条件才允许 shouldCreate=true：
1. 新方向必须同时依赖 A 和 B；拿走任何一边，它就不再成立。
2. 它不是共同主题、同义改写、折中总结或漂亮但空泛的比喻。
3. 它提出了一个此前不存在的具体命题、对象、场景或可探索行动。
4. 用户看到后会想继续追问，而不只是点头说“确实很像”。

分别给 synergy、novelty、specificity 打 0-100 分。只有 synergy≥72、novelty≥70、specificity≥60 才能 shouldCreate=true。
严格返回 JSON，不要 markdown：
{"shouldCreate":false,"synergy":0,"novelty":0,"specificity":0,"name":"","core":"","branches":[],"tensions":"","next":"","why":"未通过时简述原因；通过时说明A的什么与B的什么产生了什么新方向"}`
          },
          {
            role: 'user',
            content: `想法 A：\n${getIdeaFullContext(candidate.ideaA)}\n\n想法 B：\n${getIdeaFullContext(candidate.ideaB)}`
          }
        ]
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.choices?.[0]?.message?.content) {
      throw new Error(payload.error || `Supernova review failed (${response.status})`);
    }

    let raw = payload.choices[0].message.content;
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) raw = raw.slice(firstBrace, lastBrace + 1);
    const proposal = JSON.parse(raw);
    const synergy = numericDiscoveryScore(proposal.synergy);
    const novelty = numericDiscoveryScore(proposal.novelty);
    const specificity = numericDiscoveryScore(proposal.specificity);
    const branches = Array.isArray(proposal.branches) ? proposal.branches.filter(Boolean).slice(0, 3) : [];
    const passesJudgement = proposal.shouldCreate === true
      && synergy >= 72
      && novelty >= 70
      && specificity >= 60
      && String(proposal.name || '').trim()
      && String(proposal.core || '').trim()
      && branches.length >= 2;

    if (!passesJudgement) {
      rememberSupernovaPairReview(candidate.ideaA, candidate.ideaB, 'not-generative');
      return;
    }

    const createdAt = Date.now();
    const draftIdea = {
      id: createdAt,
      name: String(proposal.name).trim(),
      type: 'supernova',
      status: 'seed',
      parentIds: [candidate.ideaA.id, candidate.ideaB.id],
      nodes: [],
      chatHistory: [
        {
          role: 'assistant',
          content: `✦ 这颗候选新星来自「${candidate.ideaA.name}」和「${candidate.ideaB.name}」的碰撞。\n\n**${proposal.core}**\n\n${proposal.why}\n\n可以探索的方向：${branches.join('、')}\n\n最大的未知：${proposal.tensions}\n\n你觉得这个方向值得留下吗？`
        }
      ],
      card: {
        core: String(proposal.core).trim(),
        branches,
        tensions: String(proposal.tensions || '').trim(),
        next: String(proposal.next || '').trim()
      },
      discovery: {
        kind: 'generative-collision',
        synergy,
        novelty,
        specificity
      },
      createdAt,
      updatedAt: createdAt
    };

    const vectorValidation = await validateSupernovaDraft(candidate, draftIdea);
    if (!vectorValidation.accepted) {
      rememberSupernovaPairReview(candidate.ideaA, candidate.ideaB, 'embedding-rejected');
      return;
    }

    ideas.push(draftIdea);
    ideaEmbeddingCache.set(String(draftIdea.id), vectorValidation.record);
    await persistEmbeddingRecords([vectorValidation.record]);
    rememberSupernovaPairReview(candidate.ideaA, candidate.ideaB, 'created');
    saveIdeas();

    if (narrationEl) {
      narrationEl.textContent = `✦ 一条暗线正在长成候选新星：「${draftIdea.name}」—— ${proposal.why}`;
    }

    const svgWrap = document.getElementById('universeSvgWrap');
    if (svgWrap) {
      const rect = svgWrap.getBoundingClientRect();
      const flash = document.createElement('div');
      flash.className = 'supernova-birth-flash';
      flash.style.left = `${rect.width / 2}px`;
      flash.style.top = `${rect.height / 2}px`;
      svgWrap.appendChild(flash);
      setTimeout(() => flash.remove(), 1800);
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 35,
          spread: 90,
          startVelocity: 20,
          colors: ['#7ec8e3', '#5aa8c3', '#aedff5', '#ffffff'],
          origin: { x: 0.5, y: 0.4 },
          gravity: 0.4,
          ticks: 80
        });
      }
    }

    setTimeout(() => renderUniverse(), 800);
  } catch (error) {
    console.log('Supernova discovery paused:', error);
  } finally {
    _isDiscoveringSupernova = false;
  }
}

// ── Render List ──
function renderHomePlanets() {
  const host = document.getElementById('homePlanets');
  if (!host) return;
  const positions = [
    { left:18, top:25, size:'large' }, { left:76, top:18, size:'medium' },
    { left:88, top:51, size:'small' }, { left:79, top:80, size:'medium' },
    { left:22, top:81, size:'small' }, { left:9, top:53, size:'medium' }
  ];
  host.innerHTML = ideas.slice(0, positions.length).map((idea, index) => {
    const position = positions[index];
    const cosmicType = getIdeaCosmicType(idea);
    const returnText = t('回到这颗 →', 'Return to this →');
    return `<button class="home-planet-node cosmic-${cosmicType} size-${position.size}" style="left:${position.left}%;top:${position.top}%" onclick="selectIdea(${idea.id})" aria-label="${esc(returnText + ' ' + idea.name)}">
      <span class="home-planet-enter">${returnText}</span>
      <span class="home-planet-visual" aria-hidden="true"><i class="home-planet-ring r2"></i><i class="home-planet-ring r1"></i><i class="home-planet-core"></i></span>
      <span class="home-planet-label">${esc(idea.name)}</span>
    </button>`;
  }).join('');
}

function renderList() {
  const el = document.getElementById('ideasList');
  if (!el) return;
  const countEl = document.getElementById('ideaCount');
  if (countEl) countEl.textContent = ideas.length;
  renderHomePlanets();
  if (!ideas.length) { el.innerHTML = '<div class="list-empty">还没有点子。<br>想到什么就加进来。</div>'; return; }
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  el.innerHTML = ideas.map(idea => {
    const diffDays = Math.floor((now - idea.updatedAt) / ONE_DAY);

    let dateStr = new Date(idea.updatedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    let freshClass = '';

    if (diffDays > 15) {
      freshClass = 'dormant';
      dateStr = `${diffDays}天前`;
    } else if (diffDays >= 3) {
      freshClass = 'dusty';
      dateStr = `${diffDays}天前`;
    }

    let snippet = '';
    if (idea.chatHistory && idea.chatHistory.length > 1) {
      const msg = idea.chatHistory.find(m => m.role === 'user') || idea.chatHistory[1];
      if (msg && msg.content) {
        snippet = `<div class="idea-item-snippet">${esc(msg.content.slice(0, 20))}...</div>`;
      }
    }

    let controls = '';
    if (idea.id === currentId) {
      freshClass = ''; // always fully visible when active
      controls = `
        <div class="idea-item-controls">
          <button class="list-del-btn icon-only-btn" onclick="event.stopPropagation(); clearCurrentChat()" aria-label="${t('清空对话', 'Clear chat')}" title="${t('清空对话', 'Clear chat')}">
            <svg class="ui-icon" aria-hidden="true"><use href="#ui-clear"></use></svg>
          </button>
          <button class="list-del-btn danger icon-only-btn" onclick="event.stopPropagation(); deleteCurrentIdea()" aria-label="${t('删除点子', 'Delete idea')}" title="${t('删除点子', 'Delete idea')}">
            <svg class="ui-icon" aria-hidden="true"><use href="#ui-trash"></use></svg>
          </button>
        </div>
      `;
    }

    const isSupernova = idea.type === 'supernova';
    const namePrefix = isSupernova ? '<span style="color:#7ec8e3">✦</span> ' : '';
    const dotClass = isSupernova ? 's-supernova' : `s-${idea.status}`;
    const statusLabel = isSupernova
      ? '碰撞生成'
      : ({ seed: '萌芽', grow: '推进', pause: '搁置' }[idea.status] || '萌芽');
    const statusHint = isSupernova
      ? '由两个点子碰撞产生的新方向'
      : ({
          seed: '刚刚捕捉、还在形成中的点子',
          grow: '正在持续思考和发展的点子',
          pause: '暂时放下，之后可以再回来'
        }[idea.status] || '刚刚捕捉、还在形成中的点子');

    return `<div class="idea-item ${idea.id === currentId ? 'active' : ''} ${freshClass}" onclick="selectIdea(${idea.id})">
  <div class="idea-item-name">${namePrefix}${esc(idea.name)}</div>
  ${snippet}
  <div class="idea-item-meta">
    <span class="idea-status-badge ${dotClass}" title="${statusHint}"><span class="sdot"></span>${statusLabel}</span>
    <span class="idea-item-info">${dateStr}·${idea.nodes.length}节</span>
  </div>
  ${controls}
</div>`;
  }).join('');
}

// ── Graph ──
function relationTokens(text = '') {
  const stop = new Set('我的了是在有就也都这那和或但如果一个什么会能要不没很更最到把被让用去来说做想看知道觉得感觉因为所以比如其实已经还有可能问题事情东西时候这样'.split(''));
  const zh = [...String(text)].filter(c => /[\u4e00-\u9fa5]/.test(c) && !stop.has(c));
  const en = String(text).toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  return new Set([...zh, ...en]);
}

function inferRelation(a, b) {
  const aTokens = relationTokens(a.fullText);
  const bTokens = relationTokens(b.fullText);
  const shared = [...aTokens].filter(token => bTokens.has(token));
  if (shared.length < 2) return null;
  const combined = `${a.fullText} ${b.fullText}`;
  let label = shared.length >= 4 ? '相互印证' : '主题回声';
  if (/(对比|相比|相反|而是|但是|却)/.test(combined)) label = '形成对比';
  if (/(因为|所以|导致|源于|因此)/.test(combined)) label = '因果线索';
  if (a.type === 'todo' || b.type === 'todo') label = '引出待办';
  return { label, shared: shared.slice(0, 4) };
}

function setIdeaGraphFilter(filter) {
  graphFilter = filter;
  document.querySelectorAll('.graph-filter').forEach(button => {
    button.classList.toggle('is-active', button.dataset.filter === filter);
  });
  renderGraph();
}

function filterIdeaGraph(value) {
  graphQuery = String(value || '').trim().toLowerCase();
  renderGraph();
}

function renderGraph() {
  const svg = d3.select('#graphSvg');
  if (svg.empty()) return;
  svg.selectAll('*').remove();
  if (sim) { sim.stop(); sim = null; }

  const empty = document.getElementById('graphEmpty');

  if (!currentId) { if (empty) empty.style.display = 'flex'; return; }
  const idea = getIdea(currentId);
  if (!idea || idea.nodes.length === 0) { if (empty) empty.style.display = 'flex'; return; }
  if (empty) empty.style.display = 'none';

  const wrap = document.querySelector('.graph-svg-wrap');
  const w = wrap.clientWidth || 280;
  const h = wrap.clientHeight || 400;

  const coreId = `core-${idea.id}`;
  const core = {
    id: coreId, fullText: idea.name, keyword: idea.name,
    type: 'core', time: '', index: -1, done: false,
    fx: w / 2, fy: h / 2
  };
  const nodes = [core, ...idea.nodes.map((n, i) => ({
    id: n.id, fullText: n.text, keyword: n.keyword || n.text.slice(0, 6),
    type: n.type, time: n.time, index: i, done: n.done
  }))];
  const contentNodes = nodes.slice(1);
  const orbit = Math.max(118, Math.min(w, h) * .29);
  contentNodes.forEach((node, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2 / Math.max(contentNodes.length, 1));
    node.x = w / 2 + Math.cos(angle) * orbit;
    node.y = h / 2 + Math.sin(angle) * orbit;
  });
  core.x = w / 2;
  core.y = h / 2;

  const links = [];
  contentNodes.forEach((n, i) => {
    links.push({
      source: i === 0 ? coreId : contentNodes[i - 1].id,
      target: n.id,
      explicit: true,
      label: i === 0 ? '从核心生长' : '继续生长'
    });
  });
  contentNodes.forEach((a, i) => {
    contentNodes.forEach((b, j) => {
      if (j <= i + 1) return;
      const inferred = inferRelation(a, b);
      if (inferred) links.push({
        source: a.id, target: b.id, explicit: false,
        label: inferred.label, shared: inferred.shared
      });
    });
  });

  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);
  const validLinks = links.filter(l => nodeMap[l.source] && nodeMap[l.target]);

  const defs = svg.append('defs');
  [['insight', '#e9a137'], ['todo', '#54aab8']].forEach(([name, color]) => {
    defs.append('marker').attr('id', `arr-${name}`).attr('viewBox', '0 -3 6 6')
      .attr('refX', 18).attr('refY', 0).attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-3L6,0L0,3').attr('fill', color).attr('opacity', .8);
  });

  validLinks.forEach(link => {
    const source = nodeMap[typeof link.source === 'object' ? link.source.id : link.source];
    const target = nodeMap[typeof link.target === 'object' ? link.target.id : link.target];
    link.kind = source?.type === 'todo' || target?.type === 'todo' ? 'todo' : 'insight';
  });

  const linkSel = svg.append('g').selectAll('line')
    .data(validLinks).join('line')
    .attr('class', d => `graph-link is-${d.kind} ${d.explicit ? 'is-explicit' : 'is-inferred'}`)
    .attr('stroke', d => d.kind === 'todo' ? '#54aab8' : '#e9a137')
    .attr('stroke-width', d => d.explicit ? 1.7 : 1.25)
    .attr('stroke-dasharray', d => d.explicit ? null : '5,6')
    .attr('marker-end', d => d.explicit ? `url(#arr-${d.kind})` : null)
    .attr('opacity', d => d.explicit ? .72 : .42);

  const hitSel = svg.append('g').selectAll('line')
    .data(validLinks).join('line')
    .attr('stroke', 'transparent').attr('stroke-width', 14)
    .attr('pointer-events', 'stroke').attr('cursor', 'help');

  const nodeSel = svg.append('g').selectAll('g')
    .data(nodes).join('g')
    .attr('class', d => `graph-node is-${d.type}`)
    .attr('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e, d) => { if (sim && !e.active) sim.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (sim && !e.active) sim.alphaTarget(0); if (d.type !== 'core') { d.fx = null; d.fy = null; } }))
    .on('click', (e, d) => { e.stopPropagation(); });

  nodeSel.each(function (d) {
    const el = d3.select(this);
    if (d.type === 'core') {
      el.append('circle').attr('r', 28).attr('fill', 'rgba(236,158,47,.08)');
      el.append('circle').attr('r', 15).attr('fill', '#161719').attr('stroke', '#e9a137').attr('stroke-width', 2);
      el.append('circle').attr('r', 4).attr('fill', '#ffb43d');
    } else if (d.type === 'todo') {
      const g = el.append('g').attr('transform', 'translate(-6, -6)');
      g.append('rect')
        .attr('width', 12).attr('height', 12).attr('rx', 2)
        .attr('fill', d.done ? '#54aab8' : '#171a1e')
        .attr('stroke', '#54aab8').attr('stroke-width', 1.6)
        .attr('cursor', 'pointer')
        .on('click', (e, d) => {
          e.stopPropagation();
          toggleTodoNode(d.id);
        });
      if (d.done) {
        g.append('path')
          .attr('d', 'M3,6 L5,8 L9,3')
          .attr('fill', 'none').attr('stroke', '#0b1114').attr('stroke-width', 1.5);
      }
    } else {
      el.append('circle')
        .attr('r', 6).attr('fill', '#181716')
        .attr('stroke', '#e9a137').attr('stroke-width', 1.8);
      el.append('circle').attr('r', 2.2).attr('fill', '#ffb43d');
    }
  });

  nodeSel.append('text')
    .attr('x', d => d.type === 'core' ? 0 : 12).attr('y', d => d.type === 'core' ? 43 : 4)
    .attr('text-anchor', d => d.type === 'core' ? 'middle' : 'start')
    .attr('font-family', 'Noto Serif SC, serif')
    .attr('font-size', d => d.type === 'core' ? '14px' : '12px')
    .attr('font-weight', d => d.type === 'core' ? '700' : '600')
    .attr('fill', d => d.type === 'todo' ? '#a9d7dd' : '#e7e2d9')
    .text(d => d.keyword.length > 14 ? `${d.keyword.slice(0, 14)}…` : d.keyword);

  const tip = document.getElementById('nodeTip');
  nodeSel
    .on('mouseenter', (e, d) => {
      const typeLabel = d.type === 'core' ? t('核心点子', 'CORE IDEA') : d.type === 'todo' ? t('待办', 'ACTION') : t('洞察', 'INSIGHT');
      tip.innerHTML = `<div class="node-tip-meta">${esc(d.time || '')} · ${typeLabel}</div>${esc(d.fullText)}`;
      tip.classList.add('show');
    })
    .on('mousemove', e => { tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 8) + 'px'; })
    .on('mouseleave', () => tip.classList.remove('show'));

  hitSel
    .on('mouseenter', (e, d) => {
      const certainty = d.explicit ? t('明确关联', 'EXPLICIT LINK') : t('系统推断', 'SYSTEM INFERENCE');
      const clue = d.shared?.length ? `<br><em>${t('共同线索', 'Shared clues')}：${d.shared.join(' · ')}</em>` : '';
      tip.innerHTML = `<div class="node-tip-meta">${certainty}</div><strong>${esc(d.label)}</strong>${clue}`;
      tip.classList.add('show');
    })
    .on('mousemove', e => { tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 8) + 'px'; })
    .on('mouseleave', () => tip.classList.remove('show'));

  const matchesNode = node => !graphQuery || `${node.keyword} ${node.fullText}`.toLowerCase().includes(graphQuery);
  const matchesLink = link => !graphQuery || `${link.label} ${(link.shared || []).join(' ')}`.toLowerCase().includes(graphQuery);
  const visibleNode = node => graphFilter === 'all' || node.type === 'core' ||
    (graphFilter === 'insight' && node.type !== 'todo') ||
    (graphFilter === 'todo' && node.type === 'todo') ||
    (graphFilter === 'inferred' && validLinks.some(link => !link.explicit &&
      [link.source.id || link.source, link.target.id || link.target].includes(node.id)));
  const relatedIds = new Set();
  validLinks.forEach(link => {
    const sourceId = link.source.id || link.source;
    const targetId = link.target.id || link.target;
    if (matchesLink(link) || matchesNode(nodeMap[sourceId]) || matchesNode(nodeMap[targetId])) {
      relatedIds.add(sourceId); relatedIds.add(targetId);
    }
  });
  nodeSel.classed('is-dimmed', d => !visibleNode(d) || (graphQuery && !relatedIds.has(d.id) && !matchesNode(d)))
    .classed('is-match', d => graphQuery && matchesNode(d));
  linkSel.classed('is-dimmed', d => {
    const source = nodeMap[d.source.id || d.source];
    const target = nodeMap[d.target.id || d.target];
    const filtered = graphFilter === 'inferred' ? d.explicit : !visibleNode(source) || !visibleNode(target);
    return filtered || (graphQuery && !matchesLink(d) && !matchesNode(source) && !matchesNode(target));
  });

  const paintGraphLayout = () => {
    linkSel
      .attr('x1', d => cx((typeof d.source === 'object' ? d.source : nodeMap[d.source]).x, w))
      .attr('y1', d => cy((typeof d.source === 'object' ? d.source : nodeMap[d.source]).y, h))
      .attr('x2', d => cx((typeof d.target === 'object' ? d.target : nodeMap[d.target]).x, w))
      .attr('y2', d => cy((typeof d.target === 'object' ? d.target : nodeMap[d.target]).y, h));
    hitSel
      .attr('x1', d => cx((typeof d.source === 'object' ? d.source : nodeMap[d.source]).x, w))
      .attr('y1', d => cy((typeof d.source === 'object' ? d.source : nodeMap[d.source]).y, h))
      .attr('x2', d => cx((typeof d.target === 'object' ? d.target : nodeMap[d.target]).x, w))
      .attr('y2', d => cy((typeof d.target === 'object' ? d.target : nodeMap[d.target]).y, h));
    nodeSel.attr('transform', d => `translate(${cx(d.x, w)},${cy(d.y, h)})`);
  };
  paintGraphLayout();

  try {
    sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(validLinks).id(d => d.id).distance(d => d.explicit ? 112 : 150).strength(d => d.explicit ? .58 : .12))
      .force('charge', d3.forceManyBody().strength(d => d.type === 'core' ? -420 : -230))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('x', d3.forceX(w / 2).strength(.05))
      .force('y', d3.forceY(h / 2).strength(.07))
      .force('collision', d3.forceCollide(30))
      .on('tick', paintGraphLayout);
  } catch (error) {
    console.warn('Graph simulation fell back to radial layout:', error);
    sim = null;
  }

}

async function ensureUniverseEnglishLabels() {
  if (universeLabelFetchPending) return;
  const pending = ideas.filter(idea => !idea.universeLabelEn).slice(0, 12);
  if (!pending.length) return;
  universeLabelFetchPending = true;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-') ? `Bearer ${apiKey}` : apiKey;
    }
    const source = pending.map(idea => ({
      id: String(idea.id),
      title: idea.name,
      core: idea.card?.core || ''
    }));
    const response = await fetch('/api/chat', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 220,
        messages: [
          { role: 'system', content: 'Return only a JSON object. Each supplied id must map to a concise English noun phrase of 1-3 words, Title Case, maximum 20 characters. Capture the idea rather than translating word-for-word. No markdown.' },
          { role: 'user', content: JSON.stringify(source) }
        ]
      })
    });
    if (!response.ok) throw new Error(`Label request failed: ${response.status}`);
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim();
    const labels = JSON.parse(raw || '{}');
    let changed = false;
    pending.forEach(idea => {
      const label = String(labels[String(idea.id)] || '').trim().replace(/[.!?]+$/, '');
      if (label && label.length <= 24) {
        idea.universeLabelEn = label;
        changed = true;
      }
    });
    if (changed) {
      saveIdeas();
      if (currentLanguage === 'en' && document.getElementById('universeView')?.style.display !== 'none') renderUniverse();
    }
  } catch (error) {
    console.warn('Universe labels are using compact fallbacks:', error);
  } finally {
    universeLabelFetchPending = false;
  }
}

const cx = (v, w) => Math.max(12, Math.min(w - 12, v));
const cy = (v, h) => Math.max(10, Math.min(h - 10, v));

// ── Tab & Card ──
function setCardPageScroll(enabled) {
  const wasEnabled = document.body.classList.contains('card-page-scroll');
  document.body.classList.toggle('card-page-scroll', Boolean(enabled));
  if (wasEnabled && !enabled) window.scrollTo(0, 0);
}

function switchTab(tab) {
  document.getElementById('tabCard').classList.toggle('active', tab === 'card');
  document.getElementById('tabGraph').classList.toggle('active', tab === 'graph');
  document.getElementById('cardPanel').style.display = tab === 'card' ? 'flex' : 'none';
  document.getElementById('graphSvgWrap').style.display = tab === 'graph' ? 'block' : 'none';
  setCardPageScroll(tab === 'card');
  if (tab === 'graph') renderGraph();
}

function renderCard() {
  const idea = currentId ? getIdea(currentId) : null;
  const cardEmpty = document.getElementById('cardEmpty');
  const cardContent = document.getElementById('cardContent');
  const cardGenBtn = document.getElementById('cardGenBtn');
  if (!cardEmpty) return;

  if (!idea) {
    cardEmpty.style.display = 'flex';
    cardContent.style.display = 'none';
    if (cardGenBtn) cardGenBtn.style.display = 'none';
    return;
  }

  if (idea.card) {
    cardEmpty.style.display = 'none';
    cardContent.style.removeProperty('display');
    document.getElementById('cardCore').textContent = idea.card.core || '';
    const originBlock = document.getElementById('cardOriginBlock');
    const turnBlock = document.getElementById('cardTurnBlock');
    const contextDetails = document.getElementById('cardContextDetails');
    const origin = idea.card.origin || '';
    const turningPoint = idea.card.turningPoint || '';
    const hasContext = Boolean(origin || turningPoint);
    cardContent.classList.toggle('has-context', hasContext);
    cardContent.classList.toggle('no-context', !hasContext);
    contextDetails.style.display = hasContext ? '' : 'none';
    contextDetails.open = false;
    originBlock.style.display = origin ? 'flex' : 'none';
    turnBlock.style.display = turningPoint ? 'flex' : 'none';
    document.getElementById('cardOrigin').textContent = origin;
    document.getElementById('cardTurningPoint').textContent = turningPoint;
    const branches = idea.card.branches || [];
    const tensions = idea.card.tensions || '';
    document.getElementById('cardBranchesBlock').style.display = branches.length ? '' : 'none';
    document.getElementById('cardTensionBlock').style.display = tensions ? '' : 'none';
    document.getElementById('cardBranches').innerHTML =
      branches.map(b => `<span class="card-chip">${esc(b)}</span>`).join('');
    document.getElementById('cardTensions').textContent = tensions;
    document.getElementById('cardNext').textContent = idea.card.next || '';
    document.getElementById('cardNextAction').style.display = idea.card.next ? 'flex' : 'none';
    const actions = idea.card.actions || {};
    document.getElementById('cardActionDeeper').textContent = actions.deeper || t('再挖深一点', 'Dig deeper');
    document.getElementById('cardActionOutline').textContent = actions.outline || t('变成创作提纲', 'Turn into an outline');
    document.getElementById('cardActionEcho').textContent = actions.echo || t('寻找旧点子的回声', 'Find an echo');
    document.getElementById('cardActionRest').textContent = actions.rest || t('先放在这里', 'Leave it here');
    const moreActions = document.getElementById('cardMoreActions');
    const moreToggle = document.getElementById('cardMoreToggle');
    moreActions.hidden = true;
    moreToggle.textContent = t('+ 另外 3 条', '+ 3 more');
    moreToggle.setAttribute('aria-expanded', 'false');
    renderTimeline(idea);
  } else {
    cardEmpty.style.display = 'flex';
    cardContent.style.display = 'none';
    const chatLen = (idea.chatHistory || []).length;
    if (cardGenBtn) cardGenBtn.style.display = chatLen >= 4 ? 'block' : 'none';
  }
}

function toggleCardMore() {
  const more = document.getElementById('cardMoreActions');
  const toggle = document.getElementById('cardMoreToggle');
  if (!more || !toggle) return;
  more.hidden = !more.hidden;
  toggle.setAttribute('aria-expanded', String(!more.hidden));
  toggle.textContent = more.hidden ? t('+ 另外 3 条', '+ 3 more') : t('收起', 'Show less');
}

function renderTimeline(idea) {
  const tl = document.getElementById('cardTimeline');
  if (!tl) return;
  
  let events = [];
  
  // 1. Seed
  events.push({ time: idea.createdAt, type: 'seed', text: idea.card?.seed || t('种子种下：最早的念头碎片', 'Seed planted: the earliest fragment of the thought') });
  
  // 2. Supernova (if any)
  if (idea.parentIds && idea.parentIds.length === 2) {
    const p1 = getIdea(idea.parentIds[0]);
    const p2 = getIdea(idea.parentIds[1]);
    const n1 = p1 ? p1.name : t('未知', 'Unknown');
    const n2 = p2 ? p2.name : t('未知', 'Unknown');
    events.push({ time: idea.createdAt + 10, type: 'supernova', text: currentLanguage === 'en' ? `Convergence: born from the collision of “${n1}” and “${n2}”` : `星系交汇：从「${n1}」与「${n2}」中碰撞孕育` });
  }
  
  // 3. AI Insights / Todos (Pinned nodes)
  (idea.nodes || []).forEach(n => {
    const text = n.type === 'todo'
      ? (currentLanguage === 'en' ? `Action chosen: ${n.text}` : `决定了一步小行动：${n.text}`)
      : (currentLanguage === 'en' ? `Breakthrough: ${n.text}` : `思维突破：${n.text}`);
    events.push({ time: n.id, type: n.type === 'todo' ? 'todo' : 'insight', text });
  });
  
  // 4. Evolutions
  (idea.evolutions || []).forEach(e => {
    events.push({ time: e.time, type: 'evolution', text: currentLanguage === 'en' ? `Core evolved into “<strong>${e.newCore}</strong>”` : `核心进化：概念升级为了 “<strong>${e.newCore}</strong>”` });
  });
  
  // Keep the narrative order stable: seed → pinned memories → later evolutions.
  
  if (events.length <= 1) {
    tl.style.display = 'none';
    return;
  }
  
  tl.style.display = 'flex';
  tl.innerHTML = `<div class="card-section-label"><span class="card-label-icon" aria-hidden="true">⌁</span>${t('演变过程', 'Evolution')}</div>` + events.map((e, index) => {
    const dateStr = new Date(e.time).toLocaleTimeString(currentLanguage === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const progressClass = index === events.length - 1 ? 'active' : 'done';
    const eventLabels = currentLanguage === 'en'
      ? { seed: 'First seed', insight: 'Breakthrough', todo: 'Action chosen', evolution: 'Direction found', supernova: 'Ideas merged' }
      : { seed: '最初种子', insight: '想通一点', todo: '决定行动', evolution: '找到方向', supernova: '想法交汇' };
    return `<div class="timeline-item ${e.type} ${progressClass}" title="${esc(e.text)}">
      <div class="timeline-time">${dateStr}</div><span class="timeline-sep">—</span>
      <div class="timeline-text">${eventLabels[e.type] || eventLabels.insight}</div>
    </div>`;
  }).join('');
}

async function triggerCardEvolution(ideaId) {
  const idea = getIdea(ideaId);
  if (!idea || !idea.card || !idea.chatHistory) return;
  
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-') ? `Bearer ${apiKey}` : apiKey;
    }
    
    // We ask AI to read the chat history and evolve the card
    const res = await fetch('/api/chat', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 650,
        messages: [
          { role: 'system', content: `你是“抽屉”的想法编辑。用户的想法随着聊天变深了，请重写卡片的最新状态。

写作原则：
- 不要总结、说教或替用户拔高意义。写得简短、有温度，像用户终于把模糊感觉说清楚。
- core 写一个有张力的发现、反差或追问；优先使用对话里的具体对象，不使用“探索……的意义/可能性”这类论文腔。
- branches 是 2 条属于这个点子的具体观察方向，每条必须带对象、场景或可观察行为，不能是泛用主题词。
- next 是现在就能执行的一步，包含动作、对象，能带时间/地点更好。
- next 与 actions 都是卡片标签：英文最多 5 个词，中文最多 10 个字。删掉解释，只留下动作本身。
- actions 的四句话必须脱离这个点子就不成立；禁止使用“深入探索 / Dig deeper”“寻找回声 / Find an echo”这类通用菜单。
- seed 从最早对话提炼一个带场景的起点，像“第一次种子：站在书店外，感觉自己像在越界”。

返回 JSON，不要 markdown，不要增加字段：
{"core":"最新核心句","origin":"最能唤回最初念头的一句用户原话","turningPoint":"这轮思考发生的关键转变；没有则为空字符串","branches":["具体方向1","具体方向2"],"tensions":"仍然悬着的一个真实问题","next":"最值得先做的具体动作","actions":{"deeper":"回到现场继续观察的动作","outline":"把它推进为作品的动作","echo":"寻找前人作品或旧想法的动作","rest":"暂时放下但保留触发条件的动作"},"seed":"带具体场景的最初种子"}` },
          ...idea.chatHistory
        ]
      })
    });
    
    const data = await res.json();
    let raw = data.choices[0].message.content;
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(raw);
    
    // Record evolution milestone
    if (!idea.evolutions) idea.evolutions = [];
    idea.evolutions.push({
      time: Date.now(),
      oldCore: idea.card.core,
      newCore: parsed.core
    });
    
    // Update card
    idea.card = {
      core: parsed.core,
      origin: parsed.origin || idea.card.origin,
      turningPoint: parsed.turningPoint || idea.card.turningPoint,
      branches: parsed.branches || idea.card.branches,
      tensions: parsed.tensions || idea.card.tensions,
      next: parsed.next || idea.card.next,
      actions: parsed.actions || idea.card.actions,
      seed: parsed.seed || idea.card.seed
    };
    
    idea.updatedAt = Date.now();
    saveIdeas();
    
    // Visual update if still on this idea
    if (currentId === ideaId) {
      renderCard();
      const cardEl = document.getElementById('cardContent');
      if (cardEl) {
        cardEl.classList.remove('card-evolving');
        void cardEl.offsetWidth; // trigger reflow
        cardEl.classList.add('card-evolving');
      }
    }
  } catch (err) {
    console.log('Evolution failed silently', err);
  }
}

async function generateIdeaCard(auto) {
  if (!currentId || cardGenerating) return;
  const idea = getIdea(currentId);
  if (!idea) return;
  const history = idea.chatHistory || [];
  if (history.length < 2) return;

  cardGenerating = true;
  const cardGenBtn = document.getElementById('cardGenBtn');
  if (cardGenBtn) { cardGenBtn.disabled = true; cardGenBtn.textContent = '整理中…'; }
  const cardEmpty = document.getElementById('cardEmpty');
  const cardContent = document.getElementById('cardContent');
  const regenBtn = document.querySelector('.card-regen-btn');
  if (regenBtn) { regenBtn.disabled = true; regenBtn.textContent = '整理中…'; }
  if (cardContent && cardContent.style.display !== 'none') {
  } else if (cardEmpty) {
    cardEmpty.querySelector('.card-empty-text').textContent = '正在随手整理思路…';
  }

  const conversation = history.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n');
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      if (apiKey.startsWith('sk-')) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        headers['X-Access-Code'] = apiKey;
      }
    }

    let res = await fetch('/api/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: `你是“抽屉”的想法编辑。请从对话中提炼一张真正属于这个点子的卡片。

语气与质量标准：
1. 简短、有温度、有画面，不总结人生，不教育用户，不使用咨询报告或论文语气。
2. core 应该像一个突然变清楚的发现、反差或追问。直接写事物本身，不要以“我想探索 / 本项目旨在 / 关于……的思考”开头。
3. branches 只写 2 条具体方向。每条包含明确对象、场景或可观察行为；换到别的点子里仍然成立的句子必须重写。
4. next 是最值得先做的一步，必须可以执行，包含动作和对象；如果对话提供了时间、地点或数量，就把它写进去。它是卡片标签，不是解释句。
5. actions 是四条次级动作标签，每条 4-12 个词或相当长度：
   - deeper：回到这个点子最具体的现场，再多看一步。
   - outline：把这个点子推进成某种可创作的东西，但不要空泛地写“做提纲”。
   - echo：指出应该去找哪类前人作品、旧记录或相似表达。
   - rest：允许暂时放下，同时写出什么信号出现时值得回来。
   next 与四条 actions：英文每条最多 5 个词，中文每条最多 10 个字。禁止完整解释句。
   禁止生成“深入探索 / Dig deeper”“变成提纲 / Turn into an outline”“寻找回声 / Find an echo”“先放在这里 / Leave it here”等通用菜单。
6. seed 从最早的用户表达中提炼一条带具体场景、动作或感受的起点，不虚构对话中没有发生的事实。
7. origin 尽量保留用户原话；turningPoint 只记录对话中真实发生的认知转向，没有就留空。

返回 JSON，不要 markdown，不要增加字段：
{"core":"一个有张力的核心句","origin":"用户原话，尽量简短","turningPoint":"认知转向或空字符串","branches":["具体方向1","具体方向2"],"tensions":"一个仍未解决的真实问题","next":"最值得先做的具体动作","actions":{"deeper":"专属动作","outline":"专属动作","echo":"专属动作","rest":"专属动作"},"seed":"带场景的最初种子"}`
          },
          { role: 'user', content: `点子名：${idea.name}\n\n对话：\n${conversation}` }
        ]
      })
    });
    const data = await res.json();
    let raw = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) raw = raw.slice(firstBrace, lastBrace + 1);
    idea.card = JSON.parse(raw);
    idea.updatedAt = Date.now();
    saveIdeas();
    dismissConceptUniverseForRealIdea();
    renderCard();
    switchTab('card');
    setTimeout(showCardBirthMoment, 420);
  } catch (e) {
    if (cardGenBtn) { cardGenBtn.disabled = false; cardGenBtn.textContent = '整理成卡片'; }
    if (regenBtn) { regenBtn.disabled = false; regenBtn.textContent = '重新整理'; }
    if (cardEmpty) cardEmpty.querySelector('.card-empty-text').textContent = '聊上几句，我来帮你整理思路。';
    if (!auto) alert('生成点子卡失败，请重试');
  } finally {
    cardGenerating = false;
    if (regenBtn) { regenBtn.disabled = false; regenBtn.textContent = '重新整理'; }
  }
}

function showCardBirthMoment() {
  if (localStorage.getItem(CARD_BIRTH_SEEN_KEY)) return;
  const moment = document.getElementById('cardBirthMoment');
  const ideaView = document.getElementById('ideaView');
  const drawer = document.getElementById('drawerPanel');
  if (!moment || !ideaView || !drawer) return;
  localStorage.setItem(CARD_BIRTH_SEEN_KEY, '1');
  drawer.classList.remove('open');
  drawer.classList.add('closed');
  updateDrawerLabel(false);
  moment.classList.add('show');
  moment.setAttribute('aria-hidden', 'false');
  ideaView.classList.add('card-just-born');
}

function dismissCardBirthMoment(continueChat) {
  const moment = document.getElementById('cardBirthMoment');
  const ideaView = document.getElementById('ideaView');
  moment?.classList.remove('show');
  moment?.setAttribute('aria-hidden', 'true');
  ideaView?.classList.remove('card-just-born');
  if (continueChat) expandDrawerIfNot();
}

function copyCard() {
  const idea = currentId ? getIdea(currentId) : null;
  if (!idea || !idea.card) return;
  const c = idea.card;
  const origin = c.origin ? `\n\n**${t('从这里长出来', 'Where it began')}**\n${c.origin}` : '';
  const turn = c.turningPoint ? `\n\n**${t('这次转弯', 'The turn')}**\n${c.turningPoint}` : '';
  const text = `# ${idea.name}\n\n**${t('核心想法', 'Core thought')}**\n${c.core}${origin}${turn}\n\n**${t('关键方向', 'Key directions')}**\n${(c.branches || []).map(b => '· ' + b).join('\n')}\n\n**${t('未解决的张力', 'Unresolved tension')}**\n${c.tensions}\n\n**${t('接下来可以长成', 'What it could become next')}**\n${c.next}`;
  navigator.clipboard.writeText(text)
    .then(() => {
      const btn = document.querySelector('.card-copy-btn');
      if (btn) { btn.textContent = '✓ 已复制'; setTimeout(() => btn.textContent = '复制卡片', 2000); }
    })
    .catch(() => alert('复制失败，请手动复制'));
}

function growIdea(mode) {
  const idea = currentId ? getIdea(currentId) : null;
  if (!idea) return;
  if (mode === 'rest') {
    updateStatus('pause');
    document.getElementById('statusSel').value = 'pause';
    const dock = document.querySelector('.growth-dock');
    if (dock) {
      dock.classList.add('resting');
      setTimeout(() => dock.classList.remove('resting'), 1200);
    }
    return;
  }

  const selectedAction = idea.card?.actions?.[mode] || '';
  const actionLead = selectedAction ? (currentLanguage === 'en' ? `Follow this specific direction: “${selectedAction}” ` : `沿着这条具体动作继续：“${selectedAction}”。`) : '';
  const prompts = currentLanguage === 'en' ? {
    deeper: `${actionLead}Do not summarize. Find the most uncomfortable tension inside “${idea.card?.tensions || idea.name}” and ask me one sharper question.`,
    outline: `${actionLead}Move this idea toward something I could create. Ask one focused question before shaping it; do not finish it for me.`,
    echo: `${actionLead}Look through my other ideas and relevant prior work for the most meaningful echo. Go beyond shared keywords and explain what new direction it opens.`
  } : {
    deeper: `${actionLead}别总结。抓住「${idea.card?.tensions || idea.name}」里最别扭的地方，再往深处问我一个问题。`,
    outline: `${actionLead}把这个点子往一个可创作的作品推进。先问我一个关键问题，不要直接替我写完。`,
    echo: `${actionLead}看看我已有的其他点子和相关作品里，哪个最可能和「${idea.name}」产生真正的回声。不要只找相同关键词，要解释它能打开什么新方向。`
  };
  const input = document.getElementById('chatInput');
  input.value = prompts[mode];
  expandDrawerIfNot();
  input.focus();
}

// ── Node & Todo Methods ──
function toggleTodoNode(nodeId) {
  const idea = getIdea(currentId);
  if (!idea) return;
  const node = idea.nodes.find(n => n.id === nodeId);
  if (!node || node.type !== 'todo' || node.done) return;

  node.done = true;
  idea.updatedAt = Date.now();
  saveIdeas();
  renderGraph();

  if (window.confetti) {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#d7a454', '#789365', '#a96d3b']
    });
  }

  document.getElementById('chatInput').value = currentLanguage === 'en'
    ? `I just completed this action: “${node.keyword}”. What should I do next?`
    : `我刚刚完成了这个行动：【${node.keyword}】。下一步该做什么？`;
  sendMessage();
}

// ── Chat ──
async function sendMessage(e) {
  if (e) e.stopPropagation();
  expandDrawerIfNot();

  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || loading) return;

  // 检查是否可以使用云端代理 (小范围测试期间注释掉门槛)
  // const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '';
  // if (!apiKey && isLocal) { openModal('apiModal'); return; }

  // 熔断机制：如果没有设置自己的 Key，且超过了每日 30 条的限制
  if (!apiKey && getMessageCount() >= MAX_FREE_MESSAGES) {
    alert(`今日可用额度（${MAX_FREE_MESSAGES}条）已用完。\n你可以明天再来，或者在“设置”中填入你自己的 API Key 继续使用。`);
    openModal('settingsModal');
    return;
  }

  const hasPreviousUserMessage = ideas.some(candidate =>
    (candidate.chatHistory || []).some(message => message.role === 'user')
  );
  const showPrivacyNote = !localStorage.getItem(FIRST_MESSAGE_PRIVACY_KEY) && !hasPreviousUserMessage;
  if (!localStorage.getItem(FIRST_MESSAGE_PRIVACY_KEY)) {
    localStorage.setItem(FIRST_MESSAGE_PRIVACY_KEY, '1');
  }

  input.value = ''; input.style.height = 'auto';
  appendMsg('user', text, false, undefined, { showPrivacyNote });
  chatHistory.push({ role: 'user', content: text, privacyNotice: showPrivacyNote });

  const idea = currentId ? getIdea(currentId) : null;
  if (idea) { idea.chatHistory = chatHistory; saveIdeas(); }

  // 增加今日计数
  if (!apiKey) incrementMessageCount();

  setLoad(true);
  const ctx = idea
    ? `当前点子：「${idea.name}」，状态：${{ seed: '萌芽', grow: '推进中', pause: '搁置' }[idea.status]}，已有${idea.nodes.length}个节点。`
    : '用户还未选择点子。';

  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.innerHTML = `<span class="msg-avatar"><span class="msg-avatar-core"></span></span><div class="msg-stack"><div class="msg-who">${t('抽屉', 'Drawer')}</div><div class="msg-bubble ai-stream-bubble"></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  const bubble = div.querySelector('.ai-stream-bubble');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const requestBody = {
      model: 'Qwen/Qwen2.5-72B-Instruct',
      max_tokens: 800,
      stream: true,
      messages: [
        {
          role: 'system', content: `你是"抽屉"——用户的思维搭档，不是助理。

${ctx}

【你的性格】
犀利、幽默、有主见。你不是来哄用户的，你是来跟他们一起折腾一个想法的。
遇到离经叛道的、拧巴的、黑暗的想法——不要拉回正轨，往那个方向再走深一步。
偶尔可以不同意用户，说"我倒觉得你真正想聊的不是这个"。

【你的做法】
- 先感应这个想法背后的情绪和张力，再问问题。
- 追问要犀利，不要顺着最安全的路走——找矛盾，找反常，找用户自己没意识到的东西。
- 可以用类比、可以反问、偶尔可以说一句让用户愣一下的话。
- 如果想法已经聊透了，抛出一个具体的最小行动，建议钉为待办。

【禁止】
不列清单，不总结，不说教，不说"非常好""很棒"，不顺着"善意""正确"这类词往常规方向走。
每次只说一件事、问一个问题。极其口语，像个聪明的活人。` },
        ...chatHistory
      ]
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      if (apiKey.startsWith('sk-')) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        headers['X-Access-Code'] = apiKey;
      }
    }

    let res = await fetch('/api/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = '请求失败: ' + res.status;
      try {
        const e = JSON.parse(errText);
        errMsg = e.error?.message || errMsg;
      } catch (e) { }
      throw new Error(errMsg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let aiText = '';
    let aiThink = '';
    let buffer = '';

    while (true) {
      const readResult = await Promise.race([
        reader.read(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('API Streaming timeout (No data for 30s)')), 30000))
      ]);

      if (readResult.done) break;
      const value = readResult.value;
      buffer += decoder.decode(value, { stream: true });

      let eolIndex;
      while ((eolIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, eolIndex).trim();
        buffer = buffer.slice(eolIndex + 1);

        if (line === '') continue;
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices[0].delta.reasoning_content) {
              const r = data.choices[0].delta.reasoning_content;
              if (r) aiThink += r;
            }
            if (data.choices[0].delta.content) {
              aiText += data.choices[0].delta.content;
            }

            let displayThink = aiThink;
            let displayText = aiText;
            const thinkMatch = aiText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
            if (thinkMatch) {
              displayThink = (aiThink ? aiThink + '\n' : '') + thinkMatch[1];
              displayText = aiText.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '');
            }

            let htmlStr = '';
            if (displayThink) {
              htmlStr += `<details class="think-box"><summary>AI 思考过程</summary><div class="think-content">${fmt(displayThink)}</div></details><br>`;
            }
            htmlStr += fmt(displayText);
            bubble.innerHTML = htmlStr;
            msgs.scrollTop = msgs.scrollHeight;
          } catch (e) {
            console.error('SSE JSON parsing error:', e, line);
          }
        }
      }
    }

    const currentIdx = chatHistory.length;
    chatHistory.push({ role: 'assistant', content: aiText });
    if (idea) { idea.chatHistory = chatHistory; saveIdeas(); }

    if (idea && !idea.card && chatHistory.length >= 4) {
      setTimeout(() => generateIdeaCard(true), 800);
    } else {
      renderCard();
      // Evolution check: every 4 user messages (approx. 8 total messages) after card exists
      if (idea && idea.card) {
        const userMsgs = chatHistory.filter(m => m.role === 'user').length;
        if (userMsgs > 0 && userMsgs % 4 === 0) {
          setTimeout(() => triggerCardEvolution(idea.id), 800);
        }
      }
    }

    if (chatHistory.length >= 3) {
      const btnsDiv = document.createElement('div');
      btnsDiv.className = 'chat-inline-actions';

      const pinBtn = document.createElement('button');
      pinBtn.className = 'pin-btn';
      pinBtn.textContent = t('↓ 钉入时间线', '↓ Pin to timeline');
      pinBtn.onclick = function () { pinToTimeline(this, false, currentIdx); };

      const todoBtn = document.createElement('button');
      todoBtn.className = 'todo-btn';
      todoBtn.textContent = t('☐ 钉为待办', '☐ Pin as action');
      todoBtn.onclick = function () { pinToTimeline(this, true, currentIdx); };

      btnsDiv.appendChild(pinBtn);
      btnsDiv.appendChild(todoBtn);
      const stack = div.querySelector('.msg-stack');
      (stack || div).appendChild(btnsDiv);
    }

  } catch (e) {
    bubble.innerHTML = fmt(`出了点问题：${e.message}`);
  } finally { setLoad(false); }
}

async function pinToTimeline(btn, isTodo, msgIdx) {
  if (!currentId) { alert('请先选择一个点子'); return; }
  btn.disabled = true; btn.textContent = '提炼中…';

  const idea = getIdea(currentId);
  const historyToUse = idea.chatHistory || chatHistory;
  const endIdx = typeof msgIdx === 'number' ? msgIdx : historyToUse.length - 1;
  const startIdx = Math.max(0, endIdx - 5);
  const recent = historyToUse.slice(startIdx, endIdx + 1).map(m => `${m.role === 'user' ? '你' : 'AI'}: ${m.content}`).join('\n');
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      if (apiKey.startsWith('sk-')) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        headers['X-Access-Code'] = apiKey;
      }
    }

    let res = await fetch('/api/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 150,
        messages: [
          {
            role: 'system', content: isTodo
              ? `从最后几轮对话中提炼出一个具体、可执行的待办事项（Action Item），返回JSON，不要任何markdown包裹：
{"text":"不超过25字，描述要做的具体行为","keyword":"2-5字的核心短语，如：测试 DeepSeek，搭建脚手架"}`
              : `从对话提炼一个灵感或总结节点，返回JSON，不要任何markdown包裹：
{"text":"15-35字，第一人称，像日记里的一个发现","keyword":"2-4字的核心词组，会显示在图谱节点上"}` },
          { role: 'user', content: `提炼：\n${recent}` }
        ]
      })
    });
    const data = await res.json();
    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

    const idea = getIdea(currentId);
    idea.nodes.push({
      id: Date.now(), text: parsed.text, type: isTodo ? 'todo' : 'ai', keyword: parsed.keyword,
      done: false, time: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });
    idea.updatedAt = Date.now();
    saveIdeas(); renderList(); renderGraph(); renderCard();

    btn.textContent = '✓ 已钉入';
    btn.style.borderColor = 'var(--accent3)';
    btn.style.color = 'var(--accent3)';
  } catch (e) {
    btn.disabled = false; btn.textContent = isTodo ? '☐ 钉为待办' : '↓ 钉入时间线';
    alert('提炼失败，请重试');
  }
}

// ── DOM helpers ──
function appendMsg(role, text, showPin, msgIdx, options = {}) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  let actions = '';
  if (showPin && role === 'ai') {
    const idxParam = typeof msgIdx === 'number' ? msgIdx : 'null';
    actions = `<div class="chat-inline-actions">
  <button class="pin-btn" onclick="pinToTimeline(this, false, ${idxParam})">${t('⌁ 钉入时间线', '⌁ Pin to timeline')}</button>
  <button class="todo-btn" onclick="pinToTimeline(this, true, ${idxParam})">${t('✓ 钉为待办', '✓ Pin as action')}</button>
</div>`;
  }
  const avatar = role === 'user'
    ? `<span class="msg-avatar msg-avatar-user">${t('你', 'You')}</span>`
    : `<span class="msg-avatar"><span class="msg-avatar-core"></span></span>`;
  const privacyNote = role === 'user' && options.showPrivacyNote
    ? `<div class="msg-privacy-note">${t(
        '点子与对话记录只保存在此浏览器；为生成回复，当前对话会发送至 AI 服务处理，本应用不会在服务端保存对话记录。',
        'Ideas and chat history stay in this browser. To generate a reply, the current conversation is sent to the AI service for processing and is not stored by this app.'
      )}</div>`
    : '';
  div.innerHTML = `${avatar}<div class="msg-stack"><div class="msg-who">${role === 'user' ? t('你', 'You') : t('抽屉', 'Drawer')}</div><div class="msg-bubble">${fmt(text)}</div>${privacyNote}${actions}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function setLoad(v) { loading = v; document.getElementById('sendBtn').disabled = v; document.getElementById('chatInput').disabled = v; }
function fmt(t) { return t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

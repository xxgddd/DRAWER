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
let cardGenerating = false;
let currentLanguage = localStorage.getItem('drawer_language') || 'zh';

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
  '点击星球 → 深入了解': 'Click a planet → explore it',
  '金色回声 → 找回旧念头': 'Golden echo → revisit an old thought',
  '蓝色碰撞 → 长出新方向': 'Blue collision → grow a new direction',
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
};
const UI_COPY_REVERSE = Object.fromEntries(Object.entries(UI_COPY).map(([zh, en]) => [en, zh]));

function t(zh, en) { return currentLanguage === 'en' ? en : zh; }
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
  if (appTitle) appTitle.innerHTML = currentLanguage === 'en' ? 'Idea <span>Drawer</span>' : '抽屉 <span>Drawer</span>';
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
  // --- Simulating White Dwarf for the oldest ideas ---
  if (ideas.length > 0) {
    let modified = false;
    const oldestIdea = ideas[ideas.length - 1];
    if (oldestIdea && Date.now() - oldestIdea.updatedAt < 7 * 24 * 60 * 60 * 1000) {
      oldestIdea.updatedAt = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      modified = true;
    }
    if (ideas.length > 1) {
      const secondOldest = ideas[ideas.length - 2];
      if (secondOldest && Date.now() - secondOldest.updatedAt < 7 * 24 * 60 * 60 * 1000) {
        secondOldest.updatedAt = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
        modified = true;
      }
    }
    if (modified) saveIdeas();
  }
  // ----------------------------------------------------

  applyFontSize(fontSize);
  initLanguage();
  renderList();
  initTextarea();
  initQuickCapture();
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
}
function saveSettings() {
  const k = document.getElementById('newApiKeyInput').value.trim();
  const fs = document.getElementById('fontSizeSel').value;
  if (k) { apiKey = k; localStorage.setItem('drawer_api_key', k); }
  fontSize = fs;
  localStorage.setItem('drawer_font_size', fs);
  applyFontSize(fs);
  closeModal('settingsModal');
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
  const btn = document.getElementById('drawerToggleBtn');
  if (drawer.classList.contains('closed')) {
    drawer.classList.remove('closed');
    drawer.classList.add('open');
    updateDrawerLabel(true);
    // Scroll to bottom of msgs after opening
    setTimeout(() => {
      const msgs = document.getElementById('messages');
      msgs.scrollTop = msgs.scrollHeight;
    }, 100);
  } else {
    drawer.classList.add('closed');
    drawer.classList.remove('open');
    updateDrawerLabel(false);
  }
}

function expandDrawerIfNot() {
  const drawer = document.getElementById('drawerPanel');
  const btn = document.getElementById('drawerToggleBtn');
  if (drawer.classList.contains('closed')) {
    drawer.classList.remove('closed');
    drawer.classList.add('open');
    updateDrawerLabel(true);
    const msgs = document.getElementById('messages');
    setTimeout(() => msgs.scrollTop = msgs.scrollHeight, 100);
  }
}

function initTextarea() {
  const ta = document.getElementById('chatInput');
  if (!ta) return;
  ta.addEventListener('focus', expandDrawerIfNot);
  ta.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
  });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
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
function saveIdeas() { localStorage.setItem('drawer_ideas', JSON.stringify(ideas)); }
function getIdea(id) { return ideas.find(i => i.id === id); }

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
  if (btn) btn.setAttribute('aria-label', isOpen ? t('收起对话', 'Close chat') : t('展开对话', 'Open chat'));
}

function updateIdeaHero(idea) {
  if (!idea) return;
  const summary = document.getElementById('ideaHeroSummary');
  const number = document.getElementById('ideaHeroNumber');
  const statusText = document.getElementById('ideaStatusText');
  const statusChip = document.getElementById('ideaStatusChip');
  const connectionChip = document.getElementById('ideaConnectionChip');
  const createdChip = document.getElementById('ideaCreatedChip');
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
  if (connectionChip) connectionChip.textContent = currentLanguage === 'en' ? `${(idea.nodes || []).length} nodes connected` : `已连接 ${(idea.nodes || []).length} 个节点`;
  if (createdChip) {
    const created = new Date(idea.createdAt || Date.now());
    createdChip.textContent = currentLanguage === 'en'
      ? `Created ${created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : `创建于 ${created.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`;
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
      appendMsg(msg.role === 'user' ? 'user' : 'ai', msg.content, msg.role !== 'user' && idx >= 2, idx);
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
}
function showNoSel() {
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

function showUniverse() {
  universeFocusId = currentId || universeFocusId || ideas.find(i => i.card && i.card.core)?.id || ideas[0]?.id || null;
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
  renderUniverse();
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
    const label = relation.relation === 'collision' ? t('碰撞', 'Collision') : t('回声', 'Echo');
    reasonEl.textContent = `${label} · ${relation.aiReason || (currentLanguage === 'en' ? `Both touch “${relation.sharedChars}”` : `共同触及「${relation.sharedChars}」`)}`;
  } else {
    reasonEl.textContent = t('它暂时没有与中心形成足够清晰的联系。', 'Its connection to the center is not clear enough yet.');
  }
  const nextEl = document.getElementById('universeInspectorNext');
  nextEl.textContent = idea.card?.next ? (currentLanguage === 'en' ? `Continue with: ${idea.card.next}` : `可以继续：${idea.card.next}`) : '';
  nextEl.style.display = idea.card?.next ? 'block' : 'none';
  const nodeCount = (idea.nodes || []).length;
  const chatCount = (idea.chatHistory || []).filter(m => m.role === 'user').length;
  const inspectorStatuses = currentLanguage === 'en' ? {seed:'Seed',grow:'Active',pause:'Parked'} : {seed:'萌芽',grow:'推进中',pause:'搁置'};
  document.getElementById('universeInspectorMeta').textContent = currentLanguage === 'en'
    ? `${chatCount} turns · ${nodeCount} growth nodes · ${inspectorStatuses[idea.status] || inspectorStatuses.seed}`
    : `${chatCount} 轮对话 · ${nodeCount} 个生长节点 · ${inspectorStatuses[idea.status] || inspectorStatuses.seed}`;
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
  const statusLabels = currentLanguage === 'en' ? { seed:'Seed', grow:'Active', pause:'Parked' } : { seed: '萌芽', grow: '推进', pause: '搁置' };
  const statusClass = `status-${idea.status || 'seed'}`;
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
    <div class="universe-preview-row"><span class="universe-preview-status ${statusClass}"><i></i>${statusLabels[idea.status] || '萌芽'}</span><span class="universe-preview-date">${date}</span></div>
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
  const saved = localStorage.getItem(key);
  const history = saved ? JSON.parse(saved) : [];

  uChatContext = { idA, idB, key, history };

  // Set title
  document.getElementById('uChatTitle').textContent = `✦ ${ideaA.name} × ${ideaB.name}`;

  // Show adopt/discard button if a supernova exists for this pair
  const adoptBtn = document.getElementById('uChatAdopt');
  const discardBtn = document.getElementById('uChatDiscard');
  const pairKey = [idA, idB].sort().join(',');
  const supernova = ideas.find(i => 
    i.type === 'supernova' && i.parentIds && 
    i.parentIds.sort().join(',') === pairKey
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
    localStorage.setItem(key, JSON.stringify(history));
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
  
  const pairKey = [idA, idB].sort().join(',');
  const supernova = ideas.find(i => 
    i.type === 'supernova' && i.parentIds && 
    i.parentIds.sort().join(',') === pairKey
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
  
  const pairKey = [idA, idB].sort().join(',');
  const supernovaIndex = ideas.findIndex(i => 
    i.type === 'supernova' && i.parentIds && 
    i.parentIds.sort().join(',') === pairKey
  );
  if (supernovaIndex === -1) return;

  // Remove the supernova
  ideas.splice(supernovaIndex, 1);
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

  localStorage.setItem(uChatContext.key, JSON.stringify(uChatContext.history));
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

function renderUniverse() {
  const svg = d3.select('#universeSvg');
  svg.selectAll('*').remove();
  hideUniverseNodePreview();
  if (universeSim) { universeSim.stop(); universeSim = null; }

  const emptyEl = document.getElementById('universeEmpty');
  const svgWrap = document.getElementById('universeSvgWrap');
  const narration = document.getElementById('universeNarration');
  const subtitle = document.getElementById('universeSubtitle');

  if (ideas.length < 2) {
    emptyEl.style.display = 'flex';
    svgWrap.style.display = 'none';
    narration.style.display = 'none';
    return;
  }

  const ideasWithCards = ideas.filter(i => i.card && i.card.core);
  subtitle.textContent = currentLanguage === 'en'
    ? `${ideas.length} ideas · ${ideasWithCards.length} stars`
    : `${ideas.length} 个点子 · ${ideasWithCards.length} 颗恒星`;

  emptyEl.style.display = 'none';
  svgWrap.style.display = 'block';

  const wrap = document.getElementById('universeSvgWrap');
  const w = wrap.clientWidth || 400;
  const h = wrap.clientHeight || 500;

  // Build nodes from ALL ideas
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const nodes = ideas.map((idea, i) => {
    const hasCard = idea.card && idea.card.core;
    const chatLen = (idea.chatHistory || []).length;
    const nodeCount = (idea.nodes || []).length;
    const isDwarf = (Date.now() - idea.updatedAt) > SEVEN_DAYS;
    
    let baseSize = hasCard ? Math.max(10, Math.min(25, 6 + chatLen * 0.8 + nodeCount * 1.2)) : 4;
    if (isDwarf && hasCard) baseSize = Math.max(8, baseSize * 0.6); // Shrink white dwarfs

    return {
      id: idea.id,
      name: idea.name,
      hasCard,
      core: hasCard ? idea.card.core : '',
      branches: hasCard ? (idea.card.branches || []) : [],
      tensions: hasCard ? (idea.card.tensions || '') : '',
      status: idea.status,
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

  function extractBigrams(text) {
    const bigrams = new Set();
    // Split text by punctuation or spaces to prevent cross-boundary bigrams
    const chunks = text.split(/[^\u4e00-\u9fa5]+/);
    for (const chunk of chunks) {
      if (chunk.length < 2) continue;
      for (let i = 0; i < chunk.length - 1; i++) {
        if (!stopWords.has(chunk[i]) && !stopWords.has(chunk[i+1])) {
          const bg = chunk[i] + chunk[i+1];
          if (!stopBigrams.has(bg)) {
            bigrams.add(bg);
          }
        }
      }
    }
    return bigrams;
  }

  const cardNodes = nodes.filter(n => n.hasCard);
  cardNodes.forEach((a, i) => {
    const aIdea = ideas.find(idea => idea.id === a.id);
    const aText = a.name + ' ' + a.core + ' ' + a.branches.join(' ') + ' ' + a.tensions;
    const aGrams = extractBigrams(aText);
    
    cardNodes.forEach((b, j) => {
      if (j <= i) return;
      const bIdea = ideas.find(idea => idea.id === b.id);
      
      // Check if one is a direct parent of the other (Supernova relationship)
      const isParent = (aIdea.parentIds && aIdea.parentIds.includes(b.id)) || 
                       (bIdea.parentIds && bIdea.parentIds.includes(a.id));
                       
      if (isParent) {
        // If one is an active supernova, line is Blue (strength: 1)
        // If both are normal ideas (adopted supernova), line cools down to Yellow (strength: 0.5)
        const isActiveSupernova = aIdea.type === 'supernova' || bIdea.type === 'supernova';
        const childName = aIdea.parentIds && aIdea.parentIds.includes(b.id) ? aIdea.name : bIdea.name;
        links.push({
          source: a.id, target: b.id,
          strength: isActiveSupernova ? 1.0 : 0.5, 
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

      // Check text matching (use name + core)
      const aTextMatch = a.name + ' ' + a.core;
      const bTextMatch = b.name + ' ' + b.core;
      const aGramsMatch = extractBigrams(aTextMatch);
      const bGramsMatch = extractBigrams(bTextMatch);
      const shared = [...aGramsMatch].filter(g => bGramsMatch.has(g));
      
      // 1 shared bigram = yellow line (0.4)
      // 2+ shared bigrams = blue line (1.0)
      if (shared.length >= 2) {
        links.push({ 
          source: a.id, target: b.id, 
          strength: Math.min(0.4 + (shared.length - 1) * 0.6, 1.0),
          relation: 'echo',
          sharedChars: shared.slice(0, 3).join('、'),
          aiReason: null 
        });
      }
    });
  });
  activeUniverseLinks = links;

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
    .attr('stroke', d => d.relation === 'collision' ? '#7ec8e3' : '#d7a454')
    .attr('stroke-width', d => 0.5 + d.strength * 1.5)
    .attr('stroke-dasharray', '4,4')
    .attr('opacity', d => 0.12 + d.strength * 0.25)
    .attr('filter', 'url(#glow)')
    .attr('pointer-events', 'none');

  // Node groups
  const nodeSel = svg.append('g').selectAll('g')
    .data(nodes).join('g')
    .attr('class', 'universe-node')
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

  // Planet / dark matter rendering
  const statusColors = { seed: '#d7a454', grow: '#789365', pause: '#5a6a7a' };
  function getNodeColor(d) {
    if (d.isFocus) return '#e0ad60';
    if (d.isDwarf && d.hasCard) return '#5e6d78'; // White dwarf color
    const idea = ideas.find(i => i.id === d.id);
    if (idea && idea.type === 'supernova') return '#7ec8e3';
    return statusColors[d.status] || '#d7a454';
  }
  
  // Outer glow circle (only for card ideas)
  nodeSel.filter(d => d.hasCard).append('circle')
    .attr('r', d => d.size + (d.isFocus ? 8 : 0))
    .attr('fill', d => getNodeColor(d) + (d.isDwarf ? '11' : '22'))
    .attr('stroke', d => getNodeColor(d))
    .attr('stroke-width', d => d.isFocus ? 2.5 : (d.isDwarf ? 1 : 1.5))
    .attr('filter', d => d.isDwarf ? null : 'url(#glow)');

  // Inner bright core (only for card ideas)
  nodeSel.filter(d => d.hasCard).append('circle')
    .attr('r', d => Math.max(2.5, (d.size + (d.isFocus ? 8 : 0)) * 0.3))
    .attr('fill', d => getNodeColor(d))
    .attr('opacity', d => d.isDwarf ? 0.6 : 0.9);

  // Dark matter dots (no card)
  nodeSel.filter(d => !d.hasCard).append('circle')
    .attr('r', 4)
    .attr('fill', '#1a1610')
    .attr('stroke', '#a8987b')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '2,2')
    .attr('opacity', 0.8)
    .attr('filter', 'url(#glow)');

  // Labels
  nodeSel.append('text')
    .attr('y', d => (d.hasCard ? d.size + (d.isFocus ? 8 : 0) : 3) + 16)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Noto Serif SC, serif')
    .attr('font-size', d => d.hasCard ? '11px' : '9px')
    .attr('font-weight', '300')
    .attr('fill', d => {
      if (!d.hasCard) return '#5a4e38';
      if (d.isDwarf) return '#5e6d78';
      return '#c8b89a';
    })
    .attr('opacity', d => {
      if (d.isFocus) return 1;
      if (!d.hasCard) return 0.22;
      if (d.isDwarf) return 0.42;
      return d.size >= 16 ? 0.82 : 0.58;
    })
    .text(d => d.name.length > 8 ? d.name.slice(0, 8) + '…' : d.name);

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
      const baseOpacity = d.isFocus ? 1 : (!d.hasCard ? 0.22 : (d.isDwarf ? 0.42 : (d.size >= 16 ? 0.82 : 0.58)));
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
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-') ? `Bearer ${apiKey}` : apiKey;
      }
      const res = await fetch('/api/chat', {
        method: 'POST', headers,
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 60,
          messages: [
            { role: 'system', content: '用一句话（15-25字）解释这两个想法之间的隐藏联系。像一句诗一样简洁。不要说"它们都"开头。' },
            { role: 'user', content: `「${srcNode.name}」: ${srcNode.core}\n「${tgtNode.name}」: ${tgtNode.core}` }
          ]
        })
      });
      const data = await res.json();
      d.aiReason = data.choices[0].message.content.trim().replace(/^["「『]|["」』。]$/g, '');
    } catch(err) {
      d.aiReason = '文字回声：' + d.sharedChars;
    }
    d.aiFetching = false;
  }

  function showLinkTip(e, d) {
    const srcNode = nodes.find(n => n.id === (d.source.id || d.source));
    const tgtNode = nodes.find(n => n.id === (d.target.id || d.target));
    if (!srcNode || !tgtNode) return;

    const relationLabel = d.relation === 'collision' ? '碰撞' : '回声';
    const names = `<div style="font-size:10px;color:var(--muted);margin-bottom:6px;font-family:'Space Mono',monospace;letter-spacing:.05em">${relationLabel} · ${srcNode.name} × ${tgtNode.name}</div>`;
    const tipColor = d.relation === 'collision' ? '#7ec8e3' : '#d7a454';
    
    if (d.aiReason) {
      tip.innerHTML = `${names}<div style="color:${tipColor};font-size:14px;line-height:1.6;font-style:italic">✦ ${d.aiReason}</div><div style="margin-top:6px;font-size:9px;color:#5a7a8a;font-family:'Space Mono',monospace;letter-spacing:.05em">CLICK TO EXPLORE ↗</div>`;
    } else {
      tip.innerHTML = `${names}<div style="color:#5a7a8a;font-size:12px">✦ 正在解读…</div>`;
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
    .force('link', d3.forceLink(links).id(d => d.id).distance(160).strength(d => d.strength * 0.15))
    .force('charge', d3.forceManyBody().strength(d => d.hasCard ? -500 : -100))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('x', d3.forceX(w / 2).strength(.04))
    .force('y', d3.forceY(h / 2).strength(.04))
    .force('collision', d3.forceCollide(d => (d.hasCard ? d.size : 6) + 15));

  const focusNode = nodes.find(d => d.isFocus);
  if (focusNode) {
    focusNode.fx = w / 2;
    focusNode.fy = h / 2;
  }

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
  });

  // Generate AI narration
  if (links.length > 0) {
    generateUniverseNarration(ideasWithCards, links);
  } else if (ideasWithCards.length >= 2) {
    narration.style.display = 'block';
    document.getElementById('narrationText').textContent = currentLanguage === 'en'
      ? `✦ ${ideasWithCards.length} stars have not connected yet. Keep talking and the links will grow.`
      : `✦ ${ideasWithCards.length} 颗恒星尚未产生联系。继续聊，连线会自己长出来。`;
  } else {
    narration.style.display = 'block';
    document.getElementById('narrationText').textContent = currentLanguage === 'en'
      ? `✦ ${ideas.length} pieces of dark matter are waiting to be lit. Talk with them and turn them into stars.`
      : `✦ ${ideas.length} 颗暗物质等待被点亮。和它们聊几句，让它们变成恒星。`;
  }

  // Auto-discover supernovae (runs in background)
  autoDiscoverSupernovae(ideasWithCards);

  // First-visit guide
  const guideEl = document.getElementById('universeGuide');
  if (guideEl && links.length > 0) {
    const hasVisited = localStorage.getItem('drawer_universe_visited');
    if (!hasVisited) {
      guideEl.style.display = 'flex';
      localStorage.setItem('drawer_universe_visited', '1');
      // Fade out after 8 seconds or on first interaction
      const fadeGuide = () => {
        guideEl.classList.add('fade-out');
        setTimeout(() => { guideEl.style.display = 'none'; }, 600);
      };
      setTimeout(fadeGuide, 8000);
      svg.on('click.guide', fadeGuide);
    }
  }
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
    const headers = { 'Content-Type': 'application/json' };
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

async function autoDiscoverSupernovae(ideasWithCards) {
  if (_isDiscoveringSupernova) return;
  _isDiscoveringSupernova = true;

  // Don't discover if fewer than 2 ideas
  const richIdeas = ideasWithCards.filter(i => {
    const chatLen = (i.chatHistory || []).length;
    return chatLen >= 1 || (i.nodes && i.nodes.length >= 0); // currently taking all ideas with cards
  });
  if (richIdeas.length < 2) {
    console.log('Not enough rich ideas for supernova.', richIdeas.length);
    return;
  }

  // Limit: Up to 3 active supernovae at a time
  const activeSupernovae = ideas.filter(i => i.type === 'supernova');
  if (activeSupernovae.length >= 3) {
    console.log(`Already ${activeSupernovae.length} active supernovae. Waiting for user resolution.`);
    return;
  }
  
  // Exclude pairs that already have supernovae (even if they were adopted into normal ideas)
  const existingPairs = ideas
    .filter(i => i.parentIds)
    .map(i => i.parentIds.sort().join(','));

  const narrationEl = document.getElementById('narrationText');

  console.log('Starting auto-discovery for supernovae... Rich ideas count:', richIdeas.length);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-') ? `Bearer ${apiKey}` : apiKey;
    }

    // Build full context for each idea
    const fullContexts = richIdeas.map(i => getIdeaFullContext(i)).join('\n---\n');
    
    // Collect existing supernova names to avoid duplicates
    const existingSupernovaNames = ideas.filter(i => i.parentIds).map(i => i.name).join('，');
    const duplicatePrompt = existingSupernovaNames ? `\n注意：绝对不能生成与以下已存在的点子名字或概念高度重复的内容：${existingSupernovaNames}` : '';

    const res = await fetch('/api/chat', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 400,
        messages: [
          { role: 'system', content: `你是"抽屉"的思维合成器。分析用户的多个想法，找出最有深度和潜力的交叉点。
不是简单的"都提到了X"，而是"A的某个方向 + B的某个张力 = 一个全新的、用户没想到的方向"。${duplicatePrompt}
选择最有爆发力的一对，返回JSON（不要markdown包裹）：
{"ideaA":"点子A的名字","ideaB":"点子B的名字","name":"新方向的名字（5-10字，必须有新意）","core":"一句话描述这个全新方向（20-40字）","branches":["方向1","方向2","方向3"],"tensions":"这个合成方向最大的未知是什么（一句话）","why":"为什么这两个点子放在一起会产生化学反应（一句话）"}` },
          { role: 'user', content: fullContexts }
        ]
      })
    });

    const data = await res.json();
    let raw = data.choices[0].message.content;
    
    // Robust JSON extraction
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(raw);
    console.log('Parsed supernova:', parsed);

    // Find the parent ideas
    const srcIdea = richIdeas.find(i => i.name === parsed.ideaA);
    const tgtIdea = richIdeas.find(i => i.name === parsed.ideaB);
    if (!srcIdea || !tgtIdea) return;

    // Check if this pair already exists
    const pairKey = [srcIdea.id, tgtIdea.id].sort().join(',');
    if (existingPairs.includes(pairKey)) return;

    // Create the supernova
    const idea = {
      id: Date.now(),
      name: parsed.name || `${srcIdea.name} × ${tgtIdea.name}`,
      type: 'supernova',
      status: 'seed',
      parentIds: [srcIdea.id, tgtIdea.id],
      nodes: [],
      chatHistory: [
        { role: 'assistant', content: `✦ 这颗超新星来自「${srcIdea.name}」和「${tgtIdea.name}」的深层交汇。\n\n**${parsed.core}**\n\n${parsed.why}\n\n可以探索的方向：${parsed.branches.join('、')}\n\n最大的未知：${parsed.tensions}\n\n你觉得这个方向有意思吗？` }
      ],
      card: {
        core: parsed.core,
        branches: parsed.branches,
        tensions: parsed.tensions
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    ideas.push(idea); // push to end, not unshift - let it appear naturally
    saveIdeas();

    // Update narration
    if (narrationEl) {
      narrationEl.textContent = `✦ 发现了一颗新星：「${idea.name}」—— ${parsed.why}`;
    }

    // Birth flash animation
    const svgWrap = document.getElementById('universeSvgWrap');
    if (svgWrap) {
      const rect = svgWrap.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      
      // Central flash
      const flash = document.createElement('div');
      flash.className = 'supernova-birth-flash';
      flash.style.left = cx + 'px';
      flash.style.top = cy + 'px';
      svgWrap.appendChild(flash);
      setTimeout(() => flash.remove(), 1800);
      
      // Blue confetti burst
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 35, spread: 90, startVelocity: 20,
          colors: ['#7ec8e3', '#5aa8c3', '#aedff5', '#ffffff'],
          origin: { x: 0.5, y: 0.4 },
          gravity: 0.4, ticks: 80
        });
      }
    }

    // Re-render universe to show the new star
    setTimeout(() => renderUniverse(), 800);

  } catch(err) {
    // Silent fail - supernovae are a bonus, not critical
    console.log('Supernova discovery failed:', err);
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
    const status = ['seed','grow','pause'].includes(idea.status) ? idea.status : 'seed';
    const returnText = t('回到这颗 →', 'Return to this →');
    return `<button class="home-planet-node status-${status} size-${position.size}" style="left:${position.left}%;top:${position.top}%" onclick="selectIdea(${idea.id})" aria-label="${esc(returnText + ' ' + idea.name)}">
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
          <button class="list-del-btn" onclick="event.stopPropagation(); clearCurrentChat()">清空对话</button>
          <button class="list-del-btn danger" onclick="event.stopPropagation(); deleteCurrentIdea()">删除点子</button>
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

const cx = (v, w) => Math.max(12, Math.min(w - 12, v));
const cy = (v, h) => Math.max(10, Math.min(h - 10, v));

// ── Tab & Card ──
function switchTab(tab) {
  document.getElementById('tabCard').classList.toggle('active', tab === 'card');
  document.getElementById('tabGraph').classList.toggle('active', tab === 'graph');
  document.getElementById('cardPanel').style.display = tab === 'card' ? 'flex' : 'none';
  document.getElementById('graphSvgWrap').style.display = tab === 'graph' ? 'block' : 'none';
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
    const origin = idea.card.origin || '';
    const turningPoint = idea.card.turningPoint || '';
    const hasContext = Boolean(origin || turningPoint);
    cardContent.classList.toggle('has-context', hasContext);
    cardContent.classList.toggle('no-context', !hasContext);
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
    renderTimeline(idea);
  } else {
    cardEmpty.style.display = 'flex';
    cardContent.style.display = 'none';
    const chatLen = (idea.chatHistory || []).length;
    if (cardGenBtn) cardGenBtn.style.display = chatLen >= 4 ? 'block' : 'none';
  }
}

function renderTimeline(idea) {
  const tl = document.getElementById('cardTimeline');
  if (!tl) return;
  
  let events = [];
  
  // 1. Seed
  events.push({ time: idea.createdAt, type: 'seed', text: t('种子种下：最早的念头碎片', 'Seed planted: the earliest fragment of the thought') });
  
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
    events.push({ time: n.id, type: 'insight', text });
  });
  
  // 4. Evolutions
  (idea.evolutions || []).forEach(e => {
    events.push({ time: e.time, type: 'evolution', text: currentLanguage === 'en' ? `Core evolved into “<strong>${e.newCore}</strong>”` : `核心进化：概念升级为了 “<strong>${e.newCore}</strong>”` });
  });
  
  // Sort chronologically
  events.sort((a, b) => a.time - b.time);
  
  if (events.length <= 1) {
    tl.style.display = 'none';
    return;
  }
  
  tl.style.display = 'flex';
  tl.innerHTML = `<div class="card-section-label"><span class="card-label-icon" aria-hidden="true">⌁</span>${t('演变过程', 'Evolution')}</div>` + events.map((e, index) => {
    const dateStr = new Date(e.time).toLocaleString(currentLanguage === 'en' ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const progressClass = index === events.length - 1 ? 'active' : 'done';
    return `<div class="timeline-item ${e.type} ${progressClass}">
      <div class="timeline-time">${dateStr}</div>
      <div class="timeline-text">${e.text}</div>
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
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 400,
        messages: [
          { role: 'system', content: `你是"抽屉"的想法雕刻师。用户的想法随着聊天已经变深了。
请重新提炼这个想法的最新状态。返回JSON（不要markdown包裹）：
{"core":"一句话描述最新核心概念（必须跟以前不同，更深一点）","origin":"最能唤回最初念头的一句用户原话","turningPoint":"这轮思考发生的关键转变，一句话","branches":["新方向1","新方向2"],"tensions":"目前最大的未知或矛盾点是什么","next":"下一步可继续创作的具体动作"}` },
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
      next: parsed.next || idea.card.next
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
            content: `从以下对话中提炼一张点子卡，返回JSON，不要任何markdown包裹，branches数组包含3到5个方向（根据对话丰富程度决定）：
{"core":"核心想法，1-2句，第一人称，像日记里的发现","origin":"最能唤回最初念头的一句用户原话，保持原口吻，20字内","turningPoint":"对话里认知发生变化的关键转折，1句话；没有明显转折则为空字符串","branches":["方向1，10字内","方向2，10字内","方向3，10字内"],"tensions":"最大的矛盾或未解决问题，1句话","next":"下一步可继续创作的具体动作，15字内"}`
          },
          { role: 'user', content: `点子名：${idea.name}\n\n对话：\n${conversation}` }
        ]
      })
    });
    const data = await res.json();
    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    idea.card = JSON.parse(raw);
    idea.updatedAt = Date.now();
    saveIdeas();
    renderCard();
    switchTab('card');
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

  const prompts = currentLanguage === 'en' ? {
    deeper: `Do not summarize. Find the most uncomfortable tension inside “${idea.card?.tensions || idea.name}” and ask me one sharper question.`,
    outline: 'Move this idea toward something I could create. First ask whether it wants to become an article, video, product, or another form—do not finish it for me.',
    echo: `Look through my other ideas and find the one most likely to echo “${idea.name}”. Go beyond shared keywords and explain what new direction it opens.`
  } : {
    deeper: `别总结。抓住「${idea.card?.tensions || idea.name}」里最别扭的地方，再往深处问我一个问题。`,
    outline: '把这个点子往一个可创作的作品推进。先问我它最想变成文章、视频、产品还是别的形式，不要直接替我写完。',
    echo: `看看我已有的其他点子里，哪个最可能和「${idea.name}」产生回声。不要只找相同关键词，要解释它能打开什么新方向。`
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

  input.value = ''; input.style.height = 'auto';
  appendMsg('user', text, false);
  chatHistory.push({ role: 'user', content: text });

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
function appendMsg(role, text, showPin, msgIdx) {
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
  div.innerHTML = `${avatar}<div class="msg-stack"><div class="msg-who">${role === 'user' ? t('你', 'You') : t('抽屉', 'Drawer')}</div><div class="msg-bubble">${fmt(text)}</div>${actions}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function setLoad(v) { loading = v; document.getElementById('sendBtn').disabled = v; document.getElementById('chatInput').disabled = v; }
function fmt(t) { return t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

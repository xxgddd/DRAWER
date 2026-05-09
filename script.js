// ── State ──
let apiKey = localStorage.getItem('drawer_api_key') || '';
let fontSize = localStorage.getItem('drawer_font_size') || 'medium';
let ideas = JSON.parse(localStorage.getItem('drawer_ideas') || '[]');
let currentId = null;
let chatHistory = [];
let loading = false;
let graphCollapsed = false;
let sim = null;
let cardGenerating = false;

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
  // 小范围测试期间暂时停用 Key 门槛
  // if (!apiKey) openModal('apiModal');
  // else closeModal('apiModal');
  applyFontSize(fontSize);
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
    if (btn) btn.innerHTML = '↓ 收起对话';
    // Scroll to bottom of msgs after opening
    setTimeout(() => {
      const msgs = document.getElementById('messages');
      msgs.scrollTop = msgs.scrollHeight;
    }, 100);
  } else {
    drawer.classList.add('closed');
    drawer.classList.remove('open');
    if (btn) btn.innerHTML = '↑ 展开对话';
  }
}

function expandDrawerIfNot() {
  const drawer = document.getElementById('drawerPanel');
  const btn = document.getElementById('drawerToggleBtn');
  if (drawer.classList.contains('closed')) {
    drawer.classList.remove('closed');
    drawer.classList.add('open');
    if (btn) btn.innerHTML = '↓ 收起对话';
    const msgs = document.getElementById('messages');
    setTimeout(() => msgs.scrollTop = msgs.scrollHeight, 100);
  }
}

function initTextarea() {
  const ta = document.getElementById('chatInput');
  if (!ta) return;
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

  // 随机引导语，每次打开都不一样
  const greetings = [
    '今天脑子里在转什么？',
    '有什么想法还没说出口？',
    '最近让你兴奋的事情是？',
    '有没有一件事一直在想？',
    '说点什么，哪怕只是一个词。',
    '抽屉已打开，请倾倒。'
  ];
  const greetingEl = document.getElementById('captureGreeting');
  if (greetingEl) {
    greetingEl.textContent = greetings[Math.floor(Math.random() * greetings.length)];
  }

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
  await selectIdea(idea.id);
  
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
  selectIdea(idea.id);
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
  if (idea) { idea.status = status; idea.updatedAt = Date.now(); saveIdeas(); renderList(); }
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
    newEl.onclick = startRename; newEl.title = '点击重命名';
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
    time: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  });
  idea.updatedAt = Date.now();
  saveIdeas(); renderList(); renderGraph();
}

// ── Select Idea ──
async function selectIdea(id) {
  currentId = id;
  const idea = getIdea(id);
  chatHistory = idea.chatHistory || [];
  renderList(); showIdeaView(); renderGraph(); renderCard();

  document.getElementById('ideaBarName').textContent = idea.name;
  document.getElementById('statusSel').value = idea.status;

  const drawer = document.getElementById('drawerPanel');
  const drawerBtn = document.getElementById('drawerToggleBtn');
  if (chatHistory.length > 0) {
    drawer.classList.add('open');
    drawer.classList.remove('closed');
    if (drawerBtn) drawerBtn.innerHTML = '↓ 收起对话';
  } else {
    drawer.classList.add('closed');
    drawer.classList.remove('open');
    if (drawerBtn) drawerBtn.innerHTML = '↑ 展开对话';
  }

  // Seed memory (only for old ideas that lack chatHistory)
  if (idea.nodes.length > 0 && (!chatHistory || chatHistory.length === 0)) {
    const memory = idea.nodes.slice(-4).map(n => n.text).join('；');
    chatHistory = [
      { role: 'user', content: `点子名：${idea.name}。之前的节点：${memory}` },
      { role: 'assistant', content: '我记着了。' }
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
    const initialMsg = `"${idea.name}"——现在在你脑子里是什么状态？哪怕一个词。`;
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
    return `上次聊到"${lastNode.keyword}"——那个方向现在怎么样了？`;
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
  if (noSel) noSel.style.display = 'flex';
  const v = document.getElementById('ideaView');
  if (v) v.style.display = 'none';
  const u = document.getElementById('universeView');
  if (u) u.style.display = 'none';
  document.getElementById('universeSidebarBtn').classList.remove('active');
}

// ── Universe View ──
let universeSim = null;

function showUniverse() {
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
  
  renderUniverse();
}

function renderUniverse() {
  const svg = d3.select('#universeSvg');
  svg.selectAll('*').remove();
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
  subtitle.textContent = `${ideas.length} 个点子 · ${ideasWithCards.length} 颗恒星`;

  emptyEl.style.display = 'none';
  svgWrap.style.display = 'block';

  const wrap = document.getElementById('universeSvgWrap');
  const w = wrap.clientWidth || 400;
  const h = wrap.clientHeight || 500;

  // Build nodes from ALL ideas
  const nodes = ideas.map((idea, i) => {
    const hasCard = idea.card && idea.card.core;
    const chatLen = (idea.chatHistory || []).length;
    const nodeCount = (idea.nodes || []).length;
    return {
      id: idea.id,
      name: idea.name,
      hasCard,
      core: hasCard ? idea.card.core : '',
      branches: hasCard ? (idea.card.branches || []) : [],
      tensions: hasCard ? (idea.card.tensions || '') : '',
      status: idea.status,
      size: hasCard ? Math.max(10, Math.min(25, 6 + chatLen * 0.8 + nodeCount * 1.2)) : 4,
      chatLen,
      nodeCount,
      index: i
    };
  });

  // Build links: only between ideas that BOTH have cards
  const links = [];
  const stopWords = new Set('我的了是在有就也都这那和或但如果一个什么会能要不没很更最到把被让用去来说做想看知道觉得感觉因为所以比如其实可以这个那个不是'.split(''));
  
  function extractKeyChars(text) {
    return new Set([...text].filter(c => !stopWords.has(c) && /[\u4e00-\u9fa5]/.test(c)));
  }

  const cardNodes = nodes.filter(n => n.hasCard);
  cardNodes.forEach((a, i) => {
    const aText = a.core + ' ' + a.branches.join(' ') + ' ' + a.tensions;
    const aChars = extractKeyChars(aText);
    
    cardNodes.forEach((b, j) => {
      if (j <= i) return;
      const bText = b.core + ' ' + b.branches.join(' ') + ' ' + b.tensions;
      const bChars = extractKeyChars(bText);
      const shared = [...aChars].filter(c => bChars.has(c));
      if (shared.length >= 3) {
        links.push({ 
          source: a.id, target: b.id, 
          strength: Math.min(shared.length / 5, 1),
          sharedChars: shared.slice(0, 5).join(''),
          aiReason: null // will be filled on hover
        });
      }
    });
  });

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
  for (let i = 0; i < 100; i++) {
    starGroup.append('circle')
      .attr('cx', Math.random() * w)
      .attr('cy', Math.random() * h)
      .attr('r', Math.random() * 1.2)
      .attr('fill', '#c8b89a')
      .attr('opacity', Math.random() * 0.25 + 0.03);
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
    .attr('stroke', '#7ec8e3')
    .attr('stroke-width', d => 0.5 + d.strength * 1.5)
    .attr('stroke-dasharray', '4,4')
    .attr('opacity', d => 0.12 + d.strength * 0.25)
    .attr('filter', 'url(#glow)')
    .attr('pointer-events', 'none');

  // Node groups
  const nodeSel = svg.append('g').selectAll('g')
    .data(nodes).join('g')
    .attr('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) universeSim.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) universeSim.alphaTarget(0); d.fx = null; d.fy = null; }))
    .on('click', (e, d) => {
      e.stopPropagation();
      selectIdea(d.id);
      const panel = document.getElementById('listPanel');
      if (panel && panel.classList.contains('open')) toggleSidebar();
    });

  // Planet / dark matter rendering
  const statusColors = { seed: '#e8b86d', grow: '#8fba6e', pause: '#5a6a7a' };
  function getNodeColor(d) {
    const idea = ideas.find(i => i.id === d.id);
    if (idea && idea.type === 'supernova') return '#7ec8e3';
    return statusColors[d.status] || '#e8b86d';
  }
  
  // Outer glow circle (only for card ideas)
  nodeSel.filter(d => d.hasCard).append('circle')
    .attr('r', d => d.size)
    .attr('fill', d => getNodeColor(d) + '22')
    .attr('stroke', d => getNodeColor(d))
    .attr('stroke-width', 1.5)
    .attr('filter', 'url(#glow)');

  // Inner bright core (only for card ideas)
  nodeSel.filter(d => d.hasCard).append('circle')
    .attr('r', d => Math.max(2.5, d.size * 0.3))
    .attr('fill', d => getNodeColor(d))
    .attr('opacity', 0.9);

  // Dark matter dots (no card)
  nodeSel.filter(d => !d.hasCard).append('circle')
    .attr('r', 3)
    .attr('fill', '#4a3e28')
    .attr('stroke', '#5a4e38')
    .attr('stroke-width', 0.5)
    .attr('opacity', 0.5);

  // Labels
  nodeSel.append('text')
    .attr('y', d => (d.hasCard ? d.size : 3) + 14)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'Noto Serif SC, serif')
    .attr('font-size', d => d.hasCard ? '11px' : '9px')
    .attr('font-weight', '300')
    .attr('fill', d => d.hasCard ? '#c8b89a' : '#5a4e38')
    .attr('opacity', d => d.hasCard ? 1 : 0.6)
    .text(d => d.name.length > 8 ? d.name.slice(0, 8) + '…' : d.name);

  // Node tooltip
  const tip = document.getElementById('nodeTip');
  nodeSel
    .on('mouseenter', (e, d) => {
      if (d.hasCard) {
        tip.innerHTML = `<div class="node-tip-meta">${d.chatLen}轮对话 · ${d.nodeCount}个节点 · ${{seed:'🌱萌芽',grow:'🌿推进',pause:'❄️搁置'}[d.status]}</div><strong>${d.name}</strong><br>${esc(d.core)}`;
      } else {
        tip.innerHTML = `<div class="node-tip-meta">暗物质 · 未展开</div><strong>${d.name}</strong><br><em>聊上几句就能点亮这颗星</em>`;
      }
      tip.classList.add('show');
    })
    .on('mousemove', e => { tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 8) + 'px'; })
    .on('mouseleave', () => tip.classList.remove('show'));

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
      d.aiReason = '共享关键词: ' + d.sharedChars;
    }
    d.aiFetching = false;
  }

  function showLinkTip(e, d) {
    const srcNode = nodes.find(n => n.id === (d.source.id || d.source));
    const tgtNode = nodes.find(n => n.id === (d.target.id || d.target));
    if (!srcNode || !tgtNode) return;

    const names = `<div style="font-size:10px;color:#5a7a8a;margin-bottom:6px;font-family:'Space Mono',monospace;letter-spacing:.05em">${srcNode.name} × ${tgtNode.name}</div>`;
    
    if (d.aiReason) {
      tip.innerHTML = `${names}<div style="color:#7ec8e3;font-size:14px;line-height:1.6;font-style:italic">✦ ${d.aiReason}</div>`;
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
      d3.select(linkSel.nodes()[idx]).attr('opacity', 0.6).attr('stroke-width', 2.5).attr('filter', 'url(#glowStrong)');
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
      tip.classList.remove('show');
    });

  // Simulation
  universeSim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(120).strength(d => d.strength * 0.5))
    .force('charge', d3.forceManyBody().strength(d => d.hasCard ? -200 : -50))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('x', d3.forceX(w / 2).strength(.04))
    .force('y', d3.forceY(h / 2).strength(.04))
    .force('collision', d3.forceCollide(d => (d.hasCard ? d.size : 6) + 15));

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
    document.getElementById('narrationText').textContent = `✦ ${ideasWithCards.length} 颗恒星尚未产生联系。继续聊，连线会自己长出来。`;
  } else {
    narration.style.display = 'block';
    document.getElementById('narrationText').textContent = `✦ ${ideas.length} 颗暗物质等待被点亮。和它们聊几句，让它们变成恒星。`;
  }

  // Auto-discover supernovae (runs in background)
  autoDiscoverSupernovae(ideasWithCards);
}

async function generateUniverseNarration(ideasWithCards, links) {
  const narration = document.getElementById('universeNarration');
  const narrationText = document.getElementById('narrationText');
  
  narration.style.display = 'block';
  narrationText.textContent = '正在观察你的思维星图…';

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
    narrationText.textContent = `✦ ${ideasWithCards.length} 个点子，${links.length} 条隐藏联系。点击星球深入探索。`;
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
async function autoDiscoverSupernovae(ideasWithCards) {
  // Don't discover if fewer than 2 ideas with enough content
  const richIdeas = ideasWithCards.filter(i => {
    const chatLen = (i.chatHistory || []).length;
    return chatLen >= 3 || (i.nodes && i.nodes.length >= 1);
  });
  if (richIdeas.length < 2) return;
  
  // Don't create if we already have a supernova from today
  const today = new Date().toDateString();
  const recentSupernova = ideas.find(i => 
    i.type === 'supernova' && new Date(i.createdAt).toDateString() === today
  );
  if (recentSupernova) return;

  // Exclude pairs that already have supernovae
  const existingPairs = ideas
    .filter(i => i.type === 'supernova' && i.parentIds)
    .map(i => i.parentIds.sort().join(','));

  const narrationEl = document.getElementById('narrationText');

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-') ? `Bearer ${apiKey}` : apiKey;
    }

    // Build full context for each idea
    const fullContexts = richIdeas.map(i => getIdeaFullContext(i)).join('\n---\n');
    const pairList = richIdeas.map(i => i.name).join(', ');

    const res = await fetch('/api/chat', {
      method: 'POST', headers,
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct', max_tokens: 400,
        messages: [
          { role: 'system', content: `你是"抽屉"的思维合成器。分析用户的多个想法，找出最有深度和潜力的交叉点。
不是简单的"都提到了X"，而是"A的某个方向 + B的某个张力 = 一个全新的、用户没想到的方向"。
选择最有爆发力的一对，返回JSON（不要markdown包裹）：
{"ideaA":"点子A的名字","ideaB":"点子B的名字","name":"新方向的名字（5-10字，有吸引力）","core":"一句话描述这个全新方向（20-40字）","branches":["方向1","方向2","方向3"],"tensions":"这个合成方向最大的未知是什么（一句话）","why":"为什么这两个点子放在一起会产生化学反应（一句话）"}` },
          { role: 'user', content: fullContexts }
        ]
      })
    });

    const data = await res.json();
    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);

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

    // Re-render universe to show the new star
    setTimeout(() => renderUniverse(), 800);

  } catch(err) {
    // Silent fail - supernovae are a bonus, not critical
    console.log('Supernova discovery failed:', err);
  }
}

// ── Render List ──
function renderList() {
  const el = document.getElementById('ideasList');
  if (!el) return;
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

    return `<div class="idea-item ${idea.id === currentId ? 'active' : ''} ${freshClass}" onclick="selectIdea(${idea.id})">
  <div class="idea-item-name">${namePrefix}${esc(idea.name)}</div>
  ${snippet}
  <div class="idea-item-meta">
    <span class="sdot ${dotClass}"></span>
    <span class="idea-item-info">${dateStr}·${idea.nodes.length}节</span>
  </div>
  ${controls}
</div>`;
  }).join('');
}

// ── Graph ──
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

  const nodes = idea.nodes.map((n, i) => ({
    id: n.id, fullText: n.text, keyword: n.keyword || n.text.slice(0, 6),
    type: n.type, time: n.time, index: i, done: n.done
  }));

  const links = [];
  nodes.forEach((n, i) => {
    if (i > 0) links.push({ source: nodes[i - 1].id, target: n.id, seq: true });
  });
  const stop = new Set('我的了是在有就也都这那和或但如果一个什么会能要不没很更最到把被让用去来说做想看知道觉得感觉因为所以比如其实'.split(''));
  nodes.forEach((a, i) => {
    nodes.forEach((b, j) => {
      if (j <= i + 1) return;
      const wa = new Set([...a.fullText].filter(c => !stop.has(c) && /[\u4e00-\u9fa5]/.test(c)));
      const wb = new Set([...b.fullText].filter(c => !stop.has(c) && /[\u4e00-\u9fa5]/.test(c)));
      const shared = [...wa].filter(c => wb.has(c)).length;
      if (shared >= 2) links.push({ source: a.id, target: b.id, seq: false });
    });
  });

  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);
  const validLinks = links.filter(l => nodeMap[l.source] && nodeMap[l.target]);

  svg.append('defs').append('marker')
    .attr('id', 'arr').attr('viewBox', '0 -3 6 6')
    .attr('refX', 16).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
    .append('path').attr('d', 'M0,-3L6,0L0,3').attr('fill', '#4a3e28');

  const linkSel = svg.append('g').selectAll('line')
    .data(validLinks).join('line')
    .attr('stroke', d => d.seq ? '#4a3e28' : '#3a3020')
    .attr('stroke-width', d => d.seq ? 1.5 : 1)
    .attr('stroke-dasharray', d => d.seq ? null : '3,3')
    .attr('marker-end', d => d.seq ? 'url(#arr)' : null)
    .attr('opacity', .8);

  const nodeSel = svg.append('g').selectAll('g')
    .data(nodes).join('g')
    .attr('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) sim.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
    .on('click', (e, d) => { e.stopPropagation(); });

  nodeSel.each(function (d) {
    const el = d3.select(this);
    if (d.type === 'todo') {
      const g = el.append('g').attr('transform', 'translate(-6, -6)');
      g.append('rect')
        .attr('width', 12).attr('height', 12).attr('rx', 2)
        .attr('fill', d.done ? '#8fba6e' : 'transparent')
        .attr('stroke', '#8fba6e').attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .on('click', (e, d) => {
          e.stopPropagation();
          toggleTodoNode(d.id);
        });
      if (d.done) {
        g.append('path')
          .attr('d', 'M3,6 L5,8 L9,3')
          .attr('fill', 'none').attr('stroke', '#221c14').attr('stroke-width', 1.5);
      }
    } else {
      el.append('circle')
        .attr('r', 5)
        .attr('fill', d.type === 'ai' ? '#8fba6e' : '#e8b86d')
        .attr('stroke', d.type === 'ai' ? '#5a9a4e' : '#b89040')
        .attr('stroke-width', 1.5);
    }
  });

  nodeSel.append('text')
    .attr('x', 9).attr('y', 4)
    .attr('font-family', 'Noto Serif SC, serif')
    .attr('font-size', '11px')
    .attr('font-weight', '300')
    .attr('fill', '#c8b89a')
    .text(d => d.keyword);

  const tip = document.getElementById('nodeTip');
  nodeSel
    .on('mouseenter', (e, d) => {
      tip.innerHTML = `<div class="node-tip-meta">${d.time} · ${d.type === 'ai' ? '提炼' : '你说的'}</div>${esc(d.fullText)}`;
      tip.classList.add('show');
    })
    .on('mousemove', e => { tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 8) + 'px'; })
    .on('mouseleave', () => tip.classList.remove('show'));

  sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(validLinks).id(d => d.id).distance(70).strength(d => d.seq ? .7 : .25))
    .force('charge', d3.forceManyBody().strength(-140))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('x', d3.forceX(w / 2).strength(.05))
    .force('y', d3.forceY(h / 2).strength(.07))
    .force('collision', d3.forceCollide(24));

  sim.on('tick', () => {
    linkSel
      .attr('x1', d => cx(d.source.x, w)).attr('y1', d => cy(d.source.y, h))
      .attr('x2', d => cx(d.target.x, w)).attr('y2', d => cy(d.target.y, h));
    nodeSel.attr('transform', d => `translate(${cx(d.x, w)},${cy(d.y, h)})`);
  });
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
    cardContent.style.display = 'flex';
    document.getElementById('cardCore').textContent = idea.card.core || '';
    document.getElementById('cardBranches').innerHTML =
      (idea.card.branches || []).map(b => `<span class="card-chip">${esc(b)}</span>`).join('');
    document.getElementById('cardTensions').textContent = idea.card.tensions || '';
    document.getElementById('cardNext').textContent = idea.card.next || '';
  } else {
    cardEmpty.style.display = 'flex';
    cardContent.style.display = 'none';
    const chatLen = (idea.chatHistory || []).length;
    if (cardGenBtn) cardGenBtn.style.display = chatLen >= 4 ? 'block' : 'none';
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
{"core":"核心想法，1-2句，第一人称，像日记里的发现","branches":["方向1，10字内","方向2，10字内","方向3，10字内"],"tensions":"最大的矛盾或未解决问题，1句话","next":"最小的一步行动，10字内，具体可执行"}`
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
  const text = `# ${idea.name}\n\n**核心想法**\n${c.core}\n\n**关键方向**\n${(c.branches || []).map(b => '· ' + b).join('\n')}\n\n**未解决的张力**\n${c.tensions}\n\n**最小一步**\n${c.next}`;
  navigator.clipboard.writeText(text)
    .then(() => {
      const btn = document.querySelector('.card-copy-btn');
      if (btn) { btn.textContent = '✓ 已复制'; setTimeout(() => btn.textContent = '复制卡片', 2000); }
    })
    .catch(() => alert('复制失败，请手动复制'));
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
      colors: ['#e8b86d', '#8fba6e', '#c47a3a']
    });
  }

  document.getElementById('chatInput').value = `我刚刚完成了这个行动：【${node.keyword}】。下一步该做什么？`;
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
  div.innerHTML = `<div class="msg-who">抽屉</div><div class="msg-bubble ai-stream-bubble"></div>`;
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

    if (idea && !idea.card && chatHistory.length >= 8) {
      setTimeout(() => generateIdeaCard(true), 800);
    } else {
      renderCard();
    }

    if (chatHistory.length >= 3) {
      const btnsDiv = document.createElement('div');
      btnsDiv.style.display = 'flex'; btnsDiv.style.gap = '10px';

      const pinBtn = document.createElement('button');
      pinBtn.className = 'pin-btn';
      pinBtn.textContent = '↓ 钉入时间线';
      pinBtn.onclick = function () { pinToTimeline(this, false, currentIdx); };

      const todoBtn = document.createElement('button');
      todoBtn.className = 'todo-btn';
      todoBtn.textContent = '☐ 钉为待办';
      todoBtn.onclick = function () { pinToTimeline(this, true, currentIdx); };

      btnsDiv.appendChild(pinBtn);
      btnsDiv.appendChild(todoBtn);
      div.appendChild(btnsDiv);
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
    saveIdeas(); renderList(); renderGraph();

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
    actions = `<div style="display:flex;gap:10px;margin-top:6px;">
  <button class="pin-btn" style="margin-top:0;" onclick="pinToTimeline(this, false, ${idxParam})">↓ 钉入时间线</button>
  <button class="todo-btn" style="margin-top:0;" onclick="pinToTimeline(this, true, ${idxParam})">☐ 钉为待办</button>
</div>`;
  }
  div.innerHTML = `<div class="msg-who">${role === 'user' ? '你' : '抽屉'}</div><div class="msg-bubble">${fmt(text)}</div>${actions}`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function setLoad(v) { loading = v; document.getElementById('sendBtn').disabled = v; document.getElementById('chatInput').disabled = v; }
function fmt(t) { return t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); }
function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

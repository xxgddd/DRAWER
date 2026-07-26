(function createWorldWindow(root) {
  const DAILY_STORAGE_KEY = 'drawer_world_window_daily_v1';
  const HISTORY_STORAGE_KEY = 'drawer_world_window_history_v1';
  const FEEDBACK_STORAGE_KEY = 'drawer_world_window_feedback_v1';
  const GUIDE_STORAGE_KEY = 'drawer_world_window_guide_dismissed_v1';
  const GUIDE_DURATIONS = { 1: 3200, 2: 4600, 3: 5600 };
  const WORLD_VERSION = 1;
  const ROLE_LABELS = {
    border: ['贴边星', 'BORDER LIGHT'],
    far: ['意外远星', 'DISTANT LIGHT'],
    echo: ['老星回声', 'OLD STAR ECHO']
  };
  const TYPE_LABELS = {
    person: ['人物', 'PERSON'],
    work: ['作品', 'WORK'],
    field: ['领域', 'FIELD'],
    concept: ['概念', 'CONCEPT'],
    question: ['提问', 'QUESTION']
  };
  let worldData = null;
  let worldJob = null;
  let selectedLightId = null;
  let lastCollision = null;
  let resizeObserver = null;
  let worldGuideActive = false;
  let worldGuidePhase = 0;
  let worldGuideTimer = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const label = pair => currentLanguage === 'en' ? pair[1] : pair[0];
  const ideaDisplayName = idea => currentLanguage === 'en'
    ? (idea?.universeLabelEn || idea?.nameEn || idea?.name || '')
    : (idea?.nameZh || idea?.name || '');
  const lightValue = (light, field) => {
    if (!light) return '';
    const localized = currentLanguage === 'en' ? light[`${field}En`] : light[`${field}Zh`];
    return localized || light[field] || '';
  };

  function isActive() {
    return window.DrawerAtlasView?.getMode() === 'world'
      && document.getElementById('universeView')?.style.display !== 'none';
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function dateLabel(date = new Date()) {
    if (currentLanguage === 'en') {
      return `TODAY'S LETTER · ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`;
    }
    return `今日来信 · ${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  }

  function safeJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '');
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function setLoading(message, visible = true) {
    const loading = document.getElementById('worldWindowLoading');
    const text = document.getElementById('worldWindowLoadingText');
    if (text) text.textContent = message;
    loading?.classList.toggle('hidden', !visible);
  }

  function shouldOfferGuide() {
    const forced = new URLSearchParams(window.location.search).get('concept') === '1';
    if (forced) return true;
    if (localStorage.getItem(GUIDE_STORAGE_KEY)) return false;
    return !ideas.some(idea => idea.card?.core);
  }

  function buildConceptGuideData(phase = worldGuidePhase || 1) {
    const sourceIdeas = typeof buildConceptUniverseIdeas === 'function'
      ? buildConceptUniverseIdeas(false).slice(0, 4)
      : [];
    const coordinates = [
      [-0.78, -0.38],
      [-0.5, 0.18],
      [-0.18, -0.02],
      [-0.42, 0.58]
    ];
    const points = sourceIdeas.map((idea, index) => ({
      id: idea.id,
      idea,
      x: coordinates[index][0],
      y: coordinates[index][1],
      rawX: coordinates[index][0],
      rawY: coordinates[index][1]
    }));
    const anchors = [
      { role: 'recent', idea: sourceIdeas[1], point: points[1] },
      { role: 'frontier', idea: sourceIdeas[2], point: points[2] },
      { role: 'old', idea: sourceIdeas[0], point: points[0] }
    ].filter(anchor => anchor.idea && anchor.point);
    const lights = phase >= 2 ? [
      {
        id: 'concept-light-embodied',
        name: '具身认知',
        nameEn: 'Embodied Cognition',
        type: 'concept',
        role: 'border',
        description: '身体经验如何参与思考、判断与记忆的研究方向。',
        descriptionEn: 'A research direction on how bodily experience participates in thought, judgment, and memory.',
        relation: '它贴着「情绪价值饮食顾问」的边缘，把情绪与饮食接向身体经验。',
        relationEn: 'It sits beside the emotional eating idea, connecting mood and food to bodily experience.',
        anchorId: sourceIdeas[1]?.id,
        nearestIdeaId: sourceIdeas[1]?.id,
        x: 0.22,
        y: -0.05,
        semanticDistance: 0.32
      },
      {
        id: 'concept-light-narrative',
        name: '叙事身份',
        nameEn: 'Narrative Identity',
        type: 'concept',
        role: 'echo',
        description: '人如何通过讲述经历，形成持续身份感的一种理解框架。',
        descriptionEn: 'A framework for how people form a continuous sense of self by narrating experience.',
        relation: '它回应「被需要感」：我们如何通过讲述自己与他人的关系，确认自身位置。',
        relationEn: 'It echoes the need to feel needed through the stories we tell about our place among others.',
        anchorId: sourceIdeas[0]?.id,
        nearestIdeaId: sourceIdeas[0]?.id,
        x: 0.52,
        y: 0.28,
        semanticDistance: 0.72
      },
      {
        id: 'concept-light-phenomenology',
        name: '现象学',
        nameEn: 'Phenomenology',
        type: 'field',
        role: 'far',
        description: '从第一人称经验出发理解感知、身体与世界的哲学传统。',
        descriptionEn: 'A philosophical tradition studying perception, embodiment, and the world from first-person experience.',
        relation: '它故意离日常点子更远，用另一套语言重新提问“感受是怎样出现的”。',
        relationEn: 'It stays farther away, offering another language for asking how a feeling appears.',
        anchorId: sourceIdeas[2]?.id,
        nearestIdeaId: sourceIdeas[2]?.id,
        x: 1.18,
        y: 0.72,
        semanticDistance: 1.34
      }
    ] : [];
    return {
      context: { points, items: [], anchorMeans: null, rawBounds: { xMin: -1, xMax: 1, yMin: -1, yMax: 1 }, vectorDimension: 0 },
      anchors,
      lights,
      date: localDateKey(),
      preview: true,
      conceptPreview: true,
      conceptPhase: phase
    };
  }

  function updateGuide() {
    const guide = document.getElementById('worldConceptGuide');
    if (!guide) return;
    const title = document.getElementById('worldConceptGuideTitle');
    const body = document.getElementById('worldConceptGuideBody');
    const steps = [...guide.querySelectorAll('.concept-guide-step')];
    const timeline = document.getElementById('worldConceptTimelineFill');
    guide.classList.add('show');
    guide.setAttribute('aria-hidden', 'false');
    steps.forEach((step, index) => {
      step.classList.toggle('active', index < worldGuidePhase);
      step.classList.toggle('current', index === worldGuidePhase - 1);
      if (index === worldGuidePhase - 1) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    if (timeline) {
      timeline.classList.remove('playing');
      timeline.style.setProperty('--concept-phase-duration', `${GUIDE_DURATIONS[worldGuidePhase]}ms`);
      void timeline.offsetWidth;
      timeline.classList.add('playing');
    }
    if (worldGuidePhase === 1) {
      title.textContent = t('这里是你的已知内海', 'This is your known inner sea');
      body.textContent = t('橙色星光来自你已经留下的念头，海岸线是此刻认知的边界。', 'The orange stars are thoughts you have kept; the shoreline is the edge of what you know today.');
    } else if (worldGuidePhase === 2) {
      title.textContent = t('窗口从你的边缘向外打开', 'The window opens from your frontier');
      body.textContent = t('青色灯塔不是随机推荐。每一盏都从某颗旧星出发，通向边界外的真实概念。', 'The cyan lights are not random. Each begins at one of your stars and points toward a real idea beyond the edge.');
    } else {
      title.textContent = t('把一束外部光带回抽屉', 'Bring one outside light home');
      body.textContent = t('打开来信，看看它为何与你有关。你可以收藏它，也可以让它和旧点子发生一次碰撞。', 'Open the letter to see why it found you. Save it, or let it collide with an older idea.');
    }
  }

  function scheduleGuideAdvance() {
    if (worldGuideTimer) clearTimeout(worldGuideTimer);
    worldGuideTimer = null;
    if (!worldGuideActive || worldGuidePhase >= 3 || !isActive()) return;
    worldGuideTimer = setTimeout(() => goToGuidePhase(worldGuidePhase + 1), GUIDE_DURATIONS[worldGuidePhase]);
  }

  function goToGuidePhase(phase) {
    worldGuideActive = true;
    worldGuidePhase = Math.max(1, Math.min(3, Number(phase) || 1));
    selectedLightId = worldGuidePhase >= 3 ? 'concept-light-embodied' : null;
    worldData = buildConceptGuideData(worldGuidePhase);
    updateGuide();
    setLoading('', false);
    updateSummary(worldData);
    updateDailyNudge(worldData);
    document.getElementById('worldWindowEmpty').hidden = true;
    if (isActive()) {
      renderSvg();
      renderLetter(selectedLight());
    }
    scheduleGuideAdvance();
  }

  function startGuide() {
    goToGuidePhase(1);
  }

  function finishGuide() {
    localStorage.setItem(GUIDE_STORAGE_KEY, '1');
    if (worldGuideTimer) clearTimeout(worldGuideTimer);
    worldGuideTimer = null;
    worldGuideActive = false;
    worldGuidePhase = 0;
    selectedLightId = null;
    worldData = null;
    const guide = document.getElementById('worldConceptGuide');
    guide?.classList.remove('show');
    guide?.setAttribute('aria-hidden', 'true');
    renderLetter(null);
    render(true);
  }

  function updateSummary(data = worldData) {
    const summary = document.getElementById('worldWindowSummary');
    if (!summary) return;
    if (!data) {
      summary.textContent = t('正在确认今天的航线…', 'Charting today’s route…');
      return;
    }
    const starCount = data.context?.points?.length || 0;
    const anchorCount = data.anchors?.length || 0;
    const ignored = getIgnoredNames();
    const lightCount = (data.lights || []).filter(light => !ignored.has(String(light.name || '').toLowerCase())).length;
    summary.textContent = currentLanguage === 'en'
      ? `${starCount} YOUR STARS · ${anchorCount} ANCHORS · ${lightCount} LIGHTHOUSES`
      : `${starCount} 颗你的星 · ${anchorCount} 处今日锚点 · ${lightCount} 盏外部灯塔`;
  }

  function recommendedLight(data = worldData) {
    if (!data?.lights?.length) return null;
    const ignored = getIgnoredNames();
    const roleRank = { border: 0, echo: 1, far: 2 };
    return [...data.lights]
      .filter(light => !ignored.has(String(light.name || '').toLowerCase()))
      .sort((left, right) => (
        (roleRank[left.role] ?? 3) - (roleRank[right.role] ?? 3)
        || Number(left.semanticDistance || 0) - Number(right.semanticDistance || 0)
      ))[0] || null;
  }

  function updateDailyNudge(data = worldData) {
    const panel = document.getElementById('worldDailyNudge');
    const body = document.getElementById('worldNudgeBody');
    if (!panel || !body) return;
    const light = recommendedLight(data);
    panel.hidden = !light;
    if (!light) return;
    const name = lightValue(light, 'name');
    if (currentLanguage === 'en') {
      body.textContent = light.role === 'echo'
        ? `Revisit “${name}”. It reconnects with an older idea that has been quiet for a while.`
        : light.role === 'far'
          ? `Take one intentional detour toward “${name}” and notice which assumption it unsettles.`
          : `Start with “${name}”. It sits closest to your frontier—decide whether to save it or cross it with an old idea.`;
    } else {
      body.textContent = light.role === 'echo'
        ? `先看看「${name}」。它正在回应一颗沉寂已久的旧点子。`
        : light.role === 'far'
          ? `今天故意绕远一点，打开「${name}」，看看它会松动哪个旧框架。`
          : `先看看「${name}」。它离你的边疆最近，适合判断要收藏，还是和旧点子交叉。`;
    }
  }

  function openDailyNudge() {
    const light = recommendedLight();
    if (light) selectLight(light.id);
  }

  function refreshLanguage() {
    const copy = {
      worldWindowTitle: t('世界之窗', 'World Window'),
      worldTerraSubtitle: t('海岸线之外 · 每日一封来信', 'BEYOND THE SHORE · A DAILY LETTER'),
      worldEmptyTitle: t('先在抽屉里留下一颗星', 'Leave one star in the drawer first'),
      worldEmptyBody: t('世界之窗会从你的边疆向外寻找今天的灯塔。', 'World Window looks outward from your frontier for today’s lighthouses.'),
      worldCollisionLabel: t('交叉后出现的新方向', 'A NEW DIRECTION FROM THE CROSSING'),
      worldCollisionSaveBtn: t('保存这个新火种', 'Save this new spark'),
      worldCaptureBtn: t('收藏为种子', 'Save as a seed'),
      worldCollideBtn: t('和旧点子交叉', 'Cross with an old idea'),
      worldIgnoreBtn: t('忽略', 'Ignore'),
      worldNudgeKicker: t('今日引导', "TODAY'S NUDGE"),
      worldNudgeTitle: t('今天只做一件小事', 'One small move for today'),
      worldLegendKnown: t('你的星', 'Your stars'),
      worldLegendExternal: t('外部灯塔', 'Outside lights')
    };
    Object.entries(copy).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
    const nudgeButton = document.getElementById('worldNudgeButton');
    if (nudgeButton) nudgeButton.innerHTML = `${t('打开今天的第一盏灯塔', 'Open today’s first lighthouse')} <span>↗</span>`;
    const closeButton = document.getElementById('worldLetterCloseBtn');
    if (closeButton) closeButton.setAttribute('aria-label', t('关闭', 'Close'));
    const svg = document.getElementById('worldWindowSvg');
    if (svg) svg.setAttribute('aria-label', t('世界之窗：你的已知内海与今日外部灯塔', 'World Window: your known sea and today’s outside lighthouses'));
    document.getElementById('worldWindowDate').textContent = dateLabel();
    updateCoordinate(selectedLight());
    updateSummary();
    updateDailyNudge();
    if (worldData && isActive()) {
      renderSvg();
      renderLetter(selectedLight());
    }
  }

  function getIgnoredNames() {
    const now = Date.now();
    const feedback = safeJson(FEEDBACK_STORAGE_KEY, {});
    return new Set(Object.entries(feedback.ignored || {})
      .filter(([, until]) => Number(until) > now)
      .map(([name]) => name.toLowerCase()));
  }

  function feedbackPreferences() {
    const feedback = safeJson(FEEDBACK_STORAGE_KEY, {});
    return Object.entries(feedback.actions || {})
      .map(([type, counts]) => ({
        type,
        weight: (Number(counts.capture) || 0) * 2 + (Number(counts.collide) || 0)
      }))
      .filter(item => item.weight > 0)
      .sort((left, right) => right.weight - left.weight);
  }

  function recentHistoryNames() {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const history = safeJson(HISTORY_STORAGE_KEY, [])
      .filter(entry => Number(entry.savedAt) >= threshold);
    return new Set(history.flatMap(entry => entry.names || []).map(name => String(name).toLowerCase()));
  }

  function rememberDailyNames(lights) {
    const today = localDateKey();
    const history = safeJson(HISTORY_STORAGE_KEY, [])
      .filter(entry => entry.date !== today && Number(entry.savedAt) >= Date.now() - 8 * 24 * 60 * 60 * 1000);
    history.push({ date: today, savedAt: Date.now(), names: lights.map(light => light.name) });
    saveJson(HISTORY_STORAGE_KEY, history.slice(-8));
  }

  function recordFeedback(light, action) {
    if (!light) return;
    const feedback = safeJson(FEEDBACK_STORAGE_KEY, { actions: {}, ignored: {} });
    feedback.actions ||= {};
    feedback.ignored ||= {};
    const key = String(light.type || 'concept');
    feedback.actions[key] ||= { capture: 0, collide: 0 };
    if (action === 'capture' || action === 'collide') feedback.actions[key][action] += 1;
    if (action === 'ignore') feedback.ignored[light.name.toLowerCase()] = Date.now() + 7 * 24 * 60 * 60 * 1000;
    saveJson(FEEDBACK_STORAGE_KEY, feedback);
  }

  function selectAnchors(context) {
    const pointById = new Map(context.points.map(point => [String(point.id), point]));
    const sortedRecent = [...ideas].sort((left, right) => (
      Number(right.updatedAt || right.createdAt || 0) - Number(left.updatedAt || left.createdAt || 0)
    ));
    const sortedOld = [...ideas].sort((left, right) => (
      Number(left.updatedAt || left.createdAt || 0) - Number(right.updatedAt || right.createdAt || 0)
    ));
    const centroid = context.points.reduce((sum, point) => ({
      x: sum.x + point.x / context.points.length,
      y: sum.y + point.y / context.points.length
    }), { x: 0, y: 0 });
    const frontierPoint = [...context.points].sort((left, right) => (
      Math.hypot(right.x - centroid.x, right.y - centroid.y)
      - Math.hypot(left.x - centroid.x, left.y - centroid.y)
    ))[0];
    const candidates = [
      { role: 'recent', idea: sortedRecent[0] },
      { role: 'frontier', idea: ideas.find(idea => String(idea.id) === String(frontierPoint?.id)) },
      { role: 'old', idea: sortedOld.find(idea => idea.id !== sortedRecent[0]?.id) || sortedOld[0] }
    ];
    const seen = new Set();
    return candidates.filter(anchor => {
      if (!anchor.idea || seen.has(String(anchor.idea.id))) return false;
      seen.add(String(anchor.idea.id));
      anchor.point = pointById.get(String(anchor.idea.id));
      anchor.text = getIdeaSemanticDescriptor(anchor.idea).text;
      return true;
    });
  }

  function fallbackCandidates(anchors) {
    const recent = anchors.find(anchor => anchor.role === 'recent') || anchors[0];
    const frontier = anchors.find(anchor => anchor.role === 'frontier') || anchors[0];
    const old = anchors.find(anchor => anchor.role === 'old') || anchors[anchors.length - 1];
    const relation = anchor => currentLanguage === 'en'
      ? `A real-world direction adjacent to “${ideaDisplayName(anchor?.idea) || 'your recent idea'}”.`
      : `它位于「${anchor?.idea?.name || '最近的点子'}」外侧，是可以继续查证和补课的真实方向。`;
    const englishDescriptions = {
      'Embodied Cognition': 'A research direction on how bodily experience participates in thought, judgment, and memory.',
      'Systems Thinking': 'A cross-disciplinary practice for studying relationships, feedback loops, and whole-system behavior.',
      'Design Fiction': 'A design practice that uses fictional prototypes to discuss the social consequences of possible futures.',
      'The Adjacent Possible': 'A concept describing the next set of possibilities reachable from a system’s present state.',
      'Situated Knowledge': 'The view that knowledge is always produced from particular positions, experiences, and power relations.',
      'Phenomenology': 'A philosophical field that studies perception, embodiment, and the world from first-person experience.',
      'Counterfactual Thinking': 'A way of understanding choice and causality by asking how events might have unfolded differently.',
      'What would change your frame?': 'A prompt asking what outside evidence would force you to adopt a different frame.',
      'Civic Imagination': 'The shared capacity to imagine how public life could be organized or changed.',
      'Boundary Object': 'An object different groups can use together while still interpreting it in different ways.'
    };
    return [
      ['Embodied Cognition', 'concept', '身体经验如何参与思考、判断与记忆的研究方向。', recent],
      ['Systems Thinking', 'field', '研究关系、反馈回路与整体行为的跨领域方法。', frontier],
      ['Design Fiction', 'field', '用虚构原型讨论未来技术与社会后果的设计实践。', recent],
      ['The Adjacent Possible', 'concept', '描述一个系统从当下状态能够抵达的下一圈可能性。', frontier],
      ['Situated Knowledge', 'concept', '强调知识总从具体位置、经验与权力关系中产生。', old],
      ['Phenomenology', 'field', '从第一人称经验出发理解感知、身体和世界。', old],
      ['Counterfactual Thinking', 'concept', '通过“如果当时不同”来理解选择、因果与可能性。', recent],
      ['What would change your frame?', 'question', '一个追问：什么外部证据会迫使你换一副理解框架？', frontier],
      ['Civic Imagination', 'concept', '共同想象公共生活还能如何被组织和改变。', old],
      ['Boundary Object', 'concept', '能被不同群体共同使用、又容纳不同解释的对象。', frontier],
      ['Affordance', 'concept', '环境或物件向行动者提供的可行动可能性。', recent],
      ['Liminality', 'concept', '处在旧状态已经松动、新状态尚未形成之间的过渡经验。', old],
      ['The Commons', 'concept', '由共同体协商、维护与共享的资源及其治理方式。', frontier],
      ['Actor-Network Theory', 'field', '把人、技术与制度一起看作关系网络中的行动者。', recent],
      ['Speculative Design', 'field', '通过设计假设讨论可能未来，而不是直接解决当下问题。', frontier],
      ['Sensemaking', 'concept', '人在不确定环境中组织线索并形成可行动理解的过程。', recent],
      ['Participatory Design', 'field', '让受影响的人直接参与定义问题和塑造方案。', frontier],
      ['Critical Making', 'field', '通过亲手制作来检验和批判技术与社会假设。', recent],
      ['Media Archaeology', 'field', '从被遗忘的媒介技术与历史路径重新理解当下。', old],
      ['Environmental Psychology', 'field', '研究空间、环境与人的感受和行为之间的关系。', frontier],
      ['Care Ethics', 'field', '把依赖、关系和照料责任放在伦理判断中心。', old],
      ['Slow Technology', 'concept', '有意为反思、停留和长期关系留出时间的技术观。', recent],
      ['Community of Practice', 'concept', '人们通过持续共同实践形成知识、身份与规范。', old],
      ['Tacit Knowledge', 'concept', '能够做出来、却很难完整说清楚的经验性知识。', old],
      ['Third Place', 'concept', '家庭与工作之外，支持非正式公共交往的日常场所。', frontier],
      ['Cognitive Offloading', 'concept', '把记忆或计算任务交给纸张、设备和环境完成。', recent],
      ['Extended Mind', 'concept', '把工具与环境视为认知过程可能延伸到的部分。', recent],
      ['Urban Acupuncture', 'concept', '用局部、小尺度介入撬动更大城市系统变化的方法。', frontier],
      ['Solarpunk', 'concept', '围绕生态修复、技术与更公平未来展开的文化想象。', frontier],
      ['Degrowth', 'field', '讨论在生态边界内减少物质吞吐并重组繁荣定义的领域。', frontier],
      ['Interoception', 'concept', '感知心跳、呼吸、饥饿等身体内部信号的能力。', recent],
      ['Psychogeography', 'field', '探索城市空间如何影响情绪、行动与经验。', frontier],
      ['Systems Mapping', 'field', '把参与者、关系与反馈回路画出来以理解复杂问题。', recent],
      ['Theory of Change', 'concept', '显式描述行动如何通过一系列条件产生长期变化。', frontier],
      ['Platform Cooperativism', 'field', '探索由劳动者或使用者共同拥有数字平台的路径。', frontier],
      ['Institutional Critique', 'field', '审视组织、规则与展示机制如何塑造价值和可见性。', old]
    ].map(([name, type, description, anchor], index) => ({
      id: `fallback-${index}`,
      name,
      type,
      description: currentLanguage === 'en'
        ? (englishDescriptions[name] || `An established ${type === 'field' ? 'field or practice' : 'concept'} that offers a perspective beyond your current map.`)
        : description,
      relation: relation(anchor),
      anchorId: anchor?.idea?.id,
      verification: 'conceptual'
    }));
  }

  function sanitizeCandidates(items, anchors) {
    const validTypes = new Set(Object.keys(TYPE_LABELS));
    const anchorIds = new Set(anchors.map(anchor => String(anchor.idea.id)));
    const seen = new Set();
    return (Array.isArray(items) ? items : []).map((item, index) => {
      const name = String(item?.name || '').trim().slice(0, 60);
      const normalizedName = name.toLowerCase();
      if (!name || seen.has(normalizedName)) return null;
      seen.add(normalizedName);
      const requestedAnchor = String(item?.anchorId || '');
      return {
        id: `candidate-${index}-${DrawerSemanticSpace.fingerprint(normalizedName)}`,
        name,
        type: validTypes.has(item?.type) ? item.type : 'concept',
        description: String(item?.description || '').trim().slice(0, 240),
        relation: String(item?.relation || '').trim().slice(0, 240),
        anchorId: anchorIds.has(requestedAnchor) ? requestedAnchor : String(anchors[index % anchors.length]?.idea?.id || ''),
        verification: ['person', 'work'].includes(item?.type) ? 'unverified' : 'conceptual'
      };
    }).filter(Boolean);
  }

  async function generateCandidates(anchors) {
    const excluded = new Set([...recentHistoryNames(), ...getIgnoredNames()]);
    const fallback = fallbackCandidates(anchors);
    try {
      const headers = { 'Content-Type': 'application/json', 'X-Drawer-Purpose': 'world-window-candidates' };
      if (apiKey) {
        headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-')
          ? `Bearer ${apiKey}`
          : apiKey;
      }
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-72B-Instruct',
          max_tokens: 1600,
          messages: [
            {
              role: 'system',
              content: `你在为“世界之窗”寻找外部真实存在的灯塔。它们只能是：人物、作品、研究领域、已有概念/术语或一个面向外部世界的提问。
不要生成用户自己的新点子，不要把用户已有点子换个名字。优先领域、概念和提问；人物与作品必须是你有把握真实存在的，但仍会在界面标记“AI 推荐，未核实”。
根据三个锚点生成 8 个候选。候选要有近有远，其中至少 3 个贴近边疆、2 个明显意外、2 个呼应 old 锚点。不要使用排除名单中的名字。
严格返回 JSON 数组，每项：
{"name":"名称","type":"person|work|field|concept|question","description":"它是什么，一句具体说明","relation":"它和锚点的关系，一句","anchorId":"必须复制某个输入锚点 id"}`
            },
            {
              role: 'user',
              content: JSON.stringify({
                anchors: anchors.map(anchor => ({
                  id: String(anchor.idea.id),
                  role: anchor.role,
                  name: anchor.idea.name,
                  content: anchor.text.slice(0, 1200)
                })),
                excludeLastSevenDays: [...excluded].slice(0, 80),
                lightFeedback: feedbackPreferences()
              })
            }
          ]
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.choices?.[0]?.message?.content) throw new Error(payload.error || 'Candidate generation failed');
      let raw = payload.choices[0].message.content;
      const first = raw.indexOf('[');
      const last = raw.lastIndexOf(']');
      if (first !== -1 && last !== -1) raw = raw.slice(first, last + 1);
      const generated = sanitizeCandidates(JSON.parse(raw), anchors)
        .filter(candidate => !excluded.has(candidate.name.toLowerCase()));
      const combined = [...generated, ...fallback.filter(candidate => !excluded.has(candidate.name.toLowerCase()))];
      return sanitizeCandidates(combined, anchors).slice(0, 12);
    } catch (error) {
      console.warn('World Window is using the local external-light list:', error.message);
      return fallback.filter(candidate => !excluded.has(candidate.name.toLowerCase())).slice(0, 10);
    }
  }

  async function embedCandidates(candidates) {
    await hydrateEmbeddingCache();
    const descriptors = candidates.map(candidate => {
      const text = `外部世界灯塔 / external lighthouse\n名称：${candidate.name}\n类型：${candidate.type}\n说明：${candidate.description}`;
      return {
        id: `__world_v${WORLD_VERSION}_${DrawerSemanticSpace.fingerprint(text)}`,
        text,
        fingerprint: DrawerSemanticSpace.fingerprint(text),
        candidate
      };
    });
    const stale = descriptors.filter(descriptor => {
      const record = ideaEmbeddingCache.get(String(descriptor.id));
      return !record
        || record.cacheVersion !== EMBEDDING_CACHE_VERSION
        || record.model !== EMBEDDING_MODEL
        || record.fingerprint !== descriptor.fingerprint;
    });
    if (stale.length) {
      const records = await requestIdeaEmbeddings(stale, 'world-window-lighthouses');
      records.forEach(record => ideaEmbeddingCache.set(String(record.id), record));
      await persistEmbeddingRecords(records);
    }
    return descriptors.map(descriptor => ({
      ...descriptor.candidate,
      vector: ideaEmbeddingCache.get(String(descriptor.id))?.vector || null
    }));
  }

  function normalizeAgainstUser(value, minimum, maximum) {
    const span = maximum - minimum;
    if (Math.abs(span) < 1e-9) return 0;
    return ((value - minimum) / span) * 2 - 1;
  }

  function fallbackCoordinate(candidate, index) {
    const hash = parseInt(DrawerSemanticSpace.fingerprint(candidate.name).slice(0, 6), 16) || index;
    return {
      x: 0.18 + ((hash % 100) / 100) * 1.1,
      y: -0.7 + (((hash >> 4) % 100) / 100) * 1.4
    };
  }

  function projectCandidates(candidates, context) {
    return candidates.map((candidate, index) => {
      let coordinates = fallbackCoordinate(candidate, index);
      if (candidate.vector?.length && context.anchorMeans) {
        const cosine = DrawerSemanticSpace.cosineSimilarity;
        const rawX = cosine(candidate.vector, context.anchorMeans.outward) - cosine(candidate.vector, context.anchorMeans.inward);
        const rawY = cosine(candidate.vector, context.anchorMeans.output) - cosine(candidate.vector, context.anchorMeans.absorb);
        coordinates = {
          rawX,
          rawY,
          x: normalizeAgainstUser(rawX, context.rawBounds.xMin, context.rawBounds.xMax),
          y: normalizeAgainstUser(rawY, context.rawBounds.yMin, context.rawBounds.yMax)
        };
      }
      const nearest = context.points.reduce((best, point) => {
        const distance = Math.hypot(coordinates.x - point.x, coordinates.y - point.y);
        return !best || distance < best.distance ? { point, distance } : best;
      }, null);
      return {
        ...candidate,
        ...coordinates,
        x: clamp(coordinates.x, -1.8, 1.8),
        y: clamp(coordinates.y, -1.8, 1.8),
        nearestIdeaId: nearest?.point?.id,
        semanticDistance: nearest?.distance || 0
      };
    });
  }

  function chooseDailyLights(projected, anchors, context) {
    const selected = [];
    const available = [...projected];
    const take = (sorter, predicate = () => true) => {
      const candidates = available.filter(candidate => predicate(candidate) && !selected.includes(candidate)).sort(sorter);
      const differentType = candidates.find(candidate => !selected.some(item => item.type === candidate.type));
      const chosen = differentType || candidates[0];
      if (chosen) selected.push(chosen);
      return chosen;
    };
    take((left, right) => left.semanticDistance - right.semanticDistance);
    take((left, right) => left.semanticDistance - right.semanticDistance);
    const far = take((left, right) => right.semanticDistance - left.semanticDistance);
    const oldAnchor = anchors.find(anchor => anchor.role === 'old');
    const oldPoint = context.points.find(point => String(point.id) === String(oldAnchor?.idea?.id));
    let echo = take((left, right) => {
      if (!oldPoint) return left.semanticDistance - right.semanticDistance;
      return Math.hypot(left.x - oldPoint.x, left.y - oldPoint.y)
        - Math.hypot(right.x - oldPoint.x, right.y - oldPoint.y);
    }, candidate => String(candidate.anchorId) === String(oldAnchor?.idea?.id));
    if (!echo) echo = take((left, right) => left.semanticDistance - right.semanticDistance);

    return selected.slice(0, 4).map((candidate, index) => {
      let role = index < 2 ? 'border' : 'echo';
      if (candidate === far) role = 'far';
      if (candidate === echo) role = 'echo';
      return {
        ...candidate,
        vector: undefined,
        id: `light-${localDateKey()}-${index}-${DrawerSemanticSpace.fingerprint(candidate.name)}`,
        role
      };
    });
  }

  function loadTodayCache() {
    const cached = safeJson(DAILY_STORAGE_KEY, null);
    if (!cached
        || cached.version !== WORLD_VERSION
        || cached.date !== localDateKey()
        || !Array.isArray(cached.lights)) return null;
    return cached;
  }

  function buildLocalPreviewData() {
    const now = Date.now();
    const previewIdeas = [
      ['记录身体发出的微小信号', 'Noticing the body’s small signals', -0.82, -0.4],
      ['城市漫步和归属感', 'City walks and belonging', -0.55, 0.15],
      ['让旧记忆重新变得可触摸', 'Making old memories tangible again', -0.2, -0.72],
      ['给关系留下一点空白', 'Leaving room inside relationships', 0.12, -0.15],
      ['把观察做成长期练习', 'Turning observation into a practice', 0.48, 0.35],
      ['公共空间里的偶然相遇', 'Chance encounters in public space', 0.76, 0.1],
      ['一个尚未命名的行动', 'An action not yet named', 0.3, 0.82]
    ].map(([name, nameEn, x, y], index) => {
      const idea = {
        id: `preview-idea-${index}`,
        name,
        nameEn,
        universeLabelEn: nameEn,
        chatHistory: Array.from({ length: index % 4 }, () => ({ role: 'user', content: name })),
        nodes: [],
        createdAt: now - index * 12 * 24 * 60 * 60 * 1000,
        updatedAt: now - index * 4 * 24 * 60 * 60 * 1000
      };
      return { id: idea.id, idea, x, y, rawX: x, rawY: y };
    });
    const anchors = [
      { role: 'recent', idea: previewIdeas[0].idea, point: previewIdeas[0] },
      { role: 'frontier', idea: previewIdeas[4].idea, point: previewIdeas[4] },
      { role: 'old', idea: previewIdeas[6].idea, point: previewIdeas[6] }
    ];
    const lights = [
      {
        id: 'preview-border-1',
        name: '具身认知',
        nameEn: 'Embodied Cognition',
        type: 'concept',
        role: 'border',
        description: '身体经验如何参与思考、判断与记忆的研究方向。',
        descriptionEn: 'A research direction on how bodily experience participates in thought, judgment, and memory.',
        relation: '它紧挨着你对身体信号的记录，但把个人感受接到了一个已有研究领域。',
        relationEn: 'It sits beside your notes on bodily signals, connecting personal sensation to an established field.',
        anchorId: previewIdeas[0].id,
        nearestIdeaId: previewIdeas[0].id,
        x: 0.28,
        y: -0.08,
        semanticDistance: 0.34
      },
      {
        id: 'preview-border-2',
        name: '叙事身份',
        nameEn: 'Narrative Identity',
        type: 'concept',
        role: 'border',
        description: '研究人如何通过讲述自己的经历来形成持续的身份感。',
        descriptionEn: 'A concept for how people form a continuous sense of self by telling stories about their lives.',
        relation: '它在记忆与关系之间搭了一条外部概念通道。',
        relationEn: 'It creates an outside conceptual bridge between memory and relationship.',
        anchorId: previewIdeas[4].id,
        nearestIdeaId: previewIdeas[4].id,
        x: 0.72,
        y: -0.22,
        semanticDistance: 0.41
      },
      {
        id: 'preview-far',
        name: '东方身体观',
        nameEn: 'Eastern Views of the Body',
        type: 'field',
        role: 'far',
        description: '从不同思想传统理解身体、修习与世界关系的一组研究方向。',
        descriptionEn: 'A family of traditions for understanding the body, cultivation, and its relationship with the world.',
        relation: '它故意离你的日常记录更远，用另一套身体语言制造一次框架碰撞。',
        relationEn: 'It stays deliberately far from your daily notes, offering another language for thinking about the body.',
        anchorId: previewIdeas[0].id,
        nearestIdeaId: previewIdeas[0].id,
        x: 1.42,
        y: 0.92,
        semanticDistance: 1.46
      },
      {
        id: 'preview-echo',
        name: '现象学',
        nameEn: 'Phenomenology',
        type: 'field',
        role: 'echo',
        description: '从第一人称经验出发理解感知、身体与世界的哲学传统。',
        descriptionEn: 'A philosophical tradition that studies perception, embodiment, and the world from first-person experience.',
        relation: '它回应那颗久未移动的行动点子：行动之前，经验是怎样显现的？',
        relationEn: 'It echoes an old action-oriented idea: before action begins, how does experience first appear?',
        anchorId: previewIdeas[6].id,
        nearestIdeaId: previewIdeas[6].id,
        x: 0.45,
        y: 0.76,
        semanticDistance: 0.83
      }
    ];
    return {
      context: {
        points: previewIdeas,
        items: [],
        anchorMeans: null,
        rawBounds: { xMin: -1, xMax: 1, yMin: -1, yMax: 1 },
        vectorDimension: 0
      },
      anchors,
      lights,
      date: localDateKey(),
      preview: true
    };
  }

  async function buildWorldData() {
    const previewRequested = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
      && new URLSearchParams(window.location.search).get('worldPreview') === '1';
    if (previewRequested) return buildLocalPreviewData();
    const context = await window.DrawerAtlasView.getSemanticContext();
    if (!context.points.length) return { context, anchors: [], lights: [], date: localDateKey() };
    const anchors = selectAnchors(context);
    const cached = loadTodayCache();
    if (cached) {
      return { context, anchors, lights: cached.lights, date: cached.date, cached: true };
    }

    setLoading(t('正在从你的边疆挑选今日锚点…', 'Choosing today’s anchors from your frontier…'));
    const candidates = await generateCandidates(anchors);
    setLoading(t('正在把外部灯塔放进同一张语义坐标…', 'Placing external lights in the same semantic space…'));
    let embedded = candidates;
    try {
      embedded = await embedCandidates(candidates);
    } catch (error) {
      console.warn('World Window coordinates are using the daily fallback:', error.message);
    }
    const projected = projectCandidates(embedded, context);
    const lights = chooseDailyLights(projected, anchors, context);
    const daily = { version: WORLD_VERSION, date: localDateKey(), generatedAt: Date.now(), lights };
    saveJson(DAILY_STORAGE_KEY, daily);
    rememberDailyNames(lights);
    return { context, anchors, lights, date: daily.date, cached: false };
  }

  function knownStarPosition(point, width, height) {
    return {
      x: width * (0.055 + ((point.x + 1) / 2) * 0.30),
      y: height * (0.54 + ((1 - point.y) / 2) * 0.38)
    };
  }

  function lightPosition(light, index, width, height) {
    const slots = {
      border: [{ x: 0.47, y: 0.55 }, { x: 0.68, y: 0.47 }],
      far: [{ x: 0.82, y: 0.18 }],
      echo: [{ x: 0.58, y: 0.29 }]
    };
    const sameRoleIndex = worldData.lights.slice(0, index).filter(item => item.role === light.role).length;
    const slot = slots[light.role]?.[sameRoleIndex % slots[light.role].length] || { x: 0.66, y: 0.35 };
    return {
      x: width * clamp(slot.x + clamp(light.x, -1, 1) * 0.035, 0.4, 0.88),
      y: height * clamp(slot.y - clamp(light.y, -1, 1) * 0.035, 0.12, 0.62)
    };
  }

  function updateCoordinate(light) {
    const element = document.getElementById('worldWindowCoordinate');
    if (!element) return;
    if (!light) {
      element.innerHTML = `<span>${t('向内 ↔ 向外', 'INWARD ↔ OUTWARD')}</span><span>${t('吸收 ↕ 产出', 'ABSORB ↕ OUTPUT')}</span>`;
      return;
    }
    const xLabel = light.x >= 0 ? t('向外', 'OUTWARD') : t('向内', 'INWARD');
    const yLabel = light.y >= 0 ? t('产出', 'OUTPUT') : t('吸收', 'ABSORB');
    element.innerHTML = `<span>${xLabel} ${Math.abs(light.x).toFixed(2)}</span><span>${yLabel} ${Math.abs(light.y).toFixed(2)}</span>`;
  }

  function showTooltip(event, light) {
    const tooltip = document.getElementById('worldWindowTooltip');
    const frame = document.querySelector('.world-window-frame');
    if (!tooltip || !frame) return;
    const rect = frame.getBoundingClientRect();
    tooltip.style.left = `${clamp(event.clientX - rect.left + 14, 12, rect.width - 255)}px`;
    tooltip.style.top = `${clamp(event.clientY - rect.top + 14, 12, rect.height - 130)}px`;
    tooltip.innerHTML = `<strong>${esc(lightValue(light, 'name'))}</strong><span>${label(TYPE_LABELS[light.type] || TYPE_LABELS.concept)} · ${label(ROLE_LABELS[light.role])}</span><p>${esc(lightValue(light, 'relation'))}</p>`;
    tooltip.classList.add('show');
    updateCoordinate(light);
  }

  function hideTooltip() {
    document.getElementById('worldWindowTooltip')?.classList.remove('show');
    if (!selectedLightId) updateCoordinate(null);
  }

  function renderSvg() {
    const frame = document.querySelector('.world-window-frame');
    if (!frame || !worldData || typeof d3 === 'undefined') return;
    frame.classList.toggle('world-concept-preview', Boolean(worldData.conceptPreview));
    const width = frame.clientWidth || 1000;
    const height = frame.clientHeight || 680;
    const svg = d3.select('#worldWindowSvg');
    svg.attr('viewBox', `0 0 ${width} ${height}`).selectAll('*').remove();

    const defs = svg.append('defs');
    const seaGradient = defs.append('radialGradient').attr('id', 'worldSeaGlow').attr('cx', '29%').attr('cy', '76%').attr('r', '64%');
    seaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ff7a1a').attr('stop-opacity', 0.19);
    seaGradient.append('stop').attr('offset', '72%').attr('stop-color', '#ff7a1a').attr('stop-opacity', 0.06);
    seaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#ff7a1a').attr('stop-opacity', 0);
    const orangeGlow = defs.append('filter').attr('id', 'worldOrangeGlow');
    orangeGlow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    const orangeMerge = orangeGlow.append('feMerge');
    orangeMerge.append('feMergeNode').attr('in', 'blur');
    orangeMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    const tealGlow = defs.append('filter').attr('id', 'worldTealGlow');
    tealGlow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const tealMerge = tealGlow.append('feMerge');
    tealMerge.append('feMergeNode').attr('in', 'blur');
    tealMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const coastLine = `M 0 ${height * 0.29} C ${width * 0.15} ${height * 0.36}, ${width * 0.32} ${height * 0.62}, ${width * 0.43} ${height}`;
    const coast = `${coastLine} L 0 ${height} Z`;
    svg.append('path').attr('d', coast).attr('fill', 'url(#worldSeaGlow)');
    svg.append('path')
      .attr('d', coastLine)
      .attr('fill', 'none')
      .attr('stroke', '#ff7a1a')
      .attr('stroke-width', 1.65)
      .attr('stroke-opacity', 0.76)
      .attr('filter', 'url(#worldOrangeGlow)');

    const knownPositions = new Map();
    const knownLayer = svg.append('g');
    const anchorRoleById = new Map((worldData.anchors || []).map(anchor => [
      String(anchor.idea?.id || anchor.point?.id),
      anchor.role
    ]));
    const anchorRoleLabel = {
      recent: t('最近的星', 'RECENT STAR'),
      frontier: t('边疆锚点', 'FRONTIER ANCHOR'),
      old: t('久违老星', 'OLD STAR')
    };
    worldData.context.points.forEach(point => {
      const position = knownStarPosition(point, width, height);
      const radius = Math.min(9, 4.1 + Math.sqrt(getIdeaUserTurnCount(point.idea) + 1) * 1.15);
      const anchorRole = anchorRoleById.get(String(point.id));
      knownPositions.set(String(point.id), position);
      knownLayer.append('circle')
        .attr('cx', position.x)
        .attr('cy', position.y)
        .attr('r', radius + (anchorRole ? 8 : 5))
        .attr('fill', 'none')
        .attr('stroke', '#ff9440')
        .attr('stroke-width', anchorRole ? 0.9 : 0.6)
        .attr('stroke-opacity', anchorRole ? 0.2 : 0.1);
      knownLayer.append('circle')
        .attr('cx', position.x)
        .attr('cy', position.y)
        .attr('r', radius)
        .attr('fill', '#ff9440')
        .attr('fill-opacity', anchorRole ? 1 : 0.78)
        .attr('filter', 'url(#worldOrangeGlow)');
      if (anchorRole) {
        const textAnchor = position.x < width * 0.13 ? 'start' : 'middle';
        const textX = textAnchor === 'start' ? position.x - 2 : position.x;
        knownLayer.append('text')
          .attr('x', textX)
          .attr('y', position.y + radius + 19)
          .attr('text-anchor', textAnchor)
          .attr('fill', 'rgba(246,245,243,.58)')
          .attr('font-family', 'Noto Serif SC, serif')
          .attr('font-size', width > 700 ? 11 : 9)
          .text(() => {
            const name = ideaDisplayName(point.idea);
            return name.length > 20 ? `${name.slice(0, 20)}…` : name;
          });
        knownLayer.append('text')
          .attr('x', textX)
          .attr('y', position.y + radius + 32)
          .attr('text-anchor', textAnchor)
          .attr('fill', 'rgba(255,148,64,.42)')
          .attr('font-family', 'Space Mono, monospace')
          .attr('font-size', 7)
          .attr('letter-spacing', '.08em')
          .text(anchorRoleLabel[anchorRole] || '');
      }
    });
    knownLayer.append('text')
      .attr('x', 22)
      .attr('y', height - 66)
      .attr('fill', '#ff9440')
      .attr('fill-opacity', 0.84)
      .attr('font-family', 'Noto Serif SC, serif')
      .attr('font-size', 18)
      .text(t('你的已知内海', 'YOUR KNOWN SEA'));
    knownLayer.append('text')
      .attr('x', 22)
      .attr('y', height - 43)
      .attr('fill', 'rgba(246,245,243,.38)')
      .attr('font-family', 'Space Mono, monospace')
      .attr('font-size', 8.5)
      .attr('letter-spacing', '.12em')
      .text(`${worldData.context.points.length} ${t('颗星 · 今日从这里向外', 'STARS · TODAY’S DEPARTURE')}`);

    const visibleLights = worldData.lights.filter(light => !getIgnoredNames().has(light.name.toLowerCase()));
    const positioned = visibleLights.map((light, index) => ({
      ...light,
      screen: lightPosition(light, index, width, height)
    }));
    const pointById = new Map(worldData.context.points.map(point => [String(point.id), point]));
    const lineLayer = svg.append('g');
    positioned.forEach(light => {
      const anchorId = String(light.anchorId || light.nearestIdeaId || '');
      const anchorPoint = pointById.get(anchorId);
      const source = knownPositions.get(anchorId)
        || knownPositions.get(String(anchorPoint?.id))
        || [...knownPositions.values()][0];
      if (!source) return;
      lineLayer.append('line')
        .attr('x1', source.x)
        .attr('y1', source.y)
        .attr('x2', light.screen.x)
        .attr('y2', light.screen.y)
        .attr('stroke', '#57c4c9')
        .attr('stroke-width', light.id === selectedLightId ? 1.3 : 0.9)
        .attr('stroke-opacity', light.id === selectedLightId ? 0.64 : 0.3)
        .attr('stroke-dasharray', '4,8');
    });

    const groups = svg.append('g')
      .selectAll('g')
      .data(positioned)
      .join('g')
      .attr('class', 'world-lighthouse')
      .attr('transform', light => `translate(${light.screen.x},${light.screen.y})`)
      .attr('cursor', 'pointer')
      .on('mouseenter', (event, light) => showTooltip(event, light))
      .on('mousemove', (event, light) => showTooltip(event, light))
      .on('mouseleave', hideTooltip)
      .on('click', (event, light) => {
        event.stopPropagation();
        selectLight(light.id);
      });
    groups.append('circle')
      .attr('class', 'world-lighthouse-halo')
      .attr('r', 20)
      .attr('fill', 'rgba(87,196,201,.16)');
    groups.append('circle')
      .attr('r', light => light.role === 'far' ? 13 : 15)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(87,196,201,.2)')
      .attr('stroke-width', 0.8);
    groups.append('circle')
      .attr('r', light => light.role === 'far' ? 6.6 : 7.4)
      .attr('fill', '#57c4c9')
      .attr('stroke', 'rgba(223,252,252,.78)')
      .attr('stroke-width', 0.9)
      .attr('filter', 'url(#worldTealGlow)');
    groups.append('text')
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('fill', light => light.id === selectedLightId ? '#e5f8f8' : 'rgba(246,245,243,.72)')
      .attr('font-family', 'Noto Serif SC, serif')
      .attr('font-size', width > 620 ? 14 : 11)
      .text(light => {
        const name = lightValue(light, 'name');
        return name.length > 22 ? `${name.slice(0, 22)}…` : name;
      });
    groups.append('text')
      .attr('y', 53)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(87,196,201,.54)')
      .attr('font-family', 'Space Mono, monospace')
      .attr('font-size', 8)
      .attr('letter-spacing', '.08em')
      .text(light => label(ROLE_LABELS[light.role]));

    svg.on('click', () => closeLetter());
  }

  function selectedLight() {
    return worldData?.lights.find(light => light.id === selectedLightId) || null;
  }

  function renderLetter(light) {
    const card = document.getElementById('worldLetterCard');
    const nudge = document.getElementById('worldDailyNudge');
    if (!card || !light) {
      card?.classList.remove('open');
      card?.setAttribute('aria-hidden', 'true');
      nudge?.classList.remove('yielding');
      return;
    }
    nudge?.classList.add('yielding');
    document.getElementById('worldLetterKicker').textContent = `${label(ROLE_LABELS[light.role])} · ${label(TYPE_LABELS[light.type] || TYPE_LABELS.concept)}`;
    document.getElementById('worldLetterName').textContent = lightValue(light, 'name');
    document.getElementById('worldLetterVerification').textContent = ['person', 'work'].includes(light.type)
      ? t('AI 推荐 · 未核实', 'AI SUGGESTION · UNVERIFIED')
      : t('外部线索 · 建议继续查证', 'EXTERNAL LEAD · VERIFY FURTHER');
    document.getElementById('worldLetterDescription').textContent = lightValue(light, 'description');
    document.getElementById('worldLetterRelation').textContent = lightValue(light, 'relation');
    const collision = document.getElementById('worldLetterCollision');
    const collisionText = document.getElementById('worldLetterCollisionText');
    const saveCollisionButton = document.getElementById('worldCollisionSaveBtn');
    lastCollision = null;
    collision.hidden = true;
    collisionText.textContent = '';
    saveCollisionButton.hidden = true;
    card.classList.add('open');
    card.setAttribute('aria-hidden', 'false');
    ['worldCaptureBtn', 'worldCollideBtn', 'worldIgnoreBtn'].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.disabled = worldGuideActive;
    });
    updateCoordinate(light);
  }

  function selectLight(id) {
    hideTooltip();
    selectedLightId = id;
    renderSvg();
    renderLetter(selectedLight());
  }

  function closeLetter() {
    selectedLightId = null;
    lastCollision = null;
    document.getElementById('worldLetterCard')?.classList.remove('open');
    document.getElementById('worldLetterCard')?.setAttribute('aria-hidden', 'true');
    updateCoordinate(null);
    if (worldData && isActive()) renderSvg();
  }

  function captureSelected() {
    if (worldGuideActive) return;
    const light = selectedLight();
    if (!light) return;
    const now = Date.now();
    const lightName = lightValue(light, 'name');
    const lightDescription = lightValue(light, 'description');
    const lightRelation = lightValue(light, 'relation');
    const idea = {
      id: now,
      name: lightName,
      status: 'seed',
      nodes: [{
        id: now + 1,
        text: `${t('来自世界之窗', 'From World Window')}：${lightDescription}\n${lightRelation}`,
        type: 'insight',
        keyword: lightName.slice(0, 8),
        tasks: [],
        time: new Date().toLocaleString(currentLanguage === 'en' ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }],
      chatHistory: [],
      source: 'world-window',
      externalType: light.type,
      createdAt: now,
      updatedAt: now
    };
    ideas.unshift(idea);
    recordFeedback(light, 'capture');
    saveIdeas();
    renderList();
    selectIdea(idea.id, { expandChat: true });
  }

  async function collideSelected() {
    if (worldGuideActive) return;
    const light = selectedLight();
    if (!light) return;
    const collision = document.getElementById('worldLetterCollision');
    const collisionText = document.getElementById('worldLetterCollisionText');
    const saveCollisionButton = document.getElementById('worldCollisionSaveBtn');
    const anchor = ideas.find(idea => String(idea.id) === String(light.anchorId || light.nearestIdeaId));
    const lightName = lightValue(light, 'name');
    const lightDescription = lightValue(light, 'description');
    const anchorName = ideaDisplayName(anchor) || t('旧点子', 'Old idea');
    const collisionLightId = light.id;
    lastCollision = null;
    collision.hidden = false;
    collisionText.textContent = t('正在让这盏灯塔与旧点子交叉…', 'Crossing this lighthouse with your old idea…');
    saveCollisionButton.hidden = true;
    recordFeedback(light, 'collide');
    let result = '';
    try {
      const headers = { 'Content-Type': 'application/json', 'X-Drawer-Purpose': 'world-window-collision' };
      if (apiKey) {
        headers[apiKey.startsWith('sk-') ? 'Authorization' : 'X-Access-Code'] = apiKey.startsWith('sk-')
          ? `Bearer ${apiKey}`
          : apiKey;
      }
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-72B-Instruct',
          max_tokens: 220,
          messages: [
            {
              role: 'system',
              content: '这是用户主动发起的一次“外部灯塔 × 旧点子”对撞。写 2–3 句：先指出一个具体连接，再给一个可能碰出的方向，最后用一个能继续思考的问题收尾。不要自动替用户生成或保存新点子，不要声称未提供的事实。'
            },
            {
              role: 'user',
              content: `${t('外部灯塔', 'External lighthouse')}：${lightName}\n${t('说明', 'Description')}：${lightDescription}\n${t('用户旧星', 'User’s old idea')}：${anchorName}\n${t('旧星内容', 'Old idea context')}：${anchor ? getIdeaSemanticDescriptor(anchor).text : ''}`
            }
          ]
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.choices?.[0]?.message?.content) throw new Error(payload.error || 'Collision failed');
      result = payload.choices[0].message.content.trim();
    } catch {
      result = currentLanguage === 'en'
        ? `${lightName} changes the frame around “${anchorName}”. If you borrowed its vocabulary for one day, what would become newly visible?`
        : `把「${lightName}」放到「${anchorName}」旁边，它会先改变你看问题的框架。如果借用它的词汇一天，什么原本看不见的东西会浮出来？`;
    }
    if (selectedLightId !== collisionLightId) return;
    lastCollision = {
      lightId: light.id,
      lightName,
      lightDescription,
      lightType: light.type,
      anchorId: anchor?.id || null,
      anchorName,
      text: result
    };
    collisionText.textContent = result;
    saveCollisionButton.hidden = false;
  }

  function saveCollisionSeed() {
    const collision = lastCollision;
    if (!collision || selectedLightId !== collision.lightId) return;
    const now = Date.now();
    const fullName = `${collision.anchorName} × ${collision.lightName}`;
    const idea = {
      id: now,
      name: fullName.length > 36 ? `${fullName.slice(0, 35)}…` : fullName,
      status: 'seed',
      nodes: [{
        id: now + 1,
        text: `${t('来自世界之窗的交叉', 'Cross from World Window')}：${collision.anchorName} × ${collision.lightName}\n\n${collision.text}\n\n${t('外部灯塔', 'External lighthouse')}：${collision.lightDescription}`,
        type: 'insight',
        keyword: collision.lightName.slice(0, 8),
        tasks: [],
        time: new Date().toLocaleString(currentLanguage === 'en' ? 'en-US' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }],
      chatHistory: [],
      source: 'world-window-collision',
      collisionAnchorId: collision.anchorId,
      collisionLighthouse: collision.lightName,
      externalType: collision.lightType,
      createdAt: now,
      updatedAt: now
    };
    ideas.unshift(idea);
    saveIdeas();
    renderList();
    selectIdea(idea.id, { expandChat: true });
  }

  function ignoreSelected() {
    if (worldGuideActive) return;
    const light = selectedLight();
    if (!light || !worldData) return;
    recordFeedback(light, 'ignore');
    worldData.lights = worldData.lights.filter(item => item.id !== light.id);
    const cached = loadTodayCache();
    if (cached) {
      cached.lights = cached.lights.filter(item => item.id !== light.id);
      saveJson(DAILY_STORAGE_KEY, cached);
    }
    updateSummary(worldData);
    updateDailyNudge(worldData);
    closeLetter();
  }

  function reportLocalWorldDiagnostics(data) {
    if (!['127.0.0.1', 'localhost'].includes(window.location.hostname)) return;
    fetch('/__dev/world-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: data.date,
        knownStars: data.context.points.length,
        lights: data.lights.map(light => ({
          id: light.id,
          role: light.role,
          type: light.type,
          x: light.x,
          y: light.y,
          semanticDistance: light.semanticDistance
        }))
      })
    }).catch(() => {});
  }

  async function render(force = false) {
    document.getElementById('worldWindowDate').textContent = dateLabel();
    updateSummary();
    updateDailyNudge();
    if (!isActive()) return;
    if (worldGuideActive) {
      worldData = buildConceptGuideData(worldGuidePhase || 1);
      setLoading('', false);
      updateSummary(worldData);
      updateDailyNudge(worldData);
      document.getElementById('worldWindowEmpty').hidden = true;
      renderSvg();
      renderLetter(selectedLight());
      return worldData;
    }
    if (worldData && !force) {
      setLoading('', false);
      updateSummary(worldData);
      updateDailyNudge(worldData);
      renderSvg();
      renderLetter(selectedLight());
      return worldData;
    }
    if (worldJob) return worldJob;
    setLoading(t('正在拆开今天的来信…', 'Opening today’s letter…'));
    document.getElementById('worldWindowEmpty').hidden = true;
    worldJob = buildWorldData()
      .then(data => {
        worldData = data;
        setLoading('', false);
        updateSummary(data);
        updateDailyNudge(data);
        const empty = document.getElementById('worldWindowEmpty');
        empty.hidden = data.context.points.length > 0;
        if (isActive()) {
          renderSvg();
          renderLetter(selectedLight());
        }
        reportLocalWorldDiagnostics(data);
        return data;
      })
      .catch(error => {
        console.error('World Window failed:', error);
        setLoading(t(`今天的来信没有抵达：${error.message}`, `Today’s letter did not arrive: ${error.message}`));
      })
      .finally(() => {
        worldJob = null;
      });
    return worldJob;
  }

  function activate() {
    if (shouldOfferGuide() && !worldGuideActive) startGuide();
    else if (worldGuideActive) scheduleGuideAdvance();
    render();
  }

  function deactivate() {
    if (worldGuideTimer) clearTimeout(worldGuideTimer);
    worldGuideTimer = null;
    hideTooltip();
    closeLetter();
  }

  function invalidate() {
    worldData = null;
    selectedLightId = null;
  }

  const frame = document.querySelector('.world-window-frame');
  if (frame && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (worldData && isActive()) renderSvg();
    });
    resizeObserver.observe(frame);
  }

  root.DrawerWorldWindow = {
    activate,
    captureSelected,
    closeLetter,
    collideSelected,
    deactivate,
    finishGuide,
    goToGuidePhase,
    ignoreSelected,
    invalidate,
    isActive,
    openDailyNudge,
    refreshLanguage,
    render,
    saveCollisionSeed,
    selectLight
  };
  refreshLanguage();
})(window);

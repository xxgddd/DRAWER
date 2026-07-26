(function createAtlasView(root) {
  const MODE_STORAGE_KEY = 'drawer_universe_mode_v1';
  const NARRATIVE_STORAGE_KEY = 'drawer_atlas_narratives_v1';
  const GUIDE_STORAGE_KEY = 'drawer_atlas_guide_dismissed_v1';
  const GUIDE_DURATIONS = { 1: 3200, 2: 4600, 3: 5600 };
  const ANCHOR_VERSION = 1;
  const CLUSTER_COLORS = ['#ff9440', '#57c4c9', '#ffb870', '#8fdce0', '#d6a85a', '#75b9e6'];
  const AXIS_TERMS = {
    inward: ['自我 inner self', '情绪 emotion', '身体 body', '记忆 memory', '感受 feeling'],
    outward: ['他人 other people', '关系 relationship', '城市 city', '社会 society', '世界 world'],
    absorb: ['观察 observe', '理解 understand', '感知 perceive', '记住 remember', '反思 reflect'],
    output: ['做 make', '造 create', '改变 change', '行动 act', '建立 build']
  };
  const initialQueryMode = new URLSearchParams(window.location.search).get('view');
  const queryMode = initialQueryMode === 'atlas'
    ? 'atlas'
    : initialQueryMode === 'world'
      ? 'world'
      : initialQueryMode === 'universe'
        ? 'gravity'
        : null;
  const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
  let atlasMode = queryMode || (['gravity', 'atlas', 'world'].includes(storedMode) ? storedMode : 'gravity');
  let atlasJob = null;
  let atlasData = null;
  let selectedTerraId = null;
  let atlasResizeObserver = null;
  let semanticContext = null;
  let semanticContextJob = null;
  let atlasGuideActive = false;
  let atlasGuidePhase = 0;
  let atlasGuideTimer = null;

  function isActive() {
    return atlasMode === 'atlas'
      && document.getElementById('universeView')?.style.display !== 'none';
  }

  function updateModeChrome() {
    const view = document.getElementById('universeView');
    view?.classList.toggle('atlas-mode', atlasMode === 'atlas');
    view?.classList.toggle('world-mode', atlasMode === 'world');
    const gravityButton = document.getElementById('universeGravityModeBtn');
    const atlasButton = document.getElementById('universeAtlasModeBtn');
    const worldButton = document.getElementById('universeWorldModeBtn');
    gravityButton?.classList.toggle('active', atlasMode === 'gravity');
    atlasButton?.classList.toggle('active', atlasMode === 'atlas');
    worldButton?.classList.toggle('active', atlasMode === 'world');
    gravityButton?.setAttribute('aria-pressed', String(atlasMode === 'gravity'));
    atlasButton?.setAttribute('aria-pressed', String(atlasMode === 'atlas'));
    worldButton?.setAttribute('aria-pressed', String(atlasMode === 'world'));
    document.getElementById('atlasView')?.setAttribute('aria-hidden', String(atlasMode !== 'atlas'));
    document.getElementById('worldWindowView')?.setAttribute('aria-hidden', String(atlasMode !== 'world'));
  }

  function switchMode(mode) {
    if (atlasMode === 'atlas' && mode !== 'atlas' && atlasGuideTimer) {
      clearTimeout(atlasGuideTimer);
      atlasGuideTimer = null;
    }
    atlasMode = ['atlas', 'world'].includes(mode) ? mode : 'gravity';
    localStorage.setItem(MODE_STORAGE_KEY, atlasMode);
    updateModeChrome();
    hideAtlasTooltip();
    if (atlasMode !== 'gravity') {
      closeUniverseInspector();
      closeUChat();
      hideUniverseNodePreview();
      if (universeSim) {
        universeSim.stop();
        universeSim = null;
      }
    }
    if (atlasMode === 'atlas') {
      window.DrawerWorldWindow?.deactivate();
      if (shouldOfferGuide() && !atlasGuideActive) startGuide();
      else if (atlasGuideActive) scheduleGuideAdvance();
      renderAtlas();
    } else if (atlasMode === 'world') {
      closeExpedition();
      window.DrawerWorldWindow?.activate();
    } else {
      closeExpedition();
      window.DrawerWorldWindow?.deactivate();
      renderUniverse();
    }
  }

  function activate() {
    updateModeChrome();
    if (atlasMode === 'atlas') {
      if (shouldOfferGuide() && !atlasGuideActive) startGuide();
      renderAtlas();
    }
    else if (atlasMode === 'world') window.DrawerWorldWindow?.activate();
    else renderUniverse();
  }

  function getAnchorDescriptors() {
    return Object.entries(AXIS_TERMS).flatMap(([pole, terms]) => terms.map((term, index) => {
      const text = `语义坐标锚点 / semantic axis anchor: ${term}`;
      return {
        id: `__atlas_anchor_v${ANCHOR_VERSION}_${pole}_${index}`,
        pole,
        text,
        fingerprint: DrawerSemanticSpace.fingerprint(text)
      };
    }));
  }

  async function getAtlasAnchorMeans() {
    await hydrateEmbeddingCache();
    const descriptors = getAnchorDescriptors();
    const stale = descriptors.filter(descriptor => {
      const record = ideaEmbeddingCache.get(String(descriptor.id));
      return !record
        || record.cacheVersion !== EMBEDDING_CACHE_VERSION
        || record.model !== EMBEDDING_MODEL
        || record.fingerprint !== descriptor.fingerprint;
    });
    if (stale.length) {
      const records = await requestIdeaEmbeddings(stale, 'atlas-anchors');
      records.forEach(record => ideaEmbeddingCache.set(String(record.id), record));
      await persistEmbeddingRecords(records);
    }
    const vectorsByPole = {};
    descriptors.forEach(descriptor => {
      const record = ideaEmbeddingCache.get(String(descriptor.id));
      if (!record?.vector) return;
      (vectorsByPole[descriptor.pole] ||= []).push(record.vector);
    });
    const means = Object.fromEntries(
      Object.entries(vectorsByPole).map(([pole, vectors]) => [pole, DrawerAtlasSpace.meanVector(vectors)])
    );
    if (!means.inward?.length || !means.outward?.length || !means.absorb?.length || !means.output?.length) {
      throw new Error('Atlas axis anchors are incomplete');
    }
    return means;
  }

  async function getSemanticContext(force = false) {
    const signature = DrawerSemanticSpace.fingerprint(JSON.stringify(
      ideas.map(idea => {
        const descriptor = getIdeaSemanticDescriptor(idea);
        return [String(idea.id), descriptor.fingerprint];
      })
    ));
    if (!force && semanticContext?.signature === signature) return semanticContext;
    if (!force && semanticContextJob) return semanticContextJob;
    if (!ideas.length) {
      semanticContext = { signature, points: [], items: [], anchorMeans: null, rawBounds: null, vectorDimension: 0 };
      return semanticContext;
    }

    semanticContextJob = (async () => {
      await refreshIdeaEmbeddings(ideas);
      const anchorMeans = await getAtlasAnchorMeans();
      const items = ideas.map(idea => {
        const record = getCurrentIdeaEmbedding(idea);
        return record ? { id: idea.id, idea, vector: record.vector } : null;
      }).filter(Boolean);
      if (!items.length) throw new Error('No idea embeddings are available');
      const points = DrawerAtlasSpace.projectItems(items, anchorMeans, DrawerSemanticSpace.cosineSimilarity);
      const rawXs = points.map(point => point.rawX);
      const rawYs = points.map(point => point.rawY);
      const context = {
        signature,
        points,
        items,
        anchorMeans,
        rawBounds: {
          xMin: Math.min(...rawXs),
          xMax: Math.max(...rawXs),
          yMin: Math.min(...rawYs),
          yMax: Math.max(...rawYs)
        },
        vectorDimension: items[0]?.vector?.length || 0
      };
      semanticContext = context;
      return context;
    })().finally(() => {
      semanticContextJob = null;
    });
    return semanticContextJob;
  }

  function setAtlasLoading(message, visible = true) {
    const loading = document.getElementById('atlasLoading');
    const text = document.getElementById('atlasLoadingText');
    if (text) text.textContent = message;
    loading?.classList.toggle('hidden', !visible);
  }

  function shouldOfferGuide() {
    const forced = new URLSearchParams(window.location.search).get('concept') === '1';
    if (forced) return true;
    if (localStorage.getItem(GUIDE_STORAGE_KEY)) return false;
    return ideas.filter(idea => idea.card?.core).length < 4;
  }

  function buildConceptAtlasData(phase = atlasGuidePhase || 1) {
    const sourceIdeas = typeof buildConceptUniverseIdeas === 'function'
      ? buildConceptUniverseIdeas(false)
      : [];
    const coordinates = [
      [-0.62, -0.2],
      [0.3, 0.28],
      [0.58, -0.05],
      [-0.34, 0.18]
    ];
    const points = sourceIdeas.slice(0, 4).map((idea, index) => ({
      id: idea.id,
      idea,
      x: coordinates[index][0],
      y: coordinates[index][1],
      rawX: coordinates[index][0],
      rawY: coordinates[index][1]
    }));
    const makeCluster = (id, indexes, name, color) => {
      const clusterPoints = indexes.map(index => points[index]).filter(Boolean);
      const centroid = {
        x: clusterPoints.reduce((sum, point) => sum + point.x, 0) / Math.max(1, clusterPoints.length),
        y: clusterPoints.reduce((sum, point) => sum + point.y, 0) / Math.max(1, clusterPoints.length)
      };
      const layoutPoints = clusterPoints.map(point => ({ ...point, layoutX: point.x, layoutY: point.y, clusterId: id }));
      return {
        id,
        points: clusterPoints,
        centroid,
        name,
        color,
        isConstellation: phase >= 2 && clusterPoints.length >= 2,
        layoutPoints,
        edges: phase >= 2 ? DrawerAtlasSpace.minimumSpanningTree(layoutPoints) : [],
        firstTimestamp: Math.min(...clusterPoints.map(point => Number(point.idea.createdAt || Date.now())))
      };
    };
    const clusters = phase >= 2
      ? [
          makeCluster('concept-emotion', [1, 2], t('情绪与日常', 'Mood & Everyday'), CLUSTER_COLORS[0]),
          makeCluster('concept-belonging', [0, 3], t('需要感与容器', 'Belonging & Containers'), CLUSTER_COLORS[1])
        ]
      : points.map((_, index) => makeCluster(`concept-single-${index}`, [index], '', '#d8dbdc'));
    const terraRegions = phase >= 3 ? [{
      id: 'concept-terra-action',
      x: 0.02,
      y: 0.78,
      radius: 0.22,
      area: 0.16,
      searchArea: 'output',
      name: t('行动与实验', 'Action & Experiments'),
      starter: t('如果把其中一个想法做成明天能试一次的东西，它会是什么？', 'What could one of these ideas become if you tried it once tomorrow?'),
      alternatives: [
        t('哪颗星最接近一个可以动手的原型？', 'Which star is closest to a prototype you can make?'),
        t('什么小实验能让这片空白出现第一颗星？', 'What small experiment could place the first star here?')
      ]
    }] : [];
    return { points, clusters, terraRegions, vectorDimension: 0, conceptPreview: true, conceptPhase: phase };
  }

  function updateGuide() {
    const guide = document.getElementById('atlasConceptGuide');
    if (!guide) return;
    const title = document.getElementById('atlasConceptGuideTitle');
    const body = document.getElementById('atlasConceptGuideBody');
    const steps = [...guide.querySelectorAll('.concept-guide-step')];
    guide.classList.add('show');
    guide.classList.remove('phase-1', 'phase-2', 'phase-3', 'action-ready');
    guide.classList.add(`phase-${atlasGuidePhase}`);
    guide.setAttribute('aria-hidden', 'false');
    steps.forEach((step, index) => {
      step.classList.toggle('active', index < atlasGuidePhase);
      step.classList.toggle('current', index === atlasGuidePhase - 1);
      if (index === atlasGuidePhase - 1) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    if (atlasGuidePhase === 1) {
      title.textContent = t('同一批星，落在坐标里', 'The same stars settle into coordinates');
      body.textContent = t('这里不评判点子的好坏，只看它们更靠近内心还是世界、吸收还是产出。', 'This map does not judge ideas. It places them between self and world, absorbing and making.');
    } else if (atlasGuidePhase === 2) {
      title.textContent = t('靠近的星，慢慢连成星座', 'Nearby stars slowly form constellations');
      body.textContent = t('反复靠近的注意力会被辨认成星座，让你看见这一年真正围绕过什么。', 'Recurring directions become constellations, revealing what your attention has really orbited.');
    } else {
      title.textContent = t('空白也是你的轮廓', 'Blank space is part of your shape');
      body.textContent = t('没有星星的区域会成为未知地带。它不是缺失，而是一张可以出发的邀请。', 'A region without stars becomes uncharted territory—not a failure, but an invitation to depart.');
    }
  }

  function scheduleGuideAdvance() {
    if (atlasGuideTimer) clearTimeout(atlasGuideTimer);
    atlasGuideTimer = null;
    if (!atlasGuideActive || !isActive()) return;
    if (atlasGuidePhase >= 3) {
      atlasGuideTimer = setTimeout(() => {
        if (atlasGuideActive && isActive()) {
          document.getElementById('atlasConceptGuide')?.classList.add('action-ready');
        }
      }, 2200);
      return;
    }
    atlasGuideTimer = setTimeout(() => goToGuidePhase(atlasGuidePhase + 1), GUIDE_DURATIONS[atlasGuidePhase]);
  }

  function goToGuidePhase(phase) {
    atlasGuideActive = true;
    atlasGuidePhase = Math.max(1, Math.min(3, Number(phase) || 1));
    selectedTerraId = atlasGuidePhase >= 3 ? 'concept-terra-action' : null;
    atlasData = buildConceptAtlasData(atlasGuidePhase);
    updateGuide();
    setAtlasLoading('', false);
    updateAtlasMeta(atlasData);
    if (isActive()) {
      renderAtlasSvg(atlasData);
      renderExpedition(atlasData.terraRegions.find(region => region.id === selectedTerraId));
    }
    scheduleGuideAdvance();
  }

  function startGuide() {
    goToGuidePhase(1);
  }

  function finishGuide() {
    localStorage.setItem(GUIDE_STORAGE_KEY, '1');
    if (atlasGuideTimer) clearTimeout(atlasGuideTimer);
    atlasGuideTimer = null;
    atlasGuideActive = false;
    atlasGuidePhase = 0;
    selectedTerraId = null;
    atlasData = null;
    const guide = document.getElementById('atlasConceptGuide');
    guide?.classList.remove('show');
    guide?.setAttribute('aria-hidden', 'true');
    closeExpedition();
    renderAtlas(true);
  }

  function ideaDepth(idea) {
    const userTurns = getIdeaUserTurnCount(idea);
    const nodeCount = (idea.nodes || []).length;
    const branchCount = (idea.card?.branches || []).length;
    return 1 + userTurns * 1.25 + nodeCount * 0.9 + branchCount * 0.75 + (idea.card?.core ? 2 : 0);
  }

  function ideaRecency(idea) {
    const timestamp = Number(idea.updatedAt || idea.createdAt || Date.now());
    const days = Math.max(0, Date.now() - timestamp) / (24 * 60 * 60 * 1000);
    return 0.4 + Math.exp(-days / 150) * 0.6;
  }

  function clusterFallbackName(cluster) {
    const { x, y } = cluster.centroid;
    if (Math.abs(x) < 0.22 && Math.abs(y) < 0.22) return 'Threshold & Change';
    if (x < 0 && y < 0) return 'Inner Reflection';
    if (x < 0 && y >= 0) return 'Personal Making';
    if (x >= 0 && y < 0) return 'World Watching';
    return 'Public Building';
  }

  function monthLabel(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());
    return date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  }

  function loadNarrativeCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(NARRATIVE_STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function storeNarrativeCache(signature, narrative) {
    const cache = loadNarrativeCache();
    cache[signature] = { savedAt: Date.now(), narrative };
    const trimmed = Object.fromEntries(
      Object.entries(cache)
        .sort((left, right) => (right[1]?.savedAt || 0) - (left[1]?.savedAt || 0))
        .slice(0, 20)
    );
    localStorage.setItem(NARRATIVE_STORAGE_KEY, JSON.stringify(trimmed));
  }

  function atlasNarrativeSignature(clusters, terraRegions) {
    const payload = {
      language: currentLanguage,
      clusters: clusters.map(cluster => ({
        id: cluster.id,
        members: cluster.points.map(point => `${point.id}:${getIdeaSemanticDescriptor(point.idea).fingerprint}`).sort()
      })),
      terra: terraRegions.map(region => [region.column, region.row])
    };
    return DrawerSemanticSpace.fingerprint(JSON.stringify(payload));
  }

  function fallbackNarrative(clusters, terraRegions) {
    return {
      clusters: clusters.map(cluster => ({ id: cluster.id, name: clusterFallbackName(cluster) })),
      terra: terraRegions.map(region => ({ id: region.id, ...DrawerAtlasSpace.getTerraProfile(region.x, region.y) }))
    };
  }

  async function enrichAtlasNarrative(clusters, terraRegions) {
    const signature = atlasNarrativeSignature(clusters, terraRegions);
    const cached = loadNarrativeCache()[signature]?.narrative;
    if (cached) return cached;
    const fallback = fallbackNarrative(clusters, terraRegions);
    if (!clusters.length) return fallback;

    const clusterInput = clusters.map(cluster => ({
      id: cluster.id,
      centroid: {
        inwardOutward: Number(cluster.centroid.x.toFixed(2)),
        absorbOutput: Number(cluster.centroid.y.toFixed(2))
      },
      ideas: cluster.points.slice(0, 10).map(point => ({
        name: point.idea.name,
        core: point.idea.card?.core || '',
        tension: point.idea.card?.tensions || ''
      }))
    }));
    const terraInput = terraRegions.map(region => ({
      id: region.id,
      inwardOutward: Number(region.x.toFixed(2)),
      absorbOutput: Number(region.y.toFixed(2)),
      fallbackDomain: DrawerAtlasSpace.getTerraProfile(region.x, region.y).name
    }));

    try {
      const headers = { 'Content-Type': 'application/json', 'X-Drawer-Purpose': 'atlas-narrative' };
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
          max_tokens: 1000,
          messages: [
            {
              role: 'system',
              content: `你在为一张二维语义星图命名。坐标轴固定为：
X -1=向内（自我、情绪、身体、记忆、感受），+1=向外（他人、关系、城市、社会、世界）。
Y -1=吸收（观察、理解、感知、记住、反思），+1=产出（做、造、改变、行动、建立）。

为每个 cluster 写一个英文短名，格式尽量为“A & B”，最多 3 个英文词。名字必须概括该簇的真实点子，不要复述坐标轴。
为每个 terra incognita 写：
- 英文领域名，格式“A & B”
- 一个有画面、可回答的探索问题
- 两个不同角度的备选问题
问题使用用户当前界面语言。不要把空区写成用户的缺陷，而要像一张温和的探索邀请。

严格返回 JSON：
{"clusters":[{"id":"cluster-0","name":"City & Belonging"}],"terra":[{"id":"terra-x","name":"Body & Health","starter":"问题","alternatives":["问题1","问题2"]}]}`
            },
            { role: 'user', content: JSON.stringify({ clusters: clusterInput, terra: terraInput }) }
          ]
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.choices?.[0]?.message?.content) throw new Error(payload.error || 'Atlas narrative failed');
      let raw = payload.choices[0].message.content;
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) raw = raw.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(raw);
      const clusterById = new Map((parsed.clusters || []).map(item => [String(item.id), item]));
      const terraById = new Map((parsed.terra || []).map(item => [String(item.id), item]));
      const narrative = {
        clusters: fallback.clusters.map(item => {
          const generated = clusterById.get(item.id);
          return { ...item, name: String(generated?.name || item.name).trim() };
        }),
        terra: fallback.terra.map(item => {
          const generated = terraById.get(item.id);
          const alternatives = Array.isArray(generated?.alternatives)
            ? generated.alternatives.filter(Boolean).slice(0, 2)
            : item.alternatives;
          return {
            ...item,
            name: String(generated?.name || item.name).trim(),
            starter: String(generated?.starter || item.starter).trim(),
            alternatives: alternatives.length === 2 ? alternatives : item.alternatives
          };
        })
      };
      storeNarrativeCache(signature, narrative);
      return narrative;
    } catch (error) {
      console.warn('Atlas is using local labels:', error.message);
      return fallback;
    }
  }

  async function buildAtlasData() {
    if (!ideas.length) return { points: [], clusters: [], terraRegions: [] };
    setAtlasLoading(t('正在为所有点子生成语义坐标…', 'Mapping semantic coordinates for every idea…'));
    const context = await getSemanticContext();
    const { items, points: projected } = context;
    const clusters = DrawerAtlasSpace.clusterPoints(projected, { maxClusters: 6 }).map((cluster, index) => {
      const layoutPoints = DrawerAtlasSpace.layoutClusterPoints(cluster, projected.length < 10 ? 0.16 : 0.12);
      const isConstellation = cluster.points.length >= 2;
      return {
        ...cluster,
        isConstellation,
        color: isConstellation ? CLUSTER_COLORS[index % CLUSTER_COLORS.length] : '#d8dbdc',
        layoutPoints,
        edges: DrawerAtlasSpace.minimumSpanningTree(layoutPoints),
        firstTimestamp: Math.min(...cluster.points.map(point => Number(point.idea.createdAt || point.idea.updatedAt || Date.now())))
      };
    });
    const terraRegions = DrawerAtlasSpace.findTerraIncognita(projected, {
      gridSize: 28,
      pointPadding: 0.2
    });
    setAtlasLoading(t('正在为星座和未知区域命名…', 'Naming constellations and uncharted regions…'));
    const narrative = await enrichAtlasNarrative(clusters, terraRegions);
    const clusterNarrative = new Map(narrative.clusters.map(item => [item.id, item]));
    const terraNarrative = new Map(narrative.terra.map(item => [item.id, item]));
    clusters.forEach(cluster => {
      cluster.name = clusterNarrative.get(cluster.id)?.name || clusterFallbackName(cluster);
    });
    terraRegions.forEach(region => {
      Object.assign(region, terraNarrative.get(region.id) || DrawerAtlasSpace.getTerraProfile(region.x, region.y));
    });
    const data = {
      points: projected,
      clusters,
      terraRegions,
      vectorDimension: context.vectorDimension
    };
    reportLocalAtlasDiagnostics(data);
    return data;
  }

  function reportLocalAtlasDiagnostics(data) {
    if (!['127.0.0.1', 'localhost'].includes(window.location.hostname) || !data.points.length) return;
    const xs = data.points.map(point => point.x);
    const ys = data.points.map(point => point.y);
    fetch('/__dev/atlas-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pointCount: data.points.length,
        vectorDimension: data.vectorDimension,
        extent: {
          xMin: Math.min(...xs),
          xMax: Math.max(...xs),
          yMin: Math.min(...ys),
          yMax: Math.max(...ys)
        },
        clusters: data.clusters.map(cluster => ({
          id: cluster.id,
          name: cluster.name,
          stars: cluster.points.length,
          x: cluster.centroid.x,
          y: cluster.centroid.y
        })),
        terra: data.terraRegions.map(region => ({
          id: region.id,
          name: region.name,
          x: region.x,
          y: region.y,
          radius: region.radius,
          area: region.area,
          searchArea: region.searchArea
        }))
      })
    }).catch(() => {});
  }

  function mapFactory(domainStart, domainEnd, rangeStart, rangeEnd) {
    const span = domainEnd - domainStart || 1;
    return value => rangeStart + ((value - domainStart) / span) * (rangeEnd - rangeStart);
  }

  function axisText(svg, x, y, text, anchor = 'middle') {
    svg.append('text')
      .attr('class', 'atlas-axis-label')
      .attr('x', x)
      .attr('y', y)
      .attr('text-anchor', anchor)
      .attr('fill', 'rgba(246,245,243,.25)')
      .attr('font-family', 'Space Mono, monospace')
      .attr('font-size', 9)
      .attr('letter-spacing', '.08em')
      .text(text);
  }

  function showAtlasTooltip(event, point) {
    const tooltip = document.getElementById('atlasTooltip');
    const wrap = document.getElementById('atlasCanvasWrap');
    if (!tooltip || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const left = Math.min(rect.width - 266, Math.max(12, event.clientX - rect.left + 13));
    const top = Math.min(rect.height - 130, Math.max(12, event.clientY - rect.top + 13));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.innerHTML = `<strong>${esc(point.idea.name)}</strong><p>${esc(point.idea.card?.core || t('这个点子还没有充分展开。', 'This idea is still underdeveloped.'))}</p><small>${getCosmicTypeLabel(getIdeaCosmicType(point.idea))} · ${getIdeaUserTurnCount(point.idea)} ${t('轮对话', 'turns')}</small>`;
    tooltip.classList.add('show');
  }

  function hideAtlasTooltip() {
    document.getElementById('atlasTooltip')?.classList.remove('show');
  }

  function renderAtlasSvg(data) {
    const wrap = document.getElementById('atlasCanvasWrap');
    if (!wrap || typeof d3 === 'undefined') return;
    const width = wrap.clientWidth || 900;
    const height = wrap.clientHeight || 620;
    const reservePanel = selectedTerraId && width > 980 ? 410 : 0;
    const plot = {
      left: width > 620 ? 70 : 42,
      right: Math.max(width > 620 ? 280 : 180, width - reservePanel - 42),
      top: width > 900 ? 142 : (width > 620 ? 160 : 124),
      bottom: height - (width > 620 ? 62 : 88)
    };
    const x = mapFactory(-1, 1, plot.left, plot.right);
    const y = mapFactory(-1, 1, plot.bottom, plot.top);
    const guide = document.getElementById('atlasConceptGuide');
    if (guide && data.conceptPreview) {
      let guideX = plot.left + 38;
      let guideY = plot.top + 46;
      let connectorX = data.points[0] ? x(data.points[0].x) : x(0);
      let connectorY = data.points[0] ? y(data.points[0].y) : y(0);
      if (data.conceptPhase === 2) {
        const edge = data.clusters.flatMap(cluster => cluster.edges || [])[0];
        if (edge) {
          connectorX = (x(edge.source.layoutX) + x(edge.target.layoutX)) / 2;
          connectorY = (y(edge.source.layoutY) + y(edge.target.layoutY)) / 2;
          guideX = connectorX + 140;
          guideY = connectorY - 124;
        }
      } else if (data.conceptPhase === 3 && data.terraRegions[0]) {
        connectorX = x(data.terraRegions[0].x);
        connectorY = y(data.terraRegions[0].y);
        guideX = connectorX + 150;
        guideY = connectorY - 72;
      }
      const guideWidth = Math.min(300, Math.max(220, width * .24));
      const guideLeft = Math.max(24, Math.min(width - guideWidth - 24, guideX));
      const guideTop = Math.max(92, Math.min(height - 150, guideY));
      guide.style.width = `${guideWidth}px`;
      guide.style.left = `${guideLeft}px`;
      guide.style.top = `${guideTop}px`;
      window.positionSceneGuideConnector?.(
        guide,
        connectorX,
        connectorY,
        guideLeft,
        guideTop,
        guideWidth
      );
    }
    const svg = d3.select('#atlasSvg');
    svg.attr('viewBox', `0 0 ${width} ${height}`)
      .classed('atlas-concept-preview', Boolean(data.conceptPreview))
      .selectAll('*').remove();

    const defs = svg.append('defs');
    const glow = defs.append('filter').attr('id', 'atlasGlow');
    glow.append('feGaussianBlur').attr('stdDeviation', '2.4').attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const centerX = x(0);
    const centerY = y(0);
    const maximumRadius = Math.min(centerX - plot.left, plot.right - centerX, centerY - plot.top, plot.bottom - centerY);
    const reference = svg.append('g').attr('fill', 'none').attr('stroke', 'rgba(255,255,255,.055)');
    [0.34, 0.67, 1].forEach(scale => {
      reference.append('circle').attr('cx', centerX).attr('cy', centerY).attr('r', maximumRadius * scale);
    });
    reference.append('line').attr('x1', plot.left).attr('x2', plot.right).attr('y1', centerY).attr('y2', centerY);
    reference.append('line').attr('x1', centerX).attr('x2', centerX).attr('y1', plot.top).attr('y2', plot.bottom);

    axisText(svg, plot.left - 8, centerY - 8, t('向内 · SELF', 'INWARD · SELF'), 'start');
    axisText(svg, plot.right + 8, centerY - 8, t('向外 · WORLD', 'OUTWARD · WORLD'), 'end');
    axisText(svg, centerX, plot.top - 15, t('产出 · MAKE / ACT', 'OUTPUT · MAKE / ACT'));
    axisText(svg, centerX, plot.bottom + 26, t('吸收 · NOTICE / UNDERSTAND', 'ABSORB · NOTICE / UNDERSTAND'));

    const semanticXRadius = (plot.right - plot.left) / 2;
    const semanticYRadius = (plot.bottom - plot.top) / 2;
    const terraLayer = svg.append('g');
    const terraGroups = terraLayer.selectAll('g')
      .data(data.terraRegions)
      .join('g')
      .attr('class', region => `atlas-terra ${region.id === selectedTerraId ? 'selected' : ''}`)
      .attr('transform', region => `translate(${x(region.x)},${y(region.y)})`)
      .attr('cursor', 'pointer')
      .on('click', (_, region) => selectTerra(region.id));
    terraGroups.append('ellipse')
      .attr('rx', region => Math.max(width > 620 ? 58 : 42, region.radius * semanticXRadius * 0.92))
      .attr('ry', region => Math.max(width > 620 ? 48 : 36, region.radius * semanticYRadius * 0.92))
      .attr('fill', region => region.id === selectedTerraId ? 'rgba(255,148,64,.025)' : 'rgba(255,255,255,.008)')
      .attr('stroke', region => region.id === selectedTerraId ? '#ff9440' : 'rgba(246,245,243,.2)')
      .attr('stroke-width', region => region.id === selectedTerraId ? 1.3 : 1)
      .attr('stroke-dasharray', '5,7');
    terraGroups.append('text')
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('fill', region => region.id === selectedTerraId ? 'rgba(255,148,64,.9)' : 'rgba(246,245,243,.25)')
      .attr('font-family', 'Georgia, Noto Serif SC, serif')
      .attr('font-size', width > 620 ? 12 : 10)
      .attr('font-style', 'italic')
      .text('terra incognita');
    terraGroups.append('text')
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', region => region.id === selectedTerraId ? 'rgba(255,148,64,.62)' : 'rgba(246,245,243,.18)')
      .attr('font-family', 'Space Mono, monospace')
      .attr('font-size', 8)
      .attr('letter-spacing', '.12em')
      .text(region => String(region.name || '').toUpperCase());

    const clusterLayer = svg.append('g');
    data.clusters.forEach(cluster => {
      clusterLayer.append('g')
        .selectAll('line')
        .data(cluster.edges)
        .join('line')
        .attr('x1', edge => x(edge.source.layoutX))
        .attr('y1', edge => y(edge.source.layoutY))
        .attr('x2', edge => x(edge.target.layoutX))
        .attr('y2', edge => y(edge.target.layoutY))
        .attr('stroke', cluster.color)
        .attr('class', data.conceptPreview ? 'atlas-concept-edge' : null)
        .attr('stroke-width', 1)
        .attr('stroke-linecap', 'round')
        .attr('stroke-opacity', 0.42);

      const points = clusterLayer.append('g')
        .selectAll('circle')
        .data(cluster.layoutPoints)
        .join('circle')
        .attr('cx', point => x(point.layoutX))
        .attr('cy', point => y(point.layoutY))
        .attr('r', point => Math.min(9, 3.2 + Math.sqrt(ideaDepth(point.idea)) * 1.12))
        .attr('fill', cluster.color)
        .attr('fill-opacity', point => ideaRecency(point.idea))
        .attr('stroke', point => point.idea.type === 'supernova' ? '#d9f4ff' : 'rgba(255,255,255,.18)')
        .attr('stroke-width', point => point.idea.type === 'supernova' ? 1.6 : 0.7)
        .attr('filter', 'url(#atlasGlow)')
        .attr('class', data.conceptPreview ? 'atlas-concept-point' : null)
        .attr('cursor', 'pointer')
        .on('mouseenter', (event, point) => showAtlasTooltip(event, point))
        .on('mousemove', (event, point) => showAtlasTooltip(event, point))
        .on('mouseleave', hideAtlasTooltip)
        .on('click', (_, point) => {
          if (!data.conceptPreview) selectIdea(point.idea.id);
        });
      points.append('title').text(point => point.idea.name);

      if (!cluster.isConstellation) return;
      const pointYs = cluster.layoutPoints.map(point => y(point.layoutY));
      const labelAbove = cluster.centroid.y <= 0.2;
      const labelX = Math.max(plot.left + 88, Math.min(plot.right - 88, x(cluster.centroid.x)));
      const labelY = labelAbove
        ? Math.max(plot.top + 26, Math.min(...pointYs) - 24)
        : Math.min(plot.bottom - 34, Math.max(...pointYs) + 34);
      svg.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', cluster.color)
        .attr('fill-opacity', 0.86)
        .attr('font-family', 'Georgia, Noto Serif SC, serif')
        .attr('font-size', cluster.points.length > 2 ? 15 : 13)
        .attr('font-style', 'italic')
        .text(cluster.name);
      svg.append('text')
        .attr('x', labelX)
        .attr('y', labelY + 17)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(246,245,243,.27)')
        .attr('font-family', 'Space Mono, monospace')
        .attr('font-size', 8.5)
        .attr('letter-spacing', '.13em')
        .text(`${cluster.points.length} STARS · SINCE ${monthLabel(cluster.firstTimestamp)}`);
    });

  }

  function renderExpedition(region) {
    const panel = document.getElementById('atlasExpedition');
    if (!panel || !region) {
      panel?.classList.remove('open');
      panel?.setAttribute('aria-hidden', 'true');
      return;
    }
    document.getElementById('atlasExpeditionName').textContent = region.name;
    document.getElementById('atlasExpeditionDescription').textContent = currentLanguage === 'en'
      ? `You charted ${atlasData.clusters.length} directions this year, but never once turned toward this one.`
      : `你今年探了 ${atlasData.clusters.length} 个方向，却从没转向这里。`;
    document.getElementById('atlasExpeditionQuestion').textContent = `“${region.starter}”`;
    document.getElementById('atlasExpeditionAlternative1').textContent = `· ${region.alternatives?.[0] || ''}`;
    document.getElementById('atlasExpeditionAlternative2').textContent = `· ${region.alternatives?.[1] || ''}`;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function selectTerra(id) {
    if (!atlasData) return;
    selectedTerraId = id;
    const region = atlasData.terraRegions.find(candidate => candidate.id === id);
    renderAtlasSvg(atlasData);
    renderExpedition(region);
  }

  function closeExpedition() {
    selectedTerraId = null;
    document.getElementById('atlasExpedition')?.classList.remove('open');
    document.getElementById('atlasExpedition')?.setAttribute('aria-hidden', 'true');
    if (atlasData && isActive()) renderAtlasSvg(atlasData);
  }

  function updateAtlasMeta(data) {
    const meta = document.getElementById('atlasHeadingMeta');
    const subtitle = document.getElementById('universeSubtitle');
    const constellationCount = data.clusters.filter(cluster => cluster.isConstellation).length;
    const text = data.conceptPreview
      ? (currentLanguage === 'en'
          ? `${data.points.length} BORROWED STARS · CONCEPT MAP`
          : `${data.points.length} 颗借来的星 · 概念测绘`)
      : currentLanguage === 'en'
      ? `${data.points.length} IDEAS · ${constellationCount} CONSTELLATIONS · ${data.terraRegions.length} UNCHARTED`
      : `${data.points.length} 个点子 · ${constellationCount} 个星座 · ${data.terraRegions.length} 片未知区域`;
    if (meta) meta.textContent = text;
    if (subtitle) subtitle.textContent = t('固定语义坐标 · 内外 × 吸收产出', 'Fixed semantic axes · inward/outward × absorb/output');
  }

  async function renderAtlas(force = false) {
    updateModeChrome();
    if (!isActive()) return;
    if (atlasGuideActive) {
      atlasData = buildConceptAtlasData(atlasGuidePhase || 1);
      setAtlasLoading('', false);
      updateAtlasMeta(atlasData);
      renderAtlasSvg(atlasData);
      renderExpedition(atlasData.terraRegions.find(region => region.id === selectedTerraId));
      return atlasData;
    }
    if (atlasData && !force) {
      setAtlasLoading('', false);
      updateAtlasMeta(atlasData);
      renderAtlasSvg(atlasData);
      const selected = atlasData.terraRegions.find(region => region.id === selectedTerraId);
      renderExpedition(selected);
      return;
    }
    if (atlasJob) return atlasJob;
    atlasJob = buildAtlasData()
      .then(data => {
        atlasData = data;
        if (selectedTerraId && !data.terraRegions.some(region => region.id === selectedTerraId)) selectedTerraId = null;
        setAtlasLoading('', false);
        updateAtlasMeta(data);
        if (isActive()) {
          renderAtlasSvg(data);
          renderExpedition(data.terraRegions.find(region => region.id === selectedTerraId));
        }
        return data;
      })
      .catch(error => {
        console.error('Atlas rendering failed:', error);
        setAtlasLoading(t(`图谱测绘失败：${error.message}`, `Atlas mapping failed: ${error.message}`), true);
      })
      .finally(() => {
        atlasJob = null;
      });
    return atlasJob;
  }

  function invalidate() {
    atlasData = null;
    semanticContext = null;
    window.DrawerWorldWindow?.invalidate();
  }

  function getMode() {
    return atlasMode;
  }

  updateModeChrome();
  const wrap = document.getElementById('atlasCanvasWrap');
  if (wrap && typeof ResizeObserver !== 'undefined') {
    atlasResizeObserver = new ResizeObserver(() => {
      if (atlasData && isActive()) renderAtlasSvg(atlasData);
    });
    atlasResizeObserver.observe(wrap);
  }

  root.DrawerAtlasView = {
    activate,
    closeExpedition,
    finishGuide,
    getSemanticContext,
    getMode,
    goToGuidePhase,
    invalidate,
    isActive,
    render: renderAtlas,
    switchMode
  };
})(window);

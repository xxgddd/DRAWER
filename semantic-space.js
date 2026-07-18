(function exposeDrawerSemanticSpace(root) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function buildIdeaText(idea) {
    const card = idea?.card || {};
    const fields = [
      idea?.name && `标题：${idea.name}`,
      card.core && `核心：${card.core}`,
      card.origin && `起点：${card.origin}`,
      card.turningPoint && `转变：${card.turningPoint}`,
      card.tensions && `张力：${card.tensions}`,
      card.next && `下一步：${card.next}`,
      Array.isArray(card.branches) && card.branches.length
        ? `方向：${card.branches.join('；')}`
        : '',
      Array.isArray(idea?.nodes) && idea.nodes.length
        ? `节点：${idea.nodes.slice(-12).map(node => node.text).filter(Boolean).join('；')}`
        : '',
      Array.isArray(idea?.chatHistory) && idea.chatHistory.length
        ? `最近表达：${idea.chatHistory
          .filter(message => message.role === 'user')
          .slice(-6)
          .map(message => message.content)
          .filter(Boolean)
          .join('；')}`
        : ''
    ];
    return fields.filter(Boolean).join('\n').slice(0, 6000);
  }

  function fingerprint(text) {
    let hash = 2166136261;
    const value = String(text || '');
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return null;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let index = 0; index < a.length; index++) {
      const valueA = Number(a[index]);
      const valueB = Number(b[index]);
      if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) return null;
      dot += valueA * valueB;
      normA += valueA * valueA;
      normB += valueB * valueB;
    }
    if (normA === 0 || normB === 0) return null;
    return clamp(dot / Math.sqrt(normA * normB), -1, 1);
  }

  function similarityToStrength(similarity) {
    return clamp((similarity - 0.3) / 0.55, 0.16, 1);
  }

  function similarityToDistance(similarity) {
    const strength = similarityToStrength(similarity);
    return Math.round(220 - strength * 125);
  }

  function buildNeighborGraph(items, options = {}) {
    const neighbors = Math.max(1, Number(options.neighbors) || 2);
    const minSimilarity = Number.isFinite(options.minSimilarity) ? options.minSimilarity : 0.34;
    const candidates = [];

    items.forEach((left, leftIndex) => {
      items.forEach((right, rightIndex) => {
        if (rightIndex <= leftIndex) return;
        const similarity = cosineSimilarity(left.vector, right.vector);
        if (similarity == null) return;
        candidates.push({
          source: left.id,
          target: right.id,
          similarity,
          semanticDistance: 1 - similarity
        });
      });
    });

    const selectedKeys = new Set();
    items.forEach(item => {
      candidates
        .filter(candidate => candidate.source === item.id || candidate.target === item.id)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, neighbors)
        .forEach(candidate => {
          const key = [candidate.source, candidate.target].sort().join(':');
          selectedKeys.add(key);
        });
    });

    return candidates
      .filter(candidate => {
        const key = [candidate.source, candidate.target].sort().join(':');
        return selectedKeys.has(key) && candidate.similarity >= minSimilarity;
      })
      .map(candidate => ({
        ...candidate,
        strength: similarityToStrength(candidate.similarity),
        distance: similarityToDistance(candidate.similarity)
      }))
      .sort((a, b) => b.similarity - a.similarity);
  }

  function createDistanceMatrix(items) {
    const ids = items.map(item => item.id);
    const matrix = items.map((left, leftIndex) => items.map((right, rightIndex) => {
      if (leftIndex === rightIndex) return 0;
      const similarity = cosineSimilarity(left.vector, right.vector);
      return similarity == null ? 1 : 1 - similarity;
    }));
    return { ids, matrix };
  }

  root.DrawerSemanticSpace = Object.freeze({
    buildIdeaText,
    fingerprint,
    cosineSimilarity,
    buildNeighborGraph,
    createDistanceMatrix,
    similarityToDistance,
    similarityToStrength
  });
})(typeof window === 'undefined' ? globalThis : window);

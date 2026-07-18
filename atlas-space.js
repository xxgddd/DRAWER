(function exposeAtlasSpace(root) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function meanVector(vectors) {
    const valid = vectors.filter(vector => Array.isArray(vector) && vector.length);
    if (!valid.length) return [];
    const dimension = valid[0].length;
    const mean = new Array(dimension).fill(0);
    valid.forEach(vector => {
      if (vector.length !== dimension) throw new Error('Anchor vector dimensions do not match');
      vector.forEach((value, index) => {
        mean[index] += Number(value) || 0;
      });
    });
    return mean.map(value => value / valid.length);
  }

  function normalizeAxis(values) {
    if (!values.length) return [];
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = maximum - minimum;
    if (range < 1e-9) return values.map(() => 0);
    return values.map(value => ((value - minimum) / range) * 2 - 1);
  }

  function projectItems(items, anchors, cosineSimilarity) {
    if (typeof cosineSimilarity !== 'function') throw new Error('A cosine similarity function is required');
    const raw = items.map(item => ({
      ...item,
      rawX: cosineSimilarity(item.vector, anchors.outward) - cosineSimilarity(item.vector, anchors.inward),
      rawY: cosineSimilarity(item.vector, anchors.output) - cosineSimilarity(item.vector, anchors.absorb)
    }));
    const normalizedX = normalizeAxis(raw.map(item => item.rawX));
    const normalizedY = normalizeAxis(raw.map(item => item.rawY));
    return raw.map((item, index) => ({
      ...item,
      x: normalizedX[index],
      y: normalizedY[index]
    }));
  }

  function squaredDistance(left, right) {
    const dx = left.x - right.x;
    const dy = left.y - right.y;
    return dx * dx + dy * dy;
  }

  function centroid(points) {
    if (!points.length) return { x: 0, y: 0 };
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length
    };
  }

  function initialCentroids(points, count) {
    const center = centroid(points);
    const first = [...points].sort((left, right) => {
      const distanceDelta = squaredDistance(right, center) - squaredDistance(left, center);
      return distanceDelta || String(left.id).localeCompare(String(right.id));
    })[0];
    const selected = [{ x: first.x, y: first.y }];
    while (selected.length < count) {
      const next = [...points].sort((left, right) => {
        const leftDistance = Math.min(...selected.map(candidate => squaredDistance(left, candidate)));
        const rightDistance = Math.min(...selected.map(candidate => squaredDistance(right, candidate)));
        return rightDistance - leftDistance || String(left.id).localeCompare(String(right.id));
      })[0];
      selected.push({ x: next.x, y: next.y });
    }
    return selected;
  }

  function kmeans(points, count, maxIterations = 80) {
    if (!points.length) return { assignments: [], centroids: [] };
    const clusterCount = clamp(Math.round(count), 1, points.length);
    let centers = initialCentroids(points, clusterCount);
    let assignments = new Array(points.length).fill(-1);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const nextAssignments = points.map(point => {
        let bestIndex = 0;
        let bestDistance = Infinity;
        centers.forEach((candidate, index) => {
          const distance = squaredDistance(point, candidate);
          if (distance < bestDistance) {
            bestIndex = index;
            bestDistance = distance;
          }
        });
        return bestIndex;
      });
      const unchanged = nextAssignments.every((value, index) => value === assignments[index]);
      assignments = nextAssignments;
      if (unchanged) break;

      centers = centers.map((current, index) => {
        const members = points.filter((_, pointIndex) => assignments[pointIndex] === index);
        if (members.length) return centroid(members);
        const replacement = [...points].sort((left, right) => {
          const leftDistance = Math.min(...centers.map(candidate => squaredDistance(left, candidate)));
          const rightDistance = Math.min(...centers.map(candidate => squaredDistance(right, candidate)));
          return rightDistance - leftDistance;
        })[0];
        return replacement ? { x: replacement.x, y: replacement.y } : current;
      });
    }
    return { assignments, centroids: centers };
  }

  function silhouetteScore(points, assignments, clusterCount) {
    if (clusterCount <= 1 || points.length < 3) return 0;
    const distances = points.map((left, leftIndex) => points.map((right, rightIndex) => (
      leftIndex === rightIndex ? 0 : Math.sqrt(squaredDistance(left, right))
    )));
    const scores = points.map((_, pointIndex) => {
      const ownCluster = assignments[pointIndex];
      const ownMembers = assignments
        .map((cluster, index) => ({ cluster, index }))
        .filter(item => item.cluster === ownCluster && item.index !== pointIndex);
      if (!ownMembers.length) return 0;
      const within = ownMembers.reduce((sum, item) => sum + distances[pointIndex][item.index], 0) / ownMembers.length;
      let nearestOther = Infinity;
      for (let cluster = 0; cluster < clusterCount; cluster++) {
        if (cluster === ownCluster) continue;
        const members = assignments
          .map((assigned, index) => ({ assigned, index }))
          .filter(item => item.assigned === cluster);
        if (!members.length) continue;
        const average = members.reduce((sum, item) => sum + distances[pointIndex][item.index], 0) / members.length;
        nearestOther = Math.min(nearestOther, average);
      }
      return Number.isFinite(nearestOther)
        ? (nearestOther - within) / Math.max(nearestOther, within, 1e-9)
        : 0;
    });
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  function clusterPoints(points, options = {}) {
    if (!points.length) return [];
    if (points.length < 4) {
      return [{ id: 'cluster-0', index: 0, centroid: centroid(points), points: [...points], score: 0 }];
    }
    const maximum = Math.min(options.maxClusters || 6, Math.floor(Math.sqrt(points.length)) + 1, points.length - 1);
    let best = null;
    for (let count = 2; count <= maximum; count++) {
      const result = kmeans(points, count);
      const silhouette = silhouetteScore(points, result.assignments, count);
      const adjusted = silhouette - count * 0.018;
      if (!best || adjusted > best.adjusted) best = { ...result, count, silhouette, adjusted };
    }
    if (!best || best.silhouette < 0.12) {
      return [{ id: 'cluster-0', index: 0, centroid: centroid(points), points: [...points], score: best?.silhouette || 0 }];
    }

    const groups = best.centroids.map((center, index) => ({
      originalIndex: index,
      centroid: center,
      points: points.filter((_, pointIndex) => best.assignments[pointIndex] === index)
    })).filter(group => group.points.length);
    groups.sort((left, right) => left.centroid.x - right.centroid.x || right.centroid.y - left.centroid.y);
    return groups.map((group, index) => ({
      id: `cluster-${index}`,
      index,
      centroid: centroid(group.points),
      points: group.points,
      score: best.silhouette
    }));
  }

  function hashUnit(value) {
    let hash = 2166136261;
    for (const char of String(value)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
  }

  function layoutClusterPoints(cluster, spread = 0.13) {
    return cluster.points.map(point => {
      const angle = hashUnit(`${point.id}:angle`) * Math.PI * 2;
      const radius = (0.32 + hashUnit(`${point.id}:radius`) * 0.68) * spread;
      return {
        ...point,
        clusterId: cluster.id,
        layoutX: clamp(cluster.centroid.x + (point.x - cluster.centroid.x) * 0.28 + Math.cos(angle) * radius, -1, 1),
        layoutY: clamp(cluster.centroid.y + (point.y - cluster.centroid.y) * 0.28 + Math.sin(angle) * radius, -1, 1)
      };
    });
  }

  function minimumSpanningTree(points, xKey = 'layoutX', yKey = 'layoutY') {
    if (points.length < 2) return [];
    const visited = new Set([0]);
    const edges = [];
    while (visited.size < points.length) {
      let best = null;
      visited.forEach(sourceIndex => {
        points.forEach((target, targetIndex) => {
          if (visited.has(targetIndex)) return;
          const source = points[sourceIndex];
          const dx = source[xKey] - target[xKey];
          const dy = source[yKey] - target[yKey];
          const distance = dx * dx + dy * dy;
          if (!best || distance < best.distance) best = { source, target, distance, sourceIndex, targetIndex };
        });
      });
      if (!best) break;
      edges.push(best);
      visited.add(best.targetIndex);
    }
    return edges;
  }

  function findTerraIncognita(points, options = {}) {
    if (!points.length) return [];
    const gridSize = Math.max(12, options.gridSize || 24);
    const pointPadding = options.pointPadding || 0.2;
    const quadrants = [
      { id: 'inward-output', xMin: -1, xMax: 0, yMin: 0, yMax: 1, points: [] },
      { id: 'outward-output', xMin: 0, xMax: 1, yMin: 0, yMax: 1, points: [] },
      { id: 'inward-absorb', xMin: -1, xMax: 0, yMin: -1, yMax: 0, points: [] },
      { id: 'outward-absorb', xMin: 0, xMax: 1, yMin: -1, yMax: 0, points: [] }
    ];
    points.forEach(point => {
      const index = (point.y < 0 ? 2 : 0) + (point.x >= 0 ? 1 : 0);
      quadrants[index].points.push(point);
    });

    const dominant = [...quadrants].sort((left, right) => right.points.length - left.points.length)[0];
    const hasDominantQuadrant = points.length >= 4 && dominant.points.length / points.length >= 0.6;
    const oppositeById = {
      'inward-output': 'outward-absorb',
      'outward-output': 'inward-absorb',
      'inward-absorb': 'outward-output',
      'outward-absorb': 'inward-output'
    };
    const searchBounds = hasDominantQuadrant
      ? quadrants.find(quadrant => quadrant.id === oppositeById[dominant.id])
      : { id: 'full-map', xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
    const xSpan = searchBounds.xMax - searchBounds.xMin;
    const ySpan = searchBounds.yMax - searchBounds.yMin;
    let best = null;

    for (let row = 0; row < gridSize; row++) {
      for (let column = 0; column < gridSize; column++) {
        const x = searchBounds.xMin + ((column + 0.5) / gridSize) * xSpan;
        const y = searchBounds.yMin + ((row + 0.5) / gridSize) * ySpan;
        const distances = points.map(point => Math.hypot(point.x - x, point.y - y));
        const nearestDistance = Math.min(...distances);
        const canvasClearance = Math.min(x + 1, 1 - x, y + 1, 1 - y);
        const radius = Math.max(0, Math.min(nearestDistance - pointPadding, canvasClearance));
        const meanDistance = distances.reduce((sum, distance) => sum + distance, 0) / distances.length;
        const area = Math.PI * radius * radius;
        const score = area * (1 + meanDistance * 0.08);
        if (!best || score > best.score) {
          best = {
            x,
            y,
            radius,
            area,
            score,
            column,
            row,
            searchArea: searchBounds.id,
            dominantArea: hasDominantQuadrant ? dominant.id : null
          };
        }
      }
    }

    if (!best) return [];
    best.radius = clamp(best.radius, 0.2, 0.72);
    best.area = Math.PI * best.radius * best.radius;
    return [{ ...best, id: `terra-largest-${best.searchArea}` }];
  }

  const TERRA_PROFILES = {
    inwardAbsorb: {
      name: 'Body & Memory',
      starter: '你的身体最近告诉了你什么，而你的思绪一直没有听见？',
      alternatives: ['哪一种感受总在被你迅速解释掉？', '如果不急着解决，哪段记忆值得重新停留？']
    },
    inwardOutput: {
      name: 'Self & Practice',
      starter: '有什么只属于你的东西，值得被做成一种长期练习？',
      alternatives: ['你想为未来的自己建立什么？', '哪一种内在变化可以通过一个小行动开始？']
    },
    outwardAbsorb: {
      name: 'People & Place',
      starter: '最近哪一个人或地方，正在悄悄改变你理解世界的方式？',
      alternatives: ['你忽略了谁的视角？', '哪座城市正在教你一种新的生活尺度？']
    },
    outwardOutput: {
      name: 'World & Action',
      starter: '如果要让周围的世界发生一点具体变化，你会先动哪里？',
      alternatives: ['什么关系值得被重新建立？', '哪一个公共问题可以从一件小事开始？']
    },
    innerThreshold: {
      name: 'Rest & Play',
      starter: '如果休息不需要被挣来，你会怎样使用这一小段空白？',
      alternatives: ['什么事情只因为好玩就值得做？', '你多久没有允许自己毫无目的地停留？']
    },
    worldThreshold: {
      name: 'Relation & Change',
      starter: '哪一种关系正在变化，但你还没有给它一个名字？',
      alternatives: ['你想靠近谁的真实处境？', '外部世界最近给了你什么未完成的邀请？']
    },
    absorbThreshold: {
      name: 'Sense & Notice',
      starter: '如果今天只负责观察，你最想重新看见什么？',
      alternatives: ['什么细节一直在重复出现？', '哪一种声音值得先被完整听完？']
    },
    outputThreshold: {
      name: 'Make & Begin',
      starter: '哪件尚未成形的事，已经值得先做出第一个版本？',
      alternatives: ['你可以先建立一个什么微小结构？', '什么想法需要从语言走到现实？']
    }
  };

  function getTerraProfile(x, y) {
    if (Math.abs(x) < 0.28) return y < -0.2 ? TERRA_PROFILES.absorbThreshold : TERRA_PROFILES.outputThreshold;
    if (Math.abs(y) < 0.28) return x < 0 ? TERRA_PROFILES.innerThreshold : TERRA_PROFILES.worldThreshold;
    if (x < 0 && y < 0) return TERRA_PROFILES.inwardAbsorb;
    if (x < 0 && y >= 0) return TERRA_PROFILES.inwardOutput;
    if (x >= 0 && y < 0) return TERRA_PROFILES.outwardAbsorb;
    return TERRA_PROFILES.outwardOutput;
  }

  root.DrawerAtlasSpace = {
    clusterPoints,
    findTerraIncognita,
    getTerraProfile,
    kmeans,
    layoutClusterPoints,
    meanVector,
    minimumSpanningTree,
    normalizeAxis,
    projectItems,
    silhouetteScore
  };
})(typeof window !== 'undefined' ? window : globalThis);

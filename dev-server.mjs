import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('.');
const port = Number(process.env.PORT || 8765);
const maxBodyBytes = 1_000_000;
const proxyTargets = {
  '/api/chat': 'https://api.siliconflow.cn/v1/chat/completions',
  '/api/embeddings': 'https://api.siliconflow.cn/v1/embeddings'
};
const apiDiagnostics = {
  startedAt: new Date().toISOString(),
  requests: [],
  semanticReport: null,
  atlasReport: null,
  worldReport: null
};
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function send(response, status, body, type = 'application/json; charset=utf-8') {
  response.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store'
  });
  response.end(body);
}

function recordApiDiagnostic(pathname, status, body, error = '', purpose = '') {
  let model = '';
  let inputCount = 0;
  try {
    const payload = JSON.parse(body.toString('utf8'));
    model = typeof payload.model === 'string' ? payload.model : '';
    inputCount = Array.isArray(payload.input) ? payload.input.length : (payload.input ? 1 : 0);
  } catch {
    // Diagnostics intentionally ignore invalid request bodies and never retain them.
  }
  apiDiagnostics.requests.push({
    at: new Date().toISOString(),
    path: pathname,
    model,
    inputCount,
    status,
    error,
    purpose: String(purpose || '')
  });
  apiDiagnostics.requests = apiDiagnostics.requests.slice(-20);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error('Request body is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function receiveSemanticReport(request, response) {
  if (request.method !== 'POST') {
    send(response, 405, JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  try {
    const payload = JSON.parse((await readBody(request)).toString('utf8'));
    apiDiagnostics.semanticReport = {
      receivedAt: new Date().toISOString(),
      model: String(payload.model || ''),
      ideaCount: Number(payload.ideaCount) || 0,
      embeddedCount: Number(payload.embeddedCount) || 0,
      vectorDimension: Number(payload.vectorDimension) || 0,
      activeSupernovae: Number(payload.activeSupernovae) || 0,
      reviewStatuses: payload.reviewStatuses && typeof payload.reviewStatuses === 'object'
        ? Object.fromEntries(Object.entries(payload.reviewStatuses).map(([key, value]) => [String(key), Number(value) || 0]))
        : {},
      cosmicCounts: payload.cosmicCounts && typeof payload.cosmicCounts === 'object'
        ? Object.fromEntries(Object.entries(payload.cosmicCounts).map(([key, value]) => [String(key), Number(value) || 0]))
        : {},
      pairs: Array.isArray(payload.pairs)
        ? payload.pairs.slice(0, 100).map(pair => ({
          source: String(pair.source),
          target: String(pair.target),
          similarity: Number(pair.similarity),
          semanticDistance: Number(pair.semanticDistance)
        }))
        : []
    };
    send(response, 204, '');
  } catch (error) {
    send(response, 400, JSON.stringify({ error: error.message }));
  }
}

async function receiveAtlasReport(request, response) {
  if (request.method !== 'POST') {
    send(response, 405, JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  try {
    const payload = JSON.parse((await readBody(request)).toString('utf8'));
    const safeCoordinate = value => Number(Number(value).toFixed(4));
    apiDiagnostics.atlasReport = {
      receivedAt: new Date().toISOString(),
      pointCount: Number(payload.pointCount) || 0,
      vectorDimension: Number(payload.vectorDimension) || 0,
      extent: payload.extent && typeof payload.extent === 'object'
        ? Object.fromEntries(Object.entries(payload.extent).map(([key, value]) => [String(key), safeCoordinate(value)]))
        : {},
      clusters: Array.isArray(payload.clusters)
        ? payload.clusters.slice(0, 12).map(cluster => ({
          id: String(cluster.id),
          name: String(cluster.name || ''),
          stars: Number(cluster.stars) || 0,
          x: safeCoordinate(cluster.x),
          y: safeCoordinate(cluster.y)
        }))
        : [],
      terra: Array.isArray(payload.terra)
        ? payload.terra.slice(0, 8).map(region => ({
          id: String(region.id),
          name: String(region.name || ''),
          x: safeCoordinate(region.x),
          y: safeCoordinate(region.y),
          radius: safeCoordinate(region.radius),
          area: safeCoordinate(region.area),
          searchArea: String(region.searchArea || '')
        }))
        : []
    };
    send(response, 204, '');
  } catch (error) {
    send(response, 400, JSON.stringify({ error: error.message }));
  }
}

async function receiveWorldReport(request, response) {
  if (request.method !== 'POST') {
    send(response, 405, JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  try {
    const payload = JSON.parse((await readBody(request)).toString('utf8'));
    const safeCoordinate = value => Number(Number(value).toFixed(4));
    apiDiagnostics.worldReport = {
      receivedAt: new Date().toISOString(),
      date: String(payload.date || ''),
      knownStars: Number(payload.knownStars) || 0,
      lights: Array.isArray(payload.lights)
        ? payload.lights.slice(0, 4).map(light => ({
          id: String(light.id || ''),
          role: String(light.role || ''),
          type: String(light.type || ''),
          x: safeCoordinate(light.x),
          y: safeCoordinate(light.y),
          semanticDistance: safeCoordinate(light.semanticDistance)
        }))
        : []
    };
    send(response, 204, '');
  } catch (error) {
    send(response, 400, JSON.stringify({ error: error.message }));
  }
}

async function proxyApi(request, response, pathname) {
  if (request.method !== 'POST') {
    send(response, 405, JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const browserAuthorization = request.headers.authorization;
  const purpose = request.headers['x-drawer-purpose'];
  const serverKey = process.env.SILICONFLOW_API_KEY;
  const authorization = browserAuthorization || (serverKey ? `Bearer ${serverKey}` : '');
  if (!authorization) {
    recordApiDiagnostic(pathname, 401, Buffer.alloc(0), 'missing-api-key', purpose);
    send(response, 401, JSON.stringify({
      error: 'localhost 测试需要在设置中填写自己的 SiliconFlow API Key，或设置 SILICONFLOW_API_KEY 环境变量'
    }));
    return;
  }

  try {
    const body = await readBody(request);
    const upstream = await fetch(proxyTargets[pathname], {
      method: 'POST',
      headers: {
        'Content-Type': request.headers['content-type'] || 'application/json',
        'Authorization': authorization
      },
      body
    });
    recordApiDiagnostic(pathname, upstream.status, body, '', purpose);
    const result = Buffer.from(await upstream.arrayBuffer());
    response.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    response.end(result);
  } catch (error) {
    recordApiDiagnostic(pathname, 502, Buffer.alloc(0), error.message, purpose);
    send(response, 502, JSON.stringify({ error: `Local proxy failed: ${error.message}` }));
  }
}

async function serveStatic(response, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^[/\\]+/, '');
  let filePath = resolve(root, relativePath);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    send(response, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = resolve(filePath, 'index.html');
    const body = await readFile(filePath);
    send(response, 200, body, contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream');
  } catch {
    send(response, 404, 'Not found', 'text/plain; charset=utf-8');
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  if (url.pathname === '/__dev/api-status') {
    send(response, 200, JSON.stringify(apiDiagnostics));
    return;
  }
  if (url.pathname === '/__dev/semantic-report') {
    await receiveSemanticReport(request, response);
    return;
  }
  if (url.pathname === '/__dev/atlas-report') {
    await receiveAtlasReport(request, response);
    return;
  }
  if (url.pathname === '/__dev/world-report') {
    await receiveWorldReport(request, response);
    return;
  }
  if (proxyTargets[url.pathname]) {
    await proxyApi(request, response, url.pathname);
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, 'Method not allowed', 'text/plain; charset=utf-8');
    return;
  }
  await serveStatic(response, url.pathname);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`DRAWER local server: http://127.0.0.1:${port}`);
});

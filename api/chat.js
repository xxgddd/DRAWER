export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Allow client to pass API key via Authorization header, fallback to env var
  const authHeader = req.headers.get('Authorization');
  let apiKey = process.env.SILICONFLOW_API_KEY;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.split(' ')[1];
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API Key not configured on server and not provided by client' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();

  try {
    const requestUpstream = (payload) => fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    let response = await requestUpstream(body);
    if ((response.status === 400 || response.status === 404) && typeof body?.model === 'string' && body.model.includes('Kimi')) {
      const fallbacks = ['Pro/moonshotai/Kimi-K3', 'Pro/moonshotai/Kimi-K2.5', 'moonshotai/Kimi-K2-Instruct'];
      for (const fallbackModel of fallbacks) {
        if (fallbackModel === body.model) continue;
        const retry = await requestUpstream({ ...body, model: fallbackModel });
        if (retry.ok || (retry.status !== 400 && retry.status !== 404)) {
          response = retry;
          break;
        }
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to proxy request: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

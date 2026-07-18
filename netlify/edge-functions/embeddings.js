const MODEL = 'BAAI/bge-m3';
const MAX_BATCH_SIZE = 24;
const MAX_INPUT_LENGTH = 6000;

export default async request => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const clientKey = request.headers.get('Authorization');
  const accessCode = request.headers.get('X-Access-Code');
  const serverKey = Deno.env.get('SILICONFLOW_API_KEY');
  const serverAccessCode = Deno.env.get('ACCESS_CODE');

  let activeKey = null;
  if (clientKey?.startsWith('Bearer ')) {
    activeKey = clientKey;
  } else if (serverKey && (!serverAccessCode || accessCode === serverAccessCode)) {
    activeKey = `Bearer ${serverKey}`;
  }

  if (!activeKey) {
    return new Response(JSON.stringify({ error: '请提供有效的 API Key 或访问码' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const input = Array.isArray(body.input) ? body.input : [body.input];
    const validInput = input.length > 0
      && input.length <= MAX_BATCH_SIZE
      && input.every(value => typeof value === 'string' && value.trim() && value.length <= MAX_INPUT_LENGTH);

    if (!validInput || (body.model && body.model !== MODEL)) {
      return new Response(JSON.stringify({ error: 'Invalid embedding request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch('https://api.siliconflow.cn/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': activeKey
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        encoding_format: 'float'
      })
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Embedding proxy failed: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

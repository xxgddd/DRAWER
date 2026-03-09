export default async (request, context) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  const clientKey = request.headers.get('Authorization');
  const accessCode = request.headers.get('X-Access-Code');
  const serverKey = Deno.env.get("SILICONFLOW_API_KEY");
  const serverAccessCode = Deno.env.get("ACCESS_CODE");

  // 这里的逻辑是：
  // 1. 如果有 clientKey (用户填了自己的 Key)，直接放行。
  // 2. 如果没有 clientKey 但有正确的 accessCode，使用 serverKey 放行。
  // 3. 否则，拒绝。

  let activeKey = null;
  if (clientKey) {
    activeKey = clientKey;
  } else if (serverAccessCode && accessCode === serverAccessCode) {
    activeKey = serverKey ? `Bearer ${serverKey}` : null;
  }

  if (!activeKey) {
    const msg = serverAccessCode ? "请在设置中输入正确的'访问码'或自己的 API Key" : "未配置 API Key";
    return new Response(JSON.stringify({ error: msg }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.clone().json();
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': activeKey,
      },
      body: JSON.stringify(body),
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Netlify Edge Error: ' + error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

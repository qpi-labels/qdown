async function handleProxy(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Clone headers and remove ones that might cause the target server to reject the request
  const headers = new Headers(request.headers);
  headers.delete('Origin');
  headers.delete('Referer');
  headers.delete('Host');

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'follow',
  });

  try {
    const response = await fetch(proxyRequest);
    
    // Copy the response to modify headers
    const proxyResponse = new Response(response.body, response);
    
    // Set CORS headers
    proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    proxyResponse.headers.set('Access-Control-Allow-Headers', '*');
    
    return proxyResponse;
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 502 });
  }
}

export async function onRequestGet(context) { return handleProxy(context); }
export async function onRequestPost(context) { return handleProxy(context); }

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}

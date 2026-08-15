export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Intercept proxy requests for both /api/proxy and /api/proxy?url=...
    if (url.pathname === '/api/proxy' || url.pathname.startsWith('/api/proxy/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response('Missing url parameter', {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }

      const headers = new Headers(request.headers);
      headers.delete('Origin');
      headers.delete('Referer');
      headers.delete('Host');
      if (!headers.get('User-Agent') || headers.get('User-Agent').includes('Cloudflare')) {
        headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36');
      }

      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
          redirect: 'follow',
        });

        const proxyResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers),
        });

        proxyResponse.headers.set('Access-Control-Allow-Origin', '*');
        proxyResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
        proxyResponse.headers.set('Access-Control-Allow-Headers', '*');
        proxyResponse.headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');

        return proxyResponse;
      } catch (err) {
        return new Response(`Proxy error: ${err.message}`, {
          status: 502,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }
    }

    // Default static file serving from Cloudflare Pages
    return env.ASSETS.fetch(request);
  },
};

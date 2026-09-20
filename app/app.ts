import { type Attributes, metrics } from '@opentelemetry/api';
import { createServer } from 'node:http';

const meter = metrics.getMeter('otel-demo-api');
const requests = meter.createCounter('demo_http_requests', {
  description: 'Number of HTTP requests handled by the demo app',
});
const duration = meter.createHistogram('demo_http_request_duration_milliseconds', {
  description: 'HTTP request duration in milliseconds',
});

const server = createServer(async (request, response) => {
  const startedAt = performance.now();
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const route = url.pathname === '/work' ? '/work' : url.pathname;
  let statusCode = 200;

  if (url.pathname === '/health') {
    response.writeHead(200).end('ok');
  } else if (url.pathname === '/work') {
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 250));
    statusCode = url.searchParams.get('fail') === 'true' ? 500 : 200;
    response.writeHead(statusCode, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: statusCode === 200 }));
  } else {
    statusCode = 404;
    response.writeHead(statusCode).end('not found');
  }

  const attributes: Attributes = {
    'http.route': route,
    'http.response.status_code': statusCode,
  };
  requests.add(1, attributes);
  duration.record(performance.now() - startedAt, attributes);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`Demo API listening on port ${port}`);
});


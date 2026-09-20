import { type Attributes, metrics, SpanStatusCode, trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { createServer } from 'node:http';

const meter = metrics.getMeter('otel-demo-api');
const logger = logs.getLogger('otel-demo-api');
const tracer = trace.getTracer('otel-demo-api');

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
  await tracer.startActiveSpan('demo.work', async (span) => {
    try {
      span.setAttribute('demo.operation', 'simulated-work');
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 250));

      if (url.searchParams.get('fail') === 'true') {
        const error = new Error('The simulated operation failed');
        statusCode = 500;
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      }

      response.writeHead(statusCode, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: statusCode === 200 }));
    } finally {
      span.end();
    }
  });
} else {
  statusCode = 404;
  response.writeHead(statusCode).end('not found');
}

  const elapsed = performance.now() - startedAt;
  const attributes: Attributes = {
    'http.route': route,
    'http.response.status_code': statusCode,
  };

  requests.add(1, attributes);
  duration.record(elapsed, attributes);

  const failed = statusCode >= 500;
  logger.emit({
    severityNumber: failed ? SeverityNumber.ERROR : SeverityNumber.INFO,
    severityText: failed ? 'ERROR' : 'INFO',
    body: failed ? 'Request failed' : 'Request completed',
    attributes: {
      ...attributes,
      'http.request.method': request.method ?? 'UNKNOWN',
      'http.server.request.duration_ms': Math.round(elapsed),
    },
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => {
  console.log(`Demo API listening on port ${port}`);
});


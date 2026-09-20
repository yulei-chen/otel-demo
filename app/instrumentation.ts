import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

const endpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318')
  .replace(/\/$/, '');
const token = process.env.OTEL_AUTH_TOKEN;

if (!token) {
  throw new Error('OTEL_AUTH_TOKEN is required');
}

const headers = { Authorization: `Bearer ${token}` };
const resource = defaultResource().merge(resourceFromAttributes({
  'service.name': process.env.OTEL_SERVICE_NAME || 'otel-demo-api',
  'service.version': process.env.npm_package_version || '1.0.0',
  'deployment.environment.name': process.env.NODE_ENV || 'development',
}));

const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: `${endpoint}/v1/metrics`,
    headers,
  }),
  exportIntervalMillis: 5000,
});

const logProcessor = new BatchLogRecordProcessor({
  exporter: new OTLPLogExporter({
    url: `${endpoint}/v1/logs`,
    headers,
  }),
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    headers,
  }),
  metricReaders: [metricReader],
  logRecordProcessors: [logProcessor],
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false },
  })],
});

sdk.start();

process.once('SIGTERM', () => {
  sdk.shutdown()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('OpenTelemetry shutdown failed', error);
      process.exit(1);
    });
});


'use strict'

const process = require('process');
const opentelemetrySDK = require('@opentelemetry/sdk-node');
const opentelemetryAPI = require("@opentelemetry/api");
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } =  require('@opentelemetry/exporter-trace-otlp-proto');
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-proto");
const { MeterProvider, AggregationTemporality, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

// enable logging ONLY for developement
// this is useful for debugging instrumentation issues
// remove from production after issues (if any) are resolved
// view more logging levels here: https://github.com/open-telemetry/opentelemetry-js-api/blob/main/src/diag/types.ts#L67
opentelemetryAPI.diag.setLogger(
  new opentelemetryAPI.DiagConsoleLogger(),
  opentelemetryAPI.DiagLogLevel.DEBUG,
);

// Declare the resource to be used.
//    A resource represents a collection of attributes describing the
//    service. This collection of attributes will be associated with all
//    telemetry generated from this service (traces, metrics, logs).
const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'FoodMe-OTel',
  })

// Enable auto-instrumentation from the meta package.
const instrumentations = [getNodeAutoInstrumentations()];

// Configure the OTLP/PROTO exporters.
//    The following assumes you've set the OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OLTP_HEADERS
//    environment variables.
const traceExporter = new OTLPTraceExporter();
const metricExporter = new OTLPMetricExporter({
  temporalityPreference: AggregationTemporality.DELTA
});

// Configure PeriodicMetricReader
const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 5000,
})

const meterProvider = new MeterProvider({
  resource: resource,
});

meterProvider.addMetricReader(metricReader);

// Set this MeterProvider to be global to the app being instrumented.
opentelemetryAPI.metrics.setGlobalMeterProvider(meterProvider); 

const sdk = new opentelemetrySDK.NodeSDK({
  resource, 
  traceExporter,  
  metricReader, 
  instrumentations,
});

// initialize the SDK and register with the OpenTelemetry API
// this enables the API to record telemetry
sdk.start()
  .then(() => console.log('OpenTelemetry initialized'))
  .catch((error) => console.log('Error initializing OpenTelemetry', error));

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
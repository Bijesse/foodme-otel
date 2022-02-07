# FoodMe App — an AngularJS app instrumented with OpenTelemetry

Originally copied from: https://github.com/IgorMinar/foodme/: ASimplified meal ordering app for local restaurants built with AngularJS
and node.js backend.

Check out this doc for more info about the app: http://goo.gl/Xa0Ea

### Steps to run the app and export traces to your New Relic Account:

This assumes you have `npm` installed on your machine.

1. Run `npm install` to install all dependencies.
2. Export the following environment variables:

```shell
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://otlp.nr-data.net:4318/v1/traces
export OTEL_EXPORTER_OTLP_HEADERS=api-key=<YOUR_LICENSEY_KEY>
```

Replace `<YOUR_LICENSE_KEY>` with your [New Relic ingest license key](https://one.newrelic.com/launcher/api-keys-ui.api-keys-launcher).

3. Run `npm start` to launch the app. Generate traffic by clicking around the web site.
4. Head to your [New Relic account](https://one.newrelic.com) to view this service, `FoodMe`, under `Services - OpenTelemetry`, and explore the data!

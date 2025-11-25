import type { AWS } from '@serverless/typescript';

import { app } from '@/app/config/app.config';
/**
 * Template note:
 * - Templates do NOT commit generated register files under app/generated; they
 *   are declared via ambient types (templates/default/types/registers.d.ts) so
 *   TypeScript can typecheck without artifacts.
 * - To ensure side effects still run (endpoint/serverless registration) and to
 *   satisfy noUncheckedSideEffectImports, import register modules as namespaces
 *   and reference them via `void`.
 * - In real apps, `smoz init` seeds placeholders and `smoz register` rewrites
 *   app/generated/register.*.ts at author time.
 */
import * as __register_functions from '@/app/generated/register.functions';
import * as __register_serverless from '@/app/generated/register.serverless';
void __register_functions;
void __register_serverless;
const config: AWS = {
  service: '${param:SERVICE_NAME}',
  frameworkVersion: '4',
  plugins: [
    'serverless-apigateway-log-retention',
    'serverless-deployment-bucket',
    'serverless-domain-manager',
    'serverless-plugin-common-excludes',
    'serverless-offline',
  ],
  package: {
    individually: true,
    patterns: ['!**/?(*.)test.+(!(.))'],
  },
  custom: {
    apiGatewayLogRetention: {
      accessLogging: {
        enabled: true,
        days: 5,
      },
      executionLogging: {
        enabled: false,
      },
    },
    customDomain: {
      autoDomain: true,
      basePath: '',
      certificateArn: '${param:DOMAIN_CERTIFICATE_ARN}',
      domainName: '${param:DOMAIN_NAME}',
      preserveExternalPathMappings: true,
    },
    deploymentBucket: {
      accelerate: true,
      blockPublicAccess: true,
    },
    // Local emulation defaults (serverless-offline)
    'serverless-offline': {
      httpPort: 3000,
      noPrependStageInUrl: true,
    },
  },
  stages: app.stages as NonNullable<AWS['stages']>,
  provider: {
    apiGateway: {
      apiKeys: ['${param:SERVICE_NAME}-${param:STAGE}'],
      disableDefaultEndpoint: true,
    },
    apiName: '${param:SERVICE_NAME}',
    deploymentBucket: {
      name: '${param:SERVICE_NAME}-deployment',
      serverSideEncryption: 'AES256',
    },
    deploymentMethod: 'direct',
    endpointType: 'edge',
    environment: app.environment as NonNullable<AWS['provider']['environment']>,
    iam: {
      role: {
        managedPolicies: [
          'arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy',
        ],
        statements: [{ Effect: 'Allow', Action: '*', Resource: '*' }],
      },
    },
    logRetentionInDays: 5,
    logs: {
      lambda: { applicationLogLevel: 'DEBUG', logFormat: 'JSON' },
      restApi: {
        accessLogging: true,
        executionLogging: false,
        format:
          '{ "accountId": "$context.accountId", "apiId": "$context.apiId", "domainName": "$context.domainName", "domainPrefix": "$context.domainPrefix", "error": { "message": "$context.error.message", "responseType": "$context.error.responseType" }, "extendedRequestId": "$context.extendedRequestId", "httpMethod": "$context.httpMethod", "identity" { "accountId": "$context.identity.accountId", "apiKey": "$context.identity.apiKey", "caller": "$context.identity.caller", "clientCert": { "clientCertPem": "$context.identity.clientCert.clientCertPem", "subjectDN": "$context.identity.clientCert.subjectDN", "issuerDN": "$context.identity.clientCert.issuerDN", "serialNumber": "$context.identity.clientCert.serialNumber", "validity": { "notBefore": "$context.identity.clientCert.validity.notBefore", "notAfter": "$context.identity.clientCert.validity.notAfter" } }, "sourceIp": "$context.identity.sourceIp", "user": "$context.identity.user", "userArn": "$context.identity.userArn", "userAgent": "$context.identity.userAgent", }, "integration": { "latency": "$context.integration.latency" }, "path": "$context.path", "protocol": "$context.protocol", "requestId": "$context.requestId", "requestTime": "$context.requestTime", "requestTimeEpoch": "$context.requestTimeEpoch", "resourceId": "$context.resourceId", "resourcePath": "$context.resourcePath", "stage": "$context.stage", "responseLatency": "$context.responseLatency", "responseLength": "$context.responseLength", "status": "$context.status" }',
      },
    },
    memorySize: 256,
    name: 'aws',
    region: '${param:REGION}' as NonNullable<AWS['provider']['region']>,
    runtime: 'nodejs22.x',
    profile: '${param:PROFILE}',
    stackName: '${param:SERVICE_NAME}-${param:STAGE}',
    stackTags: {
      service: '${param:SERVICE_NAME}',
      stage: '${param:STAGE}',
    },
    stage: '${opt:stage, "dev"}',
    tracing: {
      apiGateway: true,
      lambda: true,
    },
    versionFunctions: false,
  },
  functions: app.buildAllServerlessFunctions() as NonNullable<AWS['functions']>,
  build: {
    esbuild: {
      bundle: true,
      // Param placeholders resolve at deploy/package time; assert to boolean for TS.
      minify: '${param:ESB_MINIFY}' as unknown as boolean,
      sourcemap: '${param:ESB_SOURCEMAP}' as unknown as boolean,
      // This keeps the AWS SDK external and trims bundles.
      exclude: ['@aws-sdk/*'],
      target: 'node22',
      platform: 'node',
      // Avoid bundling require.resolve shims
      define: {
        'require.resolve': undefined,
      },
    },
  },
};

export default config;

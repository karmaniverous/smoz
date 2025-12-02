// Ensure functions/serverless registrations are loaded via generated registers
import '@/app/generated/register.functions';
import '@/app/generated/register.serverless';

import type { AWS } from '@serverless/typescript';

import { app } from '@/app/config/app.config';
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
  stages: app.stages,
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
    environment: app.environment,
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
    // @ts-expect-error param resolves as bool
    region: '${param:REGION}',
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
  functions: app.buildAllServerlessFunctions(),
  // Minimal fixture resource import for versioned table v000.
  resources: {
    Resources: {
      // @ts-expect-error fie import resolves as table definition
      Table000: '${file(./app/tables/000/table.yml)}',
    },
  },
  build: {
    esbuild: {
      bundle: true,
      // @ts-expect-error param resolves as bool
      minify: '${param:ESB_MINIFY}',
      // @ts-expect-error param resolves as bool
      sourcemap: '${param:ESB_SOURCEMAP}',
      exclude: ['@aws-sdk/*'],
      target: 'node22',
      platform: 'node',
      define: {
        'require.resolve': undefined,
      },
    },
  },
};

export default config;

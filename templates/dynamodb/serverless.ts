import type { AWS } from '@serverless/typescript';

import { app } from '@/app/config/app.config';
/**
 * Template note:
 * - Templates do NOT commit generated register files under app/generated; they
 *   are declared via ambient types (templates/*\/types/registers.d.ts) so
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
    },
    memorySize: 256,
    name: 'aws',
    // @ts-expect-error param resolves as region
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
      // @ts-expect-error file import resolves as table definition
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

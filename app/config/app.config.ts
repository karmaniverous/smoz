/**
 * REQUIREMENTS ADDRESSED
 * - Add STAGE_NAME to the /app fixture’s stage params as a best practice for
 *   dynamic resource naming. This mirrors the template policy and supports
 *   future resources (e.g., versioned DynamoDB tables) that use
 *   ${param:STAGE_NAME} for names.
 * - Note: STAGE_NAME is seeded here and not yet consumed by the fixture’s
 *   resources; future changes may reference it in resource imports.
 */

import { z } from 'zod';

import { App, dirFromHere } from '@/src';

// Derive the app root as the parent directory of app/config/
export const appRootAbs = dirFromHere(import.meta.url, 1);

export const app = App.create({
  appRootAbs,
  globalParamsSchema: z.object({
    ESB_MINIFY: z.boolean(),
    ESB_SOURCEMAP: z.boolean(),
    PROFILE: z.string(),
    REGION: z.string(),
    SERVICE_NAME: z.string(),
  }),
  stageParamsSchema: z.object({
    DOMAIN_CERTIFICATE_ARN: z.string(),
    DOMAIN_NAME: z.string(),
    STAGE_NAME: z.string(),
    STAGE: z.string(),
  }),
  serverless: {
    httpContextEventMap: {
      my: {
        authorizer: {
          arn: '${param:COGNITO_USER_POOL_ARN}',
          name: 'UserPoolAuthorizer',
          type: 'COGNITO_USER_POOLS',
        },
      },
      private: { private: true },
      public: {},
    },
    defaultHandlerFileName: 'handler',
    defaultHandlerFileExport: 'handler',
  },
  global: {
    params: {
      ESB_MINIFY: false,
      ESB_SOURCEMAP: true,
      PROFILE: 'dev',
      REGION: 'us-east-1',
      SERVICE_NAME: 'smoz-sample',
    },
    envKeys: ['REGION', 'SERVICE_NAME'],
  },
  stage: {
    params: {
      dev: {
        DOMAIN_CERTIFICATE_ARN:
          'arn:aws:acm:us-east-1:000000000000:certificate/dev-placeholder',
        DOMAIN_NAME: 'api.dev.example.test',
        STAGE_NAME: 'smoz-sample-dev',
        STAGE: 'dev',
      },
      prod: {
        DOMAIN_CERTIFICATE_ARN:
          'arn:aws:acm:us-east-1:000000000000:certificate/prod-placeholder',
        DOMAIN_NAME: 'api.example.test',
        STAGE_NAME: 'smoz-sample-prod',
        STAGE: 'prod',
        ESB_MINIFY: true,
        ESB_SOURCEMAP: false,
      },
    },
    envKeys: ['STAGE'],
  },
});
export const { stages, environment, buildFnEnv } = app;

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { App, toPosixPath } from '@karmaniverous/smoz';
import { z } from 'zod';

// Derive the app root as the parent directory of app/config/
export const APP_ROOT_ABS = toPosixPath(
  fileURLToPath(new URL('..', import.meta.url)),
);

export const app = App.create({
  appRootAbs: APP_ROOT_ABS,
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
    STAGE: z.string(),
    STAGE_NAME: z.string(),
  }),
  serverless: {
    httpContextEventMap: {
      my: {}, // place a Cognito authorizer here if needed
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
      SERVICE_NAME: 'my-smoz-app',
    },
    envKeys: ['PROFILE', 'REGION', 'SERVICE_NAME'],
  },
  stage: {
    params: {
      dev: {
        DOMAIN_CERTIFICATE_ARN:
          'arn:aws:acm:us-east-1:000000000000:certificate/dev-placeholder',
        DOMAIN_NAME: 'api.dev.example.test',
        STAGE: 'dev',
        STAGE_NAME: 'my-smoz-app-dev',
      },
    },
    envKeys: ['STAGE'],
  },
});

export const ENDPOINTS_ROOT_REST = toPosixPath(
  join(APP_ROOT_ABS, 'functions', 'rest'),
);

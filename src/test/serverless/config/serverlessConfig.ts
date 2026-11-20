import { z } from 'zod';

import type { SecurityContextHttpEventMap } from '@/src/types/SecurityContextHttpEventMap';

/** Zod schema for implementation-wide Serverless config. */
export const serverlessConfigSchema = z.object({
  /** Context → event fragment to merge into generated http events */
  httpContextEventMap: z.custom<SecurityContextHttpEventMap>(),
  /** Used to construct default handler string if missing on a function */
  defaultHandlerFileName: z.string().min(1),
  defaultHandlerFileExport: z.string().min(1),
});

/** Implementation-wide Serverless configuration. */
export const serverlessConfig = serverlessConfigSchema.parse({
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
});

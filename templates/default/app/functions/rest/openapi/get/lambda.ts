import { z } from 'zod';

import { app } from '@/app/config/app.config';

export const responseSchema = z.unknown();

export const fn = app.defineFunction({
  // A literal eventType types the handler's event (APIGatewayProxyEvent).
  eventType: 'rest',
  functionName: 'openapi_get',
  responseSchema,
  callerModuleUrl: import.meta.url,
});

import { z } from 'zod';

import { app } from '@/app/config/app.config';

export const eventSchema = z.object({});
export const responseSchema = z.object({ ok: z.boolean() });

export const fn = app.defineFunction({
  // A literal eventType types the handler's event (APIGatewayProxyEvent).
  eventType: 'rest',
  functionName: 'hello_get',
  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
});

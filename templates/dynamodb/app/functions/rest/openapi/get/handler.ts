import type { z } from 'zod';

// Import the document from its real generated location.
// The template ships a placeholder at app/generated/openapi.json.
import openapiDoc from '@/app/generated/openapi.json';

import type { responseSchema } from './lambda';
import { fn } from './lambda';

type Response = z.infer<typeof responseSchema>;
type FnHandlerApi<T> = {
  handler: (impl: () => Promise<T> | T) => (...args: unknown[]) => Promise<T>;
};

const reg = fn as unknown as FnHandlerApi<Response>;

export const handler = reg.handler(async () => {
  // Tip: run `npm run openapi` to regenerate this file.
  // Trivial await keeps parity with prior style.
  await Promise.resolve();
  return openapiDoc as Response;
});

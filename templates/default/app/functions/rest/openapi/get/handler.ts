// Import the document from its real generated location.
// The template ships a placeholder at app/generated/openapi.json.
import openapiDoc from '@/app/generated/openapi.json';

import { fn } from './lambda';

export const handler = fn.handler(async () => {
  // Tip: run `npm run openapi` to regenerate this file.
  await Promise.resolve(); // satisfy require-await without adding complexity
  return openapiDoc;
});

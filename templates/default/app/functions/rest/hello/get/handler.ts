import { fn } from './lambda';

// The return type is checked against responseSchema.
export const handler = fn.handler(async () => {
  await Promise.resolve(); // satisfy require-await without adding complexity
  return { ok: true };
});

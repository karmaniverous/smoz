/**
 * REQUIREMENTS ADDRESSED
 * - Call makeWrapHandler with only (functionConfig, businessHandler).
 * - Eliminate wrapHandler shim and stage/global injection here.
 * - Apply HTTP middleware automatically based on eventType token.
 */
import type { z } from 'zod';

import openapi from '@/app/generated/openapi.json';

import type { responseSchema } from './lambda';
import { fn } from './lambda';
type Response = z.infer<typeof responseSchema>;
export const handler = fn.handler(async (): Promise<Response> => openapi);

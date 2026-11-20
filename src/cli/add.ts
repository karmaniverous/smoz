/**
 * SMOZ CLI: add
 *
 * Scaffold a function under app/functions.
 * Usage spec:
 * - HTTP:    `<eventType>/<segments...>/<method>`
 * - non-HTTP:`<eventType>/<segments...>`
 *
 * Creates:
 * - HTTP: lambda.ts, handler.ts, openapi.ts
 * - non-HTTP: lambda.ts, handler.ts
 *
 * Idempotent; formatted with the project's Prettier when it has one.
 */
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, join, posix } from 'node:path';

import { formatWithProjectPrettier } from '@/src/cli/util/projectPrettier';

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
  'trace',
]);

const writeIfAbsent = async (
  outFile: string,
  content: string,
): Promise<{
  created: boolean;
}> => {
  if (existsSync(outFile)) return { created: false };
  await fs.mkdir(dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, content, 'utf8');
  return { created: true };
};

/** True if a segment encodes a path param (`:id | {id} | [id]`). */
const isParamSeg = (s: string): boolean =>
  s.startsWith(':') ||
  (s.startsWith('{') && s.endsWith('}')) ||
  (s.startsWith('[') && s.endsWith(']'));

/** Extract the bare param name from a param segment. */
const getParamName = (s: string): string => {
  if (s.startsWith(':')) return s.slice(1);
  if (s.startsWith('{') && s.endsWith('}')) return s.slice(1, -1);
  if (s.startsWith('[') && s.endsWith(']')) return s.slice(1, -1);
  return s;
};

/** Normalize a segment for the filesystem (Windows‑safe). */
const toDirSeg = (s: string): string =>
  isParamSeg(s) ? `[${getParamName(s)}]` : s;
/** Normalize a segment for API paths (Serverless/OpenAPI‑native). */
const toPathSeg = (s: string): string =>
  isParamSeg(s) ? `{${getParamName(s)}}` : s;

/**
 * `lambda.ts` for a new function. `method`, `basePath`, `functionName`,
 * `httpContexts` and `contentType` derive from the folder and the app's
 * `functionDefaults`, so only real overrides are written: `basePath` when a
 * path parameter folder (`[id]`) maps to `{id}`. `eventType` is written as a
 * literal: at runtime it derives from the folder too, but only a literal
 * types the handler's event (#39 D1).
 */
const lambdaTemplate = ({
  heading,
  eventType,
  basePath,
}: {
  heading: string;
  eventType: string;
  basePath?: string | undefined;
}) => `/**
 * Registration: ${heading}
 */
import { z } from 'zod';

import { app } from '@/app/config/app.config';

export const eventSchema = z.unknown();
export const responseSchema = z.unknown();

export const fn = app.defineFunction({
  // A literal eventType types the handler's event.
  eventType: '${eventType}',
${basePath === undefined ? '' : `  // Folder [param] is served as {param}.\n  basePath: '${basePath}',\n`}  eventSchema,
  responseSchema,
  callerModuleUrl: import.meta.url,
});
`;

/**
 * `handler.ts` for a new function (HTTP or not). No casts: the event is
 * typed by `eventType` and `eventSchema`, the return value is checked
 * against `responseSchema`.
 */
const handlerTemplate = () => `/**
 * Handler: replace with your business logic.
 *
 * \`event\` is typed by eventType and eventSchema; the return value is
 * checked against responseSchema.
 */
import { fn } from './lambda';

export const handler = fn.handler(async () => {
  await Promise.resolve();
  return {};
});
`;

const openapiTemplate = ({
  params,
  pathTemplate,
}: {
  params: string[];
  pathTemplate: string;
}) => {
  const paramsBlock =
    params.length > 0
      ? `  parameters: [
${params
  .map(
    (p) =>
      `    { name: '${p}', in: 'path', required: true, schema: { type: 'string' }, description: 'Path parameter: ${p}' },`,
  )
  .join('\n')}
  ],
`
      : '';
  return `/* REQUIREMENTS
- Define OpenAPI Path Item for the new endpoint.
*/
import { eventSchema, fn, responseSchema } from './lambda';

fn.openapi({
  summary: 'Describe your endpoint',
  description: 'Describe your endpoint. Path template: ${pathTemplate}.',
${paramsBlock}  requestBody: {
    description: 'Request payload.',
    content: { 'application/json': { schema: eventSchema } },
  },
  responses: {
    200: {
      description: 'Ok',
      content: { 'application/json': { schema: responseSchema } },
    },
  },
  tags: [],
});

export {};
`;
};

export const runAdd = async (
  root: string,
  spec: string,
): Promise<{ created: string[]; skipped: string[] }> => {
  const parts = spec.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error(
      'Invalid spec. Use <eventType>/<segments...>/<method> (HTTP) or <eventType>/<segments...> (non-HTTP).',
    );
  }
  const token = parts[0]!.toLowerCase();
  const tail = parts[parts.length - 1]!.toLowerCase();
  const isHttp = HTTP_METHODS.has(tail);

  const baseParts = isHttp ? parts.slice(1, -1) : parts.slice(1);
  if (baseParts.length === 0) {
    throw new Error('Provide at least one path segment after the eventType.');
  }
  const method = isHttp ? tail : undefined;

  // Normalize param segments for path and filesystem
  const dirSegs = baseParts.map(toDirSeg);
  const pathSegs = baseParts.map(toPathSeg);

  // Base path (Serverless/OpenAPI native, uses {param})
  const basePath = pathSegs.join('/');

  // Derive path template and param names for OpenAPI hints
  const paramNames = baseParts.filter(isParamSeg).map(getParamName);
  const pathTemplate = '/' + pathSegs.join('/');

  const dir = join(
    root,
    'app',
    'functions',
    token,
    ...dirSegs,
    ...(method ? [method] : []),
  );
  const lambdaPath = join(dir, 'lambda.ts');
  const handlerPath = join(dir, 'handler.ts');
  const openapiPath = join(dir, 'openapi.ts');

  // Compute contents
  const files: Array<{ path: string; content: string; enabled: boolean }> = [];
  if (isHttp) {
    files.push({
      path: lambdaPath,
      content: lambdaTemplate({
        // In backticks: TSDoc reads a bare {param} as an inline tag.
        heading: `\`${method!.toUpperCase()} ${pathTemplate}\``,
        eventType: token,
        // Derived basePath is the folder path; write it only when it differs.
        basePath: basePath === dirSegs.join('/') ? undefined : basePath,
      }),
      enabled: true,
    });
    files.push({
      path: handlerPath,
      content: handlerTemplate(),
      enabled: true,
    });
    files.push({
      path: openapiPath,
      content: openapiTemplate({ params: paramNames, pathTemplate }),
      enabled: true,
    });
  } else {
    files.push({
      path: lambdaPath,
      content: lambdaTemplate({
        heading: `internal ${token} function`,
        eventType: token,
      }),
      enabled: true,
    });
    files.push({
      path: handlerPath,
      content: handlerTemplate(),
      enabled: true,
    });
    files.push({ path: openapiPath, content: '', enabled: false });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    if (!f.enabled) continue;
    const formatted = await formatWithProjectPrettier(root, f.path, f.content);
    const { created: c } = await writeIfAbsent(f.path, formatted);
    if (c) created.push(posix.normalize(f.path));
    else skipped.push(posix.normalize(f.path));
  }

  return { created, skipped };
};

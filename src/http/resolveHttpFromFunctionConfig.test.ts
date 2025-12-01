import { describe, expect, it } from 'vitest';

import { resolveHttpFromFunctionConfig } from '@/src/http/resolveHttpFromFunctionConfig';
import type { MethodKey } from '@/src/types/FunctionConfig';
import type { HttpContext } from '@/src/types/HttpContext';

const makePaths = (kind: 'in-root' | 'out-of-root' | 'root-get-tail') => {
  if (process.platform === 'win32') {
    const baseRoot = 'C:/tmp/sandbox';
    if (kind === 'in-root') {
      return {
        restRootAbs: `${baseRoot}/app/functions/rest`,
        callerUrl: new URL(
          `file:///C:/tmp/sandbox/app/functions/rest/users/get/lambda.ts`,
        ).href,
      };
    }
    if (kind === 'root-get-tail') {
      return {
        restRootAbs: `${baseRoot}/app/functions/rest`,
        callerUrl: new URL(
          `file:///C:/tmp/sandbox/app/functions/rest/get/lambda.ts`,
        ).href,
      };
    }
    return {
      restRootAbs: `${baseRoot}/app/functions/rest`,
      callerUrl: new URL(`file:///C:/tmp/other/place/lambda.ts`).href,
    };
  }
  // POSIX
  const baseRoot = '/tmp/sandbox';
  if (kind === 'in-root') {
    return {
      restRootAbs: `${baseRoot}/app/functions/rest`,
      callerUrl: new URL(
        `file://${baseRoot}/app/functions/rest/users/get/lambda.ts`,
      ).href,
    };
  }
  if (kind === 'root-get-tail') {
    return {
      restRootAbs: `${baseRoot}/app/functions/rest`,
      callerUrl: new URL(`file://${baseRoot}/app/functions/rest/get/lambda.ts`)
        .href,
    };
  }
  return {
    restRootAbs: `${baseRoot}/app/functions/rest`,
    callerUrl: new URL(`file://${baseRoot}/other/place/lambda.ts`).href,
  };
};

describe('resolveHttpFromFunctionConfig', () => {
  it('infers method/basePath under endpoints root and de-dupes contexts', () => {
    const p = makePaths('in-root');
    const out = resolveHttpFromFunctionConfig(
      {
        functionName: 'users_get',
        eventType: 'rest',
        // omit method/basePath to force inference
        httpContexts: [
          'public',
          'public',
          'private',
        ] as unknown as readonly HttpContext[],
      } as unknown as {
        functionName: string;
        eventType: 'rest';
        method?: MethodKey;
        basePath?: string;
        httpContexts?: readonly HttpContext[];
      },
      p.callerUrl,
      p.restRootAbs,
    );
    expect(out.method).toBe('get');
    expect(out.basePath).toBe('users');
    // unique contexts
    expect(out.contexts).toEqual(['public', 'private']);
  });

  it('throws when outside endpoints root and method is missing', () => {
    const p = makePaths('out-of-root');
    expect(() =>
      resolveHttpFromFunctionConfig(
        {
          functionName: 'x',
          eventType: 'rest',
        } as unknown as {
          functionName: string;
          eventType: 'rest';
          method?: MethodKey;
          basePath?: string;
        },
        p.callerUrl,
        p.restRootAbs,
      ),
    ).toThrow(/method missing/i);
  });

  it('throws when derived basePath is empty (caller folder == method)', () => {
    const p = makePaths('root-get-tail');
    expect(() =>
      resolveHttpFromFunctionConfig(
        {
          functionName: 'get_root',
          eventType: 'rest',
        } as unknown as {
          functionName: string;
          eventType: 'rest';
          method?: MethodKey;
          basePath?: string;
        },
        p.callerUrl,
        p.restRootAbs,
      ),
    ).toThrow(/derived basePath is empty/i);
  });
});

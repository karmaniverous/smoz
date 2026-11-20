/* REQUIREMENTS ADDRESSED (TEST)
- functionDefaults functionName and http apply with precedence explicit >
  functionDefaults > built-in.
*/
import { describe, expect, it } from 'vitest';

import type { AppHttpConfig } from '@/src/http/middleware/httpStackCustomization';
import { createLambdaContext } from '@/src/test/aws';
import {
  appRoot,
  at,
  call,
  fnsOf,
  makeApp,
  postForm,
  sawParsedBody,
} from '@/src/test/defineFunctionApp';
import {
  formParts,
  multipartBody,
  multipartContentType,
} from '@/src/test/multipart';

describe('functionDefaults', () => {
  describe('functionName', () => {
    it("'kebab' names from the segments under endpointsRootAbs", () => {
      const app = makeApp({ functionDefaults: { functionName: 'kebab' } });
      app.defineFunction({
        callerModuleUrl: at('functions/rest/user/logo/patch'),
      });
      app.defineFunction({
        callerModuleUrl: at('functions/custom/postConfirmation'),
      });
      expect(Object.keys(fnsOf(app))).toEqual([
        'user-logo-patch',
        'post-confirmation',
      ]);
    });

    it('calls a name function with eventType, segments and the default name', () => {
      const seen: unknown[] = [];
      const app = makeApp({
        functionDefaults: {
          functionName: (ctx) => {
            seen.push(ctx);
            return `svc-${ctx.segments.join('.')}`;
          },
        },
      });
      app.defineFunction({ callerModuleUrl: at('functions/rest/users/get') });
      expect(seen).toEqual([
        {
          eventType: 'rest',
          segments: ['users', 'get'],
          defaultName: 'functions_rest_users_get',
        },
      ]);
      expect(Object.keys(fnsOf(app))).toEqual(['svc-users.get']);
    });

    it('lets an explicit functionName win over the style', () => {
      const app = makeApp({ functionDefaults: { functionName: 'kebab' } });
      app.defineFunction({
        functionName: 'mine',
        callerModuleUrl: at('functions/rest/users/get'),
      });
      expect(Object.keys(fnsOf(app))).toEqual(['mine']);
    });

    it('throws when the caller is not under endpointsRootAbs', () => {
      const app = makeApp({ functionDefaults: { functionName: 'kebab' } });
      expect(() =>
        app.defineFunction({
          callerModuleUrl: at('functions/custom/job'),
          endpointsRootAbs: `${appRoot}/functions/other`,
        }),
      ).toThrow(
        /cannot apply functionDefaults\.functionName .* Pass functionName explicitly/,
      );
    });
  });

  describe('http', () => {
    const uploads: AppHttpConfig = {
      profiles: { uploads: { multipartBodyParser: {} }, plain: {} },
    };

    it('applies to a function without its own http', async () => {
      const app = makeApp({
        functionDefaults: { http: { options: { multipartBodyParser: {} } } },
      });
      const handler = app
        .defineFunction({ callerModuleUrl: at('functions/rest/form/post') })
        .handler(sawParsedBody);
      expect(await postForm(handler)).toEqual({ parsed: true });
    });

    it('shallow-merges options, function keys winning', async () => {
      const app = makeApp({
        functionDefaults: {
          http: {
            options: {
              multipartBodyParser: {},
              contentType: 'application/vnd.smoz+json',
            },
          },
        },
      });
      const optedOut = app
        .defineFunction({
          http: { options: { multipartBodyParser: false } },
          callerModuleUrl: at('functions/rest/form/post'),
        })
        .handler(sawParsedBody);
      const res = await call(optedOut, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.smoz+json',
          'Content-Type': multipartContentType,
        },
        body: multipartBody(formParts),
      });
      // Function key wins (no parsing) and the default key survives.
      expect(JSON.parse(res.body)).toEqual({ parsed: false });
      expect(res.headers['Content-Type']).toBe('application/vnd.smoz+json');
    });

    it('never overrides the profile the function selects', async () => {
      const app = makeApp({
        http: uploads,
        functionDefaults: { http: { options: { multipartBodyParser: false } } },
      });
      const chosen = app
        .defineFunction({
          http: { profile: 'uploads' },
          callerModuleUrl: at('functions/rest/a/post'),
        })
        .handler(sawParsedBody);
      const optedOut = app
        .defineFunction({
          http: {
            profile: 'uploads',
            options: { multipartBodyParser: false },
          },
          callerModuleUrl: at('functions/rest/b/post'),
        })
        .handler(sawParsedBody);
      // Profile option beats the default; the function's own option beats both.
      expect(await postForm(chosen)).toEqual({ parsed: true });
      expect(await postForm(optedOut)).toEqual({ parsed: false });
    });

    it('lets the function profile win over the default profile', async () => {
      const app = makeApp({
        http: uploads,
        functionDefaults: { http: { profile: 'plain' } },
      });
      const defaulted = app
        .defineFunction({ callerModuleUrl: at('functions/rest/a/post') })
        .handler(sawParsedBody);
      const chosen = app
        .defineFunction({
          http: { profile: 'uploads' },
          callerModuleUrl: at('functions/rest/b/post'),
        })
        .handler(sawParsedBody);
      expect(await postForm(defaulted)).toEqual({ parsed: false });
      expect(await postForm(chosen)).toEqual({ parsed: true });
    });

    it('throws at definition for an unknown functionDefaults.http.profile', () => {
      const app = makeApp({
        http: uploads,
        functionDefaults: { http: { profile: 'upload' } },
      });
      expect(() =>
        app.defineFunction({ callerModuleUrl: at('functions/rest/a/post') }),
      ).toThrow(
        `Unknown HTTP profile "upload" (functionDefaults.http.profile) on function 'functions_rest_a_post'. Known profiles: uploads, plain.`,
      );
    });

    it('is ignored by non-HTTP functions', async () => {
      // Every part of this default would break an HTTP function.
      const stack = {
        before: () => {
          throw new Error('HTTP stack ran');
        },
      };
      const app = makeApp({
        functionDefaults: {
          http: { profile: 'missing', replace: { stack } },
          contentType: 'text/plain',
        },
      });
      const handler = app
        .defineFunction({ callerModuleUrl: at('functions/sqs/tick') })
        .handler(async () => 'raw');
      expect(await handler({ Records: [] }, createLambdaContext())).toBe('raw');
      expect(() =>
        app.defineFunction({ callerModuleUrl: at('functions/rest/a/get') }),
      ).toThrow(/Unknown HTTP profile "missing"/);
    });
  });
});

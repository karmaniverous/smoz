/* REQUIREMENTS ADDRESSED (TEST)
- #41: the Cognito trigger recipe (docs-src/recipes/cognito-triggers.md)
  typechecks and works: the handler reads the parsed event, returns it with
  response, and passes response validation; extending eventSchema instead
  fails at runtime, as the recipe says.
*/
import type { PreTokenGenerationTriggerEvent } from 'aws-lambda';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  expectTypeOf,
  it,
} from 'vitest';
import { z } from 'zod';

import { createLambdaContext } from '@/src/test/aws';
import { at, makeApp } from '@/src/test/defineFunctionApp';

const savedEnv = { ...process.env };
beforeAll(() => {
  Object.assign(process.env, { REGION: 'us-east-1', STAGE: 'dev' });
});
afterAll(() => {
  process.env = savedEnv;
});

// As in the recipe.
const eventSchema = z.object({
  request: z.looseObject({
    userAttributes: z.looseObject({
      sub: z.string(),
      email_verified: z.stringbool().default(false),
    }),
  }),
});
const responseSchema = z.looseObject({
  response: z.object({
    claimsOverrideDetails: z.object({
      claimsToAddOrOverride: z.record(z.string(), z.string()),
    }),
  }),
});

const cognitoEvent = (): PreTokenGenerationTriggerEvent =>
  ({
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_x',
    userName: 'u',
    callerContext: { awsSdkVersion: 'x', clientId: 'c' },
    triggerSource: 'TokenGeneration_Authentication',
    request: {
      userAttributes: { sub: 'abc', email_verified: 'true' },
      groupConfiguration: { groupsToOverride: [] },
    },
    response: { claimsOverrideDetails: {} },
  }) as unknown as PreTokenGenerationTriggerEvent;

const define = (rs: z.ZodType) =>
  makeApp().defineFunction({
    eventType: 'cognito-userpool',
    eventSchema,
    responseSchema: rs as typeof responseSchema,
    callerModuleUrl: at('functions/cognito-userpool/preTokenGeneration'),
  });

describe('Cognito trigger recipe (#41)', () => {
  it('returns the event with response; response validation passes', async () => {
    const handler = define(responseSchema).handler(async (event) => {
      await Promise.resolve();
      const { sub, email_verified } = event.request.userAttributes;
      return {
        ...event,
        response: {
          claimsOverrideDetails: {
            claimsToAddOrOverride: {
              tenant: `tenant-${sub}`,
              verified: String(email_verified),
            },
          },
        },
      };
    });
    const out = (await handler(cognitoEvent(), createLambdaContext())) as {
      triggerSource: string;
      response: unknown;
    };
    expect(out.response).toEqual({
      claimsOverrideDetails: {
        claimsToAddOrOverride: { tenant: 'tenant-abc', verified: 'true' },
      },
    });
    // Undeclared parts of the event come back untouched.
    expect(out.triggerSource).toBe('TokenGeneration_Authentication');
  });

  it('fails with Invalid response when responseSchema extends a transforming eventSchema', async () => {
    const extended = eventSchema.extend({ response: z.looseObject({}) });
    // The types reject it: the handler has email_verified parsed (boolean),
    // the extended schema's input wants a string.
    expectTypeOf<
      z.output<
        typeof eventSchema
      >['request']['userAttributes']['email_verified']
    >().not.toExtend<
      z.input<typeof extended>['request']['userAttributes']['email_verified']
    >();
    // At runtime (typed as the recipe's schema to get past the types), every
    // invocation fails.
    const handler = define(extended).handler(async (event) => {
      await Promise.resolve();
      return {
        ...event,
        response: { claimsOverrideDetails: { claimsToAddOrOverride: {} } },
      };
    });
    await expect(
      handler(cognitoEvent(), createLambdaContext()),
    ).rejects.toThrow('Invalid response');
  });
});

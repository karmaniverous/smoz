/**
 * baseEventTypeMapSchema
 * - Schema-first companion to BaseEventTypeMap.
 * - Now includes a Step Functions event with an optional Payload wrapper.
 * - Ensures z.infer<typeof baseEventTypeMapSchema> === BaseEventTypeMap.
 *
 * @remarks * Consumers typically extend this schema when creating an App to add
 * project‑local event tokens (e.g., 'step').
 * Only tokens listed in the app’s `httpEventTypeTokens` are treated as HTTP at runtime.
 */
import type {
  ALBEvent,
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  CloudFrontRequestEvent,
  CloudWatchLogsEvent,
  CognitoUserPoolTriggerEvent,
  DynamoDBStreamEvent,
  EventBridgeEvent,
  FirehoseTransformationEvent,
  KinesisStreamEvent,
  S3Event,
  SESEvent,
  SNSEvent,
  SQSEvent,
} from 'aws-lambda';
import { z } from 'zod';

/**
 * Base event type map schema containing standard AWS Lambda event types.
 */
export const baseEventTypeMapSchema = z.object({
  /** API Gateway Proxy Event (v1). */
  rest: z.custom<APIGatewayProxyEvent>(),
  /** API Gateway Proxy Event (v2). */
  http: z.custom<APIGatewayProxyEventV2>(),
  /** Application Load Balancer Event. */
  alb: z.custom<ALBEvent>(),
  /** SQS Event. */
  sqs: z.custom<SQSEvent>(),
  /** SNS Event. */
  sns: z.custom<SNSEvent>(),
  /** S3 Event. */
  s3: z.custom<S3Event>(),
  /** DynamoDB Stream Event. */
  dynamodb: z.custom<DynamoDBStreamEvent>(),
  /** Kinesis Stream Event. */
  kinesis: z.custom<KinesisStreamEvent>(),
  /** EventBridge Event. */
  eventbridge: z.custom<EventBridgeEvent<string, unknown>>(),
  /** CloudWatch Logs Event. */
  'cloudwatch-logs': z.custom<CloudWatchLogsEvent>(),
  /** SES Event. */
  ses: z.custom<SESEvent>(),
  /** CloudFront Request Event. */
  cloudfront: z.custom<CloudFrontRequestEvent>(),
  /** Firehose Transformation Event. */
  firehose: z.custom<FirehoseTransformationEvent>(),
  /** Cognito User Pool Trigger Event. */
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Upstream AWS types mark this as deprecated; we retain the token for compatibility with existing apps.
  'cognito-userpool': z.custom<CognitoUserPoolTriggerEvent>(),
  /**
   * Step Functions → Lambda (Service Integration: Lambda Invoke)
   *
   * When Step Functions invokes Lambda via the AWS SDK integration
   * (e.g., "arn:aws:states:::lambda:invoke"), the event received by the
   * Lambda handler is an object that wraps the original input under a
   * "Payload" key. The Payload is already parsed JSON.
   *
   * Notes:
   * - We accept additional keys (e.g., StatusCode/ExecutedVersion in some
   *   patterns) via passthrough.
   * - For the common “request/response” integration where Step Functions
   *   passes state directly, apps can still treat the event via their
   *   own app-local event map if needed.
   */
  /** Step Functions Lambda Invoke Payload wrapper. */
  step: z
    .object({
      /** Payload object from the Step Function state. */
      Payload: z.unknown().optional(),
    })
    .catchall(z.unknown()),
});

/** Canonical base event map type (schema‑first). Extend the schema in your App. */
export type BaseEventTypeMap = z.infer<typeof baseEventTypeMapSchema>;
// Notes:// - This list intentionally includes widely used, generic AWS events.
// - Apps can extend the schema with custom or specialized tokens:
//     const EventMap = baseEventTypeMapSchema.extend({ step: z.custom<MyStepEvent>() })
// - Only tokens listed in your App's httpEventTypeTokens are treated as HTTP by the runtime.

/** Step Functions “Lambda Invoke” wrapper event shape exported for convenience. */
export type StepFunctionInvokeEvent = z.infer<
  typeof baseEventTypeMapSchema
>['step'];

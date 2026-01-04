/** CloudFormation GetAtt intrinsic. */
export const Arn = (resource: string) => ({ 'Fn::GetAtt': [resource, 'Arn'] });

/** DynamoDB Index ARN intrinsic (Sub). */
export const IndexArn = (tableEnv: string, indexEnv: string) => ({
  'Fn::Sub': `arn:aws:dynamodb:\${param:REGION}:\${AWS::AccountId}:table/\${param:${tableEnv}}/index/\${param:${indexEnv}}`,
});

/** Step Functions State Machine ARN intrinsic (Sub). */
export const StateMachineArn = (stateMachineNameEnv: string) => ({
  'Fn::Sub': `arn:aws:states:\${AWS::Region}:\${AWS::AccountId}:stateMachine:\${param:${stateMachineNameEnv}}`,
});

/** Standard resource name pattern. */
export const ResourceName = (name: string) =>
  `\${self:service}-\${opt:stage, "dev"}-${name}`;

/** CloudFormation Ref intrinsic. */
export const Ref = (ref: string) => ({ Ref: ref });

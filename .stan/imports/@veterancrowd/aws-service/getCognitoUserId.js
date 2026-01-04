/*
******************* DO NOT EDIT THIS NOTICE *****************
This code and all related intellectual property is owned by  
Veteran Crowd Rewards, LLC. It is not to be disclosed, copied
or used without written permission.                          
*************************************************************
*/

// Configure Cognito client.
import AWSXray from 'aws-xray-sdk';
import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';

let cip = new CognitoIdentityProvider({
  region: process.env.AWS_DEFAULT_REGION,
});

export default async (event) => {
  cip = process.env.AWS_XRAY_DAEMON_ADDRESS
    ? AWSXray.captureAWSv3Client(cip)
    : cip;

  return (
    (
      await cip.adminGetUser({
        UserPoolId: process.env.USER_POOL_ID,
        Username: event.requestContext.authorizer.claims['cognito:username'],
      })
    ).UserAttributes.find(
      (attribute) => attribute.Name === 'dev:custom:userId'
    ) ?? {}
  ).Value;
};

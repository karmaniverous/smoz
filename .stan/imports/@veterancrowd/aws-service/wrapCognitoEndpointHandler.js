/*
******************* DO NOT EDIT THIS NOTICE *****************
This code and all related intellectual property is owned by  
Veteran Crowd Rewards, LLC. It is not to be disclosed, copied
or used without written permission.                          
*************************************************************
*/

// npm imports
import _ from 'lodash';

// lib imports
import getCognitoUserId from './getCognitoUserId.js';
import wrapEndpointHandler from './wrapEndpointHandler.js';

export default (handler, { eventSchema, responseSchema, getUser } = {}) =>
  wrapEndpointHandler(
    async (event, context, logger) => {
      const userId = await getCognitoUserId(event);

      if (getUser) {
        const userResponse = await getUser({ params: { userId } });
        context.user = _.isArray(userResponse)
          ? userResponse[0]
          : userResponse.data?.[0];
      }
      context.user ??= { userId };

      logger.debug('USER CONTEXT', { userContext: context.user });

      return await handler(event, context, logger);
    },
    { eventSchema, responseSchema }
  );

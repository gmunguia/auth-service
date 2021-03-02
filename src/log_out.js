const { default: Ajv } = require("ajv");
const { compose, fromPairs, toPairs, map } = require("ramda");
const { createDynamoDb: _createDynamoDb } = require("./lib/dynamodb.js");
const { chaos } = require("./lib/chaos.js");
const {
  BadRequest,
  NotFound,
  Forbidden,
  Unauthorized,
} = require("./lib/errors.js");
const { withCors } = require("./lib/withCors.js");
const { withErrorResponse } = require("./lib/withErrorResponse.js");

const validate = (schema, value) => {
  const ajv = new Ajv();
  const valid = ajv.validate(schema, value);
  if (!valid) throw new BadRequest(ajv.errorsText());
};

const createHandler = (
  createDynamoDb = _createDynamoDb,
  tableName = process.env.TABLE_NAME
) => {
  const parseEvent = ({ pathParameters, headers }) => {
    const mapPairs = (f) => compose(fromPairs, map(f), toPairs);
    const mapKeys = (f) => mapPairs(([key, value]) => [f(key), value]);
    const normaliseHeaders = mapKeys((key) => key.toLowerCase());

    const schema = {
      type: "object",
      properties: {
        pathParameters: {
          type: "object",
          properties: {
            username: { type: "string" },
            sessionToken: { type: "string" },
          },
          required: ["username", "sessionToken"],
        },
        headers: {
          type: "object",
        },
      },
      required: ["pathParameters", "headers"],
    };
    validate(schema, {
      pathParameters,
      headers,
    });

    validate(
      {
        type: "object",
        properties: {
          authorization: { type: "string" },
        },
        required: ["authorization"],
      },
      normaliseHeaders(headers)
    );

    return {
      username: pathParameters.username,
      targetSessionToken: pathParameters.sessionToken,
      currentSessionToken: normaliseHeaders(headers).authorization,
    };
  };

  const findSession = async ({ sessionToken }) => {
    const db = createDynamoDb();

    const { Item: item } = await db.get({
      TableName: tableName,
      Key: {
        PK: sessionToken,
        SK: sessionToken,
      },
    });

    return item;
  };

  const deleteSession = async ({ sessionToken }) => {
    const db = createDynamoDb();

    await db.delete({
      TableName: tableName,
      Key: {
        PK: sessionToken,
        SK: sessionToken,
      },
      ConditionExpression: "attribute_exists(PK)",
    });

    return sessionToken;
  };

  const handleEvent = async (event) => {
    chaos();

    const { currentSessionToken, targetSessionToken, username } = parseEvent(
      event
    );
    const currentSession = await findSession({
      sessionToken: currentSessionToken,
    });
    if (currentSession == null) {
      throw new Unauthorized("You need to set a valid Authorization header");
    }
    if (currentSession.username !== username) {
      throw new Forbidden("You cannot access the requested resource");
    }

    const targetSession = await findSession({
      sessionToken: targetSessionToken,
    });
    if (targetSession == null || targetSession.username !== username) {
      throw new NotFound("Cannot find session to delete");
    }

    await deleteSession({ sessionToken: targetSessionToken });

    return {
      statusCode: 204,
    };
  };

  return handleEvent;
};

module.exports.handler = withCors(withErrorResponse(createHandler()));

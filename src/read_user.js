const { inspect } = require("util");
const { default: Ajv } = require("ajv");
const { compose, fromPairs, toPairs, map } = require("ramda");
const { createDynamoDb: _createDynamoDb } = require("./lib/dynamodb.js");
const { chaos } = require("./lib/chaos.js");
const {
  BadRequest,
  NotFound,
  Unauthorized,
  Forbidden,
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
  const mapPairs = (f) => compose(fromPairs, map(f), toPairs);
  const mapKeys = (f) => mapPairs(([key, value]) => [f(key), value]);
  const normaliseHeaders = mapKeys((key) => key.toLowerCase());

  const parseEvent = ({ pathParameters, requestContext, headers }) => {
    const schema = {
      type: "object",
      properties: {
        pathParameters: {
          type: "object",
          properties: {
            username: { type: "string" },
          },
          required: ["username"],
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
      sessionToken: normaliseHeaders(headers).authorization,
      requestTime: new Date(requestContext.requestTimeEpoch),
    };
  };

  const findUser = async ({ username }) => {
    const db = createDynamoDb();

    const { Item: item } = await db.get({
      TableName: tableName,
      Key: {
        PK: username,
        SK: username,
      },
    });

    return item;
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

  const handleEvent = async (event) => {
    try {
      chaos();

      const { username, sessionToken } = parseEvent(event);

      const session = await findSession({ sessionToken });
      if (session == null) {
        throw new Unauthorized("A valid Authorization header must be provided");
        // TODO WWW-Authenticate token. see https://tools.ietf.org/html/rfc6749#section-5.2
      }
      if (session.username !== username) {
        throw new Forbidden("You cannot access the requested resource");
      }

      const user = await findUser({ username });
      if (user == null) {
        throw new NotFound("User not found");
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ username, firstName: user.firstName }),
        headers: {
          "content-type": "application/json",
        },
      };
    } catch (error) {
      console.error(inspect(event, { depth: 3 }));
      console.error(error);
      return {
        statusCode: error.code || 500,
        body: JSON.stringify({
          details: error.publicDetails || "Unkown error",
        }),
        headers: {
          "content-type": "application/json",
        },
      };
    }
  };

  return handleEvent;
};

module.exports.handler = withCors(withErrorResponse(createHandler()));

const { inspect } = require("util");
const bcrypt = require("bcryptjs");
const { default: Ajv } = require("ajv");
const { createDynamoDb: _createDynamoDb } = require("./lib/dynamodb.js");
const { chaos } = require("./lib/chaos.js");
const { BadRequest } = require("./lib/errors.js");

const validate = (schema, value) => {
  const ajv = new Ajv();
  const valid = ajv.validate(schema, value);
  if (!valid) throw new BadRequest(ajv.errorsText());
};

const createHandler = (
  createDynamoDb = _createDynamoDb,
  tableName = process.env.TABLE_NAME
) => {
  const parseEvent = ({ pathParameters, body, requestContext }) => {
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
        body: { type: "string" },
      },
      required: ["pathParameters", "body"],
    };
    validate(schema, {
      pathParameters,
      body,
    });

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (error) {
      throw new BadRequest("Body must contain valid JSON");
    }

    validate(
      {
        type: "object",
        properties: {
          firstName: { type: "string" },
          password: { type: "string" },
        },
        required: ["firstName", "password"],
      },
      parsedBody
    );

    return {
      username: pathParameters.username,
      firstName: parsedBody.firstName,
      password: parsedBody.password,
      requestTime: new Date(requestContext.requestTimeEpoch),
    };
  };

  const writeUser = async ({ username, firstName, password, requestTime }) => {
    const db = createDynamoDb();

    const item = {
      PK: username,
      SK: username,
      username,
      firstName,
      password,
      createdAt: requestTime.toISOString(),
    };

    // TODO throw 409 if user already exists.
    await db.put({
      TableName: tableName,
      Item: item,
    });
  };

  const handleEvent = async (event) => {
    try {
      chaos();

      const { username, firstName, password, requestTime } = parseEvent(event);
      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);
      await writeUser({ username, firstName, password: hash, requestTime });

      return {
        statusCode: 201,
        body: JSON.stringify({
          username,
          firstName,
        }),
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
      };
    }
  };

  return handleEvent;
};

module.exports.handler = createHandler();

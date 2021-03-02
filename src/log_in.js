const bcrypt = require("bcryptjs");
const { default: Ajv } = require("ajv");
const { v4: uuid } = require("uuid");
const { createDynamoDb: _createDynamoDb } = require("./lib/dynamodb.js");
const { chaos } = require("./lib/chaos.js");
const { BadRequest, NotFound } = require("./lib/errors.js");
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
          password: { type: "string" },
        },
        required: ["password"],
      },
      parsedBody
    );

    return {
      username: pathParameters.username,
      password: parsedBody.password,
      requestTime: new Date(requestContext.requestTimeEpoch),
    };
  };

  const findUser = async ({ username, password }) => {
    const db = createDynamoDb();

    const { Item: item } = await db.get({
      TableName: tableName,
      Key: {
        PK: username,
        SK: username,
      },
    });

    if (!(await bcrypt.compare(password, item.password))) return;

    return item;
  };

  const createSession = async ({ username, requestTime }) => {
    const db = createDynamoDb();

    const sessionToken = uuid();
    const item = {
      PK: sessionToken,
      SK: sessionToken,
      username,
      createdAt: requestTime.toISOString(),
    };

    await db.put({
      TableName: tableName,
      Item: item,
    });

    return sessionToken;
  };

  const handleEvent = async (event) => {
    chaos();

    const { username, password, requestTime } = parseEvent(event);
    const user = await findUser({ username, password });
    if (user == null) {
      throw new NotFound("User not found");
    }

    const sessionToken = await createSession({
      username,
      requestTime,
    });

    return {
      statusCode: 201,
      body: JSON.stringify({ sessionToken }),
      headers: {
        "content-type": "application/json",
      },
    };
  };

  return handleEvent;
};

module.exports.handler = withCors(withErrorResponse(createHandler()));

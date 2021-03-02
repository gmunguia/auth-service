const { inspect } = require("util");
const fastRedact = require("fast-redact");

const redact = fastRedact({
  paths: ["*.password"],
  serialize: (o) => inspect(o, { depth: 3 }),
});

const safeParse = (string) => {
  try {
    return JSON.parse(string);
  } catch (error) {
    return "invalid JSON";
  }
};

module.exports.withErrorResponse = (handler) => async (event, context) => {
  try {
    return await handler(event, context);
  } catch (error) {
    console.error(redact({ ...event, body: safeParse(event.body) }));
    console.error(error);
    return {
      statusCode: error.code || 500,
      body: JSON.stringify({
        details: error.publicDetails || "Unkown error",
      }),
    };
  }
};

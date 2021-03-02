const { inspect } = require("util");

module.exports.withErrorResponse = (handler) => async (event, context) => {
  try {
    return await handler(event, context);
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

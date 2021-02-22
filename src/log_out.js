const { inspect } = require("util");
const { chaos } = require("./lib/chaos.js");

const createHandler = () => {
  const handleEvent = async (event) => {
    try {
      chaos();

      return {
        statusCode: 204,
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

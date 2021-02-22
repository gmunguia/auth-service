const { Chaos } = require("./errors");

module.exports.chaos = (errorRate = process.env.ERROR_RATE) => {
  if (Math.random() < Number(errorRate)) throw new Chaos();
};

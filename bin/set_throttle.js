const aws = require("aws-sdk");

(async () => {
  // TODO Extract from cloudformation outputs.
  const API_NAME = "development-auth";
  const STAGE_NAME = "development";

  var apigateway = new aws.APIGateway();

  const { items } = await apigateway.getRestApis().promise();
  const api = items.find((item) => item.name === API_NAME);
  if (!api) throw Error("couldn't find api");

  await apigateway
    .updateStage({
      restApiId: api.id,
      stageName: STAGE_NAME,
      patchOperations: [
        {
          op: "replace",
          path: "/*/*/throttling/burstLimit",
          value: "2",
        },
        {
          op: "replace",
          path: "/*/*/throttling/rateLimit",
          value: "1",
        },
      ],
    })
    .promise();
})();

const corsHeaders = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Origin": "*",
};

module.exports.withCors = (handler) => async (event, context) => {
  const { statusCode, headers, body } = await handler(event, context);
  return {
    statusCode,
    body,
    headers: {
      ...headers,
      ...corsHeaders,
    },
  };
};

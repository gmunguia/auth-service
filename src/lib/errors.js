class Chaos extends Error {
  constructor() {
    super("Artificial error");
    const numberOfOgres = Math.floor(Math.random() * 10) + 1;
    const stringOfOgres = Array.from(Array(numberOfOgres), () => "👹").join("");
    this.publicDetails = stringOfOgres;
  }
}

class HttpError extends Error {}

class BadRequest extends HttpError {
  constructor(publicDetails) {
    super("Bad request");
    this.code = 400;
    this.publicDetails = publicDetails;
  }
}

class NotFound extends HttpError {
  constructor(publicDetails) {
    super("Not found");
    this.code = 404;
    this.publicDetails = publicDetails;
  }
}

class Unauthorized extends HttpError {
  constructor(publicDetails) {
    super("Unauthorized");
    this.code = 401;
    this.publicDetails = publicDetails;
  }
}

class Forbidden extends HttpError {
  constructor(publicDetails) {
    super("Forbidden");
    this.code = 403;
    this.publicDetails = publicDetails;
  }
}

class Conflict extends HttpError {
  constructor(publicDetails) {
    super("Conflict");
    this.code = 409;
    this.publicDetails = publicDetails;
  }
}

module.exports.HttpError = HttpError;
module.exports.BadRequest = BadRequest;
module.exports.NotFound = NotFound;
module.exports.Unauthorized = Unauthorized;
module.exports.Forbidden = Forbidden;
module.exports.Conflict = Conflict;
module.exports.Chaos = Chaos;

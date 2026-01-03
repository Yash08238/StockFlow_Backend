const jwt = require("jsonwebtoken");
const config = require("../config/config");
const errorResponse = require("../responses/errorResponse");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res
      .status(403)
      .json({ status: "error", message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // Bearer <token>
  if (!token) {
    return res
      .status(403)
      .json({ status: "error", message: "Malformed token" });
  }

  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ status: "error", message: "Unauthorized: Invalid token" });
    }
    req.user = decoded; // { userId: ..., username: ... }
    next();
  });
};

module.exports = verifyToken;

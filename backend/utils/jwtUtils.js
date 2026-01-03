const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/config");

const verifyResetToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

const generateResetToken = (email) => {
  return jwt.sign({ email, type: "reset" }, jwtSecret, { expiresIn: "1h" });
};

module.exports = {
  verifyResetToken,
  generateResetToken,
};

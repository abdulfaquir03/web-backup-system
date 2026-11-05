require("dotenv").config()
const jwt = require('jsonwebtoken')

const authentication = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.redirect("/authentication");
  }

  jwt.verify(token, process.env.CHAVE_SECRETA, (error, decoded) => {
    if (error) {
      return res.redirect("/authentication");
    }

    req.user = { id: decoded.id || decoded.userId || decoded, role:  decoded.role};
    next();
  });
};

module.exports = { authentication }
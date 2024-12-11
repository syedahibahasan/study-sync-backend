import expressJwtPackage from "express-jwt";
const { expressjwt } = expressJwtPackage;
import dotenv from "dotenv";
dotenv.config();

// Middleware to validate token
// export const validateJwt = expressjwt({
//   secret: process.env.JWT_SECRET,
//   algorithms: ["HS256"],
//   requestProperty: "auth", // this is where the decoded token will be stored
// });

// export default validateJwt;
export const validateJwt = [
  expressjwt({
    secret: process.env.JWT_SECRET,
    algorithms: ["HS256"],
    requestProperty: "auth",
  }),
  (req, res, next) => {
    if (req.auth) {
      req.user = req.auth; // Map the decoded token to req.user for consistency
    }
    next();
  },
];

export default validateJwt;


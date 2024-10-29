import expressJwtPackage from "express-jwt";
const { expressjwt } = expressJwtPackage;
import dotenv from "dotenv";
dotenv.config();

// Middleware to validate token
export const validateJwt = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
  requestProperty: "auth", // this is where the decoded token will be stored
});

export default validateJwt;

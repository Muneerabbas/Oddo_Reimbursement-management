import dotenv from "dotenv";

dotenv.config({ path: ".env" });

if (!process.env.PORT) process.env.PORT = "3999";
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "vitest-default-jwt-secret";

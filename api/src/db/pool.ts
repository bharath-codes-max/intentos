import postgres from "postgres";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check your .env file");
}

export const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
});

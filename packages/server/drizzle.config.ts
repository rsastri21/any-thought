import { config as dotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv({
    path: "../../.env",
});

export default defineConfig({
    out: "./src/db/migrations",
    schema: "./src/db/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});

import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique(),
  name: varchar("name", { length: 256 }).notNull(),
  email: text("email"), // Optional, required for password reset
  password: text("password").notNull(),
  salt: text("salt").notNull(),
  image: text("image").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

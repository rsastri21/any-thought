import { relations } from "drizzle-orm";
import { pgEnum, pgTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
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

export const usersRelations = relations(users, ({ many }) => ({
  friends: many(friends),
  friendRequests: many(friendRequests),
}));

export const friends = pgTable(
  "friends",
  {
    userIdLeft: text("user_id_left")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userIdRight: text("user_id_right")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userIdLeft, t.userIdRight] })],
);

export const friendsRelations = relations(friends, ({ one }) => ({
  userLeft: one(users, {
    fields: [friends.userIdLeft],
    references: [users.id],
  }),
  userRight: one(users, {
    fields: [friends.userIdRight],
    references: [users.id],
  }),
}));

export const friendRequestStatus = pgEnum("friend_request_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const friendRequests = pgTable(
  "friendRequests",
  {
    requester: text("requester")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestee: text("requestee")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendRequestStatus(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.requester, t.requestee] })],
);

export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
  requester: one(users, {
    fields: [friendRequests.requester],
    references: [users.id],
  }),
  requestee: one(users, {
    fields: [friendRequests.requestee],
    references: [users.id],
  }),
}));

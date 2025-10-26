import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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
  friends: many(friends, { relationName: "friends" }),
  friendRequests: many(friendRequests, { relationName: "friendRequests" }),
  posts: many(posts),
  assets: many(assets),
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
    status: friendRequestStatus().notNull(),
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

export const assetStatus = pgEnum("asset_status", ["processing", "active"]);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  author: text("author")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  caption: text("caption"),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const postsRelations = relations(posts, ({ many, one }) => ({
  author: one(users, {
    fields: [posts.author],
    references: [users.id],
  }),
  assets: many(assets),
}));

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
  url: text("url").notNull(),
  status: assetStatus().notNull().default("processing"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

export const assetsRelations = relations(assets, ({ one }) => ({
  posts: one(posts, {
    fields: [assets.postId],
    references: [posts.id],
  }),
  users: one(users, {
    fields: [assets.userId],
    references: [users.id],
  }),
}));

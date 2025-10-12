import { Schema } from "effect";
import { User } from "./User.js";
import { HttpApiSchema } from "@effect/platform";

export class FriendNotFoundError extends Schema.TaggedError<FriendNotFoundError>(
  "FriendNotFoundError",
)(
  "FriendNotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 404 }),
) { }

export class FriendAlreadyExistsError extends Schema.TaggedError<FriendAlreadyExistsError>(
  "FriendAlreadyExistsError",
)(
  "FriendAlreadyExistsError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 400 }),
) { }

export class FriendRelationship extends Schema.Class<FriendRelationship>("FriendRelationship")({
  userIdLeft: User.fields.id,
  userIdRight: User.fields.id,
  createdAt: Schema.DateTimeUtcFromDate,
}) { }

export class FriendRequest extends Schema.Class<FriendRequest>("FriendRequest")({
  requester: User.fields.id,
  requestee: User.fields.id,
  status: Schema.Literal("pending", "accepted", "rejected"),
  createdAt: Schema.DateTimeUtcFromDate,
}) { }

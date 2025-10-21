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
) {}

export class FriendAlreadyExistsError extends Schema.TaggedError<FriendAlreadyExistsError>(
  "FriendAlreadyExistsError",
)(
  "FriendAlreadyExistsError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 400 }),
) {}

export class FriendRequestNotFoundError extends Schema.TaggedError<FriendRequestNotFoundError>(
  "FriendRequestNotFoundError",
)(
  "FriendRequestNotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 404 }),
) {}

export class FriendRequestAlreadyExistsError extends Schema.TaggedError<FriendRequestAlreadyExistsError>(
  "FriendRequestAlreadyExistsError",
)(
  "FriendRequestAlreadyExistsError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 400 }),
) {}

export class FriendRelationship extends Schema.Class<FriendRelationship>("FriendRelationship")({
  userIdLeft: User.fields.id,
  userIdRight: User.fields.id,
  createdAt: Schema.DateTimeUtcFromDate,
}) {}

export class RemoveFriendRelationshipPayload extends Schema.Class<RemoveFriendRelationshipPayload>(
  "RemoveFriendRelationshipPayload",
)({
  userIdLeft: FriendRelationship.fields.userIdLeft,
  userIdRight: FriendRelationship.fields.userIdRight,
}) {}

export const FriendRequestStatus = Schema.Literal("pending", "accepted", "rejected");
export const FriendRequestQueryMode = Schema.Literal("to", "from");

export class FriendRequestKey extends Schema.Class<FriendRequestKey>("FriendRequestKey")({
  requester: User.fields.id,
  requestee: User.fields.id,
}) {}

export class FriendRequestUpdate extends FriendRequestKey.extend<FriendRequestUpdate>(
  "FriendRequestUpdate",
)({
  status: FriendRequestStatus,
}) {}

export class FriendRequest extends FriendRequestKey.extend<FriendRequest>("FriendRequest")({
  status: FriendRequestStatus,
  createdAt: Schema.DateTimeUtcFromDate,
}) {}

export class CreateFriendRequestPayload extends FriendRequestUpdate.extend<CreateFriendRequestPayload>(
  "CreateFriendRequestPayload",
)({}) {}

export const EngageRequestAction = Schema.Literal("accept", "reject");

export class EngageFriendRequestPayload extends FriendRequestKey.extend<EngageFriendRequestPayload>(
  "EngageFriendRequestPayload",
)({
  action: EngageRequestAction,
}) {}

export const EngageFriendRequestResponse = Schema.Tuple(
  FriendRequest,
  Schema.Option(FriendRelationship),
);

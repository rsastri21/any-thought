import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import {
  CreateFriendRequestPayload,
  EngageFriendRequestPayload,
  EngageFriendRequestResponse,
  FriendAlreadyExistsError,
  FriendNotFoundError,
  FriendRelationship,
  FriendRequest,
  FriendRequestAlreadyExistsError,
  FriendRequestKey,
  FriendRequestNotFoundError,
  FriendRequestQueryMode,
  FriendRequestStatus,
  RemoveFriendRelationshipPayload,
} from "../models/Friends.js";
import { Schema } from "effect";
import { Authorization } from "../middlewares/AuthMiddleware.js";

export class FriendsGroup extends HttpApiGroup.make("friends")
  .add(
    HttpApiEndpoint.post("new-request", "/new-request")
      .setPayload(CreateFriendRequestPayload)
      .addSuccess(FriendRequest)
      .addError(FriendRequestAlreadyExistsError),
  )
  .add(
    HttpApiEndpoint.post("engage-request", "/engage-request")
      .setPayload(EngageFriendRequestPayload)
      .addSuccess(EngageFriendRequestResponse)
      .addError(FriendRequestNotFoundError)
      .addError(FriendAlreadyExistsError),
  )
  .add(
    HttpApiEndpoint.del("delete-request", "/delete-request")
      .setPayload(FriendRequestKey)
      .addSuccess(FriendRequest)
      .addError(FriendRequestNotFoundError),
  )
  .add(
    HttpApiEndpoint.get("list-requests", "/list-requests")
      .setUrlParams(Schema.Struct({ mode: FriendRequestQueryMode, status: FriendRequestStatus }))
      .addSuccess(Schema.Array(FriendRequest)),
  )
  .add(HttpApiEndpoint.get("list", "/list").addSuccess(Schema.Array(FriendRelationship)))
  .add(
    HttpApiEndpoint.del("remove", "/remove")
      .setPayload(RemoveFriendRelationshipPayload)
      .addSuccess(FriendRelationship)
      .addError(FriendNotFoundError),
  )
  .middleware(Authorization)
  .prefix("/friends") {}

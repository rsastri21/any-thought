import { HttpApiBuilder } from "@effect/platform";
import { DomainApi } from "@org/domain/domain-api";
import { DateTime, Effect } from "effect";
import { FriendService } from "../services/friends-service.js";
import { FriendRequest } from "@org/domain/models/Friends";
import { CurrentUser } from "@org/domain/middlewares/AuthMiddleware";
import { Unauthorized } from "@effect/platform/HttpApiError";

export const FriendsLive = HttpApiBuilder.group(
  DomainApi,
  "friends",
  Effect.fnUntraced(function* (handlers) {
    const friendService = yield* FriendService;

    return handlers
      .handle("new-request", (request) =>
        Effect.gen(function* () {
          const now = yield* DateTime.now;
          return yield* friendService.createFriendRequest(
            new FriendRequest({ ...request.payload, createdAt: now }),
          );
        }),
      )
      .handle("engage-request", (request) => friendService.engageFriendRequest(request.payload))
      .handle("delete-request", (request) => friendService.deleteFriendRequest(request.payload))
      .handle("list-requests", (request) =>
        Effect.gen(function* () {
          const currentUser = yield* CurrentUser;
          return yield* friendService.listFriendRequests({
            userId: currentUser.id,
            status: request.urlParams.status,
            mode: request.urlParams.mode,
          });
        }),
      )
      .handle("list", () =>
        Effect.gen(function* () {
          const currentUser = yield* CurrentUser;
          return yield* friendService.listFriends(currentUser.id);
        }),
      )
      .handle("remove", (request) =>
        Effect.gen(function* () {
          const currentUser = yield* CurrentUser;
          if (
            request.payload.userIdLeft !== currentUser.id &&
            request.payload.userIdRight !== currentUser.id
          ) {
            return yield* Effect.fail(new Unauthorized());
          }
          return yield* friendService.removeFriend(request.payload);
        }),
      );
  }),
);

import { DateTime, Effect, Match, Option } from "effect";
import { FriendRepository } from "../repositories/friend-repository.js";
import { FriendRequestRepository } from "../repositories/friend-request-repository.js";
import {
  FriendRelationship,
  FriendRequestUpdate,
  type FriendRequestStatus,
  type FriendRequest,
} from "@org/domain/models/Friends";
import type { User } from "@org/domain/models/User";

type EngageRequestAction = "accept" | "reject";

export class FriendService extends Effect.Service<FriendService>()("FriendService", {
  dependencies: [FriendRepository.Default, FriendRequestRepository.Default],
  effect: Effect.gen(function* () {
    const friendRepo = yield* FriendRepository;
    const friendRequestRepo = yield* FriendRequestRepository;

    const createFriendRequest = Effect.fn("FriendService.createFriendRequest")(function* (
      input: typeof FriendRequest.Type,
    ) {
      return yield* friendRequestRepo.create(input);
    });

    const engageFriendRequest = Effect.fn("FriendService.engageFriendRequest")(function* (input: {
      requester: typeof FriendRequest.fields.requester.Type;
      requestee: typeof FriendRequest.fields.requestee.Type;
      action: EngageRequestAction;
    }) {
      const engageActionMatcher = Match.type<EngageRequestAction>().pipe(
        Match.when("accept", function* () {
          const now = yield* DateTime.now;
          const [friendRequest, friend] = yield* Effect.all(
            [
              friendRequestRepo.update(
                FriendRequestUpdate.make({
                  requester: input.requester,
                  requestee: input.requestee,
                  status: "accepted",
                }),
              ),
              friendRepo.create(
                FriendRelationship.make({
                  userIdLeft: input.requester,
                  userIdRight: input.requestee,
                  createdAt: now,
                }),
              ),
            ],
            { concurrency: "unbounded" },
          );
          return [friendRequest, Option.some(friend)] as const;
        }),
        Match.when("reject", function* () {
          const friendRequest = yield* friendRequestRepo.update(
            FriendRequestUpdate.make({
              requester: input.requester,
              requestee: input.requestee,
              status: "rejected",
            }),
          );
          return [friendRequest, Option.none<typeof FriendRelationship.Type>()] as const;
        }),
        Match.exhaustive,
      );

      return yield* engageActionMatcher(input.action);
    });

    const deleteFriendRequest = Effect.fn("FriendService.deleteFriendRequest")(function* (input: {
      requester: typeof FriendRequest.fields.requester.Type;
      requestee: typeof FriendRequest.fields.requestee.Type;
    }) {
      return yield* friendRequestRepo.del(input);
    });

    const listFriendRequests = Effect.fn("FriendService.listFriendRequests")(function* (input: {
      userId: typeof User.fields.id.Type;
      status: typeof FriendRequestStatus.Type;
      mode: "to" | "from";
    }) {
      const args = { userId: input.userId, status: input.status };
      const listFriendRequestMatcher = Match.type<"to" | "from">().pipe(
        Match.when("to", () => friendRequestRepo.findRequestsToUser(args)),
        Match.when("from", () => friendRequestRepo.findRequestsFromUser(args)),
        Match.exhaustive,
      );
      return yield* listFriendRequestMatcher(input.mode);
    });

    const listFriends = Effect.fn("FriendService.listFriends")(function* (
      input: typeof User.fields.id.Type,
    ) {
      return yield* friendRepo.findFriendById(input);
    });

    const removeFriend = Effect.fn("FriendService.removeFriend")(function* (input: {
      userIdLeft: typeof User.fields.id.Type;
      userIdRight: typeof User.fields.id.Type;
    }) {
      return yield* friendRepo.del(input);
    });

    return {
      createFriendRequest,
      engageFriendRequest,
      deleteFriendRequest,
      listFriendRequests,
      listFriends,
      removeFriend,
    } as const;
  }),
}) {}

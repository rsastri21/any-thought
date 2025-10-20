import { Array, Effect, Schema } from "effect";
import { DatabaseService } from "../db/database.js";
import {
  FriendRequest,
  FriendRequestUpdate,
  FriendRequestAlreadyExistsError,
  FriendRequestNotFoundError,
} from "@org/domain/models/Friends";
import { DbSchema } from "../db/index.js";
import { and, eq } from "drizzle-orm";

export class FriendRequestRepository extends Effect.Service<FriendRequestRepository>()(
  "FriendRequestRepository",
  {
    dependencies: [DatabaseService.Default],
    effect: Effect.gen(function* () {
      const db = yield* DatabaseService;

      const create = db.makeQuery((execute, input: typeof FriendRequest.Type) =>
        execute((client) =>
          client
            .insert(DbSchema.friendRequests)
            .values(Schema.encodeUnknownSync(FriendRequest)(input))
            .returning(),
        ).pipe(
          Effect.flatMap(Array.head),
          Effect.flatMap(Schema.decode(FriendRequest)),
          Effect.catchTags({
            DatabaseError: (error) =>
              error.type === "unique_violation"
                ? Effect.fail(
                    new FriendRequestAlreadyExistsError({
                      message: "Friend request already exists.",
                    }),
                  )
                : Effect.die(error),
            NoSuchElementException: () => Effect.die(""),
            ParseError: Effect.die,
          }),
          Effect.withSpan("FriendRequestRepository.create"),
        ),
      );

      const update = db.makeQuery((execute, input: typeof FriendRequestUpdate.Type) =>
        execute((client) =>
          client
            .update(DbSchema.friendRequests)
            .set(Schema.encodeUnknownSync(FriendRequestUpdate)(input))
            .where(
              and(
                eq(DbSchema.friendRequests.requester, input.requester),
                eq(DbSchema.friendRequests.requestee, input.requestee),
              ),
            )
            .returning(),
        ).pipe(
          Effect.flatMap(Array.head),
          Effect.flatMap(Schema.decode(FriendRequest)),
          Effect.catchTags({
            DatabaseError: Effect.die,
            NoSuchElementException: () =>
              new FriendRequestNotFoundError({
                message: `No friend request for requester: ${input.requester} and requestee ${input.requestee}.`,
              }),
            ParseError: Effect.die,
          }),
          Effect.withSpan("FriendRequestRepository.update"),
        ),
      );

      const findAll = db.makeQuery((execute) =>
        execute((client) => client.query.friendRequests.findMany()).pipe(
          Effect.flatMap(Schema.decode(Schema.Array(FriendRequest))),
          Effect.catchTags({
            DatabaseError: Effect.die,
            ParseError: Effect.die,
          }),
          Effect.withSpan("FriendRequestRepository.findAll"),
        ),
      );

      const findRequestsToUser = db.makeQuery(
        (
          execute,
          input: {
            userId: typeof FriendRequest.fields.requestee.Type;
            status: typeof FriendRequest.fields.status.Type;
          },
        ) =>
          execute((client) =>
            client.query.friendRequests.findMany({
              where: and(
                eq(DbSchema.friendRequests.requestee, input.userId),
                eq(DbSchema.friendRequests.status, input.status),
              ),
            }),
          ).pipe(
            Effect.flatMap(Schema.decode(Schema.Array(FriendRequest))),
            Effect.catchTags({
              DatabaseError: Effect.die,
              ParseError: Effect.die,
            }),
            Effect.withSpan("FriendRequestRepository.findRequestsToUser"),
          ),
      );

      const findRequestsFromUser = db.makeQuery(
        (
          execute,
          input: {
            userId: typeof FriendRequest.fields.requester.Type;
            status: typeof FriendRequest.fields.status.Type;
          },
        ) =>
          execute((client) =>
            client.query.friendRequests.findMany({
              where: and(
                eq(DbSchema.friendRequests.requester, input.userId),
                eq(DbSchema.friendRequests.status, input.status),
              ),
            }),
          ).pipe(
            Effect.flatMap(Schema.decode(Schema.Array(FriendRequest))),
            Effect.catchTags({
              DatabaseError: Effect.die,
              ParseError: Effect.die,
            }),
            Effect.withSpan("FriendRequestRepository.findRequestsFromUser"),
          ),
      );

      const del = db.makeQuery(
        (
          execute,
          input: {
            requester: typeof FriendRequest.fields.requester.Type;
            requestee: typeof FriendRequest.fields.requestee.Type;
          },
        ) =>
          execute((client) =>
            client
              .delete(DbSchema.friendRequests)
              .where(
                and(
                  eq(DbSchema.friendRequests.requester, input.requester),
                  eq(DbSchema.friendRequests.requestee, input.requestee),
                ),
              )
              .returning(),
          ).pipe(
            Effect.flatMap(Array.head),
            Effect.flatMap(Schema.decode(FriendRequest)),
            Effect.catchTags({
              DatabaseError: Effect.die,
              NoSuchElementException: () =>
                new FriendRequestNotFoundError({
                  message: `Friend request with users ${input} not found.`,
                }),
              ParseError: Effect.die,
            }),
            Effect.withSpan("FriendRequestRepository.del"),
          ),
      );

      return {
        create,
        update,
        findAll,
        findRequestsToUser,
        findRequestsFromUser,
        del,
      } as const;
    }),
  },
) {}

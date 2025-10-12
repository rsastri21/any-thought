import {
  FriendAlreadyExistsError,
  FriendNotFoundError,
  FriendRelationship,
} from "@org/domain/models/Friends";
import type { User } from "@org/domain/models/User";
import { and, eq, or } from "drizzle-orm";
import { Array, Effect, Schema } from "effect";
import { DatabaseService } from "../db/database.js";
import { DbSchema } from "../db/index.js";

export class FriendRepository extends Effect.Service<FriendRepository>()("FriendRepository", {
  dependencies: [DatabaseService.Default],
  effect: Effect.gen(function*() {
    const db = yield* DatabaseService;

    const create = db.makeQuery((execute, input: typeof FriendRelationship.Type) =>
      execute((client) =>
        client
          .insert(DbSchema.friends)
          .values(Schema.encodeUnknownSync(FriendRelationship)(input))
          .returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(FriendRelationship)),
        Effect.catchTags({
          DatabaseError: (error) =>
            error.type === "unique_violation"
              ? Effect.fail(
                new FriendAlreadyExistsError({ message: "Friend relationship already exists." }),
              )
              : Effect.die(error),
          NoSuchElementException: () => Effect.die(""),
          ParseError: Effect.die,
        }),
        Effect.withSpan("FriendRepository.create"),
      ),
    );

    const findAll = db.makeQuery((execute) =>
      execute((client) => client.query.friends.findMany()).pipe(
        Effect.flatMap(Schema.decode(Schema.Array(FriendRelationship))),
        Effect.catchTags({
          DatabaseError: Effect.die,
          ParseError: Effect.die,
        }),
        Effect.withSpan("FriendRepository.findAll"),
      ),
    );
    const findFriendById = db.makeQuery((execute, input: typeof User.fields.id.Type) =>
      execute((client) =>
        client.query.friends.findMany({
          where: or(
            eq(DbSchema.friends.userIdLeft, input),
            eq(DbSchema.friends.userIdRight, input),
          ),
        }),
      ).pipe(
        Effect.flatMap(Schema.decode(Schema.Array(FriendRelationship))),
        Effect.catchTags({
          DatabaseError: Effect.die,
          ParseError: Effect.die,
        }),
        Effect.withSpan("FriendRepository.findFriendById"),
      ),
    );
    const del = db.makeQuery(
      (
        execute,
        input: { userIdLeft: typeof User.fields.id.Type; userIdRight: typeof User.fields.id.Type },
      ) =>
        execute((client) =>
          client
            .delete(DbSchema.friends)
            .where(
              or(
                and(
                  eq(DbSchema.friends.userIdLeft, input.userIdLeft),
                  eq(DbSchema.friends.userIdRight, input.userIdRight),
                ),
                and(
                  eq(DbSchema.friends.userIdLeft, input.userIdRight),
                  eq(DbSchema.friends.userIdRight, input.userIdLeft),
                ),
              ),
            )
            .returning(),
        ).pipe(
          Effect.flatMap(Array.head),
          Effect.flatMap(Schema.decode(FriendRelationship)),
          Effect.catchTags({
            DatabaseError: Effect.die,
            NoSuchElementException: () =>
              new FriendNotFoundError({ message: `Friend with users ${input} not found.` }),
            ParseError: Effect.die,
          }),
          Effect.withSpan("UserRepository.del"),
        ),
    );

    return {
      create,
      findAll,
      findFriendById,
      del,
    } as const;
  }),
}) { }

import { Array, DateTime, Effect, Option, ParseResult, Schema } from "effect";
import { DatabaseService } from "../db/database.js";
import { AuthUser, User, UserNotFoundError } from "@org/domain/models/User";
import { DbSchema } from "../db/index.js";
import { eq } from "drizzle-orm";

export const UserFromAuthUser = Schema.transformOrFail(AuthUser, User, {
  strict: true,
  decode: (authUser) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, password, salt, ...rest } = authUser;
    return ParseResult.succeed({
      ...rest,
      createdAt: DateTime.toDateUtc(createdAt),
    });
  },
  encode: (user, _, ast) =>
    ParseResult.fail(
      new ParseResult.Forbidden(ast, user, "Encoding User to AuthUser is forbidden."),
    ),
});

export class UserRepository extends Effect.Service<UserRepository>()("UserRepository", {
  dependencies: [DatabaseService.Default],
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService;

    const create = db.makeQuery((execute, input: typeof AuthUser.Type) =>
      execute((client) =>
        client.insert(DbSchema.users).values(Schema.encodeUnknownSync(AuthUser)(input)).returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(UserFromAuthUser)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () => Effect.die(""),
          ParseError: Effect.die,
        }),
        Effect.withSpan("UserRepository.create"),
      ),
    );

    const update = db.makeQuery((execute, input: typeof User.Type) =>
      execute((client) =>
        client
          .update(DbSchema.users)
          .set(Schema.encodeUnknownSync(User)(input))
          .where(eq(DbSchema.users.id, input.id))
          .returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(User)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            new UserNotFoundError({ message: `User with id ${input.id} not found.` }),
          ParseError: Effect.die,
        }),
        Effect.withSpan("UserRepository.update"),
      ),
    );

    const findUserById = db.makeQuery((execute, input: typeof User.fields.id.Type) =>
      execute((client) =>
        client.query.users.findFirst({
          columns: { password: false, salt: false },
          where: eq(DbSchema.users.id, input),
        }),
      ).pipe(
        Effect.flatMap(Option.fromNullable),
        Effect.flatMap(Schema.decode(User)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            new UserNotFoundError({ message: `User with ${input} not found.` }),
          ParseError: Effect.die,
        }),
        Effect.withSpan("UserRepository.findUserById"),
      ),
    );

    const findAuthUserById = db.makeQuery((execute, input: typeof User.fields.id.Type) =>
      execute((client) =>
        client.query.users.findFirst({
          where: eq(DbSchema.users.id, input),
        }),
      ).pipe(
        Effect.flatMap(Option.fromNullable),
        Effect.flatMap(Schema.decode(AuthUser)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            new UserNotFoundError({ message: `User with ${input} not found.` }),
          ParseError: Effect.die,
        }),
        Effect.withSpan("UserRepository.findAuthUserById"),
      ),
    );

    const findAll = db.makeQuery((execute) =>
      execute((client) =>
        client.query.users.findMany({ columns: { password: false, salt: false } }),
      ).pipe(
        Effect.flatMap(Schema.decode(Schema.Array(User))),
        Effect.catchTags({
          DatabaseError: Effect.die,
          ParseError: Effect.die,
        }),
        Effect.withSpan("UserRepository.findAll"),
      ),
    );

    const del = db.makeQuery((execute, input: typeof User.fields.id.Type) =>
      execute((client) =>
        client.delete(DbSchema.users).where(eq(DbSchema.users.id, input)).returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(Schema.Struct({ id: User.fields.id }))),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            new UserNotFoundError({ message: `User with id ${input} not found.` }),
          ParseError: Effect.die,
        }),
        Effect.withSpan("UserRepository.del"),
      ),
    );

    return {
      create,
      update,
      findUserById,
      findAuthUserById,
      findAll,
      del,
    } as const;
  }),
}) {}

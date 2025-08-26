import { Array, Effect, Option, Schema } from "effect";
import { DatabaseService } from "../db/database.js";
import { Session, SessionNotFoundError } from "@org/domain/models/Session";
import { DbSchema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { getSessionId } from "../utils/auth.js";

const SESSION_EXPIRY_TIME = 1000 * 60 * 60 * 24 * 30; // 30 days

export class SessionRepository extends Effect.Service<SessionRepository>()("SessionRepository", {
  dependencies: [DatabaseService.Default],
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService;

    const create = db.makeQuery(
      (execute, input: { token: string; userId: typeof Session.fields.userId.Type }) => {
        const sessionId = getSessionId(input.token);

        const session = {
          id: sessionId,
          userId: input.userId,
          expiresAt: new Date(Date.now() + SESSION_EXPIRY_TIME),
        };

        return execute((client) =>
          client.insert(DbSchema.sessions).values(session).returning(),
        ).pipe(
          Effect.flatMap(Array.head),
          Effect.flatMap(Schema.decode(Session)),
          Effect.catchTags({
            DatabaseError: Effect.die,
            NoSuchElementException: () => Effect.die(""),
            ParseError: Effect.die,
          }),
          Effect.withSpan("SessionRepository.create"),
        );
      },
    );

    const refresh = Effect.fn("SessionRepository.refresh")(function* (token: string) {
      const sessionId = getSessionId(token);
      return yield* db
        .execute((client) =>
          client
            .update(DbSchema.sessions)
            .set({ expiresAt: new Date(Date.now() + SESSION_EXPIRY_TIME) })
            .where(eq(DbSchema.sessions.id, sessionId))
            .returning(),
        )
        .pipe(
          Effect.flatMap(Array.head),
          Effect.flatMap(Schema.decode(Session)),
          Effect.catchTags({
            DatabaseError: Effect.die,
            NoSuchElementException: () =>
              new SessionNotFoundError({ message: `No session for token: ${token}.` }),
            ParseError: Effect.die,
          }),
        );
    });

    const get = db.makeQuery((execute, input: string) => {
      const sessionId = getSessionId(input);
      return execute((client) =>
        client.query.sessions.findFirst({ where: eq(DbSchema.sessions.id, sessionId) }),
      ).pipe(
        Effect.flatMap(Option.fromNullable),
        Effect.flatMap(Schema.decode(Session)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            new SessionNotFoundError({ message: `No session for token: ${input}.` }),
          ParseError: Effect.die,
        }),
        Effect.withSpan("SessionRepository.get"),
      );
    });

    const del = db.makeQuery((execute, input: string) => {
      const sessionId = getSessionId(input);
      return execute((client) =>
        client.delete(DbSchema.sessions).where(eq(DbSchema.sessions.id, sessionId)).returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(Session)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            new SessionNotFoundError({ message: `No session for token: ${input}.` }),
          ParseError: Effect.die,
        }),
        Effect.withSpan("SessionRepository.get"),
      );
    });

    return {
      create,
      refresh,
      get,
      del,
    } as const;
  }),
}) {}

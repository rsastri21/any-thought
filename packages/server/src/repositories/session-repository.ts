import { Session, SessionNotFoundError } from "@org/domain/models/Session";
import { DateTime, Effect, pipe, Schema } from "effect";
import { RedisService } from "../redis/redis.js";
import { getSessionId } from "../utils/auth.js";

const SESSION_EXPIRY_TIME = 30; // 30 days

export class SessionRepository extends Effect.Service<SessionRepository>()("SessionRepository", {
  dependencies: [RedisService.Default],
  effect: Effect.gen(function* () {
    const redis = yield* RedisService;

    const create = Effect.fn("SessionRepository.create")(
      function* (token: string, userId: typeof Session.fields.userId.Type) {
        const sessionId = getSessionId(token);
        const now = yield* DateTime.now;
        const expiresAt = DateTime.add(now, { days: SESSION_EXPIRY_TIME });
        const session = Session.make({
          id: sessionId,
          userId,
          expiresAt,
        });
        yield* redis.execute((client) =>
          client
            .multi()
            .hSet(`session:${session.id}`, Schema.encodeSync(Session)(session))
            .sAdd(`user:${userId}:sessions`, [sessionId])
            .exec(),
        );
        return session;
      },
      (effect) => Effect.catchTag(effect, "RedisError", Effect.die),
    );

    const refresh = Effect.fn("SessionRepository.refresh")(
      function* (sessionId: typeof Session.fields.id.Type) {
        const exists = yield* redis.execute((client) =>
          client.hExists(`session:${sessionId}`, "expiresAt"),
        );
        if (exists === 0) {
          return yield* Effect.fail(
            new SessionNotFoundError({ message: `No session found with id: ${sessionId}.` }),
          );
        }
        const now = yield* DateTime.now;
        const expiresAt = DateTime.formatIso(DateTime.add(now, { days: SESSION_EXPIRY_TIME }));
        yield* redis.execute((client) =>
          client.hSet(`session:${sessionId}`, "expiresAt", expiresAt),
        );
        return yield* Effect.void;
      },
      (effect) => Effect.catchTag(effect, "RedisError", Effect.die),
    );

    const get = Effect.fn("SessionRepository.get")(
      function* (token: string) {
        const sessionId = getSessionId(token);
        return yield* redis.execute((client) => client.hGetAll(`session:${sessionId}`));
      },
      (effect, token) =>
        pipe(
          effect,
          Effect.flatMap(Schema.decodeUnknown(Session)),
          Effect.catchTags({
            RedisError: Effect.die,
            ParseError: () =>
              new SessionNotFoundError({ message: `No session for token: ${token}.` }), // Redis returns {} on no match
          }),
        ),
    );

    const del = Effect.fn("SessionRepository.del")(
      function* (userId: typeof Session.fields.userId.Type, token: string) {
        const sessionId = getSessionId(token);
        yield* redis.execute((client) =>
          client
            .multi()
            .sRem(`user:${userId}:sessions`, `session:${sessionId}`)
            .del(`session:${sessionId}`)
            .exec(),
        );
      },
      (effect) => Effect.catchTag(effect, "RedisError", Effect.die),
    );

    const delAll = Effect.fn("SessionRepository.delAll")(
      function* (userId: typeof Session.fields.userId.Type) {
        const userKey = `user:${userId}:sessions`;
        const sessions = yield* redis.execute((client) => client.sMembers(userKey));
        yield* redis.execute((client) => client.del([...sessions, userKey]));
      },
      (effect) => Effect.catchTag(effect, "RedisError", Effect.die),
    );

    return {
      create,
      refresh,
      get,
      del,
      delAll,
    } as const;
  }),
}) {}

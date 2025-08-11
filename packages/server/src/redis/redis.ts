import { Config, Data, Effect, Redacted } from "effect";
import { createClient } from "redis";

export class RedisError extends Data.TaggedError("RedisError")<{
  readonly cause?: unknown;
  readonly message?: string;
}> {}

export class RedisService extends Effect.Service<RedisService>()("RedisService", {
  dependencies: [],
  scoped: Effect.gen(function* () {
    const redisUrl = yield* Config.redacted("REDIS_URL");

    const redisClient = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => createClient({ url: Redacted.value(redisUrl) }).connect(),
        catch: (e) => new RedisError({ cause: e, message: "Error connecting to Redis instance." }),
      }),
      (client) => Effect.promise(() => client.quit()),
    );

    const use = Effect.fn(<T>(fn: (client: ReturnType<typeof createClient>) => Promise<T>) =>
      Effect.tryPromise({
        try: () => fn(redisClient),
        catch: (e) => new RedisError({ cause: e, message: "Error in 'Redis.use'." }),
      }),
    );

    return {
      use,
    } as const;
  }),
}) {}

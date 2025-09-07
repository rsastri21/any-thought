import { Config, Data, Effect, Redacted } from "effect";
import { createClient } from "redis";

export class RedisError extends Data.TaggedError("RedisError")<{
  readonly cause?: unknown;
  readonly message?: string;
}> {}

export class RedisConnectionLostError extends Data.TaggedError("RedisConnectionLostError")<{
  readonly cause?: unknown;
  readonly message?: string;
}> {}

export class RedisService extends Effect.Service<RedisService>()("RedisService", {
  accessors: true,
  dependencies: [],
  scoped: Effect.gen(function* () {
    const redisUrl = yield* Config.redacted("REDIS_URL");

    const redisClient = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          createClient({
            url: Redacted.value(redisUrl),
            socket: { reconnectStrategy: false },
          }).connect(),
        catch: (e) =>
          new RedisConnectionLostError({ cause: e, message: "[Redis] Failed to connect" }),
      }),
      (client) =>
        Effect.tryPromise(() => client.quit()).pipe(
          Effect.catchTag("UnknownException", () => Effect.succeed(undefined)),
        ),
    );

    yield* Effect.tryPromise(() => redisClient.ping()).pipe(
      Effect.timeoutFail({
        duration: "5 seconds",
        onTimeout: () =>
          new RedisConnectionLostError({
            cause: new Error("[Redis] Failed to connect: timeout"),
            message: "[Redis] Failed to connect: timeout",
          }),
      }),
      Effect.catchTag(
        "UnknownException",
        (error) =>
          new RedisConnectionLostError({ cause: error, message: "[Redis] Failed to connect" }),
      ),
      Effect.tap(() =>
        Effect.logInfo("[Redis client]: Connection to the Redis instance established."),
      ),
    );

    const setupConnectionListeners = Effect.zipRight(
      Effect.async<void, RedisConnectionLostError>((resume) => {
        redisClient.on("error", (error) => {
          resume(
            Effect.fail(new RedisConnectionLostError({ cause: error, message: error.message })),
          );
        });

        return Effect.sync(() => {
          redisClient.removeAllListeners("error");
        });
      }),
      Effect.logInfo("[Redis client]: Connection error listeners initialized."),
      {
        concurrent: true,
      },
    );

    const execute = Effect.fn(<T>(fn: (client: ReturnType<typeof createClient>) => Promise<T>) =>
      Effect.tryPromise({
        try: () => fn(redisClient),
        catch: (e) => new RedisError({ cause: e, message: "Error in 'Redis.execute'." }),
      }),
    );

    return {
      setupConnectionListeners,
      execute,
    } as const;
  }),
}) {}

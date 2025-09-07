import { HttpApiBuilder, HttpMiddleware, HttpServer } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { DomainApi } from "@org/domain/domain-api";
import { Duration, Effect, Layer, Schedule } from "effect";
import { createServer } from "node:http";
import { AuthLive } from "./api/auth-live.js";
import { DatabaseService } from "./db/database.js";
import { AuthService } from "./services/auth-service.js";
import { RedisService } from "./redis/redis.js";

const HealthLive = HttpApiBuilder.group(DomainApi, "health", (handlers) =>
  handlers.handle("health", () => Effect.succeed("OK")),
);

const ApiLive = HttpApiBuilder.api(DomainApi).pipe(Layer.provide([AuthLive, HealthLive]));

const CorsLive = HttpApiBuilder.middlewareCors({
  allowedOrigins: ["*"],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "B3", "traceparent"],
  credentials: true,
});

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  Layer.provide(CorsLive),
  Layer.provide(ApiLive),
  Layer.merge(Layer.effectDiscard(RedisService.use((redis) => redis.setupConnectionListeners))),
  Layer.merge(Layer.effectDiscard(DatabaseService.use((db) => db.setupConnectionListeners))),
  Layer.provide(AuthService.Default),
  Layer.provide(DatabaseService.Default),
  Layer.provide(RedisService.Default),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
);

Layer.launch(HttpLive).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.retry({
    while: (error) =>
      error._tag === "DatabaseConnectionLostError" || error._tag === "RedisConnectionLostError",
    schedule: Schedule.exponential("1 second", 2).pipe(
      Schedule.modifyDelay(Duration.min("8 seconds")),
      Schedule.jittered,
      Schedule.repetitions,
      Schedule.modifyDelayEffect((count, delay) =>
        Effect.as(
          Effect.logError(
            `[Server crashed]: Retrying in ${Duration.format(delay)} (attempt #${count + 1})`,
          ),
          delay,
        ),
      ),
    ),
  }),
  NodeRuntime.runMain(),
);

import { HttpApiBuilder, HttpMiddleware, HttpServer } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { NodeSdk } from "@effect/opentelemetry";
import { DomainApi } from "@org/domain/domain-api";
import { Config, Duration, Effect, Layer, Redacted, Schedule } from "effect";
import { createServer } from "node:http";
import { AuthLive } from "./api/auth-live.js";
import { DatabaseService } from "./db/database.js";
import { AuthService } from "./services/auth-service.js";
import { RedisService } from "./redis/redis.js";
import { AuthorizationLive } from "./middlewares/auth-middleware-live.js";
import { UsersLive } from "./api/users-live.js";
import { UserRepository } from "./repositories/user-repository.js";
import { SessionRepository } from "./repositories/session-repository.js";
import { FriendsLive } from "./api/friends-live.js";
import { FriendService } from "./services/friends-service.js";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const HealthLive = HttpApiBuilder.group(DomainApi, "health", (handlers) =>
  handlers.handle("health", () => Effect.succeed("OK")),
);

const ApiLive = HttpApiBuilder.api(DomainApi).pipe(
  Layer.provide([AuthLive, HealthLive, UsersLive, FriendsLive]),
);

const CorsLive = HttpApiBuilder.middlewareCors({
  allowedOrigins: ["*"],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "B3", "traceparent"],
  credentials: true,
});

const NodeSdkLive = NodeSdk.layer(
  Effect.gen(function* () {
    const url = yield* Config.redacted("OTLP_URL");
    return {
      resource: { serviceName: "any-thought" },
      spanProcessor: new BatchSpanProcessor(
        new OTLPTraceExporter({ url: `${Redacted.value(url)}/v1/traces` }),
      ),
    };
  }),
);

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  Layer.provide(CorsLive),
  Layer.provide(ApiLive),
  Layer.provide(AuthorizationLive),
  Layer.merge(Layer.effectDiscard(RedisService.use((redis) => redis.setupConnectionListeners))),
  Layer.merge(Layer.effectDiscard(DatabaseService.use((db) => db.setupConnectionListeners))),
  Layer.provide(FriendService.Default),
  Layer.provide(UserRepository.Default),
  Layer.provide(SessionRepository.Default),
  Layer.provide(AuthService.Default),
  Layer.provide(DatabaseService.Default),
  Layer.provide(RedisService.Default),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
);

Layer.launch(HttpLive).pipe(
  Effect.provide(NodeSdkLive),
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

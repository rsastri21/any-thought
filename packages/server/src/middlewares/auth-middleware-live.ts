import { Authorization } from "@org/domain/middlewares/AuthMiddleware";
import { Effect, Layer, Redacted } from "effect";
import { AuthService } from "../services/auth-service.js";

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const auth = yield* AuthService;

    return {
      authToken: (token) =>
        Effect.gen(function* () {
          yield* Effect.log("Validation auth token...");
          return yield* auth.validateRequest(Redacted.value(token));
        }),
    };
  }),
);

import { HttpApiBuilder } from "@effect/platform";
import { DomainApi } from "@org/domain/domain-api";
import { security } from "@org/domain/middlewares/AuthMiddleware";
import { Effect, Redacted } from "effect";
import { AuthService } from "../services/auth-service.js";

export const AuthLive = HttpApiBuilder.group(
  DomainApi,
  "auth",
  Effect.fnUntraced(function* (handlers) {
    const auth = yield* AuthService;

    return handlers
      .handle("signup", (request) =>
        auth.signup(request.payload).pipe(Effect.withSpan("AuthLive.signup")),
      )
      .handle("login", (request) =>
        Effect.gen(function* () {
          const token = yield* auth.login(request.payload).pipe(Effect.withSpan("AuthLive.login"));
          console.log(token);
          return yield* HttpApiBuilder.securitySetCookie(security, Redacted.make(token));
        }),
      )
      .handle("signout", (request) =>
        Effect.gen(function* () {
          const token = request.request.cookies["x_at_auth_token"];
          yield* auth.signout(token).pipe(Effect.withSpan("AuthLive.signout"));
          return yield* HttpApiBuilder.securitySetCookie(security, Redacted.make(""));
        }),
      );
  }),
);

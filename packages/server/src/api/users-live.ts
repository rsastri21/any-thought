import { HttpApiBuilder } from "@effect/platform";
import type { ByIdOrUsername } from "@org/domain/contracts/UsersContract";
import { DomainApi } from "@org/domain/domain-api";
import { CurrentUser, security } from "@org/domain/middlewares/AuthMiddleware";
import type { Schema } from "effect";
import { Effect, Match, Redacted } from "effect";
import { SessionRepository } from "../repositories/session-repository.js";
import { UserRepository } from "../repositories/user-repository.js";

export const UsersLive = HttpApiBuilder.group(
  DomainApi,
  "users",
  Effect.fnUntraced(function* (handlers) {
    const userRepo = yield* UserRepository;
    const sessionRepo = yield* SessionRepository;

    const getUsers = Match.type<Schema.Schema.Type<typeof ByIdOrUsername>>().pipe(
      Match.when({ id: (id) => !!id }, (params) => userRepo.findUserById(params.id)),
      Match.when({ username: (username) => !!username }, (params) =>
        userRepo.findUserByUsername(params.username),
      ),
      Match.orElse(() => userRepo.findAll()),
    );

    return handlers
      .handle("edit", (request) => {
        return userRepo.update(request.payload).pipe(Effect.withSpan("UsersLive.edit"));
      })
      .handle("delete", (request) =>
        Effect.gen(function* () {
          const userId = request.path.id;
          yield* sessionRepo.delAll(userId);
          yield* userRepo.del(userId);
        }),
      )
      .handle("get", (request) => getUsers(request.urlParams))
      .handle("me", () =>
        Effect.gen(function* () {
          const currentUser = yield* CurrentUser;
          const [user] = yield* userRepo.findUserById(currentUser.id);
          return user;
        }).pipe(Effect.catchTag("UserNotFoundError", Effect.die)),
      )
      .handle("deleteme", () =>
        Effect.gen(function* () {
          const currentUser = yield* CurrentUser;
          yield* Effect.all([userRepo.del(currentUser.id), sessionRepo.delAll(currentUser.id)], {
            concurrency: "unbounded",
          });
          return yield* HttpApiBuilder.securitySetCookie(security, Redacted.make(""), {
            path: "/",
          });
        }).pipe(Effect.catchTag("UserNotFoundError", Effect.die)),
      );
  }),
);

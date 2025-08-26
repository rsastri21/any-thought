import { Forbidden } from "@effect/platform/HttpApiError";
import type { LoginPayload } from "@org/domain/contracts/AuthContract";
import { SignUpPayload } from "@org/domain/contracts/AuthContract";
import type { Session } from "@org/domain/models/Session";
import { AuthUser } from "@org/domain/models/User";
import { randomBytes } from "crypto";
import { DateTime, Effect, ParseResult, Schema } from "effect";
import { SessionRepository } from "../repositories/session-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import {
  ENTROPY_SIZE,
  generateIdFromEntropySize,
  generateSessionToken,
  getSessionId,
  hashPassword,
} from "../utils/auth.js";

const AuthUserFromSignUpPayload = Schema.transformOrFail(SignUpPayload, AuthUser, {
  strict: true,
  decode: Effect.fnUntraced(function* (signUpPayload) {
    const salt = randomBytes(128).toString();
    const password = yield* hashPassword(signUpPayload.password, salt);
    return yield* ParseResult.succeed({
      id: generateIdFromEntropySize(ENTROPY_SIZE),
      username: signUpPayload.username,
      name: signUpPayload.name,
      ...(signUpPayload.email && { email: signUpPayload.email }),
      image: `https://api.dicebear.com/9.x/notionists/svg?seed=${signUpPayload.name}`,
      createdAt: new Date(),
      password,
      salt,
    });
  }),
  encode: (authUser, _, ast) =>
    ParseResult.fail(
      new ParseResult.Forbidden(ast, authUser, "Encoding AuthUser to SignUpPayload is forbidden."),
    ),
});

export class AuthService extends Effect.Service<AuthService>()("AuthService", {
  dependencies: [UserRepository.Default, SessionRepository.Default],
  effect: Effect.gen(function* () {
    const userRepo = yield* UserRepository;
    const sessionRepo = yield* SessionRepository;

    const signup = Effect.fn("AuthService.signup")(function* (input: typeof SignUpPayload.Type) {
      const authUser = Schema.decodeSync(AuthUserFromSignUpPayload)(input);
      return yield* userRepo.create(authUser);
    });

    const login = Effect.fn("AuthService.login")(function* (input: typeof LoginPayload.Type) {
      const user = yield* userRepo.findAuthUserByUsername(input.username);
      const hashedPassword = yield* hashPassword(input.password, user.salt);
      if (hashedPassword !== user.password) {
        return yield* Effect.fail(Forbidden);
      }
      const token = generateSessionToken();
      return yield* sessionRepo.create({ token, userId: user.id });
    });

    const signout = Effect.fn("AuthService.signout")(function* (
      sessionId: typeof Session.fields.id.Type,
    ) {
      return yield* sessionRepo.del(sessionId);
    });

    const validateRequest = Effect.fn("AuthService.validateRequest")(function* (token: string) {
      const sessionId = getSessionId(token);
      const session = yield* sessionRepo.get(sessionId);
      const isExpired = yield* DateTime.isPast(session.expiresAt);

      if (isExpired) {
        yield* sessionRepo.del(sessionId);
        return yield* Effect.fail(Forbidden);
      }

      const now = yield* DateTime.now;
      const isRefreshable = DateTime.between({
        minimum: now,
        maximum: DateTime.add(now, { days: 15 }),
      })(session.expiresAt);

      if (isRefreshable) {
        yield* sessionRepo.refresh(sessionId);
      }

      return yield* userRepo.findUserById(session.userId);
    });

    return {
      signup,
      login,
      signout,
      validateRequest,
    } as const;
  }),
}) {}

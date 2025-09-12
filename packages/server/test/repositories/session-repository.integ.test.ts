import { describe, expect, it } from "@effect/vitest";
import { SessionNotFoundError } from "@org/domain/models/Session";
import { SessionRepository } from "@org/server/repositories/session-repository";
import {
  ENTROPY_SIZE,
  generateIdFromEntropySize,
  generateSessionToken,
} from "@org/server/utils/auth";
import { Effect, Exit } from "effect";

describe("SessionRepository Integration Tests", () => {
  it.layer(SessionRepository.Default, { timeout: "30 seconds" })("SessionRepository", (it) => {
    it.effect(
      "should create a session",
      Effect.fnUntraced(function* () {
        const sessionRepo = yield* SessionRepository;
        const token = generateSessionToken();
        const userId = generateIdFromEntropySize(ENTROPY_SIZE);
        yield* sessionRepo.create(token, userId);

        const session = yield* sessionRepo.get(token);
        expect(session).toBeDefined();
        expect(session.userId).toBe(userId);

        // Cleanup
        yield* sessionRepo.del(userId, token);
      }),
    );

    it.effect(
      "should delete all sessions",
      Effect.fnUntraced(function* () {
        const token1 = generateSessionToken();
        const token2 = generateSessionToken();
        const userId = generateIdFromEntropySize(ENTROPY_SIZE);

        const sessionRepo = yield* SessionRepository;
        yield* sessionRepo.create(token1, userId);
        yield* sessionRepo.create(token2, userId);

        const session1 = yield* sessionRepo.get(token1);
        const session2 = yield* sessionRepo.get(token2);

        expect(session1).toBeDefined();
        expect(session2).toBeDefined();

        yield* sessionRepo.delAll(userId);

        const result1 = yield* Effect.exit(sessionRepo.get(token1));
        const result2 = yield* Effect.exit(sessionRepo.get(token2));

        expect(result1).toStrictEqual(
          Exit.fail(new SessionNotFoundError({ message: `No session for token: ${token1}.` })),
        );
        expect(result2).toStrictEqual(
          Exit.fail(new SessionNotFoundError({ message: `No session for token: ${token2}.` })),
        );
      }),
    );
  });
});

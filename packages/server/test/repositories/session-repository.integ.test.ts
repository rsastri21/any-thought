import { describe, expect, it } from "@effect/vitest";
import { SessionRepository } from "@org/server/repositories/session-repository";
import {
  ENTROPY_SIZE,
  generateIdFromEntropySize,
  generateSessionToken,
} from "@org/server/utils/auth";
import { Effect } from "effect";

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
  });
});

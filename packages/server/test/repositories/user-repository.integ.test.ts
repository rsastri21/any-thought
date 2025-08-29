import { describe, expect, it } from "@effect/vitest";
import { AuthUser, User } from "@org/domain/models/User";
import { UserFromAuthUser, UserRepository } from "../../src/repositories/user-repository.js";
import { generateIdFromEntropySize } from "../../src/utils/auth.js";
import { Effect, Schema } from "effect";

const testAuthUser = Schema.decodeUnknownSync(AuthUser)({
  id: generateIdFromEntropySize(10),
  username: `test-user-${Math.floor(Math.random() * 1000)}`,
  name: "test-user",
  email: "testemail@email.com",
  image: "https://api.dicebear.com/9.x/notionists/svg?seed=Felix",
  createdAt: new Date(),
  password: "test-password",
  salt: "test-salt",
});

const testAuthUser2 = Schema.decodeUnknownSync(AuthUser)({
  id: generateIdFromEntropySize(10),
  username: `test-user-${Math.floor(Math.random() * 1000)}`,
  name: "test-user",
  email: "testemail@email.com",
  image: "https://api.dicebear.com/9.x/notionists/svg?seed=Felix",
  createdAt: new Date(),
  password: "test-password",
  salt: "test-salt",
});

const testAuthUser3 = Schema.decodeUnknownSync(AuthUser)({
  id: generateIdFromEntropySize(10),
  username: `test-user-${Math.floor(Math.random() * 1000)}`,
  name: "test-user",
  email: "testemail@email.com",
  image: "https://api.dicebear.com/9.x/notionists/svg?seed=Felix",
  createdAt: new Date(),
  password: "test-password",
  salt: "test-salt",
});

const testUser = Schema.decodeSync(UserFromAuthUser)(Schema.encodeSync(AuthUser)(testAuthUser));

describe("UserRepository Integration Tests", () => {
  it.layer(UserRepository.Default, { timeout: "30 seconds" })("UserRepository", (it) => {
    it.effect(
      "should create a user",
      Effect.fnUntraced(function* () {
        const userRepo = yield* UserRepository;
        const newUser = yield* userRepo.create(testAuthUser);

        expect(newUser).toBeDefined();
        expect(newUser.name).toEqual("test-user");
      }),
    );

    it.effect(
      "should edit a user",
      Effect.fnUntraced(function* () {
        const userRepo = yield* UserRepository;
        const user = yield* userRepo.create(testAuthUser2);
        const editUserResult = {
          ...Schema.encodeSync(User)(user),
          name: "updated-name",
        };
        const editedUser = yield* userRepo.update(Schema.decodeSync(User)(editUserResult));

        expect(editedUser.name).toEqual("updated-name");
      }),
    );

    it.effect(
      "should find a user by ID",
      Effect.fnUntraced(function* () {
        const userRepo = yield* UserRepository;
        const createdUser = yield* userRepo.create(testAuthUser3);
        const user = yield* userRepo.findUserById(createdUser.id);

        expect(user).toBeDefined();
        expect(user.id).toEqual(createdUser.id);
      }),
    );

    it.effect(
      "should delete a user",
      Effect.fnUntraced(function* () {
        const userRepo = yield* UserRepository;
        yield* userRepo.del(testUser.id);

        const users = yield* userRepo.findAll();
        expect(users).not.toContain(testUser);
      }),
    );
  });
});

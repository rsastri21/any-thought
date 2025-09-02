import { Effect, Schema } from "effect";
import { pbkdf2 } from "node:crypto";
import { User } from "@org/domain/models/User";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { Session } from "@org/domain/models/Session";

export const ENTROPY_SIZE = 10;
const ITERATIONS = 10000;

export const hashPassword = (plainTextPassword: string, salt: string) =>
  Effect.async<string>((resume) => {
    pbkdf2(plainTextPassword, salt, ITERATIONS, 64, "sha512", (err, derivedKey) => {
      if (err) {
        resume(Effect.die(err)); // Using Effect.die as there is no way to recover from this
      } else {
        resume(Effect.succeed(derivedKey.toString("hex")));
      }
    });
  });

export const generateIdFromEntropySize = (size: number) => {
  const buffer = crypto.getRandomValues(new Uint8Array(size));
  return Schema.decodeUnknownSync(User.fields.id)(encodeBase32LowerCaseNoPadding(buffer));
};

export const generateSessionToken = () => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
};

export const getSessionId = (token: string) =>
  Schema.decodeUnknownSync(Session.fields.id)(
    encodeHexLowerCase(sha256(new TextEncoder().encode(token))),
  );

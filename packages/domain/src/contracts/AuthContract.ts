import { Schema } from "effect";
import { User } from "../models/User.js";

const Password = Schema.Trim.pipe(Schema.minLength(8));

export class SignUpPayload extends Schema.Class<SignUpPayload>("SignUpPayload")(
  Schema.Struct({
    username: User.fields.username,
    name: User.fields.name,
    email: User.fields.email,
    password: Password,
    confirmPassword: Password,
  }).pipe(
    Schema.filter((input) => {
      if (input.password !== input.confirmPassword) {
        return {
          path: ["confirmPassword"],
          message: "Passwords do not match",
        };
      }
    }),
  ),
) {}

export class LoginPayload extends Schema.Class<LoginPayload>("LoginPayload")({
  username: User.fields.username,
  password: Schema.NonEmptyString,
}) {}

export class SignOutPayload extends Schema.Class<SignOutPayload>("SignOutPayload")({
  sessionId: Schema.NonEmptyString,
}) {}

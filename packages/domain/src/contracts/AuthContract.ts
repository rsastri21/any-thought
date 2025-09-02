import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Forbidden } from "@effect/platform/HttpApiError";
import { Schema } from "effect";
import { SessionNotFoundError } from "../models/Session.js";
import { User, UserAlreadyExistsError, UserNotFoundError } from "../models/User.js";

const Password = Schema.Trim.pipe(Schema.minLength(8));

export class SignUpPayload extends Schema.Class<SignUpPayload>("SignUpPayload")(
  Schema.Struct({
    username: User.fields.username.annotations({ message: () => "Username is required." }),
    name: User.fields.name.annotations({ message: () => "Name is required." }),
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
) { }

export class LoginPayload extends Schema.Class<LoginPayload>("LoginPayload")({
  username: User.fields.username,
  password: Schema.NonEmptyString,
}) { }

export class AuthGroup extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("signup", "/signup")
      .addSuccess(User)
      .addError(UserAlreadyExistsError)
      .setPayload(SignUpPayload),
  )
  .add(
    HttpApiEndpoint.post("login", "/login")
      .addSuccess(Schema.Void)
      .addError(UserNotFoundError)
      .addError(Forbidden)
      .setPayload(LoginPayload),
  )
  .add(
    HttpApiEndpoint.post("signout", "/signout")
      .addSuccess(Schema.Void)
      .addError(SessionNotFoundError),
  )
  .prefix("/auth") { }

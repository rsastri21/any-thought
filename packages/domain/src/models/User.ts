import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>("UserNotFoundError")(
  "UserNotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 404 }),
) {}

export class User extends Schema.Class<User>("User")({
  id: Schema.NonEmptyString.pipe(Schema.brand("UserId")),
  username: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  email: Schema.optionalWith(
    Schema.NonEmptyString.pipe(Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)),
    { nullable: true },
  ),
  image: Schema.String,
  createdAt: Schema.DateTimeUtcFromDate,
}) {}

export class AuthUser extends User.extend<AuthUser>("AuthUser")({
  password: Schema.NonEmptyString,
  salt: Schema.NonEmptyString,
}) {}

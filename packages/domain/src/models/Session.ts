import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class SessionNotFoundError extends Schema.TaggedError<SessionNotFoundError>(
  "SessionNotFoundError",
)(
  "SessionNotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 404 }),
) {}

export class Session extends Schema.Class<Session>("Session")({
  id: Schema.NonEmptyString.pipe(Schema.brand("SessionId")),
  userId: Schema.NonEmptyString.pipe(Schema.brand("UserId")),
  expiresAt: Schema.DateTimeUtc,
}) {}

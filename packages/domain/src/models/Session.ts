import { Schema } from "effect";

export class Session extends Schema.Class<Session>("Session")({
  id: Schema.NonEmptyString,
  userId: Schema.NonEmptyString.pipe(Schema.brand("UserId")),
  expiresAt: Schema.DateTimeUtcFromDate,
}) {}

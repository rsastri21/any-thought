import { Schema } from "effect";
import { User } from "./User.js";
import { HttpApiSchema } from "@effect/platform";

export class AssetNotFoundError extends Schema.TaggedError<AssetNotFoundError>(
  "AssetNotFoundError",
)(
  "AssetNotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 404 }),
) {}

export const AssetStatus = Schema.Literal("processing", "active");

export class Asset extends Schema.Class<Asset>("Asset")({
  id: Schema.String,
  userId: User.fields.id,
  postId: Schema.String.pipe(Schema.optionalWith({ nullable: true })),
  url: Schema.NonEmptyString,
  status: AssetStatus,
  createdAt: Schema.DateTimeUtcFromDate,
}) {}

export class CreateAssetPayload extends Schema.Class<CreateAssetPayload>("CreateAssetPayload")(
  Schema.Struct(Asset.fields).omit("id"),
) {}

export class UpdateAssetPayload extends Schema.Class<UpdateAssetPayload>("UpdateAssetPayload")({
  id: Asset.fields.id,
  postId: Asset.fields.postId,
  url: Asset.fields.url.pipe(Schema.optional),
  status: Asset.fields.status.pipe(Schema.optional),
}) {}

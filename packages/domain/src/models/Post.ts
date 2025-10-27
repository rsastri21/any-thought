import { Schema } from "effect";
import { User } from "./User.js";
import { HttpApiSchema } from "@effect/platform";

export class PostNotFoundError extends Schema.TaggedError<PostNotFoundError>("PostNotFoundError")(
  "PostNotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 404 }),
) {}

export class Post extends Schema.Class<Post>("Post")({
  id: Schema.String,
  author: User.fields.id,
  caption: Schema.String.pipe(Schema.optionalWith({ nullable: true })),
  likes: Schema.NonNegative,
  createdAt: Schema.DateTimeUtcFromDate,
}) {}

export class CreatePostPayload extends Schema.Class<CreatePostPayload>("CreatePostPayload")(
  Schema.Struct(Post.fields).omit("id", "likes"),
) {}

export class UpdatePostPayload extends Schema.Class<UpdatePostPayload>("UpdatePostPayload")({
  id: Post.fields.id,
  caption: Post.fields.caption,
  likes: Post.fields.likes.pipe(Schema.optional),
}) {}

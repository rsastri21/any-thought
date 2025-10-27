import { Array, Effect, Option, Schema } from "effect";
import { DatabaseService } from "../db/database.js";
import type { Asset } from "@org/domain/models/Asset";
import {
  CreatePostPayload,
  Post,
  PostNotFoundError,
  UpdatePostPayload,
} from "@org/domain/models/Post";
import { DbSchema } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";

export class PostRepository extends Effect.Service<PostRepository>()("PostRepository", {
  dependencies: [DatabaseService.Default],
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService;

    const create = Effect.fn("PostRepository.create")(function* (input: {
      post: typeof CreatePostPayload.Type;
      assetId: typeof Asset.fields.id.Type;
    }) {
      const { assetId, post } = input;

      return yield* db
        .transaction((tx) =>
          Effect.gen(function* () {
            const createdPost = yield* tx((client) =>
              client
                .insert(DbSchema.posts)
                .values(Schema.encodeUnknownSync(CreatePostPayload)(post))
                .returning(),
            ).pipe(
              Effect.flatMap(Array.head),
              Effect.flatMap(Schema.decode(Post)),
              Effect.catchTags({
                DatabaseError: Effect.die,
                NoSuchElementException: () => Effect.die(""),
                ParseError: Effect.die,
              }),
            );

            yield* tx((client) =>
              client
                .update(DbSchema.assets)
                .set({ postId: createdPost.id })
                .where(eq(DbSchema.assets.id, assetId)),
            ).pipe(Effect.catchTag("DatabaseError", Effect.die));

            return createdPost;
          }),
        )
        .pipe(Effect.catchTag("DatabaseError", Effect.die));
    });

    const update = db.makeQuery((execute, input: typeof UpdatePostPayload.Type) =>
      execute((client) =>
        client
          .update(DbSchema.posts)
          .set(Schema.encodeUnknownSync(UpdatePostPayload)(input))
          .returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(Post)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            Effect.fail(new PostNotFoundError({ message: `Post not found with id: ${input.id}.` })),
          ParseError: Effect.die,
        }),
        Effect.withSpan("PostRepository.update"),
      ),
    );

    const findAll = db.makeQuery((execute, input: typeof Post.fields.author.Type) =>
      execute((client) =>
        client.query.posts.findMany({ where: eq(DbSchema.posts.author, input) }),
      ).pipe(
        Effect.flatMap(Schema.decode(Schema.Array(Post))),
        Effect.catchTags({
          DatabaseError: Effect.die,
          ParseError: Effect.die,
        }),
        Effect.withSpan("PostRepository.findAll"),
      ),
    );

    const findPostsForUsers = db.makeQuery(
      (execute, input: Array<typeof Post.fields.author.Type>) =>
        execute((client) =>
          client.query.posts.findMany({ where: inArray(DbSchema.posts.author, input) }),
        ).pipe(
          Effect.flatMap(Schema.decode(Schema.Array(Post))),
          Effect.catchTags({
            DatabaseError: Effect.die,
            ParseError: Effect.die,
          }),
          Effect.withSpan("PostRepository.findPostsForUsers"),
        ),
    );

    const findPostById = db.makeQuery((execute, input: typeof Post.fields.id.Type) =>
      execute((client) =>
        client.query.posts.findFirst({ where: eq(DbSchema.posts.id, input) }),
      ).pipe(
        Effect.flatMap(Option.fromNullable),
        Effect.flatMap(Schema.decode(Post)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            Effect.fail(new PostNotFoundError({ message: `Post not found with id: ${input}.` })),
          ParseError: Effect.die,
        }),
        Effect.withSpan("PostRepository.findPostById"),
      ),
    );

    const del = db.makeQuery((execute, input: typeof Post.fields.id.Type) =>
      execute((client) =>
        client.delete(DbSchema.posts).where(eq(DbSchema.posts.id, input)).returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(Post)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            Effect.fail(new PostNotFoundError({ message: `Post not found with id: ${input}.` })),
        }),
        Effect.withSpan("PostRepository.del"),
      ),
    );

    return {
      create,
      update,
      findAll,
      findPostsForUsers,
      findPostById,
      del,
    } as const;
  }),
}) {}

import { Array, Effect, Schema } from "effect";
import {
  Asset,
  AssetNotFoundError,
  CreateAssetPayload,
  UpdateAssetPayload,
} from "@org/domain/models/Asset";
import { DatabaseService } from "../db/database.js";
import { DbSchema } from "../db/index.js";
import { eq } from "drizzle-orm";

export class AssetRepository extends Effect.Service<AssetRepository>()("AssetRepository", {
  dependencies: [DatabaseService.Default],
  effect: Effect.gen(function* () {
    const db = yield* DatabaseService;

    const insert = db.makeQuery((execute, input: typeof CreateAssetPayload.Type) =>
      execute((client) =>
        client
          .insert(DbSchema.assets)
          .values(Schema.encodeUnknownSync(CreateAssetPayload)(input))
          .returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(Asset)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () => Effect.die(""),
          ParseError: Effect.die,
        }),
        Effect.withSpan("AssetRepository.insert"),
      ),
    );

    const update = db.makeQuery((execute, input: typeof UpdateAssetPayload.Type) =>
      execute((client) =>
        client
          .update(DbSchema.assets)
          .set(Schema.encodeUnknownSync(UpdateAssetPayload)(input))
          .where(eq(DbSchema.assets.id, input.id))
          .returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(Asset)),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            Effect.fail(
              new AssetNotFoundError({ message: `Asset not found for id: ${input.id}.` }),
            ),
          ParseError: Effect.die,
        }),
        Effect.withSpan("AssetRepository.update"),
      ),
    );

    const del = db.makeQuery((execute, input: typeof Asset.fields.id.Type) =>
      execute((client) =>
        client.delete(DbSchema.assets).where(eq(DbSchema.assets.id, input)).returning(),
      ).pipe(
        Effect.flatMap(Array.head),
        Effect.flatMap(Schema.decode(Schema.Struct({ id: Asset.fields.id }))),
        Effect.catchTags({
          DatabaseError: Effect.die,
          NoSuchElementException: () =>
            Effect.fail(new AssetNotFoundError({ message: `Asset not found for id: ${input}.` })),
        }),
        Effect.withSpan("AssetRepository.del"),
      ),
    );

    return {
      insert,
      update,
      del,
    } as const;
  }),
}) {}

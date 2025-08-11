import { config as dotenv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Config, Data, Effect, Redacted } from "effect";
import postgres from "postgres";

dotenv({
  path: "../../.env",
});

class MigrationError extends Data.TaggedError("MigrationError")<{
  readonly message: string;
  readonly cause: unknown;
}> {}

const program = Effect.gen(function* () {
  yield* Effect.logInfo("[Migrator] Beginning database migration...");
  const databaseUrl = yield* Config.redacted("DATABASE_URL");
  const migrationClient = yield* Effect.acquireRelease(
    Effect.sync(() => postgres(Redacted.value(databaseUrl), { max: 1 })),
    (client) => Effect.promise(() => client.end()),
  );

  yield* Effect.tryPromise({
    try: () =>
      migrate(drizzle(migrationClient), {
        migrationsFolder: "./src/db/migrations",
      }),
    catch: (error) => {
      return new MigrationError({
        cause: error,
        message: "Failed to complete database migration.",
      });
    },
  });
}).pipe(
  Effect.catchTag("ConfigError", (error) => {
    Effect.logWarning("[Migrator] Database URL not set.");
    return Effect.die(error);
  }),
  Effect.tap(() => Effect.logInfo("[Migrator] Database migration completed.")),
);

const runnable = Effect.scoped(program);
Effect.runPromise(runnable);

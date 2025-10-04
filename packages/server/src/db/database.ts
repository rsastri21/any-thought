import { type ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, type NodePgDatabase, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { type PgTransaction } from "drizzle-orm/pg-core";
import * as pg from "pg";
import * as DbSchema from "./schema.js";
import { Cause, Config, Context, Data, Effect, Exit, Option, Redacted, Runtime } from "effect";

type TransactionClient = PgTransaction<
  NodePgQueryResultHKT,
  typeof DbSchema,
  ExtractTablesWithRelations<typeof DbSchema>
>;

type Client = NodePgDatabase<typeof DbSchema> & {
  $client: pg.Pool;
};

type TransactionContextShape = <U>(
  fn: (client: TransactionClient) => Promise<U>,
) => Effect.Effect<U, DatabaseError>;

export class TransactionContext extends Context.Tag("TransactionContext")<
  TransactionContext,
  TransactionContextShape
>() {
  public static readonly provide = (
    transaction: TransactionContextShape,
  ): (<A, E, R>(
    self: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, Exclude<R, TransactionContext>>) =>
    Effect.provideService(this, transaction);
}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly type: "unique_violation" | "foreign_key_violation" | "connection_error";
  readonly cause: any;
}> {
  public override toString() {
    return `DatabaseError: ${this.cause.message}`;
  }

  public get message() {
    return this.cause.message;
  }
}

export class DatabaseConnectionLostError extends Data.TaggedError("DatabaseConnectionLostError")<{
  cause: unknown;
  message: string;
}> {}

const matchPgError = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "code" in error.cause
  ) {
    switch (error.cause.code) {
      case "23505":
        return new DatabaseError({ type: "unique_violation", cause: error });
      case "23503":
        return new DatabaseError({ type: "foreign_key_violation", cause: error });
      case "08000":
        return new DatabaseError({ type: "connection_error", cause: error });
    }
  }
  return null;
};

export class DatabaseService extends Effect.Service<DatabaseService>()("DatabaseService", {
  accessors: true,
  dependencies: [],
  scoped: Effect.gen(function* () {
    const databaseUrl = yield* Config.redacted("DATABASE_URL");
    const pool = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new pg.Pool({
            connectionString: Redacted.value(databaseUrl),
            idleTimeoutMillis: 0,
            connectionTimeoutMillis: 0,
          }),
      ),
      (pool) => Effect.promise(() => pool.end()),
    );

    yield* Effect.tryPromise(() => pool.query("SELECT 1")).pipe(
      Effect.timeoutFail({
        duration: "10 seconds",
        onTimeout: () =>
          new DatabaseConnectionLostError({
            cause: new Error("[Database] Failed to connect: timeout"),
            message: "[Database] Failed to connect: timeout",
          }),
      }),
      Effect.catchTag(
        "UnknownException",
        (error) =>
          new DatabaseConnectionLostError({
            cause: error.cause,
            message: "[Database] Failed to connect",
          }),
      ),
      Effect.tap(() =>
        Effect.logInfo("[Database client]: Connection to the database established."),
      ),
    );

    const setupConnectionListeners = Effect.zipRight(
      Effect.async<void, DatabaseConnectionLostError>((resume) => {
        pool.on("error", (error) => {
          resume(
            Effect.fail(new DatabaseConnectionLostError({ cause: error, message: error.message })),
          );
        });

        return Effect.sync(() => {
          pool.removeAllListeners("error");
        });
      }),
      Effect.logInfo("[Database client]: Connection error listeners initialized."),
      {
        concurrent: true,
      },
    );

    const db = drizzle(pool, { schema: DbSchema });

    const execute = Effect.fn(<T>(fn: (client: Client) => Promise<T>) =>
      Effect.tryPromise({
        try: () => fn(db),
        catch: (cause) => {
          const error = matchPgError(cause);
          if (error !== null) {
            return error;
          }
          throw cause;
        },
      }),
    );

    const transaction = Effect.fn("Database.transaction")(
      <T, E, R>(txExecute: (tx: TransactionContextShape) => Effect.Effect<T, E, R>) =>
        Effect.runtime<R>().pipe(
          Effect.map((runtime) => Runtime.runPromiseExit(runtime)),
          Effect.flatMap((runPromiseExit) =>
            Effect.async<T, DatabaseError | E, R>((resume) => {
              db.transaction(async (tx: TransactionClient) => {
                const txWrapper = (fn: (client: TransactionClient) => Promise<any>) =>
                  Effect.tryPromise({
                    try: () => fn(tx),
                    catch: (cause) => {
                      const error = matchPgError(cause);
                      if (error !== null) {
                        return error;
                      }
                      throw cause;
                    },
                  });

                const result = await runPromiseExit(txExecute(txWrapper));
                Exit.match(result, {
                  onSuccess: (value) => {
                    resume(Effect.succeed(value));
                  },
                  onFailure: (cause) => {
                    if (Cause.isFailure(cause)) {
                      resume(Effect.fail(Cause.originalError(cause) as E));
                    } else {
                      resume(Effect.die(cause));
                    }
                  },
                });
              }).catch((cause) => {
                const error = matchPgError(cause);
                resume(error !== null ? Effect.fail(error) : Effect.die(cause));
              });
            }),
          ),
        ),
    );

    type ExecuteFn = <T>(
      fn: (client: Client | TransactionClient) => Promise<T>,
    ) => Effect.Effect<T, DatabaseError>;

    const makeQuery =
      <A, E, R, Input = never>(
        queryFn: (execute: ExecuteFn, input: Input) => Effect.Effect<A, E, R>,
      ) =>
      (...args: [Input] extends [never] ? [] : [input: Input]): Effect.Effect<A, E, R> => {
        const input = args[0] as Input;
        return Effect.serviceOption(TransactionContext).pipe(
          Effect.map(Option.getOrNull),
          Effect.flatMap((txOrNull) => queryFn(txOrNull ?? execute, input)),
        );
      };

    return {
      execute,
      transaction,
      setupConnectionListeners,
      makeQuery,
    } as const;
  }),
}) {}

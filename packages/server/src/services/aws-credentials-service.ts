import { Config, Data, Effect, pipe, Redacted, Schedule, Schema } from "effect";
import { RedisService } from "../redis/redis.js";
import { STS } from "itty-aws/sts";
import { AWS_ROLE, Stage } from "../utils/constants.js";
import { AwsCredentials } from "../utils/aws-credential-utils.js";

const REFRESH_INTERVAL = "30 minutes";
const CREDENTIALS_KEY = "at-server-aws-credentials";

class EmptyCredentialsResponse extends Data.TaggedError("EmptyCredentialsResponse")<{
  message: string;
}> {}

export class AwsCredentialsService extends Effect.Service<AwsCredentialsService>()(
  "AwsCredentialsService",
  {
    dependencies: [RedisService.Default],
    effect: Effect.gen(function* () {
      const awsAccessKey = yield* Config.redacted("AWS_ACCESS_KEY_ID");
      const awsSecretKey = yield* Config.redacted("AWS_SECRET_ACCESS_KEY");
      const awsRegion = yield* Config.redacted("AWS_REGION");
      const stage = yield* Stage;

      const sts = new STS({
        region: Redacted.value(awsRegion),
        credentials: {
          accessKeyId: Redacted.value(awsAccessKey),
          secretAccessKey: Redacted.value(awsSecretKey),
        },
      });

      const redis = yield* RedisService;

      const setupCredentialsRefresh = Effect.zipRight(
        Effect.gen(function* () {
          const assumeRoleResponse = yield* sts.assumeRole({
            RoleArn: AWS_ROLE[stage],
            RoleSessionName: "at-server-credentials",
          });
          yield* Effect.fail(
            new EmptyCredentialsResponse({ message: "No credentials returned from STS." }),
          ).pipe(Effect.when(() => !assumeRoleResponse.Credentials));

          const credentials = assumeRoleResponse.Credentials!;
          yield* redis.execute((client) =>
            client.hSet(CREDENTIALS_KEY, Schema.encodeSync(AwsCredentials)(credentials)),
          );
        }),
        Effect.logInfo(`[AWS Credentials]: Cached credentials. Refreshing in ${REFRESH_INTERVAL}.`),
      ).pipe(Effect.catchAll(Effect.die), Effect.repeat(Schedule.spaced(REFRESH_INTERVAL)));

      const retrieve = Effect.fn("AwsCredentialsService.retrieve")(
        function* () {
          return yield* redis.execute((client) => client.hGetAll(CREDENTIALS_KEY));
        },
        (effect) =>
          pipe(
            effect,
            Effect.flatMap(Schema.decodeUnknown(AwsCredentials)),
            Effect.catchTags({ RedisError: Effect.die, ParseError: Effect.die }),
          ),
      );

      return {
        retrieve,
        setupCredentialsRefresh,
      } as const;
    }),
  },
) {}

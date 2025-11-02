import { Config, Effect, Layer, Redacted, Schema } from "effect";
import { AwsAuthorization } from "@org/domain/middlewares/AwsMiddleware";
import { AwsCredentialsService } from "../services/aws-credentials-service.js";
import { AWS_CONFIG, Stage } from "../utils/constants.js";
import { SecretsManager } from "itty-aws/secrets-manager";
import { LowercaseAwsCredentials } from "../utils/aws-credential-utils.js";
import { Unauthorized } from "@effect/platform/HttpApiError";

export const AwsAuthorizationLive = Layer.effect(
  AwsAuthorization,
  Effect.gen(function* () {
    const credentialsService = yield* AwsCredentialsService;
    const stage = yield* Stage;
    const region = yield* Config.string("AWS_REGION");

    return {
      authToken: (token) =>
        Effect.gen(function* () {
          yield* Effect.logInfo("Validating AWS token...");
          const credentials = yield* credentialsService.retrieve();
          const secretsManager = new SecretsManager({
            region,
            credentials: Schema.decodeSync(LowercaseAwsCredentials)(credentials),
          });
          const secretResponse = yield* secretsManager
            .getSecretValue({
              SecretId: AWS_CONFIG[stage].secret,
            })
            .pipe(Effect.catchAll(Effect.die));
          yield* Effect.fail(new Unauthorized()).pipe(
            Effect.when(() => !secretResponse.SecretString),
          );
          const secret = secretResponse.SecretString!;
          yield* Effect.fail(new Unauthorized()).pipe(
            Effect.when(() => secret === Redacted.value(token)),
          );
        }),
    };
  }),
);

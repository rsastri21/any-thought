import { S3 } from "@effect-aws/client-s3";
import { Effect, Schema } from "effect";
import { AwsCredentialsService } from "./aws-credentials-service.js";
import { AWS_CONFIG, Stage } from "../utils/constants.js";
import { LowercaseAwsCredentials } from "../utils/aws-credential-utils.js";

export class S3Service extends Effect.Service<S3Service>()("S3Service", {
  dependencies: [AwsCredentialsService.Default],
  effect: Effect.gen(function* () {
    const credentialsService = yield* AwsCredentialsService;
    const stage = yield* Stage;

    const presignedPut = Effect.fn("S3Service.presignedPut")(function* (
      key: string,
      metadata?: Record<string, string>,
    ) {
      const credentials = yield* credentialsService.retrieve();
      return yield* S3.putObject(
        {
          Key: key,
          Bucket: AWS_CONFIG[stage].bucketName,
          Metadata: metadata,
        },
        { presigned: true },
      ).pipe(
        Effect.provide(
          S3.layer({ credentials: Schema.decodeSync(LowercaseAwsCredentials)(credentials) }),
        ),
      );
    });

    return {
      presignedPut,
    } as const;
  }),
}) {}

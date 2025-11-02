import { HttpApiBuilder } from "@effect/platform";
import { DomainApi } from "@org/domain/domain-api";
import { CurrentUser } from "@org/domain/middlewares/AuthMiddleware";
import type { Asset } from "@org/domain/models/Asset";
import { CreateAssetPayload } from "@org/domain/models/Asset";
import { randomUUID } from "crypto";
import { DateTime, Effect } from "effect";
import { AssetRepository } from "../repositories/asset-repository.js";
import { S3Service } from "../services/s3-service.js";
import { AWS_CONFIG, Stage } from "../utils/constants.js";

const getAssetKey = (
  userId: typeof Asset.fields.userId.Type,
  assetId: typeof Asset.fields.id.Type,
) => `any-thought/${userId}/assets/${assetId}`;

export const AssetsLive = HttpApiBuilder.group(
  DomainApi,
  "assets",
  Effect.fnUntraced(function* (handlers) {
    const s3 = yield* S3Service;
    const assetRepo = yield* AssetRepository;
    const stage = yield* Stage;

    return handlers
      .handle("new", () =>
        Effect.gen(function* () {
          const currentUser = yield* CurrentUser;
          const assetId = randomUUID().toString();
          const now = yield* DateTime.now;

          const assetKey = getAssetKey(currentUser.id, assetId);
          const payload = CreateAssetPayload.make({
            id: assetId,
            userId: currentUser.id,
            url: `https://${AWS_CONFIG[stage].cdn}/${assetKey}`,
            status: "processing",
            createdAt: now,
          });
          const asset = yield* assetRepo.insert(payload);
          const presignedUrl = yield* s3.presignedPut(assetKey).pipe(
            Effect.catchTags({
              S3ServiceError: Effect.die,
              SdkError: Effect.die,
            }),
          );
          return [asset, presignedUrl] as const;
        }),
      )
      .handle("upload-complete", (request) =>
        Effect.gen(function* () {
          const assetKey = request.payload.detail.object.key;
          const assetId = assetKey.split("/")[3];
          yield* assetRepo.update({ id: assetId, status: "active" });
        }),
      );
  }),
);

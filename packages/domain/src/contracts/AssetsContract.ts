import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Asset, AssetNotFoundError, EventBridgeCreationEvent } from "../models/Asset.js";
import { Authorization } from "../middlewares/AuthMiddleware.js";
import { Schema } from "effect";
import { AwsAuthorization } from "../middlewares/AwsMiddleware.js";

export class AssetsGroup extends HttpApiGroup.make("assets")
  .add(
    HttpApiEndpoint.post("new", "/new")
      .addSuccess(Schema.Tuple(Asset, Schema.String))
      .middleware(Authorization),
  )
  .add(
    HttpApiEndpoint.post("upload-complete", "/upload-complete")
      .setPayload(EventBridgeCreationEvent)
      .addSuccess(Schema.Void)
      .addError(AssetNotFoundError)
      .middleware(AwsAuthorization),
  )
  .prefix("/assets") {}

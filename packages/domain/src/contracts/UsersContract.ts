import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { User, UserNotFoundError } from "../models/User.js";
import { Authorization } from "../middlewares/AuthMiddleware.js";

export const ByIdOrUsername = Schema.Struct({
  id: Schema.optional(User.fields.id),
  username: Schema.optional(User.fields.username),
}).pipe(
  Schema.filter((params) =>
    params.id && params.username ? "Provide only one of 'id' or 'username' or neither." : undefined,
  ),
);

export class UsersGroup extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.post("edit", "/edit")
      .addSuccess(User)
      .addError(UserNotFoundError)
      .setPayload(User),
  )
  .add(
    HttpApiEndpoint.get("get", "/")
      .setUrlParams(ByIdOrUsername)
      .addSuccess(Schema.Array(User))
      .addError(UserNotFoundError),
  )
  .add(
    HttpApiEndpoint.del("delete", "/delete/:id")
      .setPath(
        Schema.Struct({
          id: User.fields.id,
        }),
      )
      .addSuccess(Schema.Void)
      .addError(UserNotFoundError),
  )
  .middleware(Authorization)
  .prefix("/users") {}

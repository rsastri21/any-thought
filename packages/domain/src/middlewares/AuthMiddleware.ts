import { Context } from "effect";
import type { UserId } from "../models/User.js";
import { HttpApiMiddleware, HttpApiSecurity } from "@effect/platform";
import { Unauthorized } from "@effect/platform/HttpApiError";

export const security = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "x_at_auth_token",
});

export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, UserId>() {}

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()("Authorization", {
  failure: Unauthorized,
  provides: CurrentUser,
  security: {
    authToken: security,
  },
}) {}

import { HttpApiMiddleware, HttpApiSecurity } from "@effect/platform";
import { Unauthorized } from "@effect/platform/HttpApiError";

export const security = HttpApiSecurity.apiKey({
  in: "header",
  key: "x_at_aws_token",
});

export class AwsAuthorization extends HttpApiMiddleware.Tag<AwsAuthorization>()(
  "AwsAuthorization",
  {
    failure: Unauthorized,
    security: {
      authToken: security,
    },
  },
) {}

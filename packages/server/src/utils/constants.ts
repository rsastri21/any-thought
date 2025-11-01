import { Schema } from "effect";

export const AWS_ROLE = {
  production: "arn:aws:iam::575108949460:role/server-access-role-prod",
  development: "arn:aws:iam::575108949460:role/server-access-role-dev",
};

export const AWS_CONFIG = {
  production: {
    bucketName: "infrastack-prod-photosprod6b9425f1-wgyuzhnl8b31",
    cdn: "dnbegg7axjy4z.cloudfront.net",
  },
  development: {
    bucketName: "infrastack-dev-photosdev270922ba-zuvmhsr0dpjr",
    cdn: "d32ubkhr1rd0rz.cloudfront.net",
  },
} as const;

export const Stage = Schema.Config("NODE_ENV", Schema.Literal("development", "production"));

import { Schema } from "effect";

export const AwsCredentials = Schema.Struct({
  AccessKeyId: Schema.String,
  SecretAccessKey: Schema.String,
  SessionToken: Schema.String,
});

export const AwsCredentialsLowercase = Schema.Struct({
  accessKeyId: Schema.String,
  secretAccessKey: Schema.String,
  sessionToken: Schema.String,
});

export const LowercaseAwsCredentials = Schema.transform(AwsCredentials, AwsCredentialsLowercase, {
  strict: true,
  decode: (credentials) => ({
    accessKeyId: credentials.AccessKeyId,
    secretAccessKey: credentials.SecretAccessKey,
    sessionToken: credentials.SessionToken,
  }),
  encode: (credentials) => ({
    AccessKeyId: credentials.accessKeyId,
    SecretAccessKey: credentials.secretAccessKey,
    SessionToken: credentials.sessionToken,
  }),
});

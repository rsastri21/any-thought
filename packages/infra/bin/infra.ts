#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";

const app = new cdk.App();

// Get the stage from execution context
const stage: string | undefined = app.node.tryGetContext("stage");

if (!stage) {
  throw new Error("Stage must be provided (Dev or Prod)");
}

new InfraStack(app, `InfraStack-${stage}`, {
  env: { account: "575108949460", region: "us-west-2" },
  stage,
});

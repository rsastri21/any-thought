import * as cdk from "aws-cdk-lib";
import { Distribution, S3OriginAccessControl, Signing } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
  ArnPrincipal,
  Effect,
  ManagedPolicy,
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  User,
  WebIdentityPrincipal,
} from "aws-cdk-lib/aws-iam";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

interface InfraStackProps extends cdk.StackProps {
  stage: string;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const stage = props.stage.toLowerCase();

    // Create GitHub infra for GitHub Actions
    if (stage === "prod") {
      const github = new OpenIdConnectProvider(this, `GitHubIdentityProvider-${stage}`, {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
        thumbprints: [
          "6938fd4d98bab03faadb97b34396831e3780aea1",
          "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
        ],
      });
      new Role(this, `GitHubDeployRole-${stage}`, {
        roleName: "any-thought-production-github",
        assumedBy: new WebIdentityPrincipal(github.openIdConnectProviderArn, {
          StringLike: {
            ["token.actions.githubusercontent.com:sub"]: "repo:rsastri21/any-thought:*",
          },
        }),
        managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")],
      });
    }

    const bucket = new Bucket(this, `Photos-${stage}`, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const oac = new S3OriginAccessControl(this, `PhotosOAC-${stage}`, {
      signing: Signing.SIGV4_NO_OVERRIDE,
    });

    const s3Origin = S3BucketOrigin.withOriginAccessControl(bucket, {
      originAccessControl: oac,
    });

    const distribution = new Distribution(this, `PhotosCDN-${stage}`, {
      defaultBehavior: {
        origin: s3Origin,
      },
    });

    // Create secret for connection to backend server
    const secret = new Secret(this, `AnyThoughtSecret-${stage}`);

    // Create IAM User for server AWS access
    const user = new User(this, `ServerAccessUser-${stage}`);

    const assumeRoleOnlyPolicy = new PolicyStatement({
      actions: ["sts:AssumeRole"],
      resources: ["*"],
      effect: Effect.ALLOW,
    });
    const assumeRoleManagedPolicy = new ManagedPolicy(this, `AssumeRoleManagedPolicy-${stage}`, {
      statements: [assumeRoleOnlyPolicy],
    });
    assumeRoleManagedPolicy.attachToUser(user);

    // Create role for server access
    const role = new Role(this, `ServerAccessRole-${stage}`, {
      assumedBy: new ArnPrincipal(user.userArn),
      roleName: `server-access-role-${stage}`,
    });

    bucket.grantReadWrite(role);
    distribution.grantCreateInvalidation(role);
    secret.grantRead(role);

    new cdk.CfnOutput(this, `PhotosBucketName-${stage}`, {
      exportName: `PhotosBucketName-${stage}`,
      value: bucket.bucketName,
    });
    new cdk.CfnOutput(this, `PhotosCdnDomain-${stage}`, {
      exportName: `PhotosCdnDomain-${stage}`,
      value: distribution.distributionDomainName,
    });
  }
}

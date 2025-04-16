import {
  Stack,
  StackProps,
  aws_s3 as s3,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_s3_deployment as s3deploy,
  aws_iam as iam,
  CfnOutput,
  RemovalPolicy
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

const NONE = new s3.BlockPublicAccess({
  blockPublicAcls: false,
  ignorePublicAcls: false,
  blockPublicPolicy: false,
  restrictPublicBuckets: false,
});

export class MyShopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create private S3 bucket (no public read access)
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      websiteIndexDocument: 'index.html',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: NONE,
    });

    // Create OAC (Origin Access Control) for secure access
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI');

    siteBucket.grantRead(originAccessIdentity);

    // CloudFront Distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'MyDist', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: siteBucket,
            originAccessIdentity: originAccessIdentity,
          },
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
    });

    // Deploy React build to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../dist')], // path to your React build
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Output CloudFront URL
    new CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}

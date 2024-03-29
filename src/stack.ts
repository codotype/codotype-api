import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";

// // // //

export class ApiGatewayStack extends cdk.Stack {
    constructor(scope: Construct, id: string, pluginPostfix: string) {
        super(scope, id);

        // Provisions S3 bucket for uploading .zip + .json files
        // Doc: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-s3-readme.html#logging-configuration
        const outputBucket: s3.Bucket = new s3.Bucket(this, "output-bucket", {
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const pluginsEndpointLambda = new lambda.Function(
            this,
            "plugins-endpoint",
            {
                code: new lambda.AssetCode("src/plugins-endpoint"),
                handler: "lambda.handler",
                runtime: lambda.Runtime.NODEJS_16_X,
                timeout: cdk.Duration.seconds(30),
            }
        );

        const previewEndpointLambda = new lambda.Function(
            this,
            "preview-endpoint",
            {
                code: new lambda.AssetCode("src/preview-endpoint"),
                handler: "lambda.handler",
                runtime: lambda.Runtime.NODEJS_16_X,
                timeout: cdk.Duration.seconds(30),
                memorySize: 1024,
            }
        );

        const generateEndpointLambda = new lambda.Function(
            this,
            "generate-endpoint",
            {
                code: new lambda.AssetCode("src/generate-endpoint"),
                handler: "lambda.handler",
                runtime: lambda.Runtime.NODEJS_16_X,
                timeout: cdk.Duration.seconds(30),
                memorySize: 1024,
                environment: {
                    S3_BUCKET_NAME: outputBucket.bucketName,
                },
            }
        );

        // Adds permissions for the generateEndpointLambda to read/write to S3
        outputBucket.grantReadWrite(generateEndpointLambda);

        const getPluginsIntegration = new HttpLambdaIntegration(
            "CodotypeGetPluginsIntegration",
            pluginsEndpointLambda
        );

        const postPreviewIntegration = new HttpLambdaIntegration(
            "CodotypePostPreviewIntegration",
            previewEndpointLambda
        );

        const postGenerateIntegration = new HttpLambdaIntegration(
            "CodotypePostGenerateIntegration",
            generateEndpointLambda
        );

        // Define new HTTP API
        const httpApi = new apigateway.HttpApi(
            this,
            `codotype-${pluginPostfix}-http-api`
        );

        // GET /plugins
        httpApi.addRoutes({
            path: "/plugins",
            methods: [apigateway.HttpMethod.GET],
            integration: getPluginsIntegration,
        });

        // POST /preview
        httpApi.addRoutes({
            path: "/preview",
            methods: [apigateway.HttpMethod.POST],
            integration: postPreviewIntegration,
        });

        // POST /generate
        httpApi.addRoutes({
            path: "/generate",
            methods: [apigateway.HttpMethod.POST],
            integration: postGenerateIntegration,
        });

        // Output the URL
        new CfnOutput(this, "apiUrl", { value: httpApi.url || "n/a" });
        new CfnOutput(this, "/plugins URL", {
            value: httpApi.url + "plugins" || "n/a",
        });
        new CfnOutput(this, "/preview URL", {
            value: httpApi.url + "preview" || "n/a",
        });
        new CfnOutput(this, "/generate URL", {
            value: httpApi.url + "generate" || "n/a",
        });
    }
}

import { expect as expectCDK, countResources } from "@aws-cdk/assert";
import * as cdk from "aws-cdk-lib";
import { ApiGatewayStack } from "../stack";

// // // //

describe("ApiGatewayStack", () => {
    test("loads", () => {
        const app = new cdk.App();

        // Configures CDK stack
        const stack: cdk.Stack = new ApiGatewayStack(app, "ApiGatewayStack");

        // Checks stack resource count
        expectCDK(stack).to(countResources("AWS::Lambda::Function", 1));
    });
});

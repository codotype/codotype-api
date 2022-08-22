import { App } from "aws-cdk-lib";
import { ApiGatewayStack } from "./src/stack";

// // // //

// Defines new CDK App
const app = new App();

// Instantiates the ApiGatewayStack
new ApiGatewayStack(app, "CodotypeTestStack");
app.synth();

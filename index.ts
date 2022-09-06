import { App } from "aws-cdk-lib";
import { ApiGatewayStack } from "./src/stack";

// // // //

// Defines new CDK App
const app = new App();

// TODO - check for PLUGIN_SLUG environment variable
// This will be used to name the CDK stack + it's resources

// Instantiates the ApiGatewayStack
new ApiGatewayStack(app, "CodotypeTestStack");
app.synth();

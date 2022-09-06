import { App } from "aws-cdk-lib";
import { ApiGatewayStack } from "./src/stack";

// // // //

// Pull in PLUGIN_ID env variable
// This will be used to give the stack and its resources unique names
const PLUGIN_ID = process.env.PLUGIN_ID || "";

// Throw error and exit if PLUGIN_ID isn't defined
if (PLUGIN_ID === "") {
    throw new Error("Error! process.env.PLUGIN_ID must be defined.");
}

// Defines new CDK App
const app = new App();

// TODO - check for PLUGIN_ID environment variable
// This will be used to name the CDK stack + it's resources

// Instantiates the ApiGatewayStack
new ApiGatewayStack(app, `codotype-${PLUGIN_ID}`, PLUGIN_ID);
app.synth();

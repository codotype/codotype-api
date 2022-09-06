import { App } from "aws-cdk-lib";
import { ApiGatewayStack } from "./src/stack";

// // // //

// Pull in PLUGIN_ID + GITHUB_REF_NAME env variables
// These will be used to give the stack and its resources unique names
const PLUGIN_ID = process.env.PLUGIN_ID || "";
const GITHUB_REF_NAME = process.env.GITHUB_REF_NAME || "";

// Throw error and exit if PLUGIN_ID isn't defined
if (PLUGIN_ID === "") {
    throw new Error("Error! process.env.PLUGIN_ID must be defined.");
}

// Determine deployEnv postfix
let deployEnv = "local";
if (GITHUB_REF_NAME === "main") {
    deployEnv = "prod";
} else if (GITHUB_REF_NAME === "dev") {
    deployEnv = "stage";
}

// Define postfix used for both the cloudformation stack and its resources
const pluginPostfix = `${PLUGIN_ID}-${deployEnv}`;

// Defines new CDK App
const app = new App();

// Instantiates the ApiGatewayStack
new ApiGatewayStack(app, `codotype-${pluginPostfix}`, pluginPostfix);
app.synth();

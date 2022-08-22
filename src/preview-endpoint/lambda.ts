import { InMemoryFileSystemAdapter, NodeRuntime } from "@codotype/runtime";
import {
    makeUniqueId,
    ProjectBuild,
    ProjectInput,
    RuntimeLogBehaviors,
} from "@codotype/core";

// // // //

// {
//     "version": "2.0",
//     "routeKey": "POST /preview",
//     "rawPath": "/preview",
//     "rawQueryString": "",
//     "headers": { ... }
//     "requestContext": { ... }
//     "body": "{ projectInput: { ... }}" <---------- Stringified ProjectInput JSON is here
//     "isBase64Encoded": false
// }

export const handler = async (
    event: any = {},
    context: any = {}
): Promise<any> => {
    // Log start message
    console.log("preview-endpoint -> start");
    console.log(JSON.stringify(event, null, 4));

    try {
        // Initialize InMemoryFileSystemAdapter
        const fileSystemAdapter = new InMemoryFileSystemAdapter();

        // Initialize Codotype Runtime
        const runtime = new NodeRuntime({
            cwd: process.cwd(),
            logBehavior: RuntimeLogBehaviors.normal,
            fileOverwriteBehavior: "force",
            fileSystemAdapter,
        });

        // Register the plugin
        await runtime.registerPlugin({
            relativePath: "./plugin",
        });

        // Pulls project input from req.body
        const projectInput: ProjectInput = JSON.parse(event.body).projectInput;

        // Defines buildID
        const buildID: string = `${
            projectInput.identifiers.camel
        }-${makeUniqueId()}`;

        // Defines ProjectBuild
        // FEATURE - verify ProjectInput here
        // TODO - add new ProjectBuild primative to core
        const build: ProjectBuild = {
            id: buildID,
            projectInput,
            startTime: "",
            endTime: "",
        };

        // Generates the application
        fileSystemAdapter.files = {};
        await runtime.execute({ build });

        // Send the files back to the client
        context.succeed({
            files: fileSystemAdapter.files,
        });

        // Logs "shutdown" statement
        console.log("preview-endpoint -> shutdown");
        return;
    } catch (error) {
        console.log("ERROR!");
        console.log(error);
        return context.fail(error);
    } finally {
        console.log("Finally!");
    }
};

import { InMemoryFileSystemAdapter, NodeRuntime } from "@codotype/runtime";
import {
    ProjectBuild,
    ProjectInput,
    RuntimeLogBehaviors,
} from "@codotype/core";

// // // //

// ENHANACEMENT - add correct TypeScript interfaces for event + context
// Event type:
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

        // Defines ProjectBuild
        // ENHANCEMENT - verify ProjectInput here
        // ENHANCEMENT - add new ProjectBuild primative to core
        const build: ProjectBuild = {
            projectInput,
            startTime: "",
            endTime: "",
        };

        // Generates the application
        fileSystemAdapter.files = {};
        await runtime.execute({ build });
        const files: { [key: string]: string } = {};

        // Log InMemoryFileSystemAdapter state
        console.log("InMemoryFileSystemAdapter files:");
        console.log(
            JSON.stringify(Object.keys(fileSystemAdapter.files), null, 4)
        );

        // Filters out *-codotype-project.json files so they're not shown in the UI
        Object.keys(fileSystemAdapter.files).forEach((k) => {
            if (!(k.indexOf("-codotype-project.json") > -1)) {
                files[k] = fileSystemAdapter.files[k];
            }
        });

        // TODO - all the files should have the .codotype-out/ prefix remove
        // TODO - this MUST happen before the files are sent to the client
        // TODO - this MUST happen before release
        // Object.keys(files).forEach((fn) => {
        //     const relativeFn = fn.split(".codotype-out/").pop();
        //     if (relativeFn === undefined) return;
        //     relativeFiles[relativeFn] = {
        //         content: files[fn],
        //         isBinary: false,
        //     };
        // });
        
        // Send the files back to the client
        context.succeed({
            files,
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

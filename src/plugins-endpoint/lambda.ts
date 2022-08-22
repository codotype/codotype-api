import { LocalFileSystemAdapter, NodeRuntime } from "@codotype/runtime";
import { RuntimeLogBehaviors } from "@codotype/core";

// // // //

export const handler = async (
    event: any = {},
    context: any = {}
): Promise<any> => {
    // Log start message
    console.log("plugins-endpoint -> start");
    console.log(JSON.stringify(event, null, 4));

    try {
        // Initialize Codotype NodeRuntime
        const runtime = new NodeRuntime({
            cwd: process.cwd(),
            logBehavior: RuntimeLogBehaviors.normal,
            fileOverwriteBehavior: "force",
            fileSystemAdapter: new LocalFileSystemAdapter(),
        });

        // Register the plugin
        await runtime.registerPlugin({
            relativePath: "./plugin",
        });

        // Get the plugins
        const plugins = await runtime.getPlugins();

        // Construct the JSON response
        const jsonResp = plugins.map((p) => p.pluginMetadata);

        // Send the array of plugins in the response
        context.succeed(jsonResp);

        // Logs "shutdown" statement
        console.log("plugins-endpoint -> shutdown");
        return;
    } catch (error) {
        console.log("ERROR!");
        console.log(error);
        return context.fail(error);
    } finally {
        console.log("Finally!");
    }
};

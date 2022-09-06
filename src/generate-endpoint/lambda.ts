import { LocalFileSystemAdapter, NodeRuntime } from "@codotype/runtime";
import { OUTPUT_DIRECTORY } from "@codotype/runtime/dist/constants"; // ENHANCEMENT - export constants in @codotype/runtime
import * as archiver from "archiver";
import * as AWS from "aws-sdk";
import {
    makeUniqueId,
    ProjectBuild,
    ProjectInput,
    ResponseTypes,
    RuntimeLogBehaviors,
} from "@codotype/core";
import { getSignedDownloadUrl, uploadFile } from "./s3";
import { getFilesRecursively } from "./getFilesRecursively";
import { readFileSync } from "fs";
const s3Service = new AWS.S3();

// // // //

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

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
    console.log("generate-endpoint -> start");
    console.log(JSON.stringify(event, null, 4));

    console.log("S3_BUCKET_NAME");
    console.log(S3_BUCKET_NAME);

    // Define CWD const for output
    const cwd = "/tmp";

    try {
        // Initialize InMemoryFileSystemAdapter
        // const fileSystemAdapter = new LocalFileSystemAdapter();

        // Initialize Codotype Runtime
        // NOTE - this is `/tmp` beacuse that determined the output directory of the plugin
        const runtime = new NodeRuntime({
            cwd,
            logBehavior: RuntimeLogBehaviors.normal,
            fileOverwriteBehavior: "force",
            fileSystemAdapter: new LocalFileSystemAdapter(),
        });

        // Register the plugin
        await runtime.registerPlugin({
            absolutePath: "/var/task/plugin",
        });

        // Pulls project input from req.body
        const projectInput: ProjectInput = JSON.parse(event.body).projectInput;

        // Defines buildID
        const buildID: string = `${
            projectInput.identifiers.camel
        }-${makeUniqueId()}`;

        // Defines ProjectBuild
        // ENHANCEMENT - verify ProjectInput here
        // ENHANCEMENT - add new ProjectBuild primative to core
        const build: ProjectBuild = {
            id: buildID,
            projectInput,
            startTime: "",
            endTime: "",
        };

        // Generates the application
        await runtime.execute({ build });

        // Compress files into a .zip archive as a buffer
        const zipArchiveBuffer = await new Promise<Buffer>((resolve) => {
            // Instantiate new .zip file
            const zip = archiver("zip");

            let contentsBuffer: null | Buffer = null;

            zip.on("data", (data) => {
                let bufs: Buffer[] = [data];
                if (contentsBuffer !== null) {
                    bufs = [contentsBuffer, data];
                }
                contentsBuffer = Buffer.concat(bufs);
            });

            zip.on("end", () => {
                // let data = Buffer.concat(buffer);
                console.log("data");
                console.log(contentsBuffer);

                // Resolve the promise if the
                if (contentsBuffer !== null) {
                    return resolve(contentsBuffer);
                }
                console.log("not a buffer?");
                console.log(contentsBuffer);
                throw new Error("Buffer is not a buffer!");
            });

            // Gets all files for this build
            const files = getFilesRecursively(
                `${cwd}/${OUTPUT_DIRECTORY}/${buildID}`
            );

            // Log out files being added to the .zip
            console.log("FILES:");
            console.log(JSON.stringify(files, null, 4));

            // Add each file to the .zip
            files.forEach((filepath) => {
                // Strip output directionr + buildID from file location in .zip file
                const fp = filepath.split(`${buildID}/`).pop() as string;
                console.log(`Append ${fp} to .zip`);
                zip.append(readFileSync(filepath), { name: fp });
                // NOTE: usage is:
                //   .file('contents on file.txt', { name: 'file.txt' })
            });

            // Finalize .zip file
            zip.finalize();
        });

        // // // //
        // Upload .zip + .json files to S3 + generate signed download URL

        // Define key for .json upload
        const s3ObjectKeyJson = `json/${buildID}.json`;
        console.log(`s3ObjectKeyJson: ${s3ObjectKeyJson}`);

        // Define key for .zip upload
        // NOTE - this creates a more human-readable zip filename inside folder named after buildID
        const s3ObjectKeyZip = `zip/${buildID}/${projectInput.identifiers.kebab}.zip`;
        console.log(`s3ObjectKeyZip: ${s3ObjectKeyZip}`);

        // Upload .zip file to S3
        await uploadFile({
            s3Service,
            s3ObjectKey: s3ObjectKeyZip,
            s3BucketName: S3_BUCKET_NAME,
            uploadBuffer: zipArchiveBuffer,
        });

        // Upload codotype-project.json file to S3
        await uploadFile({
            s3Service,
            s3ObjectKey: s3ObjectKeyJson,
            s3BucketName: S3_BUCKET_NAME,
            uploadBuffer: Buffer.from(JSON.stringify(projectInput, null, 4)),
        });

        // Get signed download url for the .zip file
        const s3Response = await getSignedDownloadUrl({
            s3Service,
            s3ObjectKey: s3ObjectKeyZip,
            s3BucketName: S3_BUCKET_NAME,
        });

        // If there was a problem getting the signed download URL, return error response.
        if (!s3Response.success) {
            console.log(
                "generate-endpoint -> error getting signed download url"
            );
            console.log("generate-endpoint -> shutdown");
            context.error({
                message: "unknown error has occurred.",
            });
            return;
        }

        // Send the download link for the .zip file to the client
        context.succeed({
            filepath: s3Response.url,
            type: ResponseTypes.s3,
        });

        // Logs "shutdown" statement
        console.log("generate-endpoint -> shutdown");
        return;
    } catch (error) {
        console.log("ERROR!");
        console.log(error);
        return context.fail(error);
    } finally {
        console.log("Finally!");
    }
};

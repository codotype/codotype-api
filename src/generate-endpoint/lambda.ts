import { InMemoryFileSystemAdapter, NodeRuntime } from "@codotype/runtime";
import * as archiver from "archiver";
import * as AWS from "aws-sdk";
import {
    makeUniqueId,
    ProjectBuild,
    ProjectInput,
    ResponseTypes,
    RuntimeLogBehaviors,
} from "@codotype/core";
import { getSignedDownloadUrl } from "./s3";
const s3Service = new AWS.S3();

// // // //

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

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

    // Define CWD const
    const cwd = "/tmp";

    try {
        // Initialize InMemoryFileSystemAdapter
        const fileSystemAdapter = new InMemoryFileSystemAdapter();

        // Initialize Codotype Runtime
        // NOTE - this is `/tmp` beacuse that determined the output directory of the plugin
        const runtime = new NodeRuntime({
            cwd,
            logBehavior: RuntimeLogBehaviors.normal,
            fileOverwriteBehavior: "force",
            fileSystemAdapter,
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
        // FEATURE - verify ProjectInput here
        // TODO - add new ProjectBuild primative to core
        const build: ProjectBuild = {
            id: buildID,
            projectInput,
            startTime: "",
            endTime: "",
        };

        // Generates the application
        await runtime.execute({ build });

        // Defines key for storage in S3
        // const zipFn = zipFilename(cwd, buildID);
        // const buildDir = buildDirectoryPath(cwd, buildID);
        // const key = filename.split("/").pop();

        // console.log("zip filename");
        // console.log(filename);

        // console.log("buildDir");
        // console.log(buildDir);

        /////////////////////
        /////////////////////

        const myBuffer = await new Promise<Buffer>((resolve) => {
            // NOTE - this might not work for binary files
            const files = fileSystemAdapter.files;

            let zip = archiver("zip");

            let buffer: null | Buffer = null;

            zip.on("data", (data) => {
                let bufs: Buffer[] = [data];
                if (buffer !== null) {
                    bufs = [buffer, data];
                }
                buffer = Buffer.concat(bufs);
            });

            zip.on("end", () => {
                // let data = Buffer.concat(buffer);
                console.log("data");
                console.log(buffer);
                if (buffer !== null) {
                    return resolve(buffer);
                }
                console.log("not a buffer?");
                console.log(buffer);
                throw new Error("Buffer is not a buffer!");
            });

            // TODO - clean this up
            // TODO - update this to read in the output file paths recursively
            // and add each item using zip.appnd(contents, { name: filepath })
            // where contents is a buffer instead of a string
            // this will allow this operation to support binary files,
            // which the current implementation does not
            Object.keys(files).forEach((filepath) => {
                const fp = filepath.split(`${buildID}/`).pop() as string;
                console.log(`Append ${fp}`);
                zip.append(files[filepath], { name: fp });
                // NOTE: usage is:
                //   .file('staticFiles/3.txt', { name: '3.txt' })
            });
            zip.finalize();
        });

        console.log("myBuffer");
        console.log(myBuffer);

        // // // //
        // Upload file to S3 + generate signed download URL

        // [X] - compress output
        // [X] - upload output to S3
        // [X] - generate download url for S3 file
        // [X] - return download url to client
        // [ON_DECK] - fix handling of binary files in compress subroutine
        // [PENDING] - upload build JSON to s3/dynamodb

        // Define key for s3 object
        // NOTE - this creates a more human-readable zip filename inside folder named after buildID
        const s3ObjectKey = `${buildID}/${projectInput.identifiers.kebab}.zip`;
        console.log(`s3ObjectKey: ${s3ObjectKey}`);

        // Upload .zip file to S3 bucket
        // ENHANCEMENT - use s3Obj.upload().promise() instead?
        await new Promise((resolve, reject) => {
            s3Service
                .upload({
                    Bucket: S3_BUCKET_NAME,
                    Key: s3ObjectKey,
                    Body: myBuffer,
                })
                .send((err, data) => {
                    console.log(err, data);
                    // Logs error
                    if (err) {
                        console.log(`upload to s3 -> ERROR`);
                        console.log(err);
                        reject(err);
                        return;
                    }
                    console.log(`upload to s3 -> SUCCESS!`);
                    resolve(true);
                });
        });

        // Get signed download url for the .zip file
        const s3Response = await getSignedDownloadUrl({
            s3Service,
            s3ObjectKey,
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
            filepath: s3Response,
            type: ResponseTypes.s3,
        });

        // TODO - upload codotype-project.json here? *or* dump into dynamodb?

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

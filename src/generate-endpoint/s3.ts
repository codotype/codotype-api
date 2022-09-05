import * as fs from "fs";
import { ProjectBuild } from "@codotype/core";
import * as AWS from "aws-sdk";

// // // //

// Pulls S3 bucket names from process.env
// const AWS_ACCESS_KEY_ID = String(process.env.AWS_ACCESS_KEY_ID);
// const AWS_SECRET_ACCESS_KEY = String(process.env.AWS_SECRET_ACCESS_KEY);
const S3_ZIPS_BUCKET_NAME = String(process.env.S3_ZIPS_BUCKET_NAME);
const S3_JSON_BUCKET_NAME = String(process.env.S3_JSON_BUCKET_NAME);

// AWS SDK Configuration
// NOTE - use this for local development
// AWS.config.update({
//     accessKeyId: AWS_ACCESS_KEY_ID,
//     secretAccessKey: AWS_SECRET_ACCESS_KEY,
// });

// Instantiates new S3 Client
const s3Client = new AWS.S3();

// // // //

// Uploads a build manifest to S3

export function uploadBuildToS3(props: { build: ProjectBuild }) {
    console.log("Uploading build JSON to S3...");

    const { build } = props;

    return new Promise((resolve, reject) => {
        // Stringifies the JSON build object
        const data = JSON.stringify(build, null, 2);
        const key = build.id + ".json";

        // Uploads to S3
        // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
        s3Client.upload(
            {
                Bucket: S3_JSON_BUCKET_NAME,
                Key: key,
                Body: new Buffer(data, "binary"), // Encodes to Base64
                ACL: "public-read", // TODO - should be private
                ContentType: "application/json", // Sets correct ContentType so the ZIP can be downloaded automatically
            },
            (err, resp) => {
                if (err) return reject(err);
                console.log("Successfully uploaded JSON to S3");
                return resolve(resp);
            }
        );
    });
}

// // // //

// Uploads a file to S3 bucket
export function uploadFileToS3(filename: string, key: string) {
    console.log("Uploading to S3...");

    return new Promise((resolve, reject) => {
        // Read in the file, convert it to base64, store to S3
        fs.readFile(filename, (err, data) => {
            if (err) {
                throw err;
            }

            // Uploads to S3
            // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
            s3Client.upload(
                {
                    Bucket: S3_ZIPS_BUCKET_NAME,
                    Key: key,
                    // @ts-ignore
                    Body: new Buffer(data, "binary"), // Encodes to Base64
                    ACL: "public-read",
                    ContentType: "application/zip", // Sets correct ContentType so the ZIP can be downloaded automatically
                },
                (err: any, resp: any) => {
                    if (err) return reject(err);
                    console.log("Successfully uploaded ZIP to S3");
                    return resolve(resp);
                }
            );
        });
    });
}

// // // //

/**
 * getSignedDownloadUrl
 * Gets signed URL for a .zip file stored in S3
 */
export function getSignedDownloadUrl(props: {
    s3Service: AWS.S3;
    s3ObjectKey: string;
    s3BucketName: string;
}): Promise<{ success: boolean; url: string }> {
    console.log("Getting signed S3 url");
    return new Promise((resolve) => {
        // Defines S3.Types.GetObjectRequest
        const getObjectOptions: AWS.S3.Types.GetObjectRequest = {
            Bucket: props.s3BucketName,
            Key: props.s3ObjectKey,
        };

        // Attempts to get the uploaded file from S3
        // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
        props.s3Service.getObject(getObjectOptions, (err) => {
            // File does not exist in S3 bucket
            if (err) return resolve({ success: false, url: "" });

            // If the file DOES exist, returns a signed URL to the uploaded S3 object
            // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
            const url = props.s3Service.getSignedUrl(
                "getObject",
                getObjectOptions
            );
            return resolve({ success: true, url });
        });
    });
}

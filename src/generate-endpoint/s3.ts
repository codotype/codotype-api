import * as AWS from "aws-sdk";

// // // //

/**
 * uploadFile
 * Upload file to S3 bucket
 * ENHANCEMENT - use s3Obj.upload().promise() instead?
 */
export function uploadFile(props: {
    s3Service: AWS.S3;
    s3ObjectKey: string;
    s3BucketName: string;
    uploadBuffer: Buffer;
}): Promise<boolean> {
    const { s3Service, s3BucketName, s3ObjectKey, uploadBuffer } = props;
    return new Promise((resolve, reject) => {
        s3Service
            .upload({
                Bucket: s3BucketName,
                Key: s3ObjectKey,
                Body: uploadBuffer,
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
}

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

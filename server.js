const fs = require('fs');
const morgan = require('morgan');
const express = require('express');
const archiver = require('archiver');
const ObjectId = require('bson-objectid');
const bodyParser = require('body-parser');
const CodotypeRuntime = require('@codotype/runtime');
const omit = require('lodash/omit');
const AWS = require('aws-sdk');

// TODO - add .env & .env.example files, dotenv library
const port = process.env.PORT || 3000;

// // // //

// AWS SDK Configuration
// TODO - pull env variables with dot-env library
AWS.config.update({
  accessKeyId: 'AWS_ACCESS_KEY_ID_GOES_HERE',
  secretAccessKey: 'AWS_SECRET_ACCESS_KEY_GOES_HERE'
});

// Instantiates new S3 Client
const s3Client = new AWS.S3();

// // // //

// Instantiates Codotype runtime
const runtime = new CodotypeRuntime();

// Registers generators
// TODO - update @codotype/runtime and update registerGenerator method calls
// TODO - this should be abstracted into a separate configuration file
// Ideally the runtime would be encapsulated in a docker container to separate things cleanly
// TODO - a database should be added to track how many times each generator has been run
runtime.registerGenerator({ module_path: 'codotype-react-generator' });
runtime.registerGenerator({ module_path: 'codotype-generator-nuxt' });
// runtime.registerGenerator({ module_path: 'codotype-vuejs-vuex-bootstrap-generator' });
runtime.registerGenerator({ absolute_path: '/home/aeksco/code/codotype/codotype-vuejs-vuex-bootstrap-generator' });
runtime.registerGenerator({ module_path: 'codotype-nodejs-express-mongodb-generator' });

// // // //

// Executes build
async function generateApplication({ build }) {
  // Executes the build
  // Invoke runtime directly with parameters
  return runtime.execute({ build })
}

// // // //

// Helper function to create an S3 bucket
// Requests to upload files to a bucket will fail if it doesn't already exist
function createBucket() {
  return new Promise((resolve, reject) => {

    // Defines parameters for new S3 bucket
    const params = {
     Bucket: S3_BUCKET_NAME,
     CreateBucketConfiguration: {
      LocationConstraint: "eu-west-1"
     }
    };

    // Creates bucket
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#createBucket-property
    // Resolves sucessfully if the bucket has already been created
    s3Client.createBucket(params, (err, data) => {
      if (err) {
        if (err.code === S3_BUCKET_CREATED_CODE) return resolve()
        return reject()
      }
      return resolve()
    });

  })
}

// Uploads a file to S3 bucket
function uploadFileToS3(filename) {

  console.log('Uploading to S3...');

  return new Promise((resolve, reject) => {

    // Read in the file, convert it to base64, store to S3
    fs.readFile(filename, (err, data) => {
      if (err) { throw err; }

      // Uploads to S3
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
      s3Client.upload({
        Bucket: S3_BUCKET_NAME,
        Key: filename,
        Body: new Buffer(data, 'binary'), // Encodes to Base64
        ACL: 'public-read',
        ContentType: 'application/pdf' // Sets correct ContentType so the PDF can be viewed in chrome via URL
      }, (err, resp) => {
        if (err) return reject(err);
        console.log('Successfully uploaded PDF to S3');
        return resolve(resp);
      });

    });

  });
}

// Retreives a file from S3
function getSignedDownloadUrl(filename) {
  return new Promise((resolve, reject) => {

    // Defines params for s3Client.getObject
    const getObjectOptions = {
     Bucket: S3_BUCKET_NAME,
     Key: filename
    };

    // Attempts to get the uploaded file from S3
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
    s3Client.getObject(getObjectOptions, (err, data) => {
      // File does not exist in S3 bucket
      if (err) return resolve(false);

      // If the file DOES exist, returns a signed URL to the uploaded S3 object
      // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
      const url = s3Client.getSignedUrl('getObject', getObjectOptions);
      return resolve(url)

    });
  });
}

function zipFilename(id) {
  return __dirname + `/zip/${id}.zip`;
}

// compressBuild
// Zips the build's files
function compressBuild ({ build }) {
  return new Promise((resolve, reject) => {
    // Logs build success
    // bplog(`Build ${buildId} application generated & sanitized`)

    // Pulls build id
    const { id } = build

    // create a file to stream archive data to.
    let output = fs.createWriteStream(zipFilename(id));
    let archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level (?)
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on('close', function() {
      // bplog(archive.pointer() + ' total bytes');
      // bplog('archiver has been finalized and the output file descriptor has closed.');
      console.log('ZIP COMPLETE')
      return resolve();
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function() {
      // bplog('Data has been drained');
    });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        // log warning
      } else {
        // throw error
        throw err;
      }
    });

    // good practice to catch this error explicitly
    archive.on('error', function(err) {
      throw err;
      return reject(err);
    });

    // pipe archive data to the file
    archive.pipe(output);

    // append files from a sub-directory, putting its contents at the root of archive
    archive.directory(__dirname + `/build/${id}/`, false);

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    return archive.finalize();
  })
}

// // // //

function scheduleRemoval(removedBuildId, identifier) {
  const REMOVAL_TIMEOUT = 5000

  setTimeout(() => {

    // Removed generated
    // TODO - this must be fixed. How to do `rm -rf` with Node FS?
    // fs.rmdir(__dirname + '/build/' + removedBuildId + '/' + identifier, (err) => {
      // if (err) {
        // console.log('Error: ', err);
        // throw err
        // return
      // }
      // console.log(`Deleted uncompressed: ${removedBuildId}`);
    // })

    // Removed compressed zip file
    // fs.unlink(__dirname + `/zip/${removedBuildId}.zip`, (err) => {
    //   if (err) {
    //     console.log('Error: ', err);
    //     throw err
    //     return
    //   }
    //   console.log(`Deleted compressed: ${removedBuildId}.zip`);
    // })

  }, REMOVAL_TIMEOUT)

}

// // // //

// Express.js App & Configuration
const app = express();

// Print the request log on console
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// parse JSON and url-encoded query
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// // // //

async function handleRequest(req, res) {
  // Generates unique build ID
  const build_id = 'app_' + ObjectId()

  // Pulls build from req.body
  // TODO - verify build.app && build.stages
  // TODO - rename build.app to build.blueprint
  const { build } = req.body
  build.id = build_id

  // Generates the application
  // TODO - wrap this in an error hander?
  await generateApplication({ build })
  await compressBuild({ build })

  // Responds with the zipped build
  return res.sendFile(zipFilename(build.id))

  // TODO - write build manifest to file
  // TODO - write build manifest to database / S3 <- S3 might be the easiest option short-term
  // TODO - purge old builds && zips

  // // // //
  // S3 Scratch Pad

  // Ensures S3 bucket has been created
  // TODO - this should be moved into a separate function
  // It's just here to ensure no matter what, the S3 bucket will exist when we need it
  // await createBucket();

  // Uploads the renamed filing download to S3
  // await uploadFileToS3(filename);

  // Send the signed URL to the uploaded file
  // zipUrl = await getSignedDownloadUrl(filename);
  // return res.json({ zipUrl });

  // // // //

}


// // // //

// POST /api/generate
// Whats sent to the server:
// const build = {
//   app: app,
//   stages: [{
//     generator_id: 'NUXT_GENERATOR_ID',
//     configuration: {}, // TODO - this will be populated by the UI
//   }]
// }
app.post('/api/generate', handleRequest)

// GET /api/generators
app.get('/api/generators', (req, res) => {
  return res.send(runtime.getGenerators().map(g => omit(g, 'generator_path')))
})

// Starts Express app
// TODO - can we run this app as a serverless function?
// TODO - add a postman collection & environment to this repo
// TODO - create GitHub issues for these TODOs
// TODO - add a controller and some more structure to this app
app.listen(port, () => {
  console.log(`Express is running on port ${port}`)
})

// // // //

// const serverless = require('serverless-http');
// module.exports.handler = serverless(app);

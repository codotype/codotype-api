const fs = require('fs')
const { spawn } = require('child_process')
const morgan = require('morgan')
const express = require('express')
const archiver = require('archiver')
const ObjectId = require('bson-objectid')
const bodyParser = require('body-parser')
const Codotype = require('@codotype/codotype-generator')

// TODO - remove this example after testing
const LibraryExampleApp = require('@codotype/codotype-generator/examples/library.json')

const port = process.env.PORT || 3000

// // // //

// Instantiates Codotype runtime and executes build
async function generateApplication({ app, build }) {
  // Invoke runtime directly with parameters
  const runtime = new Codotype.runtime()

  // Executes the build
  return runtime.execute({ app, build })
}

// // // //

function zipBuild (buildId, res) {

  // Logs build success
  // bplog(`Build ${buildId} application generated & sanitized`)

  // create a file to stream archive data to.
  let output = fs.createWriteStream(__dirname + `/zip/${buildId}.zip`);
  let archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level (?)
  });

  // Sends generated zip to client
  res.writeHead(200, {
    'Content-Type': 'application/zip',
    'Content-disposition': `attachment; filename=${buildId}.zip`
  });

  // Send the file to the page output.
  archive.pipe(res);

  // listen for all archive data to be written
  // 'close' event is fired only when a file descriptor is involved
  output.on('close', function() {
    // bplog(archive.pointer() + ' total bytes');
    // bplog('archiver has been finalized and the output file descriptor has closed.');
    // scheduleRemoval(buildId, appIdentifier)
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
  });

  // pipe archive data to the file
  archive.pipe(output);

  // append files from a sub-directory, putting its contents at the root of archive
  archive.directory(__dirname + `/build/${buildId}/`, false);

  // finalize the archive (ie we are done appending files but streams have to finish yet)
  // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
  archive.finalize();

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
// app.use(morgan('dev'));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// parse JSON and url-encoded query
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// // // //

async function handleRequest(req, res) {
  const buildId = 'app_' + ObjectId() + '/'

  // TODO - remove hardcoded Library app
  const app = LibraryExampleApp

  // TODO - remove this hardcoded build configuration
  // TODO - add buildId to this build configuration
  const build = {
    stages: [{
      project_path: 'nuxt_app',
      generator_path: './node_modules/codotype-generator-nuxt/generator',
      configuration: {},
    }]
  }

  // console.log(app)
  console.log(build)

  //
  await generateApplication({ app, build })
  // return zipBuild(buildId, res)
}

// Serves static VueJS build
// TODO - handle BODY json - anyway to invoke a Yoeman generator directly?
// Right now it's written to a file and generated from that - it would be best to minimize filesystem manipulation
app.post('/api/generate', (req, res) => {
  // const appconfig = req.body
  // if (!appconfig) return res.status(401).json({ err: 'No app template' })
  return handleRequest(req, res)
});

// // // //

// Starts Express app
app.listen(port, () => {
    console.log(`Express is running on port ${port}`)
})

// // // //

// const build = {
//   stages: [{
//     project_path: 'nuxt_app', // TODO - pull this from the generator
//     generator_path: './generator', // TODO - pull this from codotype-meta.json, potentially refactor this approach?
//     configuration: {}, // TODO - this will be populated by the UI
//   }]
// }

// Invoke runtime directly with parameters
// const runtime = new Codotype.runtime()

// Executes the build
// runtime.execute({ app, build })

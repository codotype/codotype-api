const fs = require('fs')
const { spawn } = require('child_process')
const morgan = require('morgan')
const express = require('express')
const archiver = require('archiver')
const ObjectId = require('bson-objectid')
const bodyParser = require('body-parser')
const CodotypeRuntime = require('@codotype/runtime')
const omit = require('lodash/omit');

// TODO - remove this example after testing
const LibraryExampleApp = require('@codotype/generator/examples/library.json')

// TODO - add .env & .env.example files, dotenv librargsy
const port = process.env.PORT || 3000

// // // //

// Instantiates Codotype runtime
const runtime = new CodotypeRuntime()

// Registers generators
runtime.registerGenerator('codotype-generator-nuxt');
runtime.registerGenerator('codotype-vuejs-vuex-bootstrap-generator');
runtime.registerGenerator('codotype-react-generator');
runtime.registerGenerator('codotype-nodejs-express-mongodb-generator');

// // // //

// Executes build
async function generateApplication({ build }) {
  // Executes the build
  // Invoke runtime directly with parameters
  return runtime.execute({ build })
}

// // // //

// compressBuild
// Zips the build's files
function compressBuild ({ build }) {
  return new Promise((resolve, reject) => {
    // Logs build success
    // bplog(`Build ${buildId} application generated & sanitized`)

    // Pulls build id
    const { id } = build

    // create a file to stream archive data to.
    let output = fs.createWriteStream(__dirname + `/zip/${id}.zip`);
    let archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level (?)
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on('close', function() {
      // bplog(archive.pointer() + ' total bytes');
      // bplog('archiver has been finalized and the output file descriptor has closed.');
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
// app.use(morgan('dev'));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// parse JSON and url-encoded query
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// // // //

async function handleRequest(req, res) {
  const build_id = 'app_' + ObjectId()

  // TODo - pull build parameters from req.body
  // TODO - remove this hardcoded build configuration
  // TODO - remove hardcoded Library app
  const build = {
    id: build_id,
    app: LibraryExampleApp,
    stages: [{
      generator_id: 'codotype-generator-nuxt',
      configuration: {}
    }]
  }

  // console.log(build)

  // Generates the application
  await generateApplication({ build })
  await compressBuild({ build })

  // // // //
  // TODO - write build manifest to file
  // TODO - write build manifest to database / S3 <- S3 might be the easiest option short-term
  // TODO - send zip to client
  // TODO - purge old builds && zips

  // Sends generated zip to client
  // res.writeHead(200, {
  //   'Content-Type': 'application/zip',
  //   'Content-disposition': `attachment; filename=${buildId}.zip`
  // });

  // Send the file to the page output.
  // archive.pipe(res);
  res.send({ build })
  // // // //
}


// // // //

// TODO - add a controller and some more structure to this app
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
app.listen(port, () => {
    console.log(`Express is running on port ${port}`)
})

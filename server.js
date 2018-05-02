const fs = require('fs')
const { spawn } = require('child_process')
const morgan = require('morgan')
const express = require('express')
const archiver = require('archiver')
const ObjectId = require('bson-objectid')
const bodyParser = require('body-parser')

const port = process.env.PORT || 3000

// // // //

// Generates application & sanitizes output
function generateApplication(buildId) {

  return new Promise((resolve, reject) => {

    // let args = ['blazeplate', `--appconfig=./build/${buildId}/blazeplate.json`, `--buildId=${buildId}`]
    let args = ['run_blazeplate.sh', buildId]
    const cmd = spawn('sh', args);

    cmd.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    cmd.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });

    cmd.on('close', (code) => {
      if (code === 0) {
        return resolve();
      } else {
        return reject();
      }
    });


  });

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
    fs.unlink(__dirname + `/zip/${removedBuildId}.zip`, (err) => {
      if (err) {
        console.log('Error: ', err);
        throw err
        return
      }
      console.log(`Deleted compressed: ${removedBuildId}.zip`);
    })

  }, REMOVAL_TIMEOUT)

}
// // // //

function writeBuildManifest (req, buildId) {
  return new Promise((resolve, reject) => {

    // Makes /build/buildId
    fs.mkdirSync(__dirname + `/build/${buildId}`)

    // Writes blazeplate.json file
    fs.writeFile(__dirname + `/build/${buildId}/blazeplate.json`, JSON.stringify(req.body, null, 2), (err) => {
      if (err) throw err;
      // console.log(`Build ${buildId} manfiest saved`);
      return resolve()
    });

  });

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

// Serves static VueJS build
// TODO - handle BODY json - anyway to invoke a Yoeman generator directly?
// Right now it's written to a file and generated from that - it would be best to minimize filesystem manipulation
app.post('/api/generate', (req, res) => {

  // Build IDs
  const buildId = 'app_' + ObjectId()
  const appIdentifier = req.body.identifier

  // Log function
  // TODO - export log file with generated app
  let buildLog = []
  function bplog(log) {
    let date = new Date()
    buildLog.push([date.toString(), log.toString()].join(' -- '))
    console.log(log)
  }

  function catchError () {
    return function (err) {
      res.status(500).json({ error: true })
    }
  }

  // Writes the manifest file
  writeBuildManifest(req, buildId).then(() => {

    // Logs manfiest write success
    bplog(`Build ${buildId} manfiest saved`)

    // Generates application codebase
    generateApplication(buildId).then(() => {

      // Logs build success
      bplog(`Build ${buildId} application generated & sanitized`)

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
        bplog(archive.pointer() + ' total bytes');
        bplog('archiver has been finalized and the output file descriptor has closed.');
        scheduleRemoval(buildId, appIdentifier)
      });

      // This event is fired when the data source is drained no matter what was the data source.
      // It is not part of this library but rather from the NodeJS Stream API.
      // @see: https://nodejs.org/api/stream.html#stream_event_end
      output.on('end', function() {
        bplog('Data has been drained');
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
      // archive.directory(`generated_apps/${buildId}/`, false);
      // TODO - removed hardcoded app_name
      archive.directory('build/' + buildId, false);

      // finalize the archive (ie we are done appending files but streams have to finish yet)
      // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
      archive.finalize();

    })
    .catch(catchError())
  })
  .catch(catchError())

});

// // // //

// Starts Express app
app.listen(port, () => {
    console.log(`Express is running on port ${port}`)
})

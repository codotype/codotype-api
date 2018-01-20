const fs = require('fs')
const { spawn } = require('child_process')
const morgan = require('morgan')
const express = require('express')
const archiver = require('archiver')
const ObjectId = require('bson-objectid')

const port = process.env.PORT || 5000

// // // //

function generateApplication() {

  return new Promise((resolve, reject) => {

    let args = ['blazeplate:resources']
    const ls = spawn('yo', args);

    ls.stdout.on('data', (data) => {
      // console.log(`stdout: ${data}`);
    });

    ls.stderr.on('data', (data) => {
      // console.log(`stderr: ${data}`);
    });

    ls.on('close', (code) => {
      return resolve();
    });


  });

}

// // // //

function scheduleRemoval(removedBuildId) {
  const REMOVAL_TIMEOUT = 5000

  setTimeout(() => {

    // Removed generatd
    // TODO - remove hardcoded app_name
    fs.rmdir(__dirname + '/generated_apps/app_name', () => {
      console.log(`Deleted uncompressed: ${removedBuildId}`);
    })

    // Removed compressed zip file
    // TODO - remove hardcoded app_name
    fs.unlink(__dirname + `/generated_zips/${removedBuildId}.zip`, (err) => {
      if (err) {
        console.log('Error: ', err);
        return
      }
      console.log(`Deleted compressed: ${removedBuildId}.zip`);
    })

  }, REMOVAL_TIMEOUT)

}
// // // //

// Express.js App & Configuration
const app = express();

// print the request log on console
// app.use(morgan('dev'));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Serves static VueJS build
app.get('/', (req, res) => {

  let buildId = 'app_' + ObjectId()
  console.log(buildId);

  generateApplication().then(() => {
    console.log('Generated Application')

    // create a file to stream archive data to.
    let output = fs.createWriteStream(__dirname + `/generated_zips/${buildId}.zip`);
    let archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
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
      console.log(archive.pointer() + ' total bytes');
      console.log('archiver has been finalized and the output file descriptor has closed.');
      scheduleRemoval(buildId)
    });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function() {
      console.log('Data has been drained');
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
    archive.directory('generated_apps/app_name/', buildId);

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    archive.finalize();

  });

});

// // // //

// Starts Express app
app.listen(port, () => {
    console.log(`Express is running on port ${port}`)
})

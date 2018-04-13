const fs = require('fs')
const { spawn } = require('child_process')
const morgan = require('morgan')
const express = require('express')
const archiver = require('archiver')
const ObjectId = require('bson-objectid')
const bodyParser = require('body-parser')

const port = process.env.PORT || 3000

// // // //

function generateApplication(buildId) {

  return new Promise((resolve, reject) => {

    let args = ['blazeplate', `--appconfig=./build/${buildId}/blazeplate.json`, `--buildId=${buildId}`]
    const cmd = spawn('yo', args);

    cmd.stdout.on('data', (data) => {
      // console.log(`stdout: ${data}`);
    });

    cmd.stderr.on('data', (data) => {
      // console.log(`stderr: ${data}`);
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


function sanitizeOutput(buildId, appIdentifier, bplog) {

  // # glob-run js-beautify --max_preserve_newlines 1 -r -s 2 'generated_apps/blazeplate_project/web_api/server/**/*.js'

  // # rexreplace '// // // // BLAZEPLATE WHITESPACE\n' '\n' generated_apps/blazeplate_project/web_api/server/api/**/*.model.js
  // # rexreplace '// // // // BLAZEPLATE WHITESPACE' '' generated_apps/blazeplate_project/web_api/server/api/**/*.model.js  // # rexreplace '// // // // BLAZEPLATE WHITESPACE' '' generated_apps/blazeplate_project/web_api/server/api/**/index.js

  // # Turns whitespace markers into actual whitespace (SERVER)
  function runRexReplace(marker) {
    return new Promise((resolve, reject) => {
      let args = [marker, "'\n'", `build/${buildId}/${appIdentifier}/web_api/server/api/**/*.js`]
      const cmd = spawn('rexreplace', args);

      cmd.stdout.on('data', (data) => {
        console.log(`RXR stdout: ${data}`);
      });

      // cmd.stderr.on('data', (data) => {
        // console.log(`stderr: ${data}`);
      // });

      cmd.on('close', (code) => {
        if (code === 0) {
          return resolve();
        } else {
          return reject();
        }
      });

    });
  }

  function runJsBeautify() {
    return new Promise((resolve, reject) => {
      let args = ['js-beautify', '--max_preserve_newlines 1', '-r', '-s 2', `build/${buildId}/${appIdentifier}/web_api/server/api/**/*.js`]
      const cmd = spawn('glob-run', args);

      cmd.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      // cmd.stderr.on('data', (data) => {
        // console.log(`stderr: ${data}`);
      // });

      cmd.on('close', (code) => {
        if (code === 0) {
          return resolve();
        } else {
          return reject();
        }
      });

    });
  }

  return new Promise((resolve, reject) => {
    bplog('runJsBeautify - start')
    runJsBeautify()
    .then(() => {
      bplog('runJsBeautify - done')
      runRexReplace("'// // // // BLAZEPLATE WHITESPACE\n'")
      bplog('RXR - #1 done')
      .then(() => {
        runRexReplace("'// // // // BLAZEPLATE WHITESPACE'")
        bplog('RXR - #2 done')
        .then(() => {
          return resolve()
        })
        .catch((err) => {
          bplog('RXR - #1 error')
          return reject(err)
        })
      })
      .catch((err) => {
        bplog('RXR - #2 error')
        return reject(err)
      })
    })
    .catch((err) => {
      bplog('runJsBeautify - error')
      return reject(err)
    })
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

// print the request log on console
// app.use(morgan('dev'));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// parse JSON and url-encoded query
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serves static VueJS build
// TODO - handle BODY json - anyway to invoke a Yoeman generator directly?
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
      bplog(`Build ${buildId} application generated`)

      // Sanitizes the output of the Yoeman generator
      sanitizeOutput(buildId, appIdentifier, bplog).then(() => {

        // Logs build success
        bplog(`Build ${buildId} output sanitized`)

        // console.log('Generated Application')
        // return res.json({ generated: true }).json()

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
  })
  .catch(catchError())

});

// // // //

// Starts Express app
app.listen(port, () => {
    console.log(`Express is running on port ${port}`)
})

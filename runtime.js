const CodotypeRuntime = require('@codotype/runtime');

// // // //

// Instantiates Codotype runtime
const runtime = new CodotypeRuntime();

// Registers generators
// Ideally the runtime would be encapsulated in a docker container to separate things cleanly
runtime.registerGenerator({ relative_path: './node_modules/codotype-vuejs-vuex-bootstrap-generator' });
runtime.registerGenerator({ relative_path: './node_modules/codotype-nodejs-express-mongodb-generator' });
runtime.registerGenerator({ relative_path: './node_modules/codotype-postman-collection-generator' });
runtime.registerGenerator({ relative_path: './node_modules/codotype-python-falcon-mongodb-generator' });
runtime.registerGenerator({ relative_path: './node_modules/codotype-mongodb-scripts-generator' });

// // // //

module.exports = runtime

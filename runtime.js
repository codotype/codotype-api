const CodotypeRuntime = require('@codotype/runtime');

// // // //

// Instantiates Codotype runtime
const runtime = new CodotypeRuntime();

// Registers generators
// Ideally the runtime would be encapsulated in a docker container to separate things cleanly
// runtime.registerGenerator({ absolute_path: '/home/aeksco/code/codotype/codotype/packages/codotype-vuejs-vuex-bootstrap-generator' });
// runtime.registerGenerator({ absolute_path: '/home/aeksco/code/codotype/codotype/packages/codotype-nodejs-express-mongodb-generator' });
// runtime.registerGenerator({ absolute_path: '/home/aeksco/code/codotype/codotype/packages/codotype-postman-collection-generator' });
runtime.registerGenerator({ absolute_path: '/home/aeksco/code/codotype/codotype/packages/codotype-python-falcon-mongodb-generator' });
// runtime.registerGenerator({ absolute_path: '/home/aeksco/code/codotype/codotype/packages/codotype-mongodb-dataworker' });
// runtime.registerGenerator({ absolute_path: '/home/aeksco/code/codotype/codotype/packages/codotype-hackathon-starter' });
// runtime.registerGenerator({ module_path: 'codotype-mongodb-dataworker' });

// // // //

module.exports = runtime

const CodotypeRuntime = require('@codotype/runtime');

// // // //

// Instantiates Codotype runtime
const runtime = new CodotypeRuntime();

// Registers local generators for development
// runtime.registerGenerator({ relative_path: '../codotype-mevn-generator' });
// runtime.registerGenerator({ relative_path: '../codotype-vuejs-simple-generator' });
// runtime.registerGenerator({ relative_path: '../codotype-hackathon-starter' });
// runtime.registerGenerator({ relative_path: '../codotype-postman-collection-generator' });
// runtime.registerGenerator({ relative_path: '../codotype-python-falcon-mongodb-generator' });
// runtime.registerGenerator({ relative_path: '../codotype-mern-generator' });
// runtime.registerGenerator({ relative_path: '../codotype-vuejs-vuex-bootstrap-generator' });
// runtime.registerGenerator({ relative_path: '../codotype-nodejs-express-mongodb-generator' });
// runtime.registerGenerator({ relative_path: '../codotype-react-generator' });
// runtime.registerGenerator({ relative_path: '../codotype-mongodb-dataworker' });

// // // //

// Registers packaged generators for production deployment
runtime.registerGenerator({ relative_path: './node_modules/@codotype/codotype-hackathon-starter' });
runtime.registerGenerator({ relative_path: './node_modules/@codotype/codotype-vuejs-simple-generator' });
runtime.registerGenerator({ relative_path: './node_modules/@codotype/codotype-nodejs-express-mongodb-generator' });

// // // //

module.exports = runtime

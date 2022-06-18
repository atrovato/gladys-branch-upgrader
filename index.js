const dotenv = require('dotenv');
const Upgrader = require('./lib');

dotenv.config();

const upgrader = new Upgrader();
upgrader.run();

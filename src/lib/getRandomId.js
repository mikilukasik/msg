const uuid = require('uuid-random');
module.exports = uuid;

// faster solution would be better

// module.exports = () => `${Date.now()}${Math.random()}`;
// module.exports = () => Date.now() + Math.random();
// module.exports = () => Math.random();
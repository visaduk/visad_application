// Country registry. Add a new country by dropping a folder under countries/
// with config.js + template.html (and optional field-mapping.json), then
// register it here.

const portugal = require('./portugal/config');
const italy = require('./italy/config');

module.exports = {
  portugal,
  italy,
};

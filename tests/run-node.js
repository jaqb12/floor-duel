// Runs the logic tests in Node: `node tests/run-node.js`.
'use strict';

const { run } = require('./logic.test.js');
const { results, passed, failed } = run();

for (const r of results) {
  console.log((r.ok ? '  ok   ' : '  FAIL ') + r.name + (r.ok ? '' : '\n         ' + r.error));
}
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;

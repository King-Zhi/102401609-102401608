const assert = require('node:assert/strict');
global.Utils = require('../js/utils.js');
Object.assign(global, require('../js/data.js'));
const tests = require('./unit_tests.js');
const runUnitTest = require('./test_helpers.js');

const assertions = {
  strictEqual: assert.strictEqual,
  isTrue: (value, message) => assert.strictEqual(value, true, message),
  isFalse: (value, message) => assert.strictEqual(value, false, message)
};

let failed = 0;
for (const test of tests) {
  try {
    runUnitTest(test, assertions);
    console.log('PASS ' + test.name);
  } catch (error) {
    failed++;
    console.error('FAIL ' + test.name + ': ' + error.message);
  }
}
console.log(`${tests.length - failed}/${tests.length} PASSED, ${failed} FAILED`);
process.exitCode = failed ? 1 : 0;
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const application = spawnSync(process.execPath, [path.join(__dirname, 'app_tests.js')], { stdio: 'inherit' });
if (application.status !== 0) process.exitCode = 1;

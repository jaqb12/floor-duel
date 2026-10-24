// Pure game logic, no DOM. Testable in Node and in the browser. Phase 1.
(function (root) {
  'use strict';
  var logic = {};
  root.Floor = root.Floor || {};
  root.Floor.logic = logic;
  if (typeof module !== 'undefined') module.exports = logic;
})(typeof window !== 'undefined' ? window : globalThis);

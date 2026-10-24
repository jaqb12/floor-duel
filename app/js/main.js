// Wires all modules together and starts the app.
(function () {
  'use strict';
  window.Floor = window.Floor || {};
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('status').textContent = 'Szkielet aplikacji (faza 0). Moduły: ' + Object.keys(Floor).join(', ');
  });
})();

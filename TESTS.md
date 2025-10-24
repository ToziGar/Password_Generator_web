# Running the quick client-side tests

This project includes a very small browser-based test harness to verify core functions (entropy calculations, basic analysis and crack-time estimates).

How to run

1. Open `tests/tests.html` in your browser (double-click the file or use "Open File" in your browser).
2. The page will load `script.js` and run a few assertions. Results appear on the page.

Notes

- These are lightweight smoke tests intended for developer convenience. They run in the browser and do not require any test framework.
- If you want to run automated tests locally in CI, we can add a Node-based harness or integrate Jest/Mocha. Tell me if you'd like that and I will scaffold it.

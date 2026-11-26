// Test-only TypeScript loader using the project's existing compiler.
// Native UI is rendered through React Native Web; device gestures still need phone QA.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const sourceRoot = path.resolve(__dirname, '../src');
const originalLoad = Module._load;
const mocks = new Map();
mocks.set('expo-symbols', { SymbolView: () => null });
Module._load = function (request, parent, isMain) {
  if (mocks.has(request)) return mocks.get(request);
  if (request === 'react-native') request = 'react-native-web';
  if (request.startsWith('@/')) request = path.join(sourceRoot, request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    if (!filename.startsWith(sourceRoot + path.sep)) throw new Error(`Unexpected TS import: ${filename}`);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
}
module.exports = { mocks };

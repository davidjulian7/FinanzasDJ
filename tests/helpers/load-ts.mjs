import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { compileFunction } from "node:vm";
import ts from "typescript";

// Ejecuta los módulos reales con dependencias aisladas, sin conexión a la base de datos.
export function loadTs(file, { mocks = {}, globals = {} } = {}) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const loadedModule = { exports: {} };
    modules.set(filename, loadedModule);
    const nativeRequire = createRequire(filename);
    const require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.startsWith(".")) {
        const target = resolve(dirname(filename), specifier);
        for (const candidate of [`${target}.ts`, `${target}/index.ts`]) {
          if (existsSync(candidate)) return load(candidate);
        }
      }
      return nativeRequire(specifier);
    };
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
      fileName: filename,
    });
    compileFunction(outputText, ["exports", "require", "module", ...Object.keys(globals)], { filename })(
      loadedModule.exports, require, loadedModule, ...Object.values(globals)
    );
    return loadedModule.exports;
  }
  return load(resolve(file));
}

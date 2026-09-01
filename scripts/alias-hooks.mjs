import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

/*
 * Lets a maintenance script import the app's own modules by their "@/" path.
 *
 * Node runs the TypeScript in lib/ unaided — it strips the types itself, and
 * scripts/generate-brand.mjs has imported straight from lib/ for a while. The
 * only thing it cannot do is the path alias, which is a tsconfig convention
 * the runtime has never heard of.
 *
 * That matters more than it sounds. The alternative is a script carrying its
 * own copy of whatever it needed from lib/, and for the script this was
 * written for — rewriting every stored example sentence — the thing it needs
 * is a prompt. A second copy of a prompt is how the sentences being rewritten
 * came to be wrong in the first place.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The extensions an aliased import may have left off. */
const CANDIDATES = ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"];

function resolveAlias(specifier) {
  const base = join(root, specifier.slice(2));

  for (const suffix of CANDIDATES) {
    const candidate = `${base}${suffix}`;
    if (!existsSync(candidate)) continue;

    // A bare hit is only real if it is a file; a directory needs an index,
    // which the later candidates supply.
    if (!suffix && statSync(candidate).isDirectory()) continue;

    return candidate;
  }

  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) {
      return nextResolve(specifier, context);
    }

    const resolved = resolveAlias(specifier);

    if (!resolved) {
      throw new Error(`Could not resolve ${specifier} under ${root}`);
    }

    return { url: pathToFileURL(resolved).href, shortCircuit: true };
  },
});

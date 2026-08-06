import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "src", "locales");
const languages = ["es", "en"];

function flatten(obj, prefix = "") {
  const output = {};
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(output, flatten(value, next));
    } else {
      output[next] = value;
    }
  }
  return output;
}

function placeholders(text) {
  const matches = String(text).match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
  return new Set(matches.map((item) => item.replace(/[{}\s]/g, "")));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = readdirSync(resolve(root, "es")).filter((name) => name.endsWith(".json"));

for (const file of files) {
  for (const language of languages) {
    const path = resolve(root, language, file);
    try {
      JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      throw new Error(`Invalid JSON in ${language}/${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const es = JSON.parse(readFileSync(resolve(root, "es", file), "utf8"));
  const en = JSON.parse(readFileSync(resolve(root, "en", file), "utf8"));

  const esFlat = flatten(es);
  const enFlat = flatten(en);
  const esKeys = Object.keys(esFlat);
  const enKeys = Object.keys(enFlat);

  for (const key of esKeys) {
    assert(key in enFlat, `Missing key in en/${file}: ${key}`);
    assert(String(esFlat[key]).trim().length > 0, `Empty value in es/${file}: ${key}`);
    assert(String(enFlat[key]).trim().length > 0, `Empty value in en/${file}: ${key}`);

    const esVars = placeholders(esFlat[key]);
    const enVars = placeholders(enFlat[key]);
    assert(esVars.size === enVars.size, `Placeholder mismatch in ${file}:${key}`);
    for (const variable of esVars) {
      assert(enVars.has(variable), `Placeholder '${variable}' missing in en/${file}:${key}`);
    }
  }

  for (const key of enKeys) {
    assert(key in esFlat, `Missing key in es/${file}: ${key}`);
  }
}

console.log(`Locale validation passed for ${files.length} module files.`);

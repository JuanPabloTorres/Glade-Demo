import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "src", "locales");
const languages = ["es", "en"];

/**
 * Flattens to leaf strings, descending into arrays as well as objects.
 *
 * Arrays used to terminate the walk, so an array-valued key was compared as
 * the string `"[object Object],[object Object]"`. Everything inside was
 * invisible to every check in this file — and the help page, the single
 * largest block of prose in the product, is built entirely from arrays of
 * `{ question, answer }`. A missing or untranslated FAQ answer could not have
 * been caught. Indexing them (`sections.faq.items.0.answer`) puts that content
 * under the same rules as the rest.
 */
function flatten(obj, prefix = "") {
  const output = {};
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
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

/**
 * Strings that are legitimately spelled the same in both locales, and so must
 * not be reported as untranslated. Every entry is a proper noun, a language
 * endonym, a two-letter code or a word English borrows unchanged — the list is
 * explicit so that adding to it is a decision someone makes on purpose.
 */
const IDENTICAL_BY_DESIGN = new Set([
  // Product name — a brand, not copy.
  "common.json:app.name",
  // "~{{minutes}} min" — an abbreviation both locales share.
  "workspace.json:stages.estimatedMinutesLabel",
  "common.json:labels.spanish",
  "common.json:labels.english",
  "common.json:labels.esCode",
  "common.json:labels.enCode",
  "common.json:labels.no",
  "navigation.json:languageToggle.es",
  "navigation.json:languageToggle.en",
  "settings.json:language.es",
  "settings.json:language.en",
]);

/**
 * Does this value carry translatable prose?
 *
 * Key parity was already enforced, and it passed while the UI still mixed
 * languages — because a key can exist in `en/` holding the Spanish text. This
 * is the check that closes that hole: a value long enough to be a sentence or
 * phrase, identical in both files, is untranslated until proven otherwise.
 * Numbers, punctuation, single short tokens and interpolation-only strings are
 * exempt, because those genuinely do not change between locales.
 */
function isTranslatableProse(value) {
  const text = String(value).replace(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g, "").trim();
  if (text.length < 4) return false;
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(text)) return false;
  // A single capitalised token is usually a proper noun or a UI code.
  return /\s/.test(text) || text.length > 12;
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

  for (const key of esKeys) {
    if (IDENTICAL_BY_DESIGN.has(`${file}:${key}`)) continue;
    if (String(esFlat[key]) !== String(enFlat[key])) continue;
    assert(
      !isTranslatableProse(esFlat[key]),
      `Untranslated value in en/${file}: ${key}\n` +
        `  both locales read: ${JSON.stringify(String(esFlat[key]).slice(0, 90))}\n` +
        `  Translate it, or add "${file}:${key}" to IDENTICAL_BY_DESIGN if the two locales genuinely share the string.`,
    );
  }
}

console.log(`Locale validation passed for ${files.length} module files (keys, placeholders and translated values).`);

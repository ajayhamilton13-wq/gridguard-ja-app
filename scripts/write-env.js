// Turns the ENV_FILE secret into .env plus build environment variables.
// Accepts KEY=value lines, a Firebase config block pasted from the console
// (apiKey: "...", authDomain: "...", ...), or both mixed together.
const fs = require("fs");

const raw = process.env.ENV_FILE || "";
const vars = {};

for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) vars[m[1]] = m[2].replace(/^["']|["'];?$/g, "");
}

const FIREBASE = {
  apiKey: "API_KEY",
  authDomain: "AUTH_DOMAIN",
  databaseURL: "DATABASE_URL",
  projectId: "PROJECT_ID",
  storageBucket: "STORAGE_BUCKET",
  messagingSenderId: "MESSAGING_SENDER_ID",
  appId: "APP_ID",
  measurementId: "MEASUREMENT_ID",
};
for (const [field, suffix] of Object.entries(FIREBASE)) {
  const m = raw.match(new RegExp("\\b" + field + "\\s*:\\s*[\"']([^\"']+)[\"']"));
  const key = "EXPO_PUBLIC_FIREBASE_" + suffix;
  if (m && !vars[key]) vars[key] = m[1];
}

for (const k of Object.keys(vars)) if (!vars[k]) delete vars[k];

const required = ["EXPO_PUBLIC_FIREBASE_API_KEY", "EXPO_PUBLIC_FIREBASE_PROJECT_ID", "EXPO_PUBLIC_FIREBASE_APP_ID"];
const missing = required.filter((k) => !vars[k]);
if (missing.length) {
  console.log(`::error::The ENV_FILE secret is missing ${missing.join(", ")}. Paste your Firebase config or KEY=value lines.`);
  process.exit(1);
}
for (const k of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"]) {
  if (!vars[k]) console.log(`::warning::${k} is not set, so community chat will stay in offline mode.`);
}
if (!vars.GOOGLE_MAPS_API_KEY) console.log("::warning::GOOGLE_MAPS_API_KEY is not set, so the map will be blank on Android.");

const body = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
fs.writeFileSync(".env", body);
if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, body);
console.log("Keys found: " + Object.keys(vars).join(", "));

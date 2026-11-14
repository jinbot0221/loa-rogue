export function configFromEnv() {
  const secret = process.env.SESSION_SECRET ?? "";
  if (
    secret.length < 32 ||
    secret === "replace-with-at-least-32-random-characters"
  )
    throw new Error(
      "Set SESSION_SECRET to a random secret of at least 32 characters in .env",
    );
  const origin = process.env.PUBLIC_ORIGIN ?? "http://localhost:5173";
  const url = new URL(origin);
  if (url.origin !== origin)
    throw new Error(
      "PUBLIC_ORIGIN must be an origin without a trailing slash/path",
    );
  const production = process.env.NODE_ENV === "production";
  if (production && url.protocol !== "https:")
    throw new Error("Production PUBLIC_ORIGIN must use HTTPS");
  return {
    secret,
    origin,
    production,
    databasePath: process.env.DATABASE_PATH ?? "./data/loa.sqlite",
  };
}

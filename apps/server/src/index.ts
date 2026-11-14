import { createApp } from "./app.js";
import { configFromEnv } from "./config.js";
const app = await createApp({ ...configFromEnv(), logger: true });
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid PORT");
await app.listen({ port, host: process.env.HOST ?? "127.0.0.1" });
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });

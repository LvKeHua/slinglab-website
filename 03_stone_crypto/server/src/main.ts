import { openDatabase } from "./db.js";
import { buildServer } from "./index.js";

const PORT = Number(process.env.STONE_PORT ?? 8766);
const HOST = process.env.STONE_HOST ?? "127.0.0.1";

const db = openDatabase();
const app = await buildServer({ db, port: PORT, host: HOST });

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`Stone server listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

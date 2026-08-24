/**
 * At-rest encryption for exchange API credentials.
 * AES-256-GCM with a key derived from STONE_ENC_KEY (or a generated key
 * persisted in the data dir). Mirrors the portfolio-tracker convention:
 * secrets are encrypted before storage and never returned to the client.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./db.js";

const KEY_FILE = join(DATA_DIR, "enc.key");

function loadOrCreateKey(): Buffer {
  if (process.env.STONE_ENC_KEY) {
    return createHash("sha256").update(process.env.STONE_ENC_KEY).digest();
  }
  if (existsSync(KEY_FILE)) {
    return Buffer.from(readFileSync(KEY_FILE, "utf8").trim(), "hex");
  }
  mkdirSync(DATA_DIR, { recursive: true });
  const key = randomBytes(32);
  writeFileSync(KEY_FILE, key.toString("hex"), { mode: 0o600 });
  return key;
}

const KEY = loadOrCreateKey();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(passcode, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasscode(guess: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const guessBuffer = scryptSync(guess, salt, KEY_LENGTH);
  if (hashBuffer.length !== guessBuffer.length) return false;
  return timingSafeEqual(hashBuffer, guessBuffer);
}

import { createHash } from "crypto";

export function computeSha256Hex(input: ArrayBuffer | Buffer | Uint8Array) {
  const buffer = Buffer.isBuffer(input)
    ? input
    : input instanceof Uint8Array
      ? Buffer.from(input)
      : Buffer.from(input);

  return createHash("sha256").update(buffer).digest("hex");
}

import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Stores answer recordings so teachers (and students) can listen again.
 * - BLOB_READ_WRITE_TOKEN set → private Vercel Blob.
 * - Local dev → ./.data/audio.
 * - Vercel without Blob → recordings are not kept.
 */
const LOCAL_DIR = path.join(process.cwd(), ".data", "audio");

export async function saveAudio(key: string, data: Blob): Promise<string | null> {
  const ext = (data.type.includes("mp4") ? "m4a" : data.type.includes("ogg") ? "ogg" : "webm");
  const name = `${key}.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const r = await put(`answers/${name}`, data, {
      access: "private",
      contentType: data.type || "audio/webm",
      addRandomSuffix: true,
    });
    return `blob:${r.pathname}`;
  }
  if (process.env.VERCEL) return null;
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), Buffer.from(await data.arrayBuffer()));
  return `local:${name}`;
}

export async function readAudio(ref: string): Promise<{ body: BodyInit; type: string } | null> {
  if (ref.startsWith("blob:")) {
    const { get } = await import("@vercel/blob");
    const r = await get(ref.slice(5), { access: "private" });
    if (!r || r.statusCode !== 200) return null;
    return { body: r.stream, type: r.blob.contentType };
  }
  if (ref.startsWith("local:")) {
    const name = path.basename(ref.slice(6));
    try {
      const buf = await readFile(path.join(LOCAL_DIR, name));
      const type = name.endsWith(".m4a") ? "audio/mp4" : name.endsWith(".ogg") ? "audio/ogg" : "audio/webm";
      return { body: new Uint8Array(buf), type };
    } catch {
      return null;
    }
  }
  return null;
}

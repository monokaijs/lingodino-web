// lib/r2.ts
import "server-only";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const R2_BUCKET = must("R2_BUCKET");
const accountId = must("R2_ACCOUNT_ID");

export const r2 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: must("R2_ACCESS_KEY_ID"),
    secretAccessKey: must("R2_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: true,
});

export function makeKey(filename: string, folder = "uploads") {
  const safeName = filename
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .replace(/[^\w.\-]+/g, "-")
    .slice(0, 120);

  const id = crypto.randomUUID().slice(0, 10);
  return `${folder}/${id}-${safeName}`;
}

export async function signPut(opts: { key: string; contentType: string; expiresIn?: number }) {
  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: opts.key,
      ContentType: opts.contentType,
    }),
    { expiresIn: opts.expiresIn ?? 600 }
  );
  return { key: opts.key, url };
}

export async function signGet(opts: { key: string; expiresIn?: number; downloadName?: string }) {
  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: opts.key,
      ResponseContentDisposition: opts.downloadName
        ? `attachment; filename="${opts.downloadName}"`
        : undefined,
    }),
    { expiresIn: opts.expiresIn ?? 600 }
  );
  return { key: opts.key, url };
}

export async function deleteKey(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  return { ok: true };
}

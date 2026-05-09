import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import type { Readable } from "stream";

export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
  region: "us-east-1", // MinIO ignores region but SDK requires it
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? "gnet_admin",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "gnet_secret_123",
  },
  forcePathStyle: true, // required for MinIO
});

export const BUCKETS = {
  inputs: "gnet-inputs",
  outputs: "gnet-outputs",
} as const;

export async function uploadToMinio(
  bucket: string,
  key: string,
  body: Buffer | Readable,
  contentType: string,
): Promise<string> {
  // Ensure bucket exists before uploading
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      console.log(`[MinIO] Bucket ${bucket} not found, creating it...`);
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } else {
      throw err;
    }
  }

  const upload = new Upload({
    client: s3,
    params: { Bucket: bucket, Key: key, Body: body, ContentType: contentType },
  });
  await upload.done();

  // Return direct URL (public bucket in dev)
  const endpoint = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";
  return `${endpoint}/${bucket}/${key}`;
}

export async function getPresignedUrl(
  bucket: string,
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function fileExists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as fs from "fs";
import * as path from "path";

const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? "gnet_admin",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "gnet_secret_123",
  },
  forcePathStyle: true,
});

const OUTPUT_BUCKET = "gnet-outputs";
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "http://localhost:9000";

let bucketEnsured = false;
async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: OUTPUT_BUCKET }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: OUTPUT_BUCKET }));
      console.log(`[Storage] Created bucket: ${OUTPUT_BUCKET}`);
    } catch (err: any) {
      // BucketAlreadyOwnedByYou / BucketAlreadyExists are fine
      if (!err?.name?.includes("BucketAlready")) {
        console.error(`[Storage] Failed to create bucket:`, err);
      }
    }
  }
  bucketEnsured = true;
}

export async function uploadOutputDirectory(
  jobId: string,
  outputDir: string,
): Promise<{ filename: string; uri: string; size: number }[]> {
  await ensureBucket();
  const results: { filename: string; uri: string; size: number }[] = [];

  const files = fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : [];
  if (files.length === 0) {
    const placeholderKey = `${jobId}/no-output.txt`;
    await new Upload({
      client: s3,
      params: {
        Bucket: OUTPUT_BUCKET,
        Key: placeholderKey,
        Body: Buffer.from("Job completed but produced no output files."),
        ContentType: "text/plain",
      },
    }).done();

    results.push({
      filename: "no-output.txt",
      uri: `${MINIO_ENDPOINT}/${OUTPUT_BUCKET}/${placeholderKey}`,
      size: 0,
    });
    return results;
  }

  for (const filename of files) {
    const filePath = path.join(outputDir, filename);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const key = `${jobId}/${filename}`;
    const stream = fs.createReadStream(filePath);

    await new Upload({
      client: s3,
      params: {
        Bucket: OUTPUT_BUCKET,
        Key: key,
        Body: stream,
        ContentType: guessContentType(filename),
      },
    }).done();

    results.push({
      filename,
      uri: `${MINIO_ENDPOINT}/${OUTPUT_BUCKET}/${key}`,
      size: stat.size,
    });
  }

  return results;
}

export async function uploadLogs(jobId: string, logs: string): Promise<string> {
  await ensureBucket();
  const key = `${jobId}/execution.log`;
  await new Upload({
    client: s3,
    params: {
      Bucket: OUTPUT_BUCKET,
      Key: key,
      Body: Buffer.from(logs),
      ContentType: "text/plain",
    },
  }).done();
  return `${MINIO_ENDPOINT}/${OUTPUT_BUCKET}/${key}`;
}

function guessContentType(filename: string): string {
  if (filename.endsWith(".json")) return "application/json";
  if (filename.endsWith(".txt")) return "text/plain";
  if (filename.endsWith(".log")) return "text/plain";
  if (filename.endsWith(".csv")) return "text/csv";
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg")) return "image/jpeg";
  if (filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".mp4")) return "video/mp4";
  if (filename.endsWith(".avi")) return "video/x-msvideo";
  if (filename.endsWith(".mkv")) return "video/x-matroska";
  if (filename.endsWith(".exr")) return "image/x-exr";
  if (filename.endsWith(".tiff") || filename.endsWith(".tif")) return "image/tiff";
  if (filename.endsWith(".bmp")) return "image/bmp";
  if (filename.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}


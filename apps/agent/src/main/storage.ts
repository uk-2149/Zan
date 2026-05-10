import { BlobServiceClient } from "@azure/storage-blob";
import * as fs from "fs";
import * as path from "path";

function loadDotEnv(): void {
  const candidates = [
    path.resolve(__dirname, "../../.env"),
    path.resolve(process.cwd(), "apps/agent/.env"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const contents = fs.readFileSync(envPath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }

    break;
  }
}

loadDotEnv();

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = connectionString
  ? BlobServiceClient.fromConnectionString(connectionString)
  : null;

const OUTPUT_CONTAINER =
  process.env.AZURE_STORAGE_CONTAINER_OUTPUTS || "gnet-outputs";

async function ensureContainer(): Promise<void> {
  if (!blobServiceClient) {
    throw new Error("[Azure] AZURE_STORAGE_CONNECTION_STRING is not set.");
  }

  const containerClient =
    blobServiceClient.getContainerClient(OUTPUT_CONTAINER);
  const result = await containerClient.createIfNotExists();
  if (result.succeeded) {
    console.log(`[Storage] Created Azure container: ${OUTPUT_CONTAINER}`);
  }
}

export async function uploadOutputDirectory(
  jobId: string,
  outputDir: string,
): Promise<{ filename: string; uri: string; size: number }[]> {
  await ensureContainer();
  if (!blobServiceClient) {
    throw new Error("[Azure] AZURE_STORAGE_CONNECTION_STRING is not set.");
  }

  const containerClient =
    blobServiceClient.getContainerClient(OUTPUT_CONTAINER);
  const results: { filename: string; uri: string; size: number }[] = [];

  const files = fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : [];
  if (files.length === 0) {
    const placeholderKey = `${jobId}/no-output.txt`;
    const blobClient = containerClient.getBlockBlobClient(placeholderKey);
    await blobClient.uploadData(
      Buffer.from("Job completed but produced no output files."),
      {
        blobHTTPHeaders: { blobContentType: "text/plain" },
      },
    );

    results.push({
      filename: "no-output.txt",
      uri: blobClient.url,
      size: 0,
    });
    return results;
  }

  for (const filename of files) {
    const filePath = path.join(outputDir, filename);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const key = `${jobId}/${filename}`;
    const blobClient = containerClient.getBlockBlobClient(key);
    await blobClient.uploadFile(filePath, {
      blobHTTPHeaders: { blobContentType: guessContentType(filename) },
    });

    results.push({
      filename,
      uri: blobClient.url,
      size: stat.size,
    });
  }

  return results;
}

export async function uploadLogs(jobId: string, logs: string): Promise<string> {
  await ensureContainer();
  if (!blobServiceClient) {
    throw new Error("[Azure] AZURE_STORAGE_CONNECTION_STRING is not set.");
  }

  const containerClient =
    blobServiceClient.getContainerClient(OUTPUT_CONTAINER);
  const key = `${jobId}/execution.log`;
  const blobClient = containerClient.getBlockBlobClient(key);
  await blobClient.uploadData(Buffer.from(logs), {
    blobHTTPHeaders: { blobContentType: "text/plain" },
  });

  return blobClient.url;
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
  if (filename.endsWith(".tiff") || filename.endsWith(".tif"))
    return "image/tiff";
  if (filename.endsWith(".bmp")) return "image/bmp";
  if (filename.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

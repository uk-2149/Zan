import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import type { Readable } from "stream";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  console.warn("[Azure] AZURE_STORAGE_CONNECTION_STRING is not set.");
}

export const blobServiceClient = connectionString
  ? BlobServiceClient.fromConnectionString(connectionString)
  : null;

export const CONTAINERS = {
  inputs: process.env.AZURE_STORAGE_CONTAINER_INPUTS || "gnet-inputs",
  outputs: process.env.AZURE_STORAGE_CONTAINER_OUTPUTS || "gnet-outputs",
} as const;

/**
 * Upload a Buffer or stream to Azure Blob Storage and return its direct URL.
 */
export async function uploadToAzure(
  containerName: string,
  blobName: string,
  body: Buffer | Readable,
  contentType: string
): Promise<string> {
  if (!blobServiceClient) {
    throw new Error("[Azure] BlobServiceClient is not initialized.");
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  if (Buffer.isBuffer(body)) {
    await blockBlobClient.uploadData(body, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  } else {
    // For streams, you generally need to provide the length or upload in blocks.
    // If it's just a general Readable and size is unknown, uploadStream is useful.
    await blockBlobClient.uploadStream(body, 8 * 1024 * 1024, 5, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  }

  return blockBlobClient.url;
}

/**
 * Generates a Shared Access Signature (SAS) URL for securely reading a blob.
 */
export async function generateReadSASUrl(
  containerName: string,
  blobName: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!blobServiceClient || !connectionString) {
    throw new Error("[Azure] BlobServiceClient or connection string is not initialized.");
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  // Extract account name and key to sign the SAS using StorageSharedKeyCredential
  // We can't use generateBlobSASQueryParameters with just a BlobServiceClient initialized via connection string
  // if we don't have the explicit credential, unless we extract it.
  
  // Actually, we can use `blobClient.generateSasUrl` directly if it's available, 
  // but it's simpler to just parse the connection string if we are using StorageSharedKeyCredential
  // Wait, BlobServiceClient created from connection string can generate SAS directly?
  // Let's check the API: blobClient.url + "?" + generateBlobSASQueryParameters(...) requires credential.
  
  const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
  const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);
  
  if (!accountNameMatch || !accountKeyMatch || !accountNameMatch[1] || !accountKeyMatch[1]) {
    throw new Error("Could not parse AccountName or AccountKey from connection string.");
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountNameMatch[1],
    accountKeyMatch[1]
  );

  const expiresOn = new Date();
  expiresOn.setSeconds(expiresOn.getSeconds() + expiresInSeconds);

  const sasOptions = {
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse("r"), // Read permission
    startsOn: new Date(),
    expiresOn,
  };

  const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
  return `${blobClient.url}?${sasToken}`;
}

export async function blobExists(
  containerName: string,
  blobName: string
): Promise<boolean> {
  if (!blobServiceClient) return false;
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    return await blobClient.exists();
  } catch {
    return false;
  }
}

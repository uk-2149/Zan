import { getPresignedUrl, BUCKETS } from "./apps/server/src/lib/minio.js";

async function test() {
  const url = await getPresignedUrl(BUCKETS.inputs, "test.txt");
  console.log("Presigned URL:", url);
}
test();

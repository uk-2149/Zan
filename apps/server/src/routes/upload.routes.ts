import { Router } from "express";
import multer from "multer";
import { verifyJWT } from "../middlewares/verifyJWT.js";
import { uploadToMinio, getPresignedUrl, BUCKETS } from "../lib/minio.js";
import * as path from "path";
import * as crypto from "crypto";

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      ".py",
      ".zip",
      ".tar.gz",
      ".json",
      ".jsonl",
      ".csv",
      ".txt",
      ".blend",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowed = allowed.some((a) => file.originalname.endsWith(a));
    if (isAllowed) cb(null, true);
    else cb(new Error(`File type not allowed: ${ext}`));
  },
});

// POST /api/upload
router.post("/", verifyJWT, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const userId = (req as any).user.id as string;
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const ext = req.file.originalname.includes(".tar.gz")
      ? ".tar.gz"
      : path.extname(req.file.originalname);
    const key = `${userId}/${uniqueId}${ext}`;

    const uri = await uploadToMinio(
      BUCKETS.inputs,
      key,
      req.file.buffer,
      req.file.mimetype,
    );
    const downloadUrl = await getPresignedUrl(BUCKETS.inputs, key);

    console.log(`[Upload] ${req.file.originalname} → ${uri}`);

    res.json({
      success: true,
      uri,
      downloadUrl,
      key,
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (err: any) {
    console.error("[Upload] Error:", err);
    res.status(500).json({ error: "Upload failed: " + (err?.message || "Unknown error") });
  }
});

export { router as uploadRouter };

import { Router } from "express";
import {
  prepareJobSubmit,
  submitJob,
  getMyJobs,
  getMyStats,
  getJobById,
  getJobLogs,
  getJobOutput,
  getJobOutputFile,
  jobComplete,
  updateJobStatus,
  cancelJob,
} from "../controllers/job.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";
import { verifyAgent } from "../middlewares/verifyAgent.js";
import { verifyInternal } from "../middlewares/verifyInternal.js";

const jobRouter: Router = Router();

// Client routes (JWT)
jobRouter.post("/submit/prepare", verifyJWT, prepareJobSubmit);
jobRouter.post("/submit", verifyJWT, submitJob);
jobRouter.get("/my-jobs", verifyJWT, getMyJobs);
jobRouter.get("/my-stats", verifyJWT, getMyStats);
jobRouter.get("/:id/logs", verifyJWT, getJobLogs);
jobRouter.get("/:id/output", verifyJWT, getJobOutput);
jobRouter.get("/:id/outputs", verifyJWT, getJobOutputFile);
jobRouter.get("/:id", verifyJWT, getJobById);
jobRouter.patch("/:id/cancel", verifyJWT, cancelJob);

// Provider agent routes (Signature)
jobRouter.post("/:id/complete", verifyAgent, jobComplete);

// Internal routes (Matchmaker)
jobRouter.patch("/:id/status", verifyInternal, updateJobStatus);

export { jobRouter };

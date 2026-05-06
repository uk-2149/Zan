import { Router } from "express";
import {
  submitJob,
  getMyJobs,
  getJobById,
  jobComplete,
  updateJobStatus,
  cancelJob,
} from "../controllers/job.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";
import { verifyAgent } from "../middlewares/verifyAgent.js";
import { verifyInternal } from "../middlewares/verifyInternal.js";

const jobRouter: Router = Router();

// Client routes (JWT)
jobRouter.post("/submit", verifyJWT, submitJob);
jobRouter.get("/my-jobs", verifyJWT, getMyJobs);
jobRouter.get("/:id", verifyJWT, getJobById);
jobRouter.patch("/:id/cancel", verifyJWT, cancelJob);

// Provider agent routes (Signature)
jobRouter.post("/:id/complete", verifyAgent, jobComplete);

// Internal routes (Matchmaker)
jobRouter.patch("/:id/status", verifyInternal, updateJobStatus);

export { jobRouter };

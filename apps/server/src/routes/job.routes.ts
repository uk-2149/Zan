import { Router } from "express";
import {
  submitJob,
  listClientJobs,
  getJob,
  cancelJob,
  getJobEvents,
} from "../controllers/job.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";

const jobRouter: Router = Router();

jobRouter.use(verifyJWT);

jobRouter.post("/", submitJob);
jobRouter.get("/", listClientJobs);
jobRouter.get("/:id", getJob);
jobRouter.patch("/:id/cancel", cancelJob);
jobRouter.get("/:id/events", getJobEvents);

export { jobRouter };

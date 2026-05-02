import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/db";
import { enqueueJob } from "@/lib/jobQueue";

const ALLOWED_TYPES = [
  "inference", "training", "fine-tune", "embedding",
  "render", "image-gen", "video-gen", "pipeline",
] as const;
type JobType = (typeof ALLOWED_TYPES)[number];

export async function GET(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? "20")),
  );
  const skip = (page - 1) * limit;

  try {
    const [jobs, total] = await prisma.$transaction([
      prisma.job.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          budget: true,
          createdAt: true,
          provider: { select: { gpuModel: true, location: true } },
          escrow: { select: { status: true, amount: true } },
        },
      }),
      prisma.job.count({ where: { clientId } }),
    ]);

    return NextResponse.json({ jobs, total, page, limit });
  } catch (err) {
    console.error("[GET /api/jobs]", err);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = (session.user as { id: string }).id;

  let body: {
    title?: string;
    type?: string;
    inputUri?: string;
    budget?: unknown;
    escrowTxSig?: string;
    requiredVramGB?: unknown;
    requiredGpuTier?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, type, inputUri, budget, escrowTxSig, requiredVramGB, requiredGpuTier } = body;

  if (
    !title?.trim() ||
    !type ||
    !inputUri?.trim() ||
    !budget ||
    !escrowTxSig?.trim()
  ) {
    return NextResponse.json(
      { error: "title, type, inputUri, budget, and escrowTxSig are required" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.includes(type as JobType)) {
    return NextResponse.json(
      { error: `type must be one of: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const budgetNum = Number(budget);
  if (isNaN(budgetNum) || budgetNum <= 0) {
    return NextResponse.json(
      { error: "budget must be a positive number" },
      { status: 400 },
    );
  }

  try {
    const job = await prisma.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          clientId,
          title:           title.trim(),
          type,
          inputUri:        inputUri.trim(),
          budget:          budgetNum,
          status:          "FUNDED",
          requiredGpuTier: requiredGpuTier ? Number(requiredGpuTier) : 0,
          ...(requiredVramGB ? { requiredVramGB: Number(requiredVramGB) } : {}),
        },
      });

      await tx.escrow.create({
        data: {
          jobId: newJob.id,
          amount: budgetNum,
          token: "SOL",
          depositTxSig: escrowTxSig.trim(),
          status: "LOCKED",
        },
      });

      await tx.jobEvent.create({
        data: {
          jobId: newJob.id,
          type: "CREATED",
          metadata: { jobType: type, budget: budgetNum },
        },
      });

      return newJob;
    });

    // Redis enqueue is best-effort: job is already committed in DB as FUNDED.
    // If Redis is temporarily down, the job stays FUNDED in Postgres and can be
    // re-enqueued by a recovery scanner. Never fail the client request over this.
    try {
      await enqueueJob(job.id);
    } catch (queueErr) {
      console.error("[POST /api/jobs] Redis enqueue failed — job will be recovered:", queueErr);
    }

    return NextResponse.json({ success: true, jobId: job.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/jobs]", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}

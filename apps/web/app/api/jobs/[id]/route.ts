import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/db";

const CANCELLABLE = new Set(["CREATED", "FUNDED"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = (session.user as { id: string }).id;

  try {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        escrow: true,
        provider: {
          select: { gpuModel: true, vramGB: true, location: true, tier: true },
        },
      },
    });

    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.clientId !== clientId)
      return NextResponse.json({ error: "Not your job" }, { status: 403 });

    return NextResponse.json({ job });
  } catch (err) {
    console.error("[GET /api/jobs/:id]", err);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = (session.user as { id: string }).id;

  try {
    const job = await prisma.job.findUnique({
      where: { id },
      select: { clientId: true, status: true },
    });

    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.clientId !== clientId)
      return NextResponse.json({ error: "Not your job" }, { status: 403 });

    if (!CANCELLABLE.has(job.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a job with status ${job.status}` },
        { status: 409 },
      );
    }

    await prisma.$transaction([
      prisma.job.update({ where: { id }, data: { status: "FAILED" } }),
      prisma.escrow.update({
        where: { jobId: id },
        data: { status: "RELEASED" },
      }),
      prisma.jobEvent.create({
        data: { jobId: id, type: "CANCELLED", metadata: { by: clientId } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/jobs/:id]", err);
    return NextResponse.json({ error: "Cancel failed" }, { status: 500 });
  }
}

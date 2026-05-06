import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/db";
import crypto from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const nonce = crypto.randomBytes(32).toString('hex');
  const message = `Zan wallet verification\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

  await prisma.user.update({
    where: { id: userId },
    data: {
      walletNonce: nonce,
      walletNonceExpiry: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return NextResponse.json({ message, nonce });
}

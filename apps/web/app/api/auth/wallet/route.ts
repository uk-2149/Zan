import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@repo/db";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { walletAddress, signature, message } = body;

  if (!walletAddress || !signature || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletNonce: true, walletNonceExpiry: true },
  });

  if (!user?.walletNonce || !user.walletNonceExpiry || user.walletNonceExpiry < new Date()) {
    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  if (!message.includes(user.walletNonce)) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  try {
    const publicKey = new PublicKey(walletAddress);
    const signatureBytes = bs58.decode(signature);
    const messageBytes = new TextEncoder().encode(message);

    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { walletAddress, NOT: { id: userId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Wallet already linked to another account" }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress,
        walletNonce: null,
        walletNonceExpiry: null,
      },
    });

    return NextResponse.json({ success: true, walletAddress });
  } catch (err) {
    return NextResponse.json({ error: "Failed to link wallet" }, { status: 500 });
  }
}

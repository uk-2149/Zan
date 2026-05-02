import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { name, email, password, role } = await req.json();
    const selectedRole = role === "PROVIDER" ? "PROVIDER" : "CLIENT";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: selectedRole,
      },
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        userId: user.id,
        role: user.role,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

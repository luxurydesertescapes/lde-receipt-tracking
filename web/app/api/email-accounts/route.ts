import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const accounts = await prisma.emailAccount.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      connectedBy: true,
      lastSyncedAt: true,
      lastSyncError: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ accounts });
}

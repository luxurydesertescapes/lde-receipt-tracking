import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Disconnects an inbox (stops future syncs). Receipts already ingested from
// it stay as-is — this only deletes the stored refresh token/connection.
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/email-accounts/[id]">
) {
  if (!(await currentAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  await prisma.emailAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { currentAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { OVERHEAD_OPTION_VALUE } from "@/lib/constants";

const UpdateSchema = z.object({
  property: z.string().min(1), // property id, or the OVERHEAD sentinel
});

// Resolves a needs-review receipt (e.g. auto-ingested from email, where the
// source text couldn't tell overhead from a specific property) by assigning
// it a category/property directly, independent of matching it to a charge.
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/receipts/[id]">
) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const isOverhead = parsed.data.property === OVERHEAD_OPTION_VALUE;
  const propertyRecord = isOverhead
    ? null
    : await prisma.property.findUnique({ where: { id: parsed.data.property } });
  if (!isOverhead && !propertyRecord) {
    return NextResponse.json({ error: "Unknown property." }, { status: 400 });
  }

  const receipt = await prisma.receipt.update({
    where: { id },
    data: {
      category: isOverhead ? "overhead" : "property",
      propertyId: propertyRecord?.id ?? null,
      needsReview: false,
    },
  });
  return NextResponse.json({ receipt });
}

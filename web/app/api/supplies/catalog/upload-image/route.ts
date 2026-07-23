import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { storage } from "@/lib/storage";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

// Uploads a photo for a catalog item (new or existing — the caller just
// gets a URL back and sets it as SupplyItem.imageUrl via the create/update
// routes) through the same StorageAdapter the receipts feature uses, so it
// lands in Google Drive when configured or web/local-storage/ otherwise.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WEBP, or GIF images are allowed." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (8MB max)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const now = new Date();
  const stored = await storage.save({
    buffer,
    filename: file.name || "supply-item.jpg",
    mimeType: file.type,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    folderLabel: "Supply Catalog",
  });

  return NextResponse.json({ url: stored.fileUrl }, { status: 201 });
}

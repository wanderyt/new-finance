import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { withAuth, badRequestResponse, serverErrorResponse } from "../../../lib/middleware/auth";
import { getOwnedPhoto, getProductPhotoPath } from "../../../lib/utils/fin-photo-storage";

export const GET = withAuth(async (request, user) => {
  const photoId = Number(new URL(request.url).pathname.split("/").pop());
  if (!Number.isSafeInteger(photoId) || photoId <= 0) return badRequestResponse("A valid photo ID is required");
  try {
    const photo = getOwnedPhoto(photoId, user.userId);
    if (!photo) return NextResponse.json({ success: false, error: "Photo not found" }, { status: 404 });
    const buffer = await fs.readFile(getProductPhotoPath(photo.storageKey));
    return new NextResponse(buffer, { headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ success: false, error: "Photo file not found" }, { status: 404 });
    }
    console.error("Failed to serve a product photo", error);
    return serverErrorResponse("Failed to load the product photo");
  }
});

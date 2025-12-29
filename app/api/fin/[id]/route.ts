import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/app/lib/db";
import { fin, finItems, finTags } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/app/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const finId = params.id;

    // Fetch fin by ID
    const userFins = await db
      .select()
      .from(fin)
      .where(and(eq(fin.finId, finId), eq(fin.userId, userId)))
      .limit(1);

    if (userFins.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Optionally fetch line items
    const items = await db
      .select()
      .from(finItems)
      .where(eq(finItems.finId, finId));

    // Optionally fetch tags
    const tags = await db
      .select()
      .from(finTags)
      .where(eq(finTags.finId, finId));

    return NextResponse.json({
      success: true,
      data: {
        ...userFins[0],
        items,
        tags,
      },
    });
  } catch (error) {
    console.error("Failed to fetch fin:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const finId = params.id;

    // Verify ownership
    const userFins = await db
      .select()
      .from(fin)
      .where(and(eq(fin.finId, finId), eq(fin.userId, userId)))
      .limit(1);

    if (userFins.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Delete fin (cascade will handle finItems and finTags)
    await db.delete(fin).where(eq(fin.finId, finId));

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete fin:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}

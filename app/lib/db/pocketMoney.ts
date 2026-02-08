import { db } from "./drizzle";
import { pocketMoney } from "./schema";
import { eq, and, desc, sum } from "drizzle-orm";
import type {
  PocketMoneyData,
  CreatePocketMoneyRequest,
  UpdatePocketMoneyRequest,
} from "../types/api";

/**
 * Get all pocket money transactions for a person
 */
export async function getAllPocketMoney(
  personId: number
): Promise<PocketMoneyData[]> {
  const transactions = await db
    .select()
    .from(pocketMoney)
    .where(eq(pocketMoney.personId, personId))
    .orderBy(desc(pocketMoney.transactionDate));

  return transactions.map((t) => ({
    pocket_money_id: t.pocketMoneyId,
    person_id: t.personId,
    transaction_date: t.transactionDate,
    amount_cents: t.amountCents,
    transaction_type: t.transactionType as
      | "initial"
      | "weekly_allowance"
      | "bonus"
      | "deduction",
    reason: t.reason,
    created_at: t.createdAt,
    created_by: t.createdBy,
  }));
}

/**
 * Get a single pocket money transaction by ID
 */
export async function getPocketMoneyById(
  pocketMoneyId: number
): Promise<PocketMoneyData | null> {
  const transactions = await db
    .select()
    .from(pocketMoney)
    .where(eq(pocketMoney.pocketMoneyId, pocketMoneyId))
    .limit(1);

  if (transactions.length === 0) {
    return null;
  }

  const t = transactions[0];
  return {
    pocket_money_id: t.pocketMoneyId,
    person_id: t.personId,
    transaction_date: t.transactionDate,
    amount_cents: t.amountCents,
    transaction_type: t.transactionType as
      | "initial"
      | "weekly_allowance"
      | "bonus"
      | "deduction",
    reason: t.reason,
    created_at: t.createdAt,
    created_by: t.createdBy,
  };
}

/**
 * Calculate current balance for a person
 */
export async function calculateBalance(personId: number): Promise<number> {
  const result = await db
    .select({ total: sum(pocketMoney.amountCents) })
    .from(pocketMoney)
    .where(eq(pocketMoney.personId, personId));

  return result[0]?.total ? Number(result[0].total) : 0;
}

/**
 * Create a new pocket money transaction
 */
export async function createPocketMoney(
  data: CreatePocketMoneyRequest,
  personId: number,
  createdBy: string
): Promise<PocketMoneyData> {
  const now = new Date().toISOString();
  const transactionDate = data.transaction_date || now;

  const inserted = await db
    .insert(pocketMoney)
    .values({
      personId,
      transactionDate,
      amountCents: data.amount_cents,
      transactionType: data.transaction_type,
      reason: data.reason,
      createdAt: now,
      createdBy,
    })
    .returning();

  const t = inserted[0];
  return {
    pocket_money_id: t.pocketMoneyId,
    person_id: t.personId,
    transaction_date: t.transactionDate,
    amount_cents: t.amountCents,
    transaction_type: t.transactionType as
      | "initial"
      | "weekly_allowance"
      | "bonus"
      | "deduction",
    reason: t.reason,
    created_at: t.createdAt,
    created_by: t.createdBy,
  };
}

/**
 * Update a pocket money transaction (only bonus/deduction types allowed)
 */
export async function updatePocketMoney(
  pocketMoneyId: number,
  data: UpdatePocketMoneyRequest
): Promise<PocketMoneyData | null> {
  // First, check if the transaction exists and is editable
  const existing = await getPocketMoneyById(pocketMoneyId);
  if (!existing) {
    return null;
  }

  // Only allow editing bonus or deduction types
  if (
    existing.transaction_type !== "bonus" &&
    existing.transaction_type !== "deduction"
  ) {
    throw new Error(
      "Only bonus and deduction transactions can be edited. Automatic transactions (weekly_allowance, initial) are protected."
    );
  }

  // Build update object with only provided fields
  const updateData: Partial<{
    transactionType: string;
    amountCents: number;
    reason: string;
    transactionDate: string;
  }> = {};

  if (data.transaction_type !== undefined) {
    updateData.transactionType = data.transaction_type;
  }
  if (data.amount_cents !== undefined) {
    updateData.amountCents = data.amount_cents;
  }
  if (data.reason !== undefined) {
    updateData.reason = data.reason;
  }
  if (data.transaction_date !== undefined) {
    updateData.transactionDate = data.transaction_date;
  }

  const updated = await db
    .update(pocketMoney)
    .set(updateData)
    .where(eq(pocketMoney.pocketMoneyId, pocketMoneyId))
    .returning();

  if (updated.length === 0) {
    return null;
  }

  const t = updated[0];
  return {
    pocket_money_id: t.pocketMoneyId,
    person_id: t.personId,
    transaction_date: t.transactionDate,
    amount_cents: t.amountCents,
    transaction_type: t.transactionType as
      | "initial"
      | "weekly_allowance"
      | "bonus"
      | "deduction",
    reason: t.reason,
    created_at: t.createdAt,
    created_by: t.createdBy,
  };
}

/**
 * Delete a pocket money transaction (only bonus/deduction types allowed)
 */
export async function deletePocketMoney(
  pocketMoneyId: number
): Promise<boolean> {
  // First, check if the transaction exists and is deletable
  const existing = await getPocketMoneyById(pocketMoneyId);
  if (!existing) {
    return false;
  }

  // Only allow deleting bonus or deduction types
  if (
    existing.transaction_type !== "bonus" &&
    existing.transaction_type !== "deduction"
  ) {
    throw new Error(
      "Only bonus and deduction transactions can be deleted. Automatic transactions (weekly_allowance, initial) are protected."
    );
  }

  await db
    .delete(pocketMoney)
    .where(eq(pocketMoney.pocketMoneyId, pocketMoneyId));

  return true;
}

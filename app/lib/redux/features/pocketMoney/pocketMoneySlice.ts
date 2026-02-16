import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  createSelector,
} from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../../store";
import type {
  PocketMoneyData,
  CreatePocketMoneyRequest,
  UpdatePocketMoneyRequest,
  PocketMoneyListResponse,
  MonthGroup,
  DayGroup,
} from "@/app/lib/types/api";

export interface PocketMoneyState {
  balance: number;
  transactions: PocketMoneyData[];
  isLoading: boolean;
  error: string | null;
  expandedMonths: string[];
}

const initialState: PocketMoneyState = {
  balance: 0,
  transactions: [],
  isLoading: false,
  error: null,
  expandedMonths: [],
};

// Async thunk for fetching pocket money list
export const fetchPocketMoneyAsync = createAsyncThunk(
  "pocketMoney/fetchList",
  async (personId: number, { rejectWithValue }) => {
    try {
      const response = await axios.get<PocketMoneyListResponse>(
        `/api/pocket-money/list?personId=${personId}`
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch pocket money"
      );
    }
  }
);

// Async thunk for creating pocket money transaction
export const createPocketMoneyAsync = createAsyncThunk(
  "pocketMoney/create",
  async (data: CreatePocketMoneyRequest, { rejectWithValue }) => {
    try {
      const response = await axios.post<{ success: true; data: PocketMoneyData }>(
        "/api/pocket-money/create",
        data
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create transaction"
      );
    }
  }
);

// Async thunk for updating pocket money transaction
export const updatePocketMoneyAsync = createAsyncThunk(
  "pocketMoney/update",
  async (
    { id, data }: { id: number; data: UpdatePocketMoneyRequest },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.put<{ success: true; data: PocketMoneyData }>(
        `/api/pocket-money/${id}`,
        data
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update transaction"
      );
    }
  }
);

// Async thunk for deleting pocket money transaction
export const deletePocketMoneyAsync = createAsyncThunk(
  "pocketMoney/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/pocket-money/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to delete transaction"
      );
    }
  }
);

const pocketMoneySlice = createSlice({
  name: "pocketMoney",
  initialState,
  reducers: {
    toggleMonthExpanded: (state, action: PayloadAction<string>) => {
      const monthKey = action.payload;
      if (state.expandedMonths.includes(monthKey)) {
        state.expandedMonths = state.expandedMonths.filter(
          (m) => m !== monthKey
        );
      } else {
        state.expandedMonths.push(monthKey);
      }
    },
    expandAllMonths: (state) => {
      // Get all unique month keys from transactions
      const monthKeys = new Set(
        state.transactions.map((t) => {
          const date = new Date(t.transaction_date);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        })
      );
      state.expandedMonths = Array.from(monthKeys);
    },
    collapseAllMonths: (state) => {
      state.expandedMonths = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch pocket money list
      .addCase(fetchPocketMoneyAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchPocketMoneyAsync.fulfilled,
        (state, action: PayloadAction<PocketMoneyListResponse>) => {
          state.isLoading = false;
          state.balance = action.payload.balance;
          state.transactions = action.payload.transactions;
        }
      )
      .addCase(fetchPocketMoneyAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create pocket money transaction
      .addCase(createPocketMoneyAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        createPocketMoneyAsync.fulfilled,
        (state, action: PayloadAction<PocketMoneyData>) => {
          state.isLoading = false;
          // Add new transaction to the list
          state.transactions.unshift(action.payload);
          // Update balance
          state.balance += action.payload.amount_cents;
        }
      )
      .addCase(createPocketMoneyAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Update pocket money transaction
      .addCase(updatePocketMoneyAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        updatePocketMoneyAsync.fulfilled,
        (state, action: PayloadAction<PocketMoneyData>) => {
          state.isLoading = false;
          // Find and replace the updated transaction
          const index = state.transactions.findIndex(
            (t) => t.pocket_money_id === action.payload.pocket_money_id
          );
          if (index !== -1) {
            // Calculate balance difference
            const oldAmount = state.transactions[index].amount_cents;
            const newAmount = action.payload.amount_cents;
            state.balance += newAmount - oldAmount;
            // Update transaction
            state.transactions[index] = action.payload;
          }
        }
      )
      .addCase(updatePocketMoneyAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Delete pocket money transaction
      .addCase(deletePocketMoneyAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        deletePocketMoneyAsync.fulfilled,
        (state, action: PayloadAction<number>) => {
          state.isLoading = false;
          // Find the transaction to delete
          const transaction = state.transactions.find(
            (t) => t.pocket_money_id === action.payload
          );
          if (transaction) {
            // Update balance
            state.balance -= transaction.amount_cents;
            // Remove transaction from list
            state.transactions = state.transactions.filter(
              (t) => t.pocket_money_id !== action.payload
            );
          }
        }
      )
      .addCase(deletePocketMoneyAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  toggleMonthExpanded,
  expandAllMonths,
  collapseAllMonths,
  clearError,
} = pocketMoneySlice.actions;

// Selectors
export const selectPocketMoneyBalance = (state: RootState) =>
  state.pocketMoney.balance;

export const selectPocketMoneyTransactions = (state: RootState) =>
  state.pocketMoney.transactions;

export const selectPocketMoneyLoading = (state: RootState) =>
  state.pocketMoney.isLoading;

export const selectPocketMoneyError = (state: RootState) =>
  state.pocketMoney.error;

export const selectExpandedMonths = (state: RootState) =>
  state.pocketMoney.expandedMonths;

// Selector to group transactions by month and day
export const selectPocketMoneyGroupedByMonth = createSelector(
  [selectPocketMoneyTransactions],
  (transactions): MonthGroup[] => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Group by month key, then by day key
    const monthMap = new Map<
      string,
      Map<string, { date: Date; transactions: PocketMoneyData[]; totalCents: number }>
    >();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.transaction_date);
      // Use UTC methods to avoid timezone issues
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const dayKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, new Map());
      }

      const dayMap = monthMap.get(monthKey)!;
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, {
          date,
          transactions: [],
          totalCents: 0,
        });
      }

      const dayData = dayMap.get(dayKey)!;
      dayData.transactions.push(transaction);
      dayData.totalCents += transaction.amount_cents;
    });

    // Convert to array and calculate month totals
    const monthGroups: MonthGroup[] = Array.from(monthMap.entries())
      .map(([monthKey, dayMap]) => {
        const days: DayGroup[] = Array.from(dayMap.entries())
          .map(([dayKey, dayData]) => ({
            dayKey,
            date: dayData.date,
            fins: dayData.transactions as any[], // Cast to FinData for compatibility
            totalCents: dayData.totalCents,
          }))
          .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort days descending

        const totalCents = days.reduce((sum, day) => sum + day.totalCents, 0);

        return {
          monthKey,
          days,
          totalCents,
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey)); // Sort months descending

    return monthGroups;
  }
);

export default pocketMoneySlice.reducer;

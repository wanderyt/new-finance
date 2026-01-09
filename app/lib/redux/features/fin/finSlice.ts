import { createSlice, createAsyncThunk, PayloadAction, createSelector } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../../store";
import {
  FinData,
  CreateFinRequest,
  CreateFinResponse,
  UpdateFinRequest,
  UpdateFinResponse,
  ListFinResponse,
  SearchFilters,
  MonthGroup,
  DayGroup,
} from "@/app/lib/types/api";

export interface FinState {
  fins: FinData[];
  currentFin: FinData | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    type: "all" | "expense" | "income";
    startDate?: string;
    endDate?: string;
  };

  history: {
    data: FinData[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    offset: number;

    searchFilters: SearchFilters;

    expandedMonths: string[];
    expandedDays: string[];
  };
}

const initialState: FinState = {
  fins: [],
  currentFin: null,
  isLoading: false,
  error: null,
  filters: {
    type: "all",
  },

  history: {
    data: [],
    isLoading: false,
    error: null,
    hasMore: true,
    offset: 0,

    searchFilters: {
      type: "all",
      dateRange: {
        preset: "all",
      },
    },

    expandedMonths: [],
    expandedDays: [],
  },
};

// Async thunk for fetching fins list
export const fetchFinsAsync = createAsyncThunk<
  FinData[],
  { type?: "expense" | "income"; startDate?: string; endDate?: string } | void,
  { rejectValue: string }
>("fin/fetchFins", async (params, { rejectWithValue }) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append("type", params.type);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const url = `/api/fin${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response = await axios.get<{ success: boolean; data: FinData[] }>(
      url,
      { withCredentials: true }
    );

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to fetch transactions"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for fetching single fin
export const fetchFinByIdAsync = createAsyncThunk<
  FinData,
  string,
  { rejectValue: string }
>("fin/fetchFinById", async (finId, { rejectWithValue }) => {
  try {
    const response = await axios.get<{ success: boolean; data: FinData }>(
      `/api/fin/${finId}`,
      { withCredentials: true }
    );

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to fetch transaction"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for creating fin
export const createFinAsync = createAsyncThunk<
  FinData,
  CreateFinRequest,
  { rejectValue: string }
>("fin/createFin", async (data, { rejectWithValue }) => {
  try {
    const response = await axios.post<CreateFinResponse>(
      "/api/fin/create",
      data,
      { withCredentials: true }
    );

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to create transaction"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for updating fin
export const updateFinAsync = createAsyncThunk<
  FinData,
  UpdateFinRequest,
  { rejectValue: string }
>("fin/updateFin", async (data, { rejectWithValue }) => {
  try {
    const response = await axios.patch<UpdateFinResponse>(
      "/api/fin/update",
      data,
      { withCredentials: true }
    );

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to update transaction"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for deleting fin
export const deleteFinAsync = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("fin/deleteFin", async (finId, { rejectWithValue }) => {
  try {
    await axios.delete(`/api/fin/${finId}`, { withCredentials: true });
    return finId;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to delete transaction"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for analyzing receipt
export const analyzeReceiptAsync = createAsyncThunk<
  {
    lineItems: Array<{
      name: string;
      amount: number;
      quantity?: number;
      unit?: string;
    }>;
    totalAmount: number;
    detectedCurrency?: string;
    merchant?: string;
    date?: string;
  },
  File,
  { rejectValue: string }
>("fin/analyzeReceipt", async (file, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append("receipt", file);

    const response = await axios.post("/api/receipts/analyze", formData, {
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to analyze receipt"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Helper function to calculate date range from filter preset
function calculateDateRange(
  dateRange?: SearchFilters["dateRange"]
): { dateFrom?: string; dateTo?: string } {
  if (!dateRange) return {};

  const now = new Date();

  switch (dateRange.preset) {
    case "all":
      return {};

    case "thisMonth": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        dateFrom: startOfMonth.toISOString(),
        dateTo: now.toISOString(),
      };
    }

    case "thisYear": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        dateFrom: startOfYear.toISOString(),
        dateTo: now.toISOString(),
      };
    }

    case "lastYear": {
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      return {
        dateFrom: startOfLastYear.toISOString(),
        dateTo: endOfLastYear.toISOString(),
      };
    }

    case "custom":
      return {
        dateFrom: dateRange.customStart,
        dateTo: dateRange.customEnd,
      };

    default:
      return {};
  }
}

// Async thunk for fetching history with pagination
export const fetchHistoryAsync = createAsyncThunk<
  { data: FinData[]; hasMore: boolean },
  { limit?: number; offset?: number; filters?: SearchFilters },
  { rejectValue: string }
>("fin/fetchHistory", async (params, { rejectWithValue }) => {
  try {
    const limit = params.limit || 100;
    const offset = params.offset || 0;
    const filters = params.filters;

    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (filters?.type && filters.type !== "all") {
      queryParams.append("type", filters.type);
    }

    const { dateFrom, dateTo } = calculateDateRange(filters?.dateRange);
    if (dateFrom) queryParams.append("dateFrom", dateFrom);
    if (dateTo) queryParams.append("dateTo", dateTo);

    const response = await axios.get<ListFinResponse>(
      `/api/fin/list?${queryParams.toString()}`,
      { withCredentials: true }
    );

    return {
      data: response.data.data,
      hasMore: response.data.pagination.hasMore,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to fetch history"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for loading more history (infinite scroll)
export const loadMoreHistoryAsync = createAsyncThunk<
  { data: FinData[]; hasMore: boolean },
  void,
  { state: RootState; rejectValue: string }
>("fin/loadMoreHistory", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const { offset, searchFilters, hasMore } = state.fin.history;

    if (!hasMore) {
      return { data: [], hasMore: false };
    }

    const newOffset = offset + 100;
    const queryParams = new URLSearchParams({
      limit: "100",
      offset: newOffset.toString(),
    });

    if (searchFilters.type !== "all") {
      queryParams.append("type", searchFilters.type);
    }

    const { dateFrom, dateTo } = calculateDateRange(searchFilters.dateRange);
    if (dateFrom) queryParams.append("dateFrom", dateFrom);
    if (dateTo) queryParams.append("dateTo", dateTo);

    const response = await axios.get<ListFinResponse>(
      `/api/fin/list?${queryParams.toString()}`,
      { withCredentials: true }
    );

    return {
      data: response.data.data,
      hasMore: response.data.pagination.hasMore,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to load more history"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for applying filters (resets data and offset)
export const applyHistoryFiltersAsync = createAsyncThunk<
  { data: FinData[]; hasMore: boolean },
  SearchFilters,
  { rejectValue: string }
>("fin/applyHistoryFilters", async (filters, { rejectWithValue }) => {
  try {
    const queryParams = new URLSearchParams({
      limit: "100",
      offset: "0",
    });

    if (filters.type !== "all") {
      queryParams.append("type", filters.type);
    }

    const { dateFrom, dateTo } = calculateDateRange(filters.dateRange);
    if (dateFrom) queryParams.append("dateFrom", dateFrom);
    if (dateTo) queryParams.append("dateTo", dateTo);

    const response = await axios.get<ListFinResponse>(
      `/api/fin/list?${queryParams.toString()}`,
      { withCredentials: true }
    );

    return {
      data: response.data.data,
      hasMore: response.data.pagination.hasMore,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to apply filters"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

const finSlice = createSlice({
  name: "fin",
  initialState,
  reducers: {
    setFilters: (
      state,
      action: PayloadAction<{
        type?: "all" | "expense" | "income";
        startDate?: string;
        endDate?: string;
      }>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentFin: (state) => {
      state.currentFin = null;
    },

    setHistoryFilters: (state, action: PayloadAction<Partial<SearchFilters>>) => {
      state.history.searchFilters = {
        ...state.history.searchFilters,
        ...action.payload,
      };
    },

    toggleMonthExpanded: (state, action: PayloadAction<string>) => {
      const monthKey = action.payload;
      const index = state.history.expandedMonths.indexOf(monthKey);
      if (index > -1) {
        state.history.expandedMonths.splice(index, 1);
      } else {
        state.history.expandedMonths.push(monthKey);
      }
    },

    toggleDayExpanded: (state, action: PayloadAction<string>) => {
      const dayKey = action.payload;
      const index = state.history.expandedDays.indexOf(dayKey);
      if (index > -1) {
        state.history.expandedDays.splice(index, 1);
      } else {
        state.history.expandedDays.push(dayKey);
      }
    },

    clearHistoryData: (state) => {
      state.history.data = [];
      state.history.offset = 0;
      state.history.hasMore = true;
    },

    resetHistoryFilters: (state) => {
      state.history.searchFilters = {
        type: "all",
        dateRange: { preset: "all" },
      };
    },
  },
  extraReducers: (builder) => {
    // Fetch fins
    builder
      .addCase(fetchFinsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFinsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.fins = action.payload;
      })
      .addCase(fetchFinsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch transactions";
      });

    // Fetch fin by ID
    builder
      .addCase(fetchFinByIdAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFinByIdAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentFin = action.payload;
      })
      .addCase(fetchFinByIdAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch transaction";
      });

    // Create fin
    builder
      .addCase(createFinAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createFinAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.fins.unshift(action.payload);
      })
      .addCase(createFinAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to create transaction";
      });

    // Update fin
    builder
      .addCase(updateFinAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateFinAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.fins.findIndex(
          (fin) => fin.finId === action.payload.finId
        );
        if (index !== -1) {
          state.fins[index] = action.payload;
        }
        if (state.currentFin?.finId === action.payload.finId) {
          state.currentFin = action.payload;
        }
      })
      .addCase(updateFinAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to update transaction";
      });

    // Delete fin
    builder
      .addCase(deleteFinAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteFinAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.fins = state.fins.filter((fin) => fin.finId !== action.payload);
        if (state.currentFin?.finId === action.payload) {
          state.currentFin = null;
        }
      })
      .addCase(deleteFinAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to delete transaction";
      });

    // Analyze receipt
    builder
      .addCase(analyzeReceiptAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(analyzeReceiptAsync.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(analyzeReceiptAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to analyze receipt";
      });

    // Fetch history
    builder
      .addCase(fetchHistoryAsync.pending, (state) => {
        state.history.isLoading = true;
        state.history.error = null;
      })
      .addCase(fetchHistoryAsync.fulfilled, (state, action) => {
        state.history.isLoading = false;
        state.history.data = action.payload.data;
        state.history.hasMore = action.payload.hasMore;
        state.history.offset = 0;
      })
      .addCase(fetchHistoryAsync.rejected, (state, action) => {
        state.history.isLoading = false;
        state.history.error = action.payload || "Failed to fetch history";
      });

    // Load more history
    builder
      .addCase(loadMoreHistoryAsync.pending, (state) => {
        state.history.isLoading = true;
      })
      .addCase(loadMoreHistoryAsync.fulfilled, (state, action) => {
        state.history.isLoading = false;
        state.history.data.push(...action.payload.data);
        state.history.hasMore = action.payload.hasMore;
        state.history.offset += 100;
      })
      .addCase(loadMoreHistoryAsync.rejected, (state, action) => {
        state.history.isLoading = false;
        state.history.error = action.payload || "Failed to load more history";
      });

    // Apply history filters
    builder
      .addCase(applyHistoryFiltersAsync.pending, (state) => {
        state.history.isLoading = true;
        state.history.error = null;
      })
      .addCase(applyHistoryFiltersAsync.fulfilled, (state, action) => {
        state.history.isLoading = false;
        state.history.data = action.payload.data;
        state.history.hasMore = action.payload.hasMore;
        state.history.offset = 0;
      })
      .addCase(applyHistoryFiltersAsync.rejected, (state, action) => {
        state.history.isLoading = false;
        state.history.error = action.payload || "Failed to apply filters";
      });
  },
});

export const {
  setFilters,
  clearError,
  clearCurrentFin,
  setHistoryFilters,
  toggleMonthExpanded,
  toggleDayExpanded,
  clearHistoryData,
  resetHistoryFilters,
} = finSlice.actions;

// Selectors
export const selectFins = (state: RootState) => state.fin.fins;
export const selectCurrentFin = (state: RootState) => state.fin.currentFin;
export const selectIsLoading = (state: RootState) => state.fin.isLoading;
export const selectError = (state: RootState) => state.fin.error;
export const selectFilters = (state: RootState) => state.fin.filters;

// Filtered fins selector
export const selectFilteredFins = (state: RootState) => {
  const { fins, filters } = state.fin;

  return fins.filter((fin) => {
    if (filters.type !== "all" && fin.type !== filters.type) {
      return false;
    }
    if (filters.startDate && fin.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && fin.date > filters.endDate) {
      return false;
    }
    return true;
  });
};

// History selectors
export const selectHistoryData = (state: RootState) => state.fin.history.data;
export const selectHistoryIsLoading = (state: RootState) => state.fin.history.isLoading;
export const selectHistoryError = (state: RootState) => state.fin.history.error;
export const selectHistoryHasMore = (state: RootState) => state.fin.history.hasMore;
export const selectHistoryFilters = (state: RootState) => state.fin.history.searchFilters;

// Filtered history selector (applies client-side filters)
export const selectFilteredHistory = createSelector(
  [selectHistoryData, selectHistoryFilters],
  (data, filters): FinData[] => {
    return data.filter((fin) => {
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        const matches = [
          fin.merchant,
          fin.category,
          fin.subcategory,
          fin.comment,
        ].some((field) => field?.toLowerCase().includes(keyword));

        if (!matches) return false;
      }

      if (filters.categories && filters.categories.length > 0) {
        const finCat = `${fin.category}:${fin.subcategory}`;
        if (!filters.categories.includes(finCat)) return false;
      }

      if (filters.amountRange) {
        const amount = fin.amountCadCents;
        if (filters.amountRange.min && amount < filters.amountRange.min) {
          return false;
        }
        if (filters.amountRange.max && amount > filters.amountRange.max) {
          return false;
        }
      }

      return true;
    });
  }
);

// Grouped history selector (groups by month, then by day)
export const selectHistoryGroupedByMonth = createSelector(
  [selectFilteredHistory],
  (fins): MonthGroup[] => {
    const monthMap = new Map<string, Map<string, FinData[]>>();

    fins.forEach((fin) => {
      const date = fin.isScheduled && fin.scheduledOn ? fin.scheduledOn : fin.date;
      const monthKey = date.substring(0, 7);
      const dayKey = date.substring(0, 10);

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, new Map());
      }

      const dayMap = monthMap.get(monthKey)!;
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }

      dayMap.get(dayKey)!.push(fin);
    });

    return Array.from(monthMap.entries())
      .map(([monthKey, dayMap]) => {
        const days: DayGroup[] = Array.from(dayMap.entries())
          .map(([dayKey, fins]) => ({
            dayKey,
            date: new Date(dayKey),
            fins,
            totalCents: fins.reduce(
              (sum, fin) =>
                sum +
                (fin.type === "expense" ? fin.amountCadCents : -fin.amountCadCents),
              0
            ),
          }))
          .sort((a, b) => b.dayKey.localeCompare(a.dayKey));

        return {
          monthKey,
          days,
          totalCents: days.reduce((sum, day) => sum + day.totalCents, 0),
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }
);

// Check if a month is expanded
export const selectIsMonthExpanded = (monthKey: string) => (state: RootState) =>
  state.fin.history.expandedMonths.includes(monthKey);

// Check if a day is expanded
export const selectIsDayExpanded = (dayKey: string) => (state: RootState) =>
  state.fin.history.expandedDays.includes(dayKey);

// Count active filters for badge
export const selectHistoryFilterCount = createSelector(
  [selectHistoryFilters],
  (filters): number => {
    let count = 0;

    if (filters.keyword) count++;
    if (filters.type !== "all") count++;
    if (filters.dateRange.preset !== "all") count++;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.amountRange?.min || filters.amountRange?.max) count++;

    return count;
  }
);

export default finSlice.reducer;

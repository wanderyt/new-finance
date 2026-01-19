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
  PersonData,
  FinItemWithParent,
  ListFinItemsResponse,
} from "@/app/lib/types/api";

interface WeeklyPricePoint {
  merchant: string;
  week: string;
  avgPrice: number;
  count: number;
}

interface PriceTrendData {
  itemName: string;
  data: WeeklyPricePoint[];
  merchants: string[];
}

interface AutocompleteItem {
  name: string;
  count: number;
  lastPurchased: string;
}

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

  charts: {
    viewMode: "month" | "year";
    selectedMonth?: string;
    selectedYear?: string;
    drilldownCategory?: string;
    selectedCategoryForList?: string;
    selectedSubcategoryForList?: string;
    comparisonMonth1?: string;
    comparisonMonth2?: string;

    selectedPersonId?: number;
    personItems: FinItemWithParent[];
    personItemsLoading: boolean;
    personItemsError: string | null;
  };

  priceTrend: {
    data: PriceTrendData | null;
    loading: boolean;
    error: string | null;
  };

  itemAutocomplete: {
    items: AutocompleteItem[];
    loading: boolean;
    error: string | null;
  };

  persons: PersonData[];
  personsLoading: boolean;
  personsError: string | null;
}

// Get current month and previous month for defaults
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const previousMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

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

  charts: {
    viewMode: "month",
    selectedMonth: currentMonth,
    comparisonMonth1: currentMonth,
    comparisonMonth2: previousMonth,

    selectedPersonId: undefined,
    personItems: [],
    personItemsLoading: false,
    personItemsError: null,
  },

  priceTrend: {
    data: null,
    loading: false,
    error: null,
  },

  itemAutocomplete: {
    items: [],
    loading: false,
    error: null,
  },

  persons: [],
  personsLoading: false,
  personsError: null,
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

// Async thunk for fetching persons
export const fetchPersonsAsync = createAsyncThunk<
  PersonData[],
  void,
  { rejectValue: string }
>("fin/fetchPersons", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get<{ success: boolean; persons: PersonData[] }>(
      "/api/persons",
      { withCredentials: true }
    );
    return response.data.persons;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to fetch persons"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for fetching person items for charts
export const fetchPersonItemsForChartsAsync = createAsyncThunk<
  FinItemWithParent[],
  { viewMode: "month" | "year"; selectedMonth?: string; selectedYear?: string; personId?: number },
  { rejectValue: string }
>("fin/fetchPersonItemsForCharts", async (params, { rejectWithValue }) => {
  try {
    const queryParams = new URLSearchParams({ limit: "1000" });

    if (params.viewMode === "month" && params.selectedMonth) {
      const [year, month] = params.selectedMonth.split("-");
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      queryParams.append("dateFrom", startDate.toISOString());
      queryParams.append("dateTo", endDate.toISOString());
    } else if (params.viewMode === "year" && params.selectedYear) {
      const startDate = new Date(parseInt(params.selectedYear), 0, 1);
      const endDate = new Date(parseInt(params.selectedYear), 11, 31, 23, 59, 59);
      queryParams.append("dateFrom", startDate.toISOString());
      queryParams.append("dateTo", endDate.toISOString());
    }

    if (params.personId) {
      queryParams.append("personId", params.personId.toString());
    }

    const response = await axios.get<ListFinItemsResponse>(
      `/api/fin/items/list?${queryParams.toString()}`,
      { withCredentials: true }
    );

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to fetch person items"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for fetching price trend
export const fetchPriceTrend = createAsyncThunk<
  PriceTrendData,
  string,
  { rejectValue: string }
>("fin/fetchPriceTrend", async (itemName, { rejectWithValue }) => {
  try {
    const response = await axios.get(
      `/api/fin/items/price-trend?itemName=${encodeURIComponent(itemName)}`,
      { withCredentials: true }
    );
    return response.data as PriceTrendData;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to fetch price trend"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

// Async thunk for fetching item autocomplete
export const fetchItemAutocomplete = createAsyncThunk<
  AutocompleteItem[],
  string,
  { rejectValue: string }
>("fin/fetchItemAutocomplete", async (query, { rejectWithValue }) => {
  try {
    const response = await axios.get(
      `/api/fin/items/autocomplete?q=${encodeURIComponent(query)}`,
      { withCredentials: true }
    );
    return response.data.items as AutocompleteItem[];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to fetch autocomplete"
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

    // Charts actions
    setChartsViewMode: (state, action: PayloadAction<"month" | "year">) => {
      state.charts.viewMode = action.payload;
    },

    setChartsSelectedMonth: (state, action: PayloadAction<string>) => {
      state.charts.selectedMonth = action.payload;
    },

    setChartsSelectedYear: (state, action: PayloadAction<string>) => {
      state.charts.selectedYear = action.payload;
    },

    setChartsDrilldownCategory: (state, action: PayloadAction<string | undefined>) => {
      state.charts.drilldownCategory = action.payload;
    },

    setChartsCategoryForList: (
      state,
      action: PayloadAction<{ category?: string; subcategory?: string }>
    ) => {
      state.charts.selectedCategoryForList = action.payload.category;
      state.charts.selectedSubcategoryForList = action.payload.subcategory;
    },

    setChartsComparisonMonths: (
      state,
      action: PayloadAction<{ month1?: string; month2?: string }>
    ) => {
      if (action.payload.month1 !== undefined) {
        state.charts.comparisonMonth1 = action.payload.month1;
      }
      if (action.payload.month2 !== undefined) {
        state.charts.comparisonMonth2 = action.payload.month2;
      }
    },

    clearChartsCategorySelection: (state) => {
      state.charts.selectedCategoryForList = undefined;
      state.charts.selectedSubcategoryForList = undefined;
    },

    clearChartsDrilldown: (state) => {
      state.charts.drilldownCategory = undefined;
    },

    setChartsSelectedPerson: (state, action: PayloadAction<number | undefined>) => {
      state.charts.selectedPersonId = action.payload;
    },

    clearPersonItems: (state) => {
      state.charts.personItems = [];
      state.charts.personItemsError = null;
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

    // Fetch persons
    builder
      .addCase(fetchPersonsAsync.pending, (state) => {
        state.personsLoading = true;
        state.personsError = null;
      })
      .addCase(fetchPersonsAsync.fulfilled, (state, action) => {
        state.personsLoading = false;
        state.persons = action.payload;
      })
      .addCase(fetchPersonsAsync.rejected, (state, action) => {
        state.personsLoading = false;
        state.personsError = action.payload || "Failed to fetch persons";
      });

    // Fetch person items for charts
    builder
      .addCase(fetchPersonItemsForChartsAsync.pending, (state) => {
        state.charts.personItemsLoading = true;
        state.charts.personItemsError = null;
      })
      .addCase(fetchPersonItemsForChartsAsync.fulfilled, (state, action) => {
        state.charts.personItemsLoading = false;
        state.charts.personItems = action.payload;
      })
      .addCase(fetchPersonItemsForChartsAsync.rejected, (state, action) => {
        state.charts.personItemsLoading = false;
        state.charts.personItemsError = action.payload || "Failed to fetch person items";
      });

    // Fetch price trend
    builder
      .addCase(fetchPriceTrend.pending, (state) => {
        state.priceTrend.loading = true;
        state.priceTrend.error = null;
      })
      .addCase(fetchPriceTrend.fulfilled, (state, action) => {
        state.priceTrend.loading = false;
        state.priceTrend.data = action.payload;
      })
      .addCase(fetchPriceTrend.rejected, (state, action) => {
        state.priceTrend.loading = false;
        state.priceTrend.error = action.payload || "Failed to fetch price trend";
      });

    // Fetch item autocomplete
    builder
      .addCase(fetchItemAutocomplete.pending, (state) => {
        state.itemAutocomplete.loading = true;
        state.itemAutocomplete.error = null;
      })
      .addCase(fetchItemAutocomplete.fulfilled, (state, action) => {
        state.itemAutocomplete.loading = false;
        state.itemAutocomplete.items = action.payload;
      })
      .addCase(fetchItemAutocomplete.rejected, (state, action) => {
        state.itemAutocomplete.loading = false;
        state.itemAutocomplete.error = action.payload || "Failed to fetch autocomplete";
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
  setChartsViewMode,
  setChartsSelectedMonth,
  setChartsSelectedYear,
  setChartsDrilldownCategory,
  setChartsCategoryForList,
  setChartsComparisonMonths,
  clearChartsCategorySelection,
  clearChartsDrilldown,
  setChartsSelectedPerson,
  clearPersonItems,
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
      // Convert to local time before extracting month/day keys
      const localDate = new Date(date);
      const monthKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}`;
      const dayKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;

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

// Charts selectors
export const selectChartsViewMode = (state: RootState) => state.fin.charts.viewMode;
export const selectChartsSelectedMonth = (state: RootState) => state.fin.charts.selectedMonth;
export const selectChartsSelectedYear = (state: RootState) => state.fin.charts.selectedYear;
export const selectChartsDrilldownCategory = (state: RootState) => state.fin.charts.drilldownCategory;
export const selectChartsComparisonMonth1 = (state: RootState) => state.fin.charts.comparisonMonth1;
export const selectChartsComparisonMonth2 = (state: RootState) => state.fin.charts.comparisonMonth2;

// Get available months from fins data
export const selectAvailableMonths = createSelector([selectFins], (fins): string[] => {
  const months = new Set<string>();
  fins.forEach((fin) => {
    // Date constructor already converts to local time
    const date = new Date(fin.date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.add(month);
  });
  return Array.from(months).sort().reverse();
});

// Get available years from fins data
export const selectAvailableYears = createSelector([selectFins], (fins): string[] => {
  const years = new Set<string>();
  fins.forEach((fin) => {
    // Date constructor already converts to local time
    const date = new Date(fin.date);
    years.add(String(date.getFullYear()));
  });
  return Array.from(years).sort().reverse();
});

// Filter fins for charts (by selected month/year + expenses only)
export const selectChartsFilteredFins = createSelector(
  [selectFins, selectChartsViewMode, selectChartsSelectedMonth, selectChartsSelectedYear],
  (fins, viewMode, selectedMonth, selectedYear): FinData[] => {
    return fins.filter((fin) => {
      if (fin.type !== "expense") return false;

      const finDate = new Date(fin.date);
      if (viewMode === "month" && selectedMonth) {
        const finMonth = `${finDate.getFullYear()}-${String(finDate.getMonth() + 1).padStart(2, "0")}`;
        return finMonth === selectedMonth;
      } else if (viewMode === "year" && selectedYear) {
        return String(finDate.getFullYear()) === selectedYear;
      }
      return true;
    });
  }
);

interface CategoryData {
  category: string;
  subcategory?: string;
  totalCents: number;
  count: number;
}

// Aggregate category data for bar chart
export const selectCategoryChartData = createSelector(
  [selectChartsFilteredFins, selectChartsDrilldownCategory],
  (fins, drilldownCategory): CategoryData[] => {
    const aggregated: Record<string, { totalCents: number; count: number }> = {};

    fins.forEach((fin) => {
      const category = fin.category || "Uncategorized";
      const subcategory = fin.subcategory;

      let key: string;
      if (drilldownCategory) {
        // Drill-down view: show subcategories for the selected category
        if (category !== drilldownCategory) return;
        key = subcategory || "Uncategorized";
      } else {
        // Top-level view: show categories
        key = category;
      }

      if (!aggregated[key]) {
        aggregated[key] = { totalCents: 0, count: 0 };
      }
      aggregated[key].totalCents += fin.amountCadCents;
      aggregated[key].count += 1;
    });

    // Convert to array and sort by total descending
    return Object.entries(aggregated)
      .map(([name, data]) => ({
        category: drilldownCategory || name,
        subcategory: drilldownCategory ? name : undefined,
        totalCents: data.totalCents,
        count: data.count,
      }))
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 15); // Top 15
  }
);

// Get expense list for selected category
export const selectCategoryExpenseList = createSelector(
  [
    selectChartsFilteredFins,
    (state: RootState) => state.fin.charts.selectedCategoryForList,
    (state: RootState) => state.fin.charts.selectedSubcategoryForList,
  ],
  (fins, selectedCategory, selectedSubcategory): FinData[] => {
    if (!selectedCategory) return [];

    return fins
      .filter((fin) => {
        const category = fin.category || "Uncategorized";
        if (category !== selectedCategory) return false;

        if (selectedSubcategory) {
          const subcategory = fin.subcategory || "Uncategorized";
          return subcategory === selectedSubcategory;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
);

interface DayAccumulation {
  day: number;
  month1Total: number;
  month2Total: number;
}

// Accumulate monthly expenses by day for comparison
export const selectMonthComparisonData = createSelector(
  [selectFins, selectChartsComparisonMonth1, selectChartsComparisonMonth2],
  (fins, month1, month2): DayAccumulation[] => {
    if (!month1 || !month2) return [];

    const accumulateMonth = (month: string): Record<number, number> => {
      const [year, monthNum] = month.split("-").map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const monthFins = fins.filter((fin) => {
        if (fin.type !== "expense") return false;
        const finDate = new Date(fin.date);
        const finMonth = `${finDate.getFullYear()}-${String(finDate.getMonth() + 1).padStart(2, "0")}`;
        return finMonth === month;
      });

      // Group by day
      const dailyTotals: Record<number, number> = {};
      monthFins.forEach((fin) => {
        const finDate = new Date(fin.date);
        const day = finDate.getDate();
        dailyTotals[day] = (dailyTotals[day] || 0) + fin.amountCadCents;
      });

      // Accumulate
      let runningTotal = 0;
      const accumulated: Record<number, number> = {};
      for (let day = 1; day <= daysInMonth; day++) {
        runningTotal += dailyTotals[day] || 0;
        accumulated[day] = runningTotal;
      }

      return accumulated;
    };

    const month1Data = accumulateMonth(month1);
    const month2Data = accumulateMonth(month2);

    // Find max days
    const maxDays = Math.max(
      Object.keys(month1Data).length,
      Object.keys(month2Data).length
    );

    // Build result array
    const result: DayAccumulation[] = [];
    for (let day = 1; day <= maxDays; day++) {
      result.push({
        day,
        month1Total: month1Data[day] || month1Data[day - 1] || 0,
        month2Total: month2Data[day] || month2Data[day - 1] || 0,
      });
    }

    return result;
  }
);

// Person selectors
export const selectPersons = (state: RootState) => state.fin.persons;
export const selectPersonsLoading = (state: RootState) => state.fin.personsLoading;
export const selectChartsSelectedPersonId = (state: RootState) => state.fin.charts.selectedPersonId;
export const selectPersonItems = (state: RootState) => state.fin.charts.personItems;
export const selectPersonItemsLoading = (state: RootState) => state.fin.charts.personItemsLoading;
export const selectPersonItemsError = (state: RootState) => state.fin.charts.personItemsError;

interface PersonSpendingData {
  personId: number;
  personName: string;
  totalCents: number;
  itemCount: number;
}

// Aggregate person spending data for pie chart
export const selectPersonSpendingData = createSelector(
  [selectPersonItems, selectPersons],
  (items, persons): PersonSpendingData[] => {
    const aggregated: Record<number, { totalCents: number; itemCount: number }> = {};

    items.forEach((item) => {
      if (item.personId) {
        if (!aggregated[item.personId]) {
          aggregated[item.personId] = { totalCents: 0, itemCount: 0 };
        }
        aggregated[item.personId].totalCents += item.originalAmountCents;
        aggregated[item.personId].itemCount += 1;
      }
    });

    return Object.entries(aggregated)
      .map(([personId, data]) => {
        const person = persons.find(p => p.personId === parseInt(personId));
        return {
          personId: parseInt(personId),
          personName: person?.name || "Unknown",
          totalCents: data.totalCents,
          itemCount: data.itemCount,
        };
      })
      .sort((a, b) => b.totalCents - a.totalCents);
  }
);

// Get items for selected person (for detail list)
export const selectSelectedPersonItems = createSelector(
  [selectPersonItems, selectChartsSelectedPersonId],
  (items, selectedPersonId): FinItemWithParent[] => {
    if (!selectedPersonId) return [];

    return items
      .filter(item => item.personId === selectedPersonId)
      .sort((a, b) => new Date(b.parentDate).getTime() - new Date(a.parentDate).getTime());
  }
);

interface PersonCategoryData {
  category: string;
  totalCents: number;
  itemCount: number;
}

// Aggregate selected person's spending by category (for category pie chart)
export const selectPersonCategoryData = createSelector(
  [selectSelectedPersonItems],
  (items): PersonCategoryData[] => {
    const aggregated: Record<string, { totalCents: number; itemCount: number }> = {};

    items.forEach((item) => {
      const category = item.category || item.parentCategory || "Uncategorized";

      if (!aggregated[category]) {
        aggregated[category] = { totalCents: 0, itemCount: 0 };
      }
      aggregated[category].totalCents += item.originalAmountCents;
      aggregated[category].itemCount += 1;
    });

    return Object.entries(aggregated)
      .map(([category, data]) => ({
        category,
        totalCents: data.totalCents,
        itemCount: data.itemCount,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);
  }
);

// Price trend selectors
export const selectPriceTrend = (state: RootState) => state.fin.priceTrend;
export const selectItemAutocomplete = (state: RootState) => state.fin.itemAutocomplete;

export default finSlice.reducer;

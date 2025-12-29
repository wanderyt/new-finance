import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../../store";
import {
  ListFinResponse,
  FinData,
  PaginationMeta,
} from "@/app/lib/types/api";

interface FinState {
  items: FinData[];
  pagination: PaginationMeta | null;
  filters: {
    type: "expense" | "income" | "all";
    dateFrom?: string;
    dateTo?: string;
  };
  listStatus: "idle" | "loading" | "succeeded" | "failed";
  listError: string | null;
}

const initialState: FinState = {
  items: [],
  pagination: null,
  filters: {
    type: "all",
    dateTo: new Date().toISOString(),
  },
  listStatus: "idle",
  listError: null,
};

// Async thunk for fetching fin list
export const fetchFinListAsync = createAsyncThunk<
  ListFinResponse,
  {
    limit?: number;
    offset?: number;
    type?: "expense" | "income" | "all";
    dateFrom?: string;
    dateTo?: string;
  },
  { rejectValue: string }
>("fin/fetchFinList", async (params, { rejectWithValue }) => {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set("limit", params.limit.toString());
    if (params.offset) queryParams.set("offset", params.offset.toString());
    if (params.type) queryParams.set("type", params.type);
    if (params.dateFrom) queryParams.set("dateFrom", params.dateFrom);
    if (params.dateTo) queryParams.set("dateTo", params.dateTo);

    const response = await axios.get<ListFinResponse>(
      `/api/fin/list?${queryParams.toString()}`,
      { withCredentials: true }
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return rejectWithValue(
        error.response.data.error || "Failed to fetch fin list"
      );
    }
    return rejectWithValue("Network error. Please try again.");
  }
});

export const finSlice = createSlice({
  name: "fin",
  initialState,
  reducers: {
    // Update filters without fetching
    setFilters: (
      state,
      action: PayloadAction<Partial<FinState["filters"]>>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    // Clear error
    clearError: (state) => {
      state.listError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinListAsync.pending, (state) => {
        state.listStatus = "loading";
        state.listError = null;
      })
      .addCase(fetchFinListAsync.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.items = action.payload.data;
        state.pagination = action.payload.pagination;
        state.listError = null;
      })
      .addCase(fetchFinListAsync.rejected, (state, action) => {
        state.listStatus = "failed";
        state.listError = action.payload || "Unknown error";
      });
  },
});

export const { setFilters, clearError } = finSlice.actions;

// Selectors
export const selectFinItems = (state: RootState) => state.fin.items;
export const selectFinPagination = (state: RootState) => state.fin.pagination;
export const selectFinFilters = (state: RootState) => state.fin.filters;
export const selectFinListStatus = (state: RootState) => state.fin.listStatus;
export const selectFinListError = (state: RootState) => state.fin.listError;

export default finSlice.reducer;

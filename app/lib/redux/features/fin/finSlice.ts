import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { RootState } from "../../store";
import {
  FinData,
  CreateFinRequest,
  CreateFinResponse,
  UpdateFinRequest,
  UpdateFinResponse,
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
}

const initialState: FinState = {
  fins: [],
  currentFin: null,
  isLoading: false,
  error: null,
  filters: {
    type: "all",
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
  },
});

export const { setFilters, clearError, clearCurrentFin } = finSlice.actions;

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

export default finSlice.reducer;

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../api';

export const fetchTennisData = createAsyncThunk(
  'tennis/fetchTennisData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/tennis');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch matches'
      );
    }
  }
);

const tennisSlice = createSlice({
  name: 'tennis',
  initialState: {
    matches: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTennisData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTennisData.fulfilled, (state, action) => {
        state.loading = false;
        state.matches = action.payload.map((match) => ({
          id: match.id,
          title: match.title,
          game: match.match || '',
        }));
        state.error = null;
      })
      .addCase(fetchTennisData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default tennisSlice.reducer;

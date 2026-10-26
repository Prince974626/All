import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../api';

export const fetchCricketData = createAsyncThunk(
  'cricket/fetchCricketData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cricket/matches');
      return response.data.matches;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch matches'
      );
    }
  }
);

const cricketSlice = createSlice({
  name: 'cricket',
  initialState: {
    matches: [],
    loader: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCricketData.pending, (state) => {
        state.loader = true;
        state.error = null;
      })
      .addCase(fetchCricketData.fulfilled, (state, action) => {
        state.loader = false;
        state.matches = action.payload.map((match) => ({
          id: match.id,
          title: match.title,
          game: match.match || '',
        }));
        state.error = null;
      })
      .addCase(fetchCricketData.rejected, (state, action) => {
        state.loader = false;
        state.error = action.payload;
      });
  },
});

export default cricketSlice.reducer;

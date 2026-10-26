import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../api';

export const fetchSoccerData = createAsyncThunk(
  'soccer/fetchSoccerData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/soccer');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch matches'
      );
    }
  }
);

const soccerSlice = createSlice({
  name: 'soccer',
  initialState: {
    matches: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSoccerData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSoccerData.fulfilled, (state, action) => {
        state.loading = false;
        state.matches = action.payload.map((match) => ({
          id: match.id,
          title: match.title,
          game: match.match || '',
        }));
        state.error = null;
      })
      .addCase(fetchSoccerData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default soccerSlice.reducer;

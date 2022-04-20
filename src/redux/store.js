import {configureStore, createSlice} from "@reduxjs/toolkit";

const wormholeSlice = createSlice({
  name: 'wormhole',
  initialState: {},
  reducers: {
    updateCurrentSystem(state, action) {
      state.system = action.payload;
    }
  }
});

export const {updateCurrentSystem} = wormholeSlice.actions;

export const store = configureStore({
  reducer: {
    wormhole: wormholeSlice.reducer
  }
});

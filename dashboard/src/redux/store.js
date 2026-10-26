import { configureStore } from '@reduxjs/toolkit';

import authReducer from './reducer/authReducer';
import downlineReducer from './reducer/downlineReducer';
import marketAnalyzeReducer from './reducer/marketAnalyzeReducer';
import cricketReducer from './reducer/cricketSlice';
import soccerReducer from './reducer/soccerSlice';
import tennisReducer from './reducer/tennisSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    downline: downlineReducer,
    market: marketAnalyzeReducer,
    cricket: cricketReducer,
    soccer: soccerReducer,
    tennis: tennisReducer,
  },
});

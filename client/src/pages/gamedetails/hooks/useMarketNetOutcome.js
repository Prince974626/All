import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getPendingBet,
  getPendingBetAmo,
} from '../../../redux/reducer/betReducer';
import { createMarketNetOutcomeHelpers } from '../utils/marketNetOutcome';

export function useMarketNetOutcome({
  gameTypes,
  gameId,
  cashoutPLKey,
  oddsStyle = 'matchOdds',
}) {
  const dispatch = useDispatch();
  const { pendingBet, pendingBetAmounts, cashoutPL } = useSelector(
    (state) => state.bet
  );

  useEffect(() => {
    if (gameId) {
      dispatch(getPendingBetAmo(gameId));
      dispatch(getPendingBet(gameId));
    }
  }, [dispatch, gameId]);

  return useMemo(
    () =>
      createMarketNetOutcomeHelpers({
        gameTypes,
        gameId,
        pendingBetHistory: pendingBet,
        pendingBetAmounts,
        cashoutPL,
        cashoutPLKey,
        oddsStyle,
      }),
    [
      gameTypes,
      gameId,
      pendingBet,
      pendingBetAmounts,
      cashoutPL,
      cashoutPLKey,
      oddsStyle,
    ]
  );
}

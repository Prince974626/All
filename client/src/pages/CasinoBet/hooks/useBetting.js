import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import { getUser, messageClear } from '../../../redux/reducer/authReducer';
import {
  createBet,
  getPendingBet,
  getPendingBetAmo,
} from '../../../redux/reducer/betReducer';
import { DEFAULT_BET_ODDS, DEFAULT_MAX_AMOUNT } from '../constants';

/**
 * Custom hook for managing betting state and actions
 */
export const useBetting = ({ gameid, bettingData }) => {
  const dispatch = useDispatch();

  // Local state
  const [betOdds, setBetOdds] = useState(DEFAULT_BET_ODDS);
  const [betAmount, setBetAmount] = useState(0);
  const [selectedBet, setSelectedBet] = useState(null);
  const [betControl, setBetControl] = useState(null);
  const [loader, setLoader] = useState(false);
  const [selectedTeamSubtype, setSelectedTeamSubtype] = useState(
    () => localStorage.getItem('selectedTeamSubtype') || null
  );

  // Form data for bet placement
  const [formData, setFormData] = useState({
    gameId: gameid || '',
    price: null,
    xValue: '',
    teamName: '',
    otype: '',
    gname: gameid || '',
    betType: 'casino',
    roundId: '',
  });

  useEffect(() => {
    if (gameid) {
      setFormData((prev) => ({ ...prev, gameId: gameid, gname: gameid }));
    }
  }, [gameid]);

  // Redux selectors
  const {
    loading,
    successMessage,
    errorMessage,
    pendingBet,
    pendingBetAmounts,
  } = useSelector((state) => state.bet);
  const { userInfo } = useSelector((state) => state.auth);

  // Reset betting state (for cancel button - doesn't reset selectedTeamSubtype)
  const resetBettingState = useCallback(() => {
    setBetControl(null);
    setSelectedBet(null);
    setBetAmount(0);
    setBetOdds(DEFAULT_BET_ODDS);
  }, []);

  // Full reset including selectedTeamSubtype (for round changes)
  const resetAllBettingState = useCallback(() => {
    setBetControl(null);
    setSelectedBet(null);
    setBetAmount(0);
    setBetOdds(DEFAULT_BET_ODDS);
    setSelectedTeamSubtype(null);
  }, []);

  // Update bet amount
  const updateAmount = useCallback((val, toggle = false) => {
    setBetAmount((prev) => {
      if (toggle) {
        return prev === val ? null : val;
      }
      return val;
    });
  }, []);

  // Set bet values when user clicks on a betting option
  const setValue = useCallback(
    (xValue, teamName, otype, nat, sid) => {
      if (nat !== betControl?.nat || sid !== betControl?.sid) {
        setBetAmount(0);
      }
      setBetOdds(xValue);

      setFormData((prev) => ({
        ...prev,
        gameId: gameid || prev.gameid,
        xValue: xValue,
        teamName: teamName,
        otype: otype,
        gname: gameid,
        roundId: bettingData?.mid,
      }));

      setSelectedBet({
        type: otype,
        teamName: teamName,
        odds: xValue,
      });
    },
    [betControl, gameid, bettingData]
  );

  // Place a bet
  const placeBet = useCallback(
    async (
      otype,
      teamName,
      maxAmo = DEFAULT_MAX_AMOUNT,
      xVal,
      subtype,
      minAmo,
      marketName,
      teamCount,
      stakeAmount
    ) => {
      if (loader || loading) return false;
      setLoader(true);

      try {
        const minBet = Number(minAmo ?? betControl?.min) || 1;
        const maxBet = Number(maxAmo ?? betControl?.max) || DEFAULT_MAX_AMOUNT;
        const effectiveStake = stakeAmount ?? betAmount;

        // Validate required fields
        if (!gameid) {
          toast.error('Game ID is missing. Please refresh the page.');
          return false;
        }

        if (!effectiveStake || effectiveStake <= 0) {
          toast.error('Please enter a valid bet amount');
          return false;
        }

        if (effectiveStake < minBet) {
          toast.error(`Minimum bet amount is ${minBet}`);
          return false;
        }

        if (effectiveStake > maxBet) {
          toast.error(`Bet amount cannot exceed ${maxBet}`);
          return false;
        }

        if (!userInfo) {
          toast.error('User data not found. Please refresh the page.');
          return false;
        }

        if (userInfo.balance === undefined || userInfo.balance === null) {
          toast.error(
            'Balance information not available. Please refresh the page.'
          );
          return false;
        }

        if (!teamName || !otype) {
          toast.error('Please select a valid betting option');
          return false;
        }

        const x = Number(xVal);
        const sendXValue = ['baccarat', 'baccarat2'].includes(
          gameid?.toLowerCase()
        )
          ? !Number.isNaN(x)
            ? Number((x + 1).toFixed(2))
            : xVal
          : xVal;
        const isAb4 =
          gameid?.toLowerCase() === 'ab4' || gameid?.toLowerCase() === 'ab3';
        const ab4Sid = bettingData?.sub?.[0]?.sid;
        const ab4ChildCount = Array.isArray(bettingData?.child)
          ? bettingData.child.length
          : 0;

        const updatedFormData = {
          ...formData,
          gameId: gameid,
          price: effectiveStake,
          xValue: sendXValue,
          teamName: teamName,
          otype: otype,
          gname: gameid,
          betType: 'casino',
          roundId:
            isAb4 && ab4Sid ? `${bettingData?.mid}${ab4Sid}` : bettingData?.mid,
          min: minBet,
          max: maxBet,
          ...(subtype && { subtype }),
          marketName: marketName || teamName,
          teamCount: isAb4
            ? ab4ChildCount
            : teamCount != null && teamCount !== ''
              ? teamCount
              : undefined,
          ...(betControl?.card && { card: betControl.card }),
          // ...(betControl?.fancyScore && { fancyScore: betControl.fancyScore }),
        };

        setFormData(updatedFormData);
        const result = await dispatch(createBet(updatedFormData));

        if (result.type === 'bet/create/fulfilled') {
          dispatch(getUser());
          await dispatch(getPendingBet(gameid));
          await dispatch(
            getPendingBetAmo({ gameId: gameid, roundId: bettingData?.mid })
          );
          setBetAmount(0);
          setBetControl(null);
          setSelectedBet(null);
          return true;
        }
        return false;
      } finally {
        setLoader(false);
      }
    },
    [gameid, betAmount, userInfo, formData, bettingData, betControl, dispatch, loader, loading]
  );

  // Handle success/error messages
  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(messageClear());
    }

    if (errorMessage) {
      toast.error(errorMessage);
      dispatch(messageClear());
    }
  }, [successMessage, errorMessage, dispatch]);

  // Persist selectedTeamSubtype to localStorage
  useEffect(() => {
    if (selectedTeamSubtype !== null) {
      localStorage.setItem('selectedTeamSubtype', selectedTeamSubtype);
    } else {
      localStorage.removeItem('selectedTeamSubtype');
    }
  }, [selectedTeamSubtype]);

  // Check if there's a pending bet for the current control
  const hasPendingBetForControl = pendingBet?.some(
    (bet) =>
      (bet.gameId === gameid ||
        bet.gameid === gameid ||
        bet.eventName === gameid ||
        bet.gname === gameid) &&
      bet.teamName === betControl?.nat
  );

  return {
    // State
    betOdds,
    setBetOdds,
    betAmount,
    setBetAmount,
    selectedBet,
    setSelectedBet,
    betControl,
    setBetControl,
    loader,
    loading,
    formData,
    selectedTeamSubtype,
    setSelectedTeamSubtype,
    pendingBet,
    pendingBetAmounts,
    userInfo,
    hasPendingBetForControl,

    // Actions
    resetBettingState,
    resetAllBettingState,
    updateAmount,
    setValue,
    placeBet,
  };
};

export default useBetting;

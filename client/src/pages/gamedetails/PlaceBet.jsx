import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createBet,
  createfancyBet,
  getPendingBetAmo,
  getBetHistory,
  messageClear,
} from '../../redux/reducer/betReducer';
import { getUser } from '../../redux/reducer/authReducer';
import { toast } from 'react-toastify';

function PlaceBet({
  selectedBet,
  onBetChange,
  onClose,
  isMobile = false,
  team1,
  team2,
  gameId,
  eventName,
  marketName,
  gameType,
  gameName = 'Cricket Game',
  sid,
  maxAmount,
  minAmount,
  fancyScore,
}) {
  console.log('selectedBet', selectedBet);
  const dispatch = useDispatch();
  const { loading, errorMessage, successMessage, pendingBetAmounts, pendingBet, cashoutPL } =
    useSelector((state) => state.bet);
  const { userInfo } = useSelector((state) => state.auth);

  const DEFAULT_GAME_STAKES = [
    { label: '1k', value: 1000 },
    { label: '2k', value: 2000 },
    { label: '5k', value: 5000 },
    { label: '10k', value: 10000 },
    { label: '20k', value: 20000 },
    { label: '25k', value: 25000 },
    { label: '50k', value: 50000 },
    { label: '75k', value: 75000 },
    { label: '1L', value: 100000 },
    { label: '2L', value: 200000 },
  ];

  const quickStakes = (() => {
    const saved = userInfo?.quickStakes;
    if (!saved?.length) return DEFAULT_GAME_STAKES;
    return DEFAULT_GAME_STAKES.map((def, i) => {
      const item = saved[i];
      if (!item) return { ...def };
      if (typeof item === 'object' && item.label && item.value) return item;
      if (typeof item === 'number' && item > 0)
        return { label: def.label, value: item };
      return { ...def };
    });
  })();

  const [stake, setStake] = useState('');
  const [odds, setOdds] = useState(selectedBet?.odds || '');
  const [betFor, setBetFor] = useState(selectedBet?.team || '');
  const [betType, setBetType] = useState(selectedBet?.type || ''); // 'back' or 'lay'
  const prevBetKeyRef = React.useRef('');
  const autoCloseTimerRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  const loadingRef = React.useRef(loading);

  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Keep loading ref in sync so timeout callback can check if bet is still placing
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const isCashoutMode = Boolean(selectedBet?.isCashoutHedge);

  useEffect(() => {
    if (selectedBet) {
      // Exclude stake from key — stake is local state for normal bets; including it
      // would reset the field on every keystroke via onBetChange.
      const selectionKey = `${selectedBet.team}-${selectedBet.odds}-${selectedBet.sid}-${selectedBet.type}-${Boolean(selectedBet.isCashoutHedge)}`;

      if (selectionKey !== prevBetKeyRef.current) {
        setBetFor(selectedBet.team || '');
        setOdds(selectedBet.odds || '');
        setBetType(selectedBet.type || '');
        setStake(
          selectedBet.isCashoutHedge && selectedBet.stake
            ? String(selectedBet.stake)
            : ''
        );
        prevBetKeyRef.current = selectionKey;
      }
    }
  }, [selectedBet]);

  // Toast messages are now handled in the parent component (CricketBet/FootballBet/TennisBet)
  // to prevent duplicate toasts from multiple PlaceBet component instances

  useEffect(() => {
    dispatch(getUser());
  }, [dispatch]);

  // Auto-close after 5 seconds of inactivity (not during cashout hedge)
  useEffect(() => {
    if (selectedBet && !selectedBet.isCashoutHedge) {
      // Clear any existing timer first
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }

      // Set new timer to close after 5 seconds (only close if not still placing bet)
      autoCloseTimerRef.current = setTimeout(() => {
        if (!loadingRef.current && onCloseRef.current) {
          onCloseRef.current();
        }
        autoCloseTimerRef.current = null;
      }, 5000);

      // Cleanup timer on unmount or when selectedBet changes
      return () => {
        if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = null;
        }
      };
    } else {
      // Clear timer if selectedBet is null
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    }
  }, [selectedBet]); // Removed onClose from dependencies

  // Reset auto-close timer on any user interaction
  const resetAutoCloseTimer = React.useCallback(() => {
    if (selectedBet && !selectedBet.isCashoutHedge) {
      // Clear existing timer
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      // Set new timer only if onClose is available
      if (onCloseRef.current) {
        autoCloseTimerRef.current = setTimeout(() => {
          if (!loadingRef.current && onCloseRef.current) {
            onCloseRef.current();
          }
          autoCloseTimerRef.current = null;
        }, 5000);
      }
    }
  }, [selectedBet]); // Removed onClose from dependencies

  const isBookmakerStyleMarket = () =>
    gameType === 'Bookmaker' ||
    gameType === 'Bookmaker 2' ||
    gameType === 'Bookmaker IPL CUP' ||
    gameType === 'Tied Match' ||
    marketName === 'Bookmaker' ||
    marketName === 'Bookmaker 2' ||
    marketName === 'Tied Match';

  const isMatchOddsStyleMarket = () =>
    gameType === 'Match Odds' ||
    gameType === 'Winner' ||
    gameType === 'Tied_Match' ||
    gameType === 'OVER_UNDER_05' ||
    gameType === 'OVER_UNDER_15' ||
    gameType === 'OVER_UNDER_25' ||
    gameType === 'OVER_UNDER_35' ||
    gameType === 'fancy1' ||
    marketName === 'MATCH_ODDS' ||
    marketName === 'TOURNAMENT_WINNER' ||
    marketName === 'Tied_Match' ||
    marketName === 'TIED_MATCH';

  const usesProjectedNetOutcome = () =>
    isMatchOddsStyleMarket() || isBookmakerStyleMarket();

  const matchesMarketGameType = (item) => {
    const gameTypeToMatch = gameType || marketName || '';
    const marketNameToMatch = marketName || gameType || '';
    // Exact match covers Tied Match, Tied_Match, Over/Under, etc.
    if (
      item.gameType === gameTypeToMatch ||
      item.gameType === marketNameToMatch
    ) {
      return true;
    }
    // Bookmaker family (Bookmaker IPL CUP shares Bookmaker pending amounts)
    if (
      (gameType === 'Bookmaker' ||
        gameType === 'Bookmaker IPL CUP' ||
        marketName === 'Bookmaker') &&
      (item.gameType === 'Bookmaker' || item.gameType === 'Bookmaker IPL CUP')
    ) {
      return true;
    }
    // Match Odds / Winner / fancy1 only — do not mix with Tied Match / OverUnder
    if (
      (gameType === 'Match Odds' ||
        gameType === 'Winner' ||
        gameType === 'fancy1' ||
        marketName === 'MATCH_ODDS' ||
        marketName === 'TOURNAMENT_WINNER') &&
      (item.gameType === 'Match Odds' ||
        item.gameType === 'Winner' ||
        item.gameType === 'MATCH_ODDS' ||
        item.gameType === 'TOURNAMENT_WINNER' ||
        item.gameType === 'fancy1')
    ) {
      return true;
    }
    return false;
  };

  const getMarketCashoutPL = () => {
    if (gameType === 'Tied Match' || marketName === 'Tied Match') {
      return cashoutPL?.['Tied Match'] || 0;
    }
    if (
      gameType === 'Bookmaker' ||
      gameType === 'Bookmaker IPL CUP' ||
      marketName === 'Bookmaker'
    ) {
      return cashoutPL?.['Bookmaker'] || 0;
    }
    const key =
      gameType === 'MATCH_ODDS' || marketName === 'MATCH_ODDS'
        ? 'Match Odds'
        : gameType === 'Tied_Match' ||
            marketName === 'Tied_Match' ||
            marketName === 'TIED_MATCH'
          ? 'Tied_Match'
          : gameType || marketName;
    return cashoutPL?.[key] || 0;
  };

  const getMarketBets = () => {
    const amountBets =
      pendingBetAmounts?.filter((item) => matchesMarketGameType(item)) || [];

    if (getMarketCashoutPL()) return amountBets;

    const historyBets =
      Array.isArray(pendingBet) && gameId
        ? pendingBet
            .filter(
              (b) =>
                String(b.gameId) === String(gameId) && matchesMarketGameType(b)
            )
            .map((b) => ({
              teamName: b.teamName,
              otype: b.otype,
              totalBetAmount: b.betAmount,
              totalPrice: b.price,
            }))
        : [];

    if (historyBets.length > 0) return historyBets;

    return amountBets;
  };

  const computeNetOutcome = (team, marketBets, mCashoutPL = 0) => {
    let netOutcome = 0;
    marketBets.forEach((bet) => {
      const isBetOnThisTeam =
        bet.teamName?.toLowerCase() === team?.toLowerCase();
      const betAmt = parseFloat(bet.totalBetAmount) || 0;
      const stakeLiability = parseFloat(bet.totalPrice) || 0;

      if (bet.otype === 'back') {
        netOutcome += isBetOnThisTeam ? betAmt : -stakeLiability;
      } else {
        netOutcome += isBetOnThisTeam ? -stakeLiability : betAmt;
      }
    });
    return Math.round((netOutcome + mCashoutPL) * 100) / 100;
  };

  const buildPendingBetLeg = (team, type, stakeValue, oddsValue) => {
    const stakeNum = parseFloat(stakeValue);
    const oddsNum = parseFloat(oddsValue);
    if (isNaN(stakeNum) || isNaN(oddsNum) || stakeNum <= 0 || !team || !type) {
      return null;
    }
    const isLay = type === 'lay';
    if (isBookmakerStyleMarket()) {
      return {
        teamName: team,
        otype: type,
        totalBetAmount: isLay ? stakeNum : stakeNum * (oddsNum / 100),
        totalPrice: isLay ? stakeNum * (oddsNum / 100) : stakeNum,
      };
    }
    return {
      teamName: team,
      otype: type,
      totalBetAmount: isLay ? stakeNum : stakeNum * (oddsNum - 1),
      totalPrice: isLay ? stakeNum * (oddsNum - 1) : stakeNum,
    };
  };

  const getProjectedNetOutcome = (team) => {
    const pendingLeg = buildPendingBetLeg(betFor, betType, stake, odds);
    if (!pendingLeg) return null;
    return computeNetOutcome(
      team,
      [...getMarketBets(), pendingLeg],
      getMarketCashoutPL()
    );
  };

  // Get bet details from pending bets (same logic as components)
  const getBetDetails = (team) => {
    const marketBets = getMarketBets();
    const matchedTeamBet = marketBets.find(
      (item) => item.teamName?.toLowerCase() === team?.toLowerCase()
    );
    const otherTeamBet = marketBets[0];

    const otype = matchedTeamBet?.otype || otherTeamBet?.otype || '';
    const totalBetAmount =
      matchedTeamBet?.totalBetAmount || otherTeamBet?.totalBetAmount || '';
    const totalPrice =
      matchedTeamBet?.totalPrice || otherTeamBet?.totalPrice || '';
    const teamName = matchedTeamBet?.teamName || otherTeamBet?.teamName || '';

    const netOutcome =
      marketBets.length > 0
        ? computeNetOutcome(team, marketBets, getMarketCashoutPL())
        : null;

    return {
      otype,
      totalBetAmount,
      totalPrice,
      teamName,
      netOutcome,
      hasMarketBets: marketBets.length > 0,
    };
  };

  // Calculate suggestion based on game type (same logic as components)
  // Don't show suggestions for these bet types - only show values after placing bet from API
  const calculateSuggestion = (
    team,
    selectedTeam,
    selectedType,
    stake,
    odds
  ) => {
    // Don't show suggestions for these bet types
    // fancy1 uses Match-Odds math, so it falls through to the match-odds branch below.
    const noSuggestionMarkets = [
      'khado',
      'Normal',
      'meter',
      'oddeven',
      'Over By Over',
    ];
    if (noSuggestionMarkets.includes(gameType)) {
      return null;
    }

    if (!stake || !odds || !selectedBet) return null;

    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);
    if (isNaN(stakeNum) || isNaN(oddsNum) || stakeNum === 0) return null;

    const { otype, totalBetAmount, totalPrice, teamName } = getBetDetails(team);
    const isMatchedTeam = teamName?.toLowerCase() === team?.toLowerCase();
    const existingBet =
      (otype && totalBetAmount) || (totalPrice && teamName && isMatchedTeam);

    // Determine calculation method based on game type
    // Games using (odds / 100): Bookmaker, Normal, Meter, Khado
    // Games using (odds - 1): Match Odds, OverUnder, TiedMatch, Fancy1, OddEven
    const usesFancyCalculation = [
      'Bookmaker',
      'Bookmaker 2',
      'Tied Match',
      'Normal',
      'meter',
      'khado',
    ].includes(gameType);
    const isBookmakerLike =
      gameType === 'Bookmaker' ||
      gameType === 'Bookmaker 2' ||
      gameType === 'Tied Match';
    const isKhado = gameType === 'khado';

    if (!existingBet) {
      // No existing bet - calculate based on game type
      let profit;
      if (usesFancyCalculation) {
        // Bookmaker, Normal, Meter, Khado: profit = stake * (odds / 100)
        if (isKhado) {
          profit = stakeNum * (oddsNum / 100); // Khado only has back
        } else if (isBookmakerLike) {
          // Bookmaker: b = otype === 'lay' ? p : p * (x / 100), p = otype === 'lay' ? p * (x / 100) : p
          const p = stakeNum;
          const x = oddsNum;
          const b = selectedType === 'lay' ? p : p * (x / 100);
          const pCalc = selectedType === 'lay' ? p * (x / 100) : p;

          if (selectedType === 'back') {
            profit = b; // For BACK: profit = stake * (odds / 100)
            return {
              value: Math.abs(profit),
              color: profit >= 0 ? 'green' : 'red',
            };
          } else {
            // For LAY: if selected team wins, you lose pCalc (stake * odds / 100)
            // The value should be negative to show loss
            profit = -pCalc; // Negative because it's a loss if selected team wins
            return { value: Math.abs(profit), color: 'red' }; // Always red for LAY loss on selected team
          }
        } else {
          // Normal, Meter
          profit =
            selectedType === 'back'
              ? stakeNum * (oddsNum / 100)
              : stakeNum * (1 - oddsNum / 100);
        }
      } else {
        // Match Odds, OverUnder, TiedMatch, Fancy1, OddEven: profit = stake * (odds - 1)
        profit =
          selectedType === 'back'
            ? stakeNum * (oddsNum - 1)
            : stakeNum * (1 - oddsNum);
      }
      return { value: Math.abs(profit), color: profit >= 0 ? 'green' : 'red' };
    }

    // Complex calculation with existing bet
    const totalBetAmt = parseFloat(totalBetAmount || 0);
    const totalPrc = parseFloat(totalPrice || 0);

    // Calculate new bet values based on game type
    let p, x, b;
    if (usesFancyCalculation) {
      if (isKhado) {
        // Khado only has back
        p = stakeNum;
        x = oddsNum;
        b = p * (x / 100);
        p = p;
      } else if (isBookmakerLike) {
        // Bookmaker calculation: b = otype === 'lay' ? p : p * (x / 100)
        // p = otype === 'lay' ? p * (x / 100) : p
        p = stakeNum;
        x = oddsNum;
        b = selectedType === 'lay' ? p : p * (x / 100);
        p = selectedType === 'lay' ? p * (x / 100) : p;
      } else {
        // Normal, Meter
        p = stakeNum;
        x = oddsNum;
        b = selectedType === 'back' ? p * (x / 100) : p * (1 - x / 100);
        p = selectedType === 'lay' ? p * (1 - x / 100) : p;
      }
    } else {
      // Match Odds, OverUnder, TiedMatch, Fancy1, OddEven
      p = stakeNum;
      x = oddsNum;
      b = selectedType === 'lay' ? p : p * (x - 1);
      p = selectedType === 'lay' ? p * (x - 1) : p;
    }

    // For Bookmaker, use the specific logic from the provided component
    if (isBookmakerLike && existingBet) {
      if (selectedTeam?.toLowerCase() === teamName?.toLowerCase()) {
        if (selectedType === otype) {
          // Same team, same type - merge
          b = b + totalBetAmt;
          p = p + totalPrc;
          const calValue = selectedType === 'back' ? b : p;
          return {
            value: Math.abs(calValue),
            color: selectedType === 'back' && calValue >= 0 ? 'green' : 'red',
          };
        } else {
          // Same team, opposite type - offset
          if (selectedType === 'back') {
            if (totalBetAmt > p) {
              p = totalPrc - b;
              return { value: Math.abs(p), color: 'red' };
            } else {
              b = b - totalPrc;
              return { value: Math.abs(b), color: b < 0 ? 'red' : 'green' };
            }
          } else if (selectedType === 'lay') {
            if (totalPrc >= b) {
              b = totalBetAmt - p;
              return { value: Math.abs(b), color: b < 0 ? 'red' : 'green' };
            } else {
              p = p - totalBetAmt;
              return { value: Math.abs(p), color: 'red' };
            }
          }
        }
      } else {
        // Different team
        if (selectedType === otype) {
          if (selectedType === 'back') {
            if (totalPrc >= b) {
              p = totalPrc - b;
              return { value: Math.abs(p), color: 'red' };
            } else {
              b = b - totalPrc;
              return { value: Math.abs(b), color: b < 0 ? 'red' : 'green' };
            }
          } else if (selectedType === 'lay') {
            if (totalPrc >= b) {
              b = totalBetAmt - p;
              return { value: Math.abs(b), color: b < 0 ? 'red' : 'green' };
            } else {
              p = p - totalBetAmt;
              return { value: Math.abs(p), color: 'red' };
            }
          }
        } else {
          // Different team, different type - add
          b = b + totalBetAmt;
          p = p + totalPrc;
          const calValue = selectedType === 'back' ? b : p;
          return {
            value: Math.abs(calValue),
            color: selectedType === 'back' && calValue >= 0 ? 'green' : 'red',
          };
        }
      }
    }

    // For other game types, use the original logic
    if (selectedTeam?.toLowerCase() === teamName?.toLowerCase()) {
      if (selectedType === otype) {
        // Same team, same type - merge
        b = b + totalBetAmt;
        p = p + totalPrc;
        const calValue = selectedType === 'back' ? b : p;
        return {
          value: Math.abs(calValue),
          color: calValue >= 0 ? 'green' : 'red',
        };
      } else {
        // Same team, opposite type - offset
        if (selectedType === 'back') {
          if (totalBetAmt > p) {
            p = totalPrc - b;
            return { value: Math.abs(p), color: 'red' };
          } else {
            b = b - totalPrc;
            return { value: Math.abs(b), color: b >= 0 ? 'green' : 'red' };
          }
        } else {
          if (totalPrc >= b) {
            b = totalBetAmt - p;
            return { value: Math.abs(b), color: b >= 0 ? 'green' : 'red' };
          } else {
            p = p - totalBetAmt;
            return { value: Math.abs(p), color: 'red' };
          }
        }
      }
    } else {
      // Different team
      if (selectedType === otype) {
        if (selectedType === 'back') {
          if (totalPrc >= b) {
            p = totalPrc - b;
            return { value: Math.abs(p), color: 'red' };
          } else {
            b = b - totalPrc;
            return { value: Math.abs(b), color: b >= 0 ? 'green' : 'red' };
          }
        } else {
          if (totalPrc >= b) {
            b = totalBetAmt - p;
            return { value: Math.abs(b), color: b >= 0 ? 'green' : 'red' };
          } else {
            p = p - totalBetAmt;
            return { value: Math.abs(p), color: 'red' };
          }
        }
      } else {
        // Different team, different type - add
        b = b + totalBetAmt;
        p = p + totalPrc;
        const calValue = selectedType === 'back' ? b : p;
        return {
          value: Math.abs(calValue),
          color: calValue >= 0 ? 'green' : 'red',
        };
      }
    }
  };

  // Calculate profit for display (always show green/profit value)
  const calculateProfit = () => {
    if (!stake || !odds) return '0';

    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);
    if (isNaN(stakeNum) || isNaN(oddsNum)) return '0';

    // Always show the green/profit value
    // For BACK: profit if selected team wins
    // For LAY: profit if selected team loses (stake)
    if (betType === 'back') {
      if (usesProjectedNetOutcome()) {
        const projected = getProjectedNetOutcome(betFor);
        if (projected !== null && projected > 0) {
          return projected.toFixed(2);
        }
      }
      // BACK: get green value from selected team suggestion
      const suggestion = calculateSuggestion(
        betFor,
        betFor,
        betType,
        stake,
        odds
      );
      if (suggestion && suggestion.color === 'green') {
        return suggestion.value.toFixed(2);
      }
      // Fallback: calculate profit if selected team wins
      const usesFancyCalculation = [
        'Bookmaker',
        'Tied Match',
        'Normal',
        'meter',
        'khado',
      ].includes(gameType);
      const isKhado = gameType === 'khado';

      let profitValue;
      if (usesFancyCalculation) {
        if (isKhado) {
          profitValue = stakeNum * (oddsNum / 100);
        } else {
          // Bookmaker, Normal, Meter
          profitValue = stakeNum * (oddsNum / 100);
        }
      } else {
        // Match Odds, OverUnder, etc.
        profitValue = stakeNum * (oddsNum - 1);
      }
      return profitValue.toFixed(2);
    } else {
      // LAY: green value is the stake (profit if selected team loses)
      return stakeNum.toFixed(2);
    }
  };

  const profit = calculateProfit();

  // Get all teams from selectedBet, fallback to team1/team2 if not available
  const allTeams =
    selectedBet?.teams && selectedBet.teams.length > 0
      ? selectedBet.teams
      : team1 && team2
        ? [team1, team2]
        : [];

  // Get the other team name (for backward compatibility)
  const getOtherTeam = () => {
    if (!team1 || !team2) return '';
    return betFor === team1 ? team2 : team1;
  };

  const otherTeam = getOtherTeam();
  const isOddEvenMarket =
    gameType === 'oddeven' || selectedBet?.gameType === 'oddeven';

  // In cashout mode the "Bet for" cell shows the market name instead of a team.
  const cashoutMarketLabel =
    gameType === 'Tied Match' || marketName === 'Tied Match'
      ? 'Tied Match'
      : gameType === 'Tied_Match' ||
          marketName === 'Tied_Match' ||
          marketName === 'TIED_MATCH'
        ? 'Tied_Match'
        : gameType === 'Bookmaker 2' || marketName === 'Bookmaker 2'
          ? 'Bookmaker 2'
          : isBookmakerStyleMarket()
            ? 'Bookmaker'
          : isMatchOddsStyleMarket()
            ? 'MATCH_ODDS'
            : marketName || gameType || betFor;

  // Format number with commas
  const formatNumber = (num) => {
    if (!num || num === '0') return '0';
    const numValue = parseFloat(num);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const handleStakeChange = (value) => {
    setStake(value);
    resetAutoCloseTimer(); // Reset timer on interaction
    // Update selectedBet with stake for suggestion calculations
    if (onBetChange && selectedBet) {
      onBetChange({ ...selectedBet, stake: value });
    }
  };

  const handleQuickStake = (amount) => {
    const currentStake = parseFloat(stake) || 0;
    const newStake = (currentStake + amount).toString();
    setStake(newStake);
    resetAutoCloseTimer(); // Reset timer on interaction
    // Update selectedBet with stake for suggestion calculations
    if (onBetChange && selectedBet) {
      onBetChange({ ...selectedBet, stake: newStake });
    }
  };

  const handleClearStake = () => {
    setStake('');
    resetAutoCloseTimer(); // Reset timer on interaction
  };

  const handleOddsChange = (value) => {
    setOdds(value);
    resetAutoCloseTimer(); // Reset timer on interaction
    if (onBetChange && selectedBet) {
      onBetChange({ ...selectedBet, odds: value });
    }
  };

  const handleOddsIncrement = () => {
    const currentOdds = parseFloat(odds) || 0;
    handleOddsChange((currentOdds + 0.01).toFixed(2));
    // Timer reset is handled in handleOddsChange
  };

  const handleOddsDecrement = () => {
    const currentOdds = parseFloat(odds) || 0;
    if (currentOdds > 0.01) {
      handleOddsChange((currentOdds - 0.01).toFixed(2));
      // Timer reset is handled in handleOddsChange
    }
  };

  const handleReset = () => {
    if (isCashoutMode) {
      setStake(selectedBet?.stake ? String(selectedBet.stake) : '');
      setOdds(selectedBet?.odds || '');
      setBetType(selectedBet?.type || '');
      setBetFor(selectedBet?.team || '');
      return;
    }
    setStake('');
    setOdds(selectedBet?.odds || '');
    setBetFor(selectedBet?.team || '');
    resetAutoCloseTimer();
  };

  const handleSubmit = async () => {
    if (!stake || !odds || !betFor) {
      toast.error('Please fill in all required fields');
      return;
    }

    const stakeNum = parseFloat(stake);
    const oddsNum = parseFloat(odds);

    if (isNaN(stakeNum) || isNaN(oddsNum)) {
      toast.error('Please enter valid stake and odds');
      return;
    }

    // Validate min/max amounts
    if (minAmount && stakeNum < minAmount) {
      toast.error(`Minimum bet amount is ${minAmount}`);
      return;
    }

    if (maxAmount && stakeNum > maxAmount) {
      toast.error(`Maximum bet amount is ${maxAmount}`);
      return;
    }

    // Determine if this is a fancy bet (Normal, meter, line, ball, khado, Over By Over).
    // fancy1 and oddeven use Match Odds math and route through the sports
    // placeBet endpoint, not the fancy one.
    const fancyBetTypes = [
      'Normal',
      'meter',
      'line',
      'ball',
      'khado',
      'Over By Over',
    ];
    const isFancyBet = fancyBetTypes.includes(gameType);

    // For all fancy bets (Normal, Meter, Khado, Over By Over):
    // fancyScore = original odds value (rate), xValue = size value, price = stake
    // For other fancy bets: use existing logic
    let finalFancyScore = fancyScore || null;
    let finalXValue = oddsNum.toString();

    const fancyBetTypesWithSize = ['Normal', 'meter', 'khado', 'Over By Over'];
    if (
      fancyBetTypesWithSize.includes(gameType) &&
      selectedBet?.size !== undefined &&
      selectedBet?.size !== null
    ) {
      // For fancy bets: fancyScore is the original odds value (rate) from selectedBet, xValue is the size value
      finalFancyScore = parseFloat(selectedBet.odds || oddsNum); // The original odds value (e.g., 15)
      finalXValue = selectedBet.size.toString(); // The size value (e.g., 120)
    }

    const formData = {
      gameId: gameId,
      sid: sid,
      otype: betType,
      oname: selectedBet?.oname || '',
      price: stakeNum,
      xValue: finalXValue,
      gameType: gameType,
      marketName: marketName || gameType,
      eventName: eventName,
      gameName: gameName,
      teamName: betFor,
      fancyScore: finalFancyScore,
      isCashoutHedge: isCashoutMode,
      hedgedBetId: selectedBet?.hedgedBetId || null,
    };

    try {
      if (isFancyBet) {
        await dispatch(createfancyBet(formData));
      } else {
        await dispatch(createBet(formData));
      }

      // Refresh user data and pending bets
      await dispatch(getUser());
      if (gameId) {
        dispatch(getPendingBetAmo(gameId));
        dispatch(
          getBetHistory({
            gameid: gameId,
            page: 1,
            limit: 10,
            selectedVoid: 'unsettel',
          })
        );
      }

      // Reset form and close modal
      setStake('');
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error placing bet:', error);
    }
  };

  const handleEdit = () => {
    // Handle edit logic here
    console.log('Editing bet');
    resetAutoCloseTimer(); // Reset timer on interaction
  };

  if (!selectedBet) {
    return null;
  }

  return (
    <div className='bg-white'>
      {/* Header */}
      <div
        className={`${isMobile ? 'bg-primary' : 'bg-secondary'} flex items-center justify-between p-1 text-[15px] font-bold text-white`}
      >
        <span>{isCashoutMode ? 'Cashout' : 'Place Bet'}</span>
        {isMobile && onClose && (
          <div className='flex items-center gap-2'>
            {(() => {
              // Don't show profit for these bet types - only show after placing bet from API
              const noSuggestionMarkets = [
                'khado',
                'Normal',
                'meter',
                'oddeven',
                'Over By Over',
              ];
              const hideProfit = noSuggestionMarkets.includes(gameType);
              return (
                !hideProfit && (
                  <span className='text-[12px]'>Profit: {profit}</span>
                )
              );
            })()}
            <button
              onClick={onClose}
              className='text-[20px] font-normal text-white hover:text-gray-200'
              style={{ lineHeight: '1' }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Betting Details Table */}

      {/* Table Headers */}
      <div className='grid grid-cols-4 bg-[#cccccc] text-[12px] font-bold text-black'>
        <div className='p-2'>(Bet for)</div>
        <div className='p-2'>Odds</div>
        <div className='p-2'>Stake</div>
        <div className='p-2'>Profit</div>
      </div>

      <div
        className={`${betType === 'back' ? 'bg-[#72bbef]' : 'bg-[#faa9ba]'}`}
      >
        {/* Table Data Row */}
        <div className={`grid grid-cols-4 text-[12px] text-black`}>
          <div className='p-2 text-[12px] text-[#000000]'>
            {isCashoutMode ? cashoutMarketLabel : betFor}
          </div>
          <div className='flex gap-1 p-2'>
            <input
              type='number'
              value={odds}
              onChange={(e) => handleOddsChange(e.target.value)}
              readOnly={isCashoutMode}
              step='0.01'
              min='0.01'
              className='h-[25px] w-full bg-white px-1 py-0.5 text-[12px]'
            />
            <div className='flex flex-col'>
              <button
                onClick={handleOddsIncrement}
                disabled={isCashoutMode}
                className='bg-white text-[10px] leading-none hover:bg-gray-100'
                style={{
                  width: '16px',
                  height: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                ▲
              </button>
              <button
                onClick={handleOddsDecrement}
                disabled={isCashoutMode}
                className='bg-white text-[10px] leading-none hover:bg-gray-100'
                style={{
                  width: '16px',
                  height: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                ▼
              </button>
            </div>
          </div>
          <div className='p-2'>
            <input
              type='number'
              value={stake}
              onChange={(e) => handleStakeChange(e.target.value)}
              readOnly={isCashoutMode}
              placeholder=''
              className='h-[25px] w-full bg-white px-1 py-0.5 text-[12px]'
            />
          </div>
          <div className='p-2'>
            {(() => {
              // Don't show profit for these bet types - only show after placing bet from API
              const noSuggestionMarkets = [
                'khado',
                'Normal',
                'meter',
                'oddeven',
                'Over By Over',
              ];
              const hideProfit = noSuggestionMarkets.includes(gameType);
              return hideProfit ? '-' : profit;
            })()}
          </div>
        </div>

        <div className='p-2'>
          <div className='mb-1 flex flex-wrap gap-1'>
            {quickStakes.map((item, i) => (
              <button
                key={i}
                onClick={() => handleQuickStake(item.value)}
                disabled={isCashoutMode}
                className='bg-[#cccccc] px-4 py-1 text-[14px] font-bold text-[#000000] hover:bg-gray-500'
                style={{ width: 'calc(20% - 4px)' }}
              >
                +{item.label}
              </button>
            ))}
          </div>
          <div className='mt-1 flex justify-end'>
            <button
              onClick={handleClearStake}
              disabled={isCashoutMode}
              className='cursor-pointer text-[12px] text-[#212529] underline'
            >
              clear
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex gap-1 p-2'>
          <button
            onClick={handleEdit}
            className='flex-1 border border-[#097c93] bg-[#097c93] py-2 text-[12px] font-bold text-white hover:bg-[#086a82]'
          >
            Edit
          </button>
          <button
            onClick={handleReset}
            className='flex-1 border border-[#bd1828] bg-[#bd1828] py-2 text-[12px] font-bold text-white hover:bg-[#c82333]'
          >
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 border border-[#198754] bg-[#198754] py-2 text-[12px] font-bold text-white hover:bg-[#157347] ${
              loading ? 'cursor-not-allowed opacity-70' : ''
            }`}
          >
            {loading
              ? 'Placing...'
              : isCashoutMode
                ? 'Cashout'
                : isMobile
                  ? 'Place Bet'
                  : 'Submit'}
          </button>
        </div>

        {/* Bet Summary Footer - Mobile Only */}
        {isMobile && allTeams.length > 0 && !isOddEvenMarket && (
          <div
            className={`${betType === 'back' ? 'bg-[#ffffff45]' : 'bg-[#ffffff45]'} p-2`}
          >
            {allTeams.map((team, index) => {
              // Don't show suggestions for these bet types - only show after placing bet from API
              const noSuggestionMarkets = [
                'khado',
                'Normal',
                'meter',
                'oddeven',
                'Over By Over',
              ];
              const shouldHideSuggestions =
                noSuggestionMarkets.includes(gameType);

              // Check for existing bet
              const {
                otype,
                totalBetAmount,
                totalPrice,
                teamName,
                netOutcome,
                hasMarketBets,
              } = getBetDetails(team);
              const isMatchedTeam =
                teamName?.toLowerCase() === team?.toLowerCase();
              const existingBet =
                hasMarketBets ||
                (otype && totalBetAmount) ||
                (totalPrice && teamName && isMatchedTeam);
              const useProjectedPL = usesProjectedNetOutcome();

              // For these bet types, only show existing bet values, no suggestions
              if (shouldHideSuggestions) {
                return (
                  <div
                    key={index}
                    className='mb-1 flex items-center justify-between'
                  >
                    <span className='text-[12px] text-black'>{team}</span>
                    {existingBet && (
                      <span
                        className={`text-[12px] font-semibold ${
                          otype === 'lay'
                            ? isMatchedTeam
                              ? 'text-[#dc3545]'
                              : 'text-[#28a745]'
                            : otype === 'back'
                              ? isMatchedTeam
                                ? 'text-[#28a745]'
                                : 'text-[#dc3545]'
                              : 'text-[#28a745]'
                        }`}
                      >
                        {(() => {
                          if (otype === 'lay') {
                            return isMatchedTeam
                              ? formatNumber(totalPrice)
                              : formatNumber(totalBetAmount);
                          } else if (otype === 'back') {
                            return isMatchedTeam
                              ? formatNumber(totalBetAmount)
                              : formatNumber(totalPrice);
                          }
                          return '';
                        })()}
                      </span>
                    )}
                  </div>
                );
              }

              const singleItemMarkets = [
                'fancy1',
                'khado',
                'Normal',
                'meter',
                'oddeven',
              ];
              const isSingleItemMarket = singleItemMarkets.includes(gameType);
              const isSelectedTeam =
                team?.toLowerCase() === betFor?.toLowerCase();
              const shouldShowSuggestion = isSingleItemMarket
                ? isSelectedTeam
                : true;

              let suggestionValue = null;
              let suggestionColor = 'green';
              let currentDisplayValue = null;
              let currentDisplayColor = 'green';

              if (useProjectedPL && hasMarketBets && netOutcome !== null) {
                currentDisplayValue = netOutcome;
                currentDisplayColor = netOutcome >= 0 ? 'green' : 'red';
              }

              if (stake && selectedBet && shouldShowSuggestion) {
                if (useProjectedPL) {
                  const projectedNet = getProjectedNetOutcome(team);
                  if (projectedNet !== null) {
                    suggestionValue = projectedNet;
                    suggestionColor = projectedNet >= 0 ? 'green' : 'red';
                  }
                } else if (isSelectedTeam) {
                  const suggestion = calculateSuggestion(
                    team,
                    betFor,
                    betType,
                    stake,
                    odds
                  );
                  if (suggestion) {
                    // For Bookmaker LAY bets on selected team, the value represents loss (negative)
                    if (
                      (gameType === 'Bookmaker' ||
                        gameType === 'Bookmaker 2' ||
                        gameType === 'Tied Match') &&
                      betType === 'lay'
                    ) {
                      // For LAY: if selected team wins, you lose stake * (odds / 100)
                      // Show as negative value
                      suggestionValue = -suggestion.value;
                      suggestionColor = 'red';
                    } else {
                      suggestionValue = suggestion.value;
                      suggestionColor = suggestion.color;
                    }
                  }
                } else if (!isSingleItemMarket) {
                  const stakeNum = parseFloat(stake);
                  if (!isNaN(stakeNum) && stakeNum > 0) {
                    if (betType === 'back') {
                      suggestionValue = stakeNum;
                      suggestionColor = 'red';
                    } else {
                      suggestionValue = stakeNum;
                      suggestionColor = 'green';
                    }
                  }
                }
              }

              return (
                <div
                  key={index}
                  className='mb-1 flex items-center justify-between'
                >
                  <span className='text-[12px] text-black'>{team}</span>
                  {(stake || existingBet) && (
                    <div className='flex items-center gap-1'>
                      {existingBet && (
                        <span
                          className={`text-[12px] font-semibold ${
                            currentDisplayValue !== null
                              ? currentDisplayColor === 'green'
                                ? 'text-[#28a745]'
                                : 'text-[#dc3545]'
                              : otype === 'lay'
                                ? isMatchedTeam
                                  ? 'text-[#dc3545]'
                                  : 'text-[#28a745]'
                                : otype === 'back'
                                  ? isMatchedTeam
                                    ? 'text-[#28a745]'
                                    : 'text-[#dc3545]'
                                  : 'text-[#28a745]'
                          }`}
                        >
                          {currentDisplayValue !== null
                            ? `${currentDisplayValue < 0 ? '-' : ''}${formatNumber(Math.abs(currentDisplayValue))}`
                            : (() => {
                                if (otype === 'lay') {
                                  return isMatchedTeam
                                    ? formatNumber(totalPrice)
                                    : formatNumber(totalBetAmount);
                                }
                                if (otype === 'back') {
                                  return isMatchedTeam
                                    ? formatNumber(totalBetAmount)
                                    : formatNumber(totalPrice);
                                }
                                return '';
                              })()}
                        </span>
                      )}
                      {suggestionValue !== null && (
                        <span
                          className={`text-[12px] font-semibold ${
                            suggestionColor === 'green'
                              ? 'text-[#28a745]'
                              : 'text-[#dc3545]'
                          }`}
                        >
                          {existingBet || currentDisplayValue !== null
                            ? `(${suggestionValue < 0 ? '-' : ''}${formatNumber(Math.abs(suggestionValue))})`
                            : `${suggestionValue < 0 ? '-' : ''}${formatNumber(Math.abs(suggestionValue))}`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlaceBet;

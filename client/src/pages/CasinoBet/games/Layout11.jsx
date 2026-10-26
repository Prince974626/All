import React, { memo, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import RouletteChipPanel from './roulette/RouletteChipPanel';
import RouletteTable from './roulette/RouletteTable';
import { ROULETTE_CHIPS } from './roulette/rouletteConstants';
import {
  buildRouletteBetIndex,
  getChipTotalForNat,
  isGameSuspended,
  isItemSuspended,
} from './roulette/rouletteBetUtils';

const Layout11 = memo(function Layout11({
  bettingData,
  gameid,
  placeBet,
  loading,
  pendingBetAmounts,
  setBetControl,
  setValue,
}) {
  const [selectedChip, setSelectedChip] = React.useState(
    ROULETTE_CHIPS[0].value
  );
  const [betMode, setBetMode] = React.useState('back');
  const [betHistory, setBetHistory] = React.useState([]);
  const [lastRoundBets, setLastRoundBets] = React.useState([]);
  const [chipPanelSlot, setChipPanelSlot] = React.useState(null);

  const [optimisticChips, setOptimisticChips] = React.useState({});
  const prevMidRef = React.useRef(bettingData?.mid);

  React.useEffect(() => {
    setChipPanelSlot(document.getElementById('roulette-chip-panel-slot'));
  }, []);

  React.useEffect(() => {
    if (prevMidRef.current && prevMidRef.current !== bettingData?.mid) {
      setLastRoundBets(betHistory);
      setBetHistory([]);
      setOptimisticChips({});
    }
    prevMidRef.current = bettingData?.mid;
  }, [bettingData?.mid, betHistory]);

  React.useEffect(() => {
    setOptimisticChips({});
  }, [pendingBetAmounts]);

  const betIndex = useMemo(
    () => buildRouletteBetIndex(bettingData?.sub || []),
    [bettingData?.sub]
  );

  const suspended = isGameSuspended(bettingData);
  const minBet = parseFloat(bettingData?.min) || 25;
  const maxBet = parseFloat(bettingData?.max) || 100000;

  const handlePlaceBet = useCallback(
    async (item) => {
      if (!item || isItemSuspended(item)) return;

      const otype = betMode;
      const odds = otype === 'back' ? item.b : item.l;

      const stake = selectedChip ?? ROULETTE_CHIPS[0].value;
      const teamCount = bettingData?.sub?.length || 1;

      setBetControl({
        ...item,
        type: otype,
        odds,
        min: minBet,
        max: maxBet,
        teamCount,
      });
      setValue(odds, item.nat, otype, item.nat, item.sid);

      const success = await placeBet(
        otype,
        item.nat,
        maxBet,
        odds,
        '',
        minBet,
        gameid,
        teamCount,
        stake
      );

      if (success) {
        setOptimisticChips((prev) => ({
          ...prev,
          [item.nat]: (prev[item.nat] || 0) + stake,
        }));
        setBetHistory((prev) => [
          ...prev,
          { nat: item.nat, amount: stake, otype, sid: item.sid },
        ]);
      }
    },
    [betMode, maxBet, minBet, placeBet, selectedChip, setBetControl, setValue]
  );

  const handleUndo = useCallback(() => {
    if (!betHistory.length) {
      toast.info('No bets to undo');
      return;
    }
    toast.info('Undo is not supported for placed bets');
  }, [betHistory.length]);

  const handleRepeat = useCallback(async () => {
    if (!lastRoundBets.length) {
      toast.info('No previous bets to repeat');
      return;
    }
    for (const bet of lastRoundBets) {
      const item = betIndex.byNat.get(bet.nat);
      if (item) {
        setSelectedChip(bet.amount);
        await handlePlaceBet(item);
      }
    }
  }, [betIndex.byNat, handlePlaceBet, lastRoundBets]);

  const handleClear = useCallback(() => {
    setBetHistory([]);
    setOptimisticChips({});
    toast.info('Cleared local bet markers');
  }, []);

  const getDisplayChip = useCallback(
    (nat) => {
      const pending = getChipTotalForNat(pendingBetAmounts, nat);
      const optimistic = optimisticChips[nat] || 0;
      // Use max so optimistic UI doesn't stack on top of refreshed pending amounts
      return Math.max(pending, optimistic);
    },
    [optimisticChips, pendingBetAmounts]
  );

  const chipPanel = (
    <RouletteChipPanel
      selectedChip={selectedChip}
      onChipSelect={setSelectedChip}
      onUndo={handleUndo}
      onRepeat={handleRepeat}
      onClear={handleClear}
      disabled={suspended || loading}
    />
  );

  return (
    <div className='my-2 px-1 sm:px-2'>
      {chipPanelSlot && createPortal(chipPanel, chipPanelSlot)}

      {/* Back / Lay toggle */}
      {gameid !== 'roulette13' && gameid !== 'ourroullete' && (
        <div className='mb-1 flex'>
          <button
            type='button'
            onClick={() => setBetMode('back')}
            className={`rounded-l-full px-10 py-2 text-sm font-bold transition-colors sm:text-base ${
              betMode === 'back'
                ? 'border-2 border-black bg-[#90caf9]'
                : 'border-2 border-white bg-[#90caf9]/60'
            }`}
          >
            Back
          </button>
          <button
            type='button'
            onClick={() => setBetMode('lay')}
            className={`rounded-r-full px-10 py-2 text-sm font-bold transition-colors sm:text-base ${
              betMode === 'lay'
                ? 'border-2 border-black bg-[#f48fb1]'
                : 'border-2 border-white bg-[#f48fb1]/60'
            }`}
          >
            Lay
          </button>
        </div>
      )}

      <div className='relative'>
        <RouletteTable
          betIndex={betIndex}
          getDisplayChip={getDisplayChip}
          onPlaceBet={handlePlaceBet}
          card={bettingData?.card}
          loading={loading}
          gameid={gameid}
          selectedChip={selectedChip}
          onChipSelect={setSelectedChip}
          onUndo={handleUndo}
          onRepeat={handleRepeat}
          onClear={handleClear}
          chipPanelDisabled={suspended || loading}
        />
      </div>
    </div>
  );
});

export default Layout11;

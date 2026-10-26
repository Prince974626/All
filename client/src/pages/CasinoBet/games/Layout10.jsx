import React, { memo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaLock } from 'react-icons/fa';
import zero from '../../../assets/cards/1.jpg';

const REQUIRED_CARDS = 3;
const TOTAL_SLOTS = 6;

const getCardImage = (cardValue) => {
  if (!cardValue || cardValue === '1') return zero;
  return `/cards/${cardValue}.jpg`;
};

const parsePositions = (value) => {
  if (!value) return [];
  if (String(value).includes(',')) {
    return String(value)
      .split(',')
      .map((n) => parseInt(n, 10))
      .filter((n) => !Number.isNaN(n));
  }
  const digits = String(value).match(/\d+/g);
  if (!digits) return [];
  const joined = digits.join('');
  if (joined.length >= REQUIRED_CARDS) {
    return joined.split('').map(Number);
  }
  return [];
};

const buildTeamName = (positions, baseName = 'Your card') => {
  const sorted = [...positions].sort((a, b) => a - b);
  return `${baseName} ${sorted.join('')}`;
};

const isSuspendedStatus = (status) =>
  String(status || '').toUpperCase() === 'SUSPENDED';

const CardSlot = memo(function CardSlot({
  position,
  cardValue,
  isSelected,
  isDisabled,
  showLock,
  onToggle,
}) {
  const isHidden = !cardValue || cardValue === '1';

  return (
    <button
      type='button'
      disabled={isDisabled}
      onClick={() => onToggle(position)}
      className={`relative flex flex-col items-center transition-all ${
        isDisabled ? 'cursor-not-allowed' : 'cursor-pointer '
      }`}
    >
      <span className='mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-[25px] font-bold text-black'>
        {position}
      </span>
      <div className='relative mt-1'>
        <img
          src={getCardImage(cardValue)}
          alt={isHidden ? 'hidden' : cardValue}
          draggable={false}
          className={`h-20 w-auto rounded-[2px] object-contain shadow-sm sm:h-24 ${
            isSelected ? 'border-[3px] border-[#0088cc]' : ''
          }`}
        />
        {showLock && (
          <div className='absolute inset-0 flex items-center justify-center rounded-[2px] bg-black/45 text-white'>
            <FaLock className='size-5' />
          </div>
        )}
      </div>
    </button>
  );
});

const MiniCard = memo(function MiniCard({ position, cardValue }) {
  const isHidden = !cardValue || cardValue === '1';

  return (
    <div className='relative'>
      <img
        src={getCardImage(cardValue)}
        alt={isHidden ? 'hidden' : cardValue}
        draggable={false}
        className='h-16 w-auto rounded-[2px] border-2 border-yellow-400 object-contain shadow-sm sm:h-20'
      />
      {cardValue === '1' && (
        <span className='absolute inset-0 flex items-center justify-center'>
          <span className='flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-black shadow-sm'>
            {position}
          </span>
        </span>
      )}
    </div>
  );
});

const MatchedBetSection = memo(function MatchedBetSection({ bets, cards }) {
  if (!bets?.length) return null;

  return (
    <div className='m-3'>
      <div className='grid grid-cols-4 border-b border-gray-300 bg-white'>
        <div className='col-span-2 flex h-9 items-center px-2 text-sm font-bold text-black'>
          Matched Bet
        </div>
        <div className='flex h-9 items-center justify-end px-2 text-sm font-bold text-black'>
          Odds
        </div>
        <div className='flex h-9 items-center justify-end px-2 text-sm font-bold text-black'>
          Stake
        </div>
      </div>

      {bets.map((bet) => {
        const userPositions = parsePositions(bet.fancyScore || bet.teamName);
        const dealerPositions = Array.from(
          { length: TOTAL_SLOTS },
          (_, i) => i + 1
        ).filter((pos) => !userPositions.includes(pos));

        return (
          <div
            key={bet._id}
            className='border-b border-gray-200 bg-[#72bbef] px-2 py-2 last:border-b-0'
          >
            <div className='grid grid-cols-4 items-center'>
              <div className='col-span-2 text-sm font-bold text-black'>
                {bet.teamName || buildTeamName(userPositions)}
              </div>
              <div className='text-right text-sm font-bold text-black'>
                {Number(bet.xValue || 0).toFixed(2)}
              </div>
              <div className='text-right text-sm font-bold text-black'>
                {Number(bet.price || 0).toFixed(0)}
              </div>
            </div>

            <div className='mt-2 rounded-sm bg-[#0000001c] px-3 py-2'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <div className='mb-1 text-sm font-bold text-black'>
                    Your Card
                  </div>
                  <div className='flex flex-wrap gap-1'>
                    {userPositions.map((pos) => (
                      <MiniCard
                        key={`user-${pos}`}
                        position={pos}
                        cardValue={cards[pos - 1]}
                      />
                    ))}
                  </div>
                </div>
                <div className='text-right'>
                  <div className='mb-1 text-sm font-bold text-black'>
                    Dealer Card
                  </div>
                  <div className='flex flex-wrap justify-end gap-1'>
                    {dealerPositions.map((pos) => (
                      <MiniCard
                        key={`dealer-${pos}`}
                        position={pos}
                        cardValue={cards[pos - 1]}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

const Layout10 = memo(function Layout10({
  bettingData,
  gameid,
  pendingBet,
  ...betProps
}) {
  const { setBetControl, setValue, setSelectedTeamSubtype, resetBettingState } =
    betProps;

  const [selectedPositions, setSelectedPositions] = useState([]);

  const cards = (bettingData?.card || '').split(',').filter(Boolean);
  const roundId = bettingData?.mid;
  const subPlayers = Array.isArray(bettingData?.sub) ? bettingData.sub : [];
  const player = subPlayers[0] ?? null;

  const getSlotGstatus = (position) => {
    const slotPlayer =
      subPlayers.find((p) => Number(p.sid) === position) ??
      (subPlayers.length === 1 ? subPlayers[0] : subPlayers[position - 1]);
    return slotPlayer?.gstatus;
  };

  const [prevRound, setPrevRound] = useState(roundId);
  if (roundId !== prevRound) {
    setPrevRound(roundId);
    setSelectedPositions([]);
  }

  const isMarketSuspended =
    isSuspendedStatus(bettingData?.gstatus) ||
    subPlayers.some((p) => isSuspendedStatus(p.gstatus));

  const isSuspended = isMarketSuspended || player?.b <= 0;

  const roundBets =
    pendingBet?.filter(
      (bet) =>
        bet.gameId === gameid &&
        String(bet.roundId) === String(roundId) &&
        bet.status === 0
    ) || [];

  const hasPlacedBet = roundBets.length > 0;

  // Auto-deselect when market suspends, a selected slot suspends, or bet is placed
  if (selectedPositions.length > 0) {
    const validSelections = hasPlacedBet
      ? []
      : isSuspended
        ? []
        : selectedPositions.filter(
            (pos) => !isSuspendedStatus(getSlotGstatus(pos))
          );
    if (validSelections.join(',') !== selectedPositions.join(',')) {
      setSelectedPositions(validSelections);
    }
  }

  const openBetPanel = (positions) => {
    if (!player) return;
    const sorted = [...positions].sort((a, b) => a - b);
    const teamName = buildTeamName(sorted);

    setBetControl({
      ...player,
      type: 'back',
      odds: player.b,
      marketName: 'WINNER',
      teamCount: 2,
      card: sorted.join(','),
      fancyScore: sorted.join(','),
      nat: teamName,
      requiredCardCount: REQUIRED_CARDS,
    });
    setSelectedTeamSubtype(player.subtype);
    setValue(player.b, teamName, 'back', teamName, player.sid ?? player.sr);
  };

  const togglePosition = (position) => {
    if (isSuspended || hasPlacedBet) return;

    let next;
    if (selectedPositions.includes(position)) {
      next = selectedPositions.filter((p) => p !== position);
    } else {
      if (selectedPositions.length >= REQUIRED_CARDS) {
        toast.error(`You can select only ${REQUIRED_CARDS} cards`);
        return;
      }
      next = [...selectedPositions, position];
    }

    setSelectedPositions(next);

    if (next.length >= 1) {
      openBetPanel(next);
    } else {
      resetBettingState();
    }
  };

  // const handleCancel = () => {
  //   resetBettingState();
  //   setSelectedPositions([]);
  // };

  // const handlePlaceBet = async (...args) => {
  //   if (selectedPositions.length !== REQUIRED_CARDS) {
  //     toast.error(`Please select exactly ${REQUIRED_CARDS} cards to place bet`);
  //     return;
  //   }
  //   const success = await betProps.placeBet(...args);
  //   if (success) {
  //     setSelectedPositions([]);
  //   }
  // };

  if (cards.length === 0) return null;

  // const hasRequiredCards = selectedPositions.length === REQUIRED_CARDS;

  return (
    <div className='my-4'>
      <div className='mx-auto mb-3 w-fit bg-[#243A48] px-2 py-1 text-[16px] text-white'>
        Select any 3 cards of your choice and experience TeenPatti in a unique
        way.
      </div>
      <div className='flex flex-wrap items-center justify-center gap-2'>
        {cards.slice(0, TOTAL_SLOTS).map((cardValue, index) => {
          const position = index + 1;
          const showLock =
            isSuspendedStatus(getSlotGstatus(position)) && cardValue === '1';

          return (
            <CardSlot
              key={`slot-${position}`}
              position={position}
              cardValue={cardValue}
              isSelected={selectedPositions.includes(position)}
              isDisabled={isSuspended}
              showLock={showLock}
              onToggle={togglePosition}
            />
          );
        })}
      </div>

      <MatchedBetSection bets={roundBets} cards={cards} />
    </div>
  );
});

export default Layout10;

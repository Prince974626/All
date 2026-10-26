import React, { memo, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { SectionHeader } from './LayoutDefault';
import { FaLock } from 'react-icons/fa';

import A from '../../../assets/cards/A.jpeg';
import K from '../../../assets/cards/K.jpeg';
import Q from '../../../assets/cards/Q.jpeg';
import J from '../../../assets/cards/J.jpeg';
import ten from '../../../assets/cards/10.jpeg';
import nine from '../../../assets/cards/9.jpeg';
import eight from '../../../assets/cards/8.jpeg';
import seven from '../../../assets/cards/7.jpeg';
import six from '../../../assets/cards/6.jpeg';
import five from '../../../assets/cards/5.jpeg';
import four from '../../../assets/cards/4.jpeg';
import three from '../../../assets/cards/3.jpeg';
import two from '../../../assets/cards/2.jpeg';

const CARD_SEQUENCE = [
  { key: 'A', img: A },
  { key: '2', img: two },
  { key: '3', img: three },
  { key: '4', img: four },
  { key: '5', img: five },
  { key: '6', img: six },
  { key: '7', img: seven },
  { key: '8', img: eight },
  { key: '9', img: nine },
  { key: '10', img: ten },
  { key: 'J', img: J },
  { key: 'Q', img: Q },
  { key: 'K', img: K },
];

const MARKET_NAME = '3 Card Judgement';
const REQUIRED_CARDS = 3;

const isYes = (nat) => nat?.toLowerCase()?.trim() === 'yes';

const getOtypeFor3cardj = (nat) => (isYes(nat) ? 'back' : 'lay');

const normalize = (str) => str?.toLowerCase()?.trim();

/** Match "Yes" / "No" to API teamName ("Yes" or "Yes#A,2,3"). */
const teamNameMatches = (detailName, playerName) => {
  const detail = normalize(detailName);
  const player = normalize(playerName);
  if (!detail || !player) return false;
  return detail === player || detail.startsWith(`${player}#`);
};

/** Show winProfit only for the placed team — never for other rows. */
const PlacedBetPL = memo(function PlacedBetPL({
  playerName,
  marketName,
  pendingBetAmounts,
}) {
  if (!Array.isArray(pendingBetAmounts)) return null;

  const market = pendingBetAmounts.find(
    (m) => normalize(m.marketName) === normalize(marketName)
  );
  const detail = market?.details?.find((d) =>
    teamNameMatches(d.teamName, playerName)
  );
  if (!detail) return null;

  const price = Number(detail.price) || 0;
  const isProfit = price >= 0;

  return (
    <span
      className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}
    >
      {price.toFixed(2)}
    </span>
  );
});

const CardStrip = memo(function CardStrip({
  selectedCards,
  disabled,
  onToggle,
}) {
  return (
    <div className='flex flex-wrap items-center justify-center gap-2 px-1'>
      {CARD_SEQUENCE.map((card) => {
        const isCardSelected = selectedCards.includes(card.key);
        return (
          <button
            key={card.key}
            type='button'
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(card.key);
            }}
            className={`transition-all ${
              isCardSelected
                ? 'ring-2 ring-[#1F7A4D] ring-offset-1'
                : 'opacity-95 hover:brightness-105'
            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <img
              src={card.img}
              alt={card.key}
              className='w-10 rounded-[2px] object-contain shadow-sm'
              draggable={false}
            />
          </button>
        );
      })}
    </div>
  );
});

const JudgementRow = memo(function JudgementRow({
  player,
  pendingBetAmounts,
  selectedCards,
  onToggleCard,
}) {
  const yes = isYes(player.nat);
  const isSuspended = player.gstatus === 'SUSPENDED';

  return (
    <div
      className={`relative flex items-stretch border-b border-black/30 ${
        yes ? 'bg-[#72BBEF]' : 'bg-[#F9C9D4]'
      } `}
    >
      {isSuspended && (
        <div className='absolute inset-0 z-10 flex items-center justify-center gap-2 bg-black/55 text-white'>
          <FaLock className='size-4' />
        </div>
      )}

      {/* Label cell */}
      <div className='grid w-[70px] shrink-0 items-center justify-center border-r border-black/30 px-1 text-[14px] font-bold text-black md:w-[90px]'>
        <span className='block'>{player.nat}</span>
        <PlacedBetPL
          playerName={player.nat}
          marketName={MARKET_NAME}
          pendingBetAmounts={pendingBetAmounts}
        />
      </div>

      {/* Odds + cards */}
      <div className='flex flex-1 flex-col items-center justify-center gap-2 py-1.5'>
        <div className='text-[18px] font-bold text-black'>{player.b}</div>
        <CardStrip
          selectedCards={selectedCards}
          disabled={isSuspended || player.b <= 0}
          onToggle={(key) => onToggleCard(player, key)}
        />
      </div>
    </div>
  );
});

const Layout8 = memo(function Layout8({ bettingData, ...betProps }) {
  const {
    betControl,
    setBetControl,
    setValue,
    setSelectedTeamSubtype,
    resetBettingState,
  } = betProps;

  // Which team's cards are selected + the chosen card keys
  const [selection, setSelection] = useState({ sid: null, cards: [] });

  const players = Array.isArray(bettingData?.sub) ? bettingData.sub : [];
  const roundId = bettingData?.mid;

  // Clear selection whenever the round changes (render-phase reset)
  const [prevRound, setPrevRound] = useState(roundId);
  if (roundId !== prevRound) {
    setPrevRound(roundId);
    setSelection({ sid: null, cards: [] });
  }

  // Clear selection if the currently selected team becomes suspended
  const selectedPlayer =
    selection.sid !== null
      ? players.find((p) => p.sid === selection.sid)
      : null;
  const isSelectionSuspended =
    selection.sid !== null &&
    (selectedPlayer?.gstatus === 'SUSPENDED' || selectedPlayer?.b <= 0);

  if (isSelectionSuspended) {
    setSelection({ sid: null, cards: [] });
  }

  useEffect(() => {
    if (isSelectionSuspended) {
      resetBettingState();
    }
  }, [isSelectionSuspended, resetBettingState]);

  // Deselect cards when bet panel closes after a full selection
  // (overlay click, Reset button, or successful place bet)
  useEffect(() => {
    if (!betControl && selection.cards.length === REQUIRED_CARDS) {
      setSelection({ sid: null, cards: [] });
    }
  }, [betControl, selection.cards.length]);

  const openBetPanel = (player, cards) => {
    const otype = getOtypeFor3cardj(player.nat);
    const combinedTeamName = `${player.nat}#${cards.join(',')}`;

    // Calculate possible 3-card combinations out of CARD_SEQUENCE (e.g. 13 choose 3 = 286, or 11 choose 3 = 165)
    const n = CARD_SEQUENCE.length;
    const teamCountNo = Math.round((n * (n - 1) * (n - 2)) / 6);

    setBetControl({
      ...player,
      nat: combinedTeamName,
      type: otype,
      odds: player.b,
      marketName: MARKET_NAME,
      teamCount: teamCountNo,
      card: cards.join(','),
      requiredCardCount: REQUIRED_CARDS,
    });
    setSelectedTeamSubtype(player.subtype);
    setValue(player.b, combinedTeamName, otype);
  };

  const toggleCard = (player, key) => {
    if (player.b <= 0 || player.gstatus === 'SUSPENDED') return;

    // Switching to a different team resets the previous team's selection
    const sameTeam = selection.sid === player.sid;
    const base = sameTeam ? selection.cards : [];

    let next;
    if (base.includes(key)) {
      next = base.filter((c) => c !== key);
    } else {
      if (base.length >= REQUIRED_CARDS) {
        toast.error(`You can select only ${REQUIRED_CARDS} cards`);
        return;
      }
      next = [...base, key];
    }

    setSelection({ sid: player.sid, cards: next });

    // Open the bet panel as soon as the first card is chosen; close when none
    if (next.length >= 3) {
      openBetPanel(player, next);
    } else {
      resetBettingState();
    }
  };

  if (players.length === 0) return null;

  const minMax = `${players[0].min} - ${players[0].max}`;
  const hasRequiredCards = selection.cards.length === REQUIRED_CARDS;

  return (
    <div className='mb-[2px]'>
      <SectionHeader title={MARKET_NAME} minMax={minMax} />
      <div className='overflow-hidden rounded-br-sm rounded-bl-sm border border-gray-400'>
        {players.map((player) => (
          <React.Fragment key={player.sid}>
            <JudgementRow
              player={player}
              selectedCards={
                selection.sid === player.sid ? selection.cards : []
              }
              onToggleCard={toggleCard}
              {...betProps}
            />
          </React.Fragment>
        ))}

        {/* Helper hint */}
        <div className='bg-[#EEF4F7] px-2 py-1 text-center text-[11px] font-semibold text-[#1F72AC]'>
          {selection.cards.length === 0
            ? `Select any ${REQUIRED_CARDS} cards on a team to place your bet`
            : hasRequiredCards
              ? `Selected cards: ${selection.cards.join(', ')}`
              : `Selected ${selection.cards.join(', ')} — pick ${
                  REQUIRED_CARDS - selection.cards.length
                } more to place bet`}
        </div>
      </div>
    </div>
  );
});

export default Layout8;

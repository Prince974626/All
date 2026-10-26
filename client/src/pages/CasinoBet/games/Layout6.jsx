import React, { memo, useMemo } from 'react';
import { FaLock } from 'react-icons/fa';
import { SuspendedCellOverlay } from './LayoutDefault';

const PLAYER_ORDER = ['Player 8', 'Player 9', 'Player 10', 'Player 11'];
const COLOR_MATCHERS = [
  {
    label: 'Any 3 Card Black',
    test: (nat) => {
      const has3 = /\b3\b|three/.test(nat);
      return (
        /black/.test(nat) && has3 && !/two|2\b/.test(nat) && !/red/.test(nat)
      );
    },
  },
  {
    label: 'Any 3 Card Red',
    test: (nat) => {
      const has3 = /\b3\b|three/.test(nat);
      return (
        /red/.test(nat) && has3 && !/two|2\b/.test(nat) && !/black/.test(nat)
      );
    },
  },
  {
    label: 'Two Black Two Red',
    test: (nat) =>
      (/two|2\b/.test(nat) && /black/.test(nat) && /red/.test(nat)) ||
      /2\s*black.*2\s*red|2\s*red.*2\s*black/.test(nat),
  },
];

// Fallback when API only sends short names like "Black" / "Red"
const COLOR_FALLBACK_MATCHERS = [
  {
    label: 'Any 3 Card Black',
    test: (nat) =>
      (/^black$/.test(nat) || /card\s*black|black\s*card/.test(nat)) &&
      !/red/.test(nat),
  },
  {
    label: 'Any 3 Card Red',
    test: (nat) =>
      (/^red$/.test(nat) || /card\s*red|red\s*card/.test(nat)) &&
      !/black/.test(nat),
  },
];
const TOTAL_MATCHERS = [
  {
    label: '8 & 9 Total',
    test: (nat) => /8/.test(nat) && /9/.test(nat) && /total/.test(nat),
  },
  {
    label: '10 & 11 Total',
    test: (nat) => /10/.test(nat) && /11/.test(nat) && /total/.test(nat),
  },
];
const LUCKY_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

const MARKET = {
  players: 'WINNER',
  oddEven: 'Odd Even',
  cardColor: 'CARD COLOR',
  cardTotal: 'CARD TOTAL',
  luckyNumber: 'LUCKY NUMBER',
};

const normalize = (str) => str?.toLowerCase()?.trim() || '';

const isWinnerMarket = (marketName) => normalize(marketName) === 'winner';

/**
 * After place bet only:
 * - winner → bet team: winProfit, other teams: netBet
 * - other markets → price (bet team only)
 */
const PlacedBetPL = memo(function PlacedBetPL({
  playerName,
  marketName,
  pendingBetAmounts,
}) {
  if (!Array.isArray(pendingBetAmounts)) return null;

  const market = pendingBetAmounts.find(
    (m) => normalize(m.marketName) === normalize(marketName)
  );
  if (!market) return null;

  const detail = market.details?.find(
    (d) => normalize(d.teamName) === normalize(playerName)
  );

  let value;
  if (isWinnerMarket(marketName)) {
    value = detail ? Number(detail.winProfit) || 0 : Number(market.netBet) || 0;
  } else {
    if (!detail) return null;
    value = Number(detail.price);
    if (Number.isNaN(value)) return null;
  }

  const isProfit = value >= 0;

  return (
    <span
      className={`text-[11px] font-bold ${
        isProfit ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {value.toFixed(2)}
    </span>
  );
});

const isColorMarket = (item) => {
  const nat = normalize(item.nat);
  if ([13, 14, 27].includes(Number(item.sid))) return true;
  return (
    COLOR_MATCHERS.some((m) => m.test(nat)) ||
    COLOR_FALLBACK_MATCHERS.some((m) => m.test(nat))
  );
};

const isTotalMarket = (item) => {
  const nat = normalize(item.nat);
  if ([25, 26].includes(item.sid)) return true;
  return TOTAL_MATCHERS.some((m) => m.test(nat));
};

const groupCard32Data = (sub) => {
  if (!Array.isArray(sub)) return {};

  const cardColor = sub.filter(isColorMarket);
  const cardTotal = sub.filter(isTotalMarket);
  const used = new Set([...cardColor, ...cardTotal].map((i) => i.sid));

  return {
    players: sub.filter((item) => item.sid >= 1 && item.sid <= 4),
    oddEven: sub.filter((item) => item.sid >= 5 && item.sid <= 12),
    cardColor,
    cardTotal,
    luckyNumber: sub.filter(
      (item) =>
        item.sid >= 15 &&
        item.sid <= 24 &&
        !used.has(item.sid) &&
        !isColorMarket(item) &&
        !isTotalMarket(item)
    ),
  };
};

const findByNat = (list, labels) =>
  labels
    .map((label) => {
      const found = list?.find(
        (item) => normalize(item.nat) === normalize(label)
      );
      return (
        found ||
        list?.find((item) => normalize(item.nat).includes(normalize(label))) ||
        list?.find((item) => normalize(label).includes(normalize(item.nat)))
      );
    })
    .filter(Boolean);

const orderByMatchers = (list = [], matchers, fallbackMatchers = []) => {
  const remaining = [...list];
  const ordered = [];

  matchers.forEach(({ label, test }) => {
    const idx = remaining.findIndex((item) => test(normalize(item.nat)));
    if (idx === -1) return;
    const [item] = remaining.splice(idx, 1);
    ordered.push({ ...item, displayNat: label });
  });

  // Fill any still-missing labels with softer name matches
  fallbackMatchers.forEach(({ label, test }) => {
    if (ordered.some((item) => item.displayNat === label)) return;
    const idx = remaining.findIndex((item) => test(normalize(item.nat)));
    if (idx === -1) return;
    const [item] = remaining.splice(idx, 1);
    ordered.push({ ...item, displayNat: label });
  });

  // Last resort: known color sids still unmatched (13=Black, 14=Red, 27=Two)
  const sidFallback = [
    { label: 'Any 3 Card Black', sid: 13 },
    { label: 'Any 3 Card Red', sid: 14 },
    { label: 'Two Black Two Red', sid: 27 },
  ];
  sidFallback.forEach(({ label, sid }) => {
    if (ordered.some((item) => item.displayNat === label)) return;
    const idx = remaining.findIndex((item) => Number(item.sid) === sid);
    if (idx === -1) return;
    const [item] = remaining.splice(idx, 1);
    ordered.push({ ...item, displayNat: label });
  });

  remaining.sort((a, b) => a.sid - b.sid).forEach((item) => ordered.push(item));

  return ordered;
};

const getPlayerLabel = (nat) => {
  const match = nat?.match(/player\s*(8|9|10|11)/i);
  if (match) return `Player ${match[1]}`;
  return nat || '';
};

const isOddNat = (nat) => /\bodd\b/i.test(nat || '');
const isEvenNat = (nat) => /\beven\b/i.test(nat || '');

const groupOddEvenByPlayer = (items = []) => {
  const byPlayer = {};

  items.forEach((item) => {
    const player = getPlayerLabel(item.nat);
    if (!byPlayer[player]) byPlayer[player] = { odd: null, even: null };
    if (isOddNat(item.nat)) byPlayer[player].odd = item;
    else if (isEvenNat(item.nat)) byPlayer[player].even = item;
  });

  // Fallback if API nats don't include player names: pair by sid order
  const hasPlayerRows = PLAYER_ORDER.some((label) => byPlayer[label]);
  if (!hasPlayerRows && items.length) {
    const sorted = [...items].sort((a, b) => a.sid - b.sid);
    PLAYER_ORDER.forEach((label, idx) => {
      const odd = sorted[idx * 2];
      const even = sorted[idx * 2 + 1];
      byPlayer[label] = { odd: odd || null, even: even || null };
    });
  }

  return PLAYER_ORDER.map((label) => ({
    label,
    odd: byPlayer[label]?.odd || null,
    even: byPlayer[label]?.even || null,
  })).filter((row) => row.odd || row.even);
};

const extractLuckyDigit = (nat, sid) => {
  const fromNat = String(nat || '').match(/\b([0-9])\b/);
  if (fromNat) return Number(fromNat[1]);
  // sid 15..24 → digits 0..9 (common provider mapping)
  if (typeof sid === 'number' && sid >= 15 && sid <= 24) return sid - 15;
  return null;
};

const orderLuckyNumbers = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    const digit = extractLuckyDigit(item.nat, item.sid);
    if (digit !== null && !map.has(digit)) map.set(digit, item);
  });

  if (map.size === 0 && items.length) {
    const sorted = [...items].sort((a, b) => a.sid - b.sid);
    sorted.forEach((item, idx) => {
      const digit = LUCKY_ORDER[idx];
      if (digit !== undefined) map.set(digit, item);
    });
  }

  return LUCKY_ORDER.map((digit) => ({
    digit,
    item: map.get(digit) || null,
  })).filter((row) => row.item);
};

const OddsCell = memo(function OddsCell({
  player,
  type = 'back',
  marketName,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
  showCellPL = false,
  className = '',
}) {
  if (!player) {
    return <td className={`relative min-h-[36px] bg-[#72bbef] ${className}`} />;
  }

  const odds = type === 'lay' ? player.l : player.b;
  const isSuspended = player.gstatus === 'SUSPENDED';
  const isSelected =
    betControl?.sid === player.sid && betControl?.type === type;

  const selectedBg =
    type === 'lay'
      ? 'bg-[#f4496d] text-white shadow-[inset_0_1px_3px_#000000a8]'
      : 'bg-[#1a8ee1] text-white shadow-[inset_0_1px_3px_#000000a8]';
  const idleBg = type === 'lay' ? 'bg-[#f9c9d4]' : 'bg-[#72bbef]';

  const handleClick = () => {
    if (isSuspended || !(odds > 0)) return;
    setBetControl({
      ...player,
      type,
      odds,
      marketName: player.marketName || marketName,
    });
    setSelectedTeamSubtype?.(player.subtype);
    setValue(odds, player.nat, type);
  };

  return (
    <td
      className={`relative h-[46px] w-[20%] py-1.5 text-center text-[14px] ${
        isSuspended ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${isSelected ? selectedBg : idleBg} ${className}`}
      onClick={handleClick}
    >
      <span className='block text-[18px] font-semibold'>{odds}</span>
      {showCellPL && (
        <PlacedBetPL
          playerName={player.nat}
          marketName={player.marketName || marketName}
          pendingBetAmounts={pendingBetAmounts}
        />
      )}
      <SuspendedCellOverlay status={player.gstatus} />
    </td>
  );
});

const BackLayTable = memo(function BackLayTable({
  players,
  marketName,
  showLay = true,
  labelWidth = 'w-[60%]',
  ...betProps
}) {
  if (!players?.length) return null;

  return (
    <table className='w-full border-collapse border border-gray-400 bg-white text-black'>
      <thead>
        <tr className='text-center text-[14px] font-bold text-black'>
          <th className={`${labelWidth} border-b border-gray-300 bg-white`} />
          <th className='border-b border-gray-300 bg-[#72bbef] py-1'>Back</th>
          {showLay && (
            <th className='border-b border-gray-300 bg-[#f9c9d4] py-1'>Lay</th>
          )}
        </tr>
      </thead>
      <tbody>
        {players.map((player) => (
          <tr key={player.sid} className='border-t border-gray-300'>
            <td className={`h-[46px] px-2 py-1 text-[15px] font-bold`}>
              {player.displayNat || player.nat}
              <div>
                <PlacedBetPL
                  playerName={player.nat}
                  marketName={player.marketName || marketName}
                  pendingBetAmounts={betProps.pendingBetAmounts}
                />
              </div>
            </td>
            <OddsCell
              player={{ ...player, marketName }}
              type='back'
              marketName={marketName}
              {...betProps}
            />
            {showLay && (
              <OddsCell
                player={{ ...player, marketName }}
                type='lay'
                marketName={marketName}
                {...betProps}
              />
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
});

const OddEvenTable = memo(function OddEvenTable({
  rows,
  marketName,
  ...betProps
}) {
  if (!rows?.length) return null;

  return (
    <table className='w-full border-collapse border border-gray-400 bg-white text-black'>
      <thead>
        <tr className='text-center text-[14px] font-bold text-black'>
          <th className='w-[60%] border-b border-gray-300 bg-white' />
          <th className='border-b border-gray-300 bg-[#72bbef] py-1'>Odd</th>
          <th className='border-b border-gray-300 bg-[#72bbef] py-1'>Even</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className='border-t border-gray-300'>
            <td className='w-[60%] px-2 py-1 text-[15px] font-bold'>
              {row.label}
            </td>
            <OddsCell
              player={row.odd ? { ...row.odd, marketName } : null}
              type='back'
              marketName={marketName}
              showCellPL
              {...betProps}
            />
            <OddsCell
              player={row.even ? { ...row.even, marketName } : null}
              type='back'
              marketName={marketName}
              showCellPL
              {...betProps}
            />
          </tr>
        ))}
      </tbody>
    </table>
  );
});

const LuckyNumberGrid = memo(function LuckyNumberGrid({
  numbers,
  marketName,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
}) {
  if (!numbers?.length) return null;

  const first = numbers[0]?.item;
  const headerValue = first?.b ?? 0;

  return (
    <div className='border border-gray-400 bg-white'>
      <div className='border-b border-gray-300 bg-[#e5e7eb] py-1 text-center text-[14px] font-bold text-black'>
        {headerValue}
      </div>
      <div className='grid grid-cols-5'>
        {numbers.map(({ digit, item }) => {
          const isSuspended = item.gstatus === 'SUSPENDED';
          const isSelected =
            betControl?.sid === item.sid && betControl?.type === 'back';

          const handleClick = () => {
            if (isSuspended || !(item.b > 0)) return;
            setBetControl({
              ...item,
              type: 'back',
              odds: item.b,
              marketName,
            });
            setSelectedTeamSubtype?.(item.subtype);
            setValue(item.b, item.nat, 'back');
          };

          return (
            <button
              key={digit}
              type='button'
              onClick={handleClick}
              className={`relative flex min-h-[70px] flex-col items-center justify-center border border-gray-300 ${
                isSuspended ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                isSelected
                  ? 'bg-[#1a8ee1] text-white'
                  : 'bg-[#72bbef] text-black'
              }`}
            >
              <span className='pointer-events-none absolute inset-0 flex items-center justify-center font-[Casino] text-[48px] font-bold select-none'>
                {digit}
              </span>

              <div className='relative z-1'>
                <PlacedBetPL
                  playerName={item.nat}
                  marketName={marketName}
                  pendingBetAmounts={pendingBetAmounts}
                />
              </div>
              {isSuspended && (
                <div className='absolute inset-0 z-10 flex items-center justify-center bg-[#444b54]/90 text-white'>
                  <FaLock className='size-4' />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

const isCard32TwoColumnLayout = (gameid) => gameid === 'card32';

const Layout6 = memo(function Layout6({
  gameid,
  bettingData,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  betAmount,
  betOdds,
  pendingBetAmounts,
}) {
  const sections = useMemo(
    () => groupCard32Data(bettingData?.sub),
    [bettingData?.sub]
  );

  const players = useMemo(
    () =>
      findByNat(sections.players, PLAYER_ORDER).length
        ? findByNat(sections.players, PLAYER_ORDER)
        : [...(sections.players || [])].sort((a, b) => a.sid - b.sid),
    [sections.players]
  );

  const oddEvenRows = useMemo(
    () => groupOddEvenByPlayer(sections.oddEven),
    [sections.oddEven]
  );

  const colorPlayers = useMemo(
    () =>
      orderByMatchers(
        sections.cardColor,
        COLOR_MATCHERS,
        COLOR_FALLBACK_MATCHERS
      ),
    [sections.cardColor]
  );

  const totalPlayers = useMemo(
    () => orderByMatchers(sections.cardTotal, TOTAL_MATCHERS),
    [sections.cardTotal]
  );

  const luckyNumbers = useMemo(
    () => orderLuckyNumbers(sections.luckyNumber),
    [sections.luckyNumber]
  );

  const betProps = {
    betControl,
    setBetControl,
    setValue,
    setSelectedTeamSubtype,
    betAmount,
    betOdds,
    pendingBetAmounts,
  };

  const useTwoColumnPlayers =
    isCard32TwoColumnLayout(gameid) && players.length >= 4;
  const playerColumnGroups = useTwoColumnPlayers
    ? [players.slice(0, 2), players.slice(2, 4)]
    : null;
  const hasOddEven = oddEvenRows.length > 0;

  return (
    <div className='mb-[2px] space-y-1'>
      {/* Top: Winner Back/Lay | Odd/Even */}
      <div
        className={`grid grid-cols-1 gap-1 ${hasOddEven ? 'md:grid-cols-2' : ''}`}
      >
        {playerColumnGroups ? (
          <div
            className={`grid md:grid-cols-2 md:gap-1 ${hasOddEven ? '' : 'w-full'}`}
          >
            {playerColumnGroups.map((columnPlayers, index) => (
              <BackLayTable
                key={index}
                players={columnPlayers}
                marketName={MARKET.players}
                showLay
                labelWidth='w-[50%]'
                {...betProps}
              />
            ))}
          </div>
        ) : (
          <BackLayTable
            players={players}
            marketName={MARKET.players}
            showLay
            {...betProps}
          />
        )}
        <OddEvenTable
          rows={oddEvenRows}
          marketName={MARKET.oddEven}
          {...betProps}
        />
      </div>

      {/* Middle: Card color | Card total */}
      <div className='grid grid-cols-1 gap-1 md:grid-cols-2'>
        <BackLayTable
          players={colorPlayers}
          marketName={MARKET.cardColor}
          showLay
          {...betProps}
        />
        <BackLayTable
          players={totalPlayers}
          marketName={MARKET.cardTotal}
          showLay={false}
          labelWidth='w-[30%]'
          {...betProps}
        />
      </div>

      {/* Bottom: Lucky numbers */}
      <LuckyNumberGrid
        numbers={luckyNumbers}
        marketName={MARKET.luckyNumber}
        {...betProps}
      />
    </div>
  );
});

export default Layout6;

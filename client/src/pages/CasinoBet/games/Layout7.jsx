import React, { memo, useMemo } from 'react';
import { SuspendedCellOverlay } from './LayoutDefault';
import { formatToK } from '../utils/bettingUtils';

const BALL_BY_BALL_COLUMNS = [
  ['0 Runs', '3 Runs', 'Boundary'],
  ['1 Runs', '4 Runs', 'Wicket'],
  ['2 Runs', '6 Runs', 'Extra Runs'],
];

const normalize = (str) => str?.toLowerCase()?.trim() || '';

/**
 * After place bet only:
 * - bet team → winProfit
 * - other teams → netBet
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

  const value = detail
    ? Number(detail.winProfit) || 0
    : Number(market.netBet) || 0;

  const isProfit = value >= 0;

  return (
    <div>
      <span
        className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}
      >
        {' '}
        {Math.abs(value).toFixed(2)}
      </span>
    </div>
  );
});

const findPlayerByNat = (players, labels) => {
  for (const label of labels) {
    const normalizedLabel = normalize(label);
    const found = players.find((player) => {
      const nat = normalize(player.nat);
      return (
        nat === normalizedLabel ||
        nat.includes(normalizedLabel) ||
        normalizedLabel.includes(nat)
      );
    });
    if (found) return found;
  }
  return null;
};

const buildPlayerColumns = (players, gameid) => {
  if (!players.length) return [];

  if (gameid === 'ballbyball') {
    return BALL_BY_BALL_COLUMNS.map((columnLabels) =>
      columnLabels
        .map((label) => findPlayerByNat(players, [label]))
        .filter(Boolean)
    ).filter((column) => column.length > 0);
  }

  const columns = [[], [], []];
  players.forEach((player, index) => {
    columns[index % 3].push(player);
  });
  return columns.filter((column) => column.length > 0);
};

const formatLimit = (value) => {
  const num = Number(value);
  if (!num) return '0';
  if (num >= 1000) {
    const formatted = formatToK(num);
    return typeof formatted === 'string' ? formatted.toUpperCase() : formatted;
  }
  return String(num);
};

const RunsOddsCell = memo(function RunsOddsCell({
  player,
  marketName,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
}) {
  if (!player) {
    return (
      <td className='relative min-h-[44px] border-l border-gray-300 bg-[#72bbef]' />
    );
  }

  const isSuspended = player.gstatus === 'SUSPENDED';
  const isSelected =
    betControl?.sid === player.sid && betControl?.type === 'back';

  const handleClick = () => {
    if (isSuspended || !(player.b > 0)) return;
    setBetControl({
      ...player,
      type: 'back',
      odds: player.b,
      marketName: player.marketName || marketName,
      teamCount: player.teamCount,
    });
    setSelectedTeamSubtype?.(player.subtype);
    setValue(player.b, player.nat, 'back');
  };

  return (
    <td
      className={`relative w-[28%] border-l border-gray-300 py-1.5 text-center ${
        isSuspended ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${isSelected ? 'bg-[#1a8ee1] text-white' : 'bg-[#72bbef] text-black'}`}
      onClick={handleClick}
    >
      <span className='block text-[14px] font-bold'>{player.b}</span>
      <span className='block text-[11px] font-normal'>{player.bs}</span>
      <SuspendedCellOverlay status={player.gstatus} />
    </td>
  );
});

const RunsColumn = memo(function RunsColumn({
  players,
  marketName,
  ...betProps
}) {
  if (!players?.length) return null;

  return (
    <table className='w-full border-collapse border border-gray-300 bg-white text-black'>
      <thead>
        <tr className='text-center text-[14px] font-bold text-black'>
          <th className='w-[42%] border-b border-gray-300 bg-white py-1' />
          <th className='border-b border-gray-300 bg-[#72bbef] py-1'>Back</th>
          <th className='w-[30%] border-b border-l border-gray-300 bg-white py-1' />
        </tr>
      </thead>
      <tbody>
        {players.map((player) => (
          <tr key={player.sid} className='border-t border-gray-300'>
            <td className='px-2 py-1.5 text-[12px] font-bold'>
              {player.nat}
              <PlacedBetPL
                playerName={player.nat}
                marketName={player.marketName || marketName}
                pendingBetAmounts={betProps.pendingBetAmounts}
              />
            </td>
            <RunsOddsCell
              player={player}
              marketName={marketName}
              {...betProps}
            />
            <td className='border-l border-gray-300 px-1 py-1 text-right leading-tight'>
              <div className='text-[11px] font-semibold text-[#0d8a72]'>
                Min: {formatLimit(player.min)}
              </div>
              <div className='text-[11px] font-semibold text-[#2c3e50]'>
                Max: {formatLimit(player.max)}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});

const Layout7 = memo(function Layout7({ displayData, gameid, ...betProps }) {
  const { sectionTitle, playerColumns } = useMemo(() => {
    const allPlayers = [];
    let title = 'Runs';

    Object.entries(displayData || {}).forEach(([nat, team]) => {
      if (!team?.length) return;
      title = nat;
      const teamCount = team.length;
      team.forEach((player) => {
        allPlayers.push({ ...player, marketName: nat, teamCount });
      });
    });

    allPlayers.sort((a, b) => a.sid - b.sid);

    return {
      sectionTitle: title,
      playerColumns: buildPlayerColumns(allPlayers, gameid),
    };
  }, [displayData, gameid]);

  if (!playerColumns.length) return null;

  return (
    <div className='mb-[2px]'>
      <div className='rounded-tl-sm rounded-tr-sm bg-gradient-to-t from-[#243A48] to-[#2E4B5E] p-1 text-[12px] font-bold text-white uppercase'>
        {sectionTitle}
      </div>

      <div className='grid grid-cols-1 gap-1 border border-t-0 border-gray-300 bg-white md:grid-cols-3'>
        {playerColumns.map((columnPlayers, index) => (
          <RunsColumn
            key={index}
            players={columnPlayers}
            marketName={sectionTitle}
            {...betProps}
          />
        ))}
      </div>
    </div>
  );
});

export default Layout7;

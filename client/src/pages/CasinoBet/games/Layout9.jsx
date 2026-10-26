import React, { memo } from 'react';
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
import zero from '../../../assets/cards/1.jpg';

// Ordered A -> K. Index here maps 1:1 to the ares/bres result arrays.
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

const MARKET_NAME = 'Andar Bahar 20';
// pendingBetAmounts (settled/placed bets) report this market as "WINNER",
// so P/L lookups must match against this name, not the section title.
const PL_MARKET_NAME = 'WINNER';

const TEAMS = [
  { key: 'andar', label: 'Andar', minSid: 1, maxSid: 13, resField: 'ares' },
  { key: 'bahar', label: 'Bahar', minSid: 21, maxSid: 33, resField: 'bres' },
];

const TEAM_ROW_BG = {
  ab20: { andar: 'bg-[#ffa07a]', bahar: 'bg-[#90ee90]' },
  ab3: { andar: 'bg-[#fc424280]', bahar: 'bg-[#fdcf1380]' },
};

const getTeamRowBg = (teamKey, isAb3) =>
  (isAb3 ? TEAM_ROW_BG.ab3 : TEAM_ROW_BG.ab20)[teamKey];

// "0,0,0,...,10,11,0" -> [0,0,...,10,11,0]
const parseResult = (str) =>
  (str || '').split(',').map((n) => parseInt(n, 10) || 0);

// Card codes look like "10SS", "ADD", "7CC" -> extract the rank prefix.
const rankOfCard = (card) => (card?.startsWith('10') ? '10' : card?.[0]);

// Find the actual dealt suit-card for a given rank on a side.
const findDealtCard = (rankKey, dealtCards) =>
  dealtCards.find((card) => rankOfCard(card) === rankKey);

const isSuspendedStatus = (status) =>
  String(status || '').toUpperCase() === 'SUSPENDED';

const isAb3TeamSuspended = (teamPlayers, gameSuspended) => {
  if (gameSuspended) return true;
  if (teamPlayers.length === 0) return false;
  return teamPlayers.every((player) => player.b === 0);
};

const RankCell = memo(function RankCell({
  player,
  rank,
  cardImg,
  noResults,
  pendingBetAmounts,
  onSelect,
  teamSuspended = false,
  useTeamLock = false,
}) {
  const isSuspended = player.gstatus === 'SUSPENDED';
  const showLock = !useTeamLock && isSuspended && noResults;
  const disabled = teamSuspended || isSuspended || player.b <= 0;

  // Only the card that actually has a placed bet (matching detail) should show
  // its bet amount. Other cards in the same market show nothing.
  const normalize = (str) => str?.toLowerCase()?.trim();
  const betDetail = Array.isArray(pendingBetAmounts)
    ? pendingBetAmounts
        .find((m) => normalize(m.marketName) === normalize(PL_MARKET_NAME))
        ?.details?.find((d) => normalize(d.teamName) === normalize(player.nat))
    : null;

  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => onSelect(player)}
      className={`relative flex shrink-0 flex-col items-center gap-0.5 text-black transition-all ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-105'}`}
    >
      <div className='text-[13px] leading-none font-bold'>{player.l}</div>
      <div className='relative'>
        <img
          src={cardImg}
          alt={rank}
          draggable={false}
          className={`h-12 w-auto object-contain shadow-sm`}
        />
        {showLock && (
          <div className='absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-black/55 text-white'>
            <FaLock className='size-3.5' />
          </div>
        )}
      </div>
      <div className='text-[10px] leading-tight'>
        {betDetail && (
          <span className='font-bold text-red-600'>
            -{Number(betDetail.price).toFixed(2)}
          </span>
        )}
      </div>
    </button>
  );
});

const Layout9 = memo(function Layout9({ bettingData, gameid, ...betProps }) {
  const { setBetControl, setValue, setSelectedTeamSubtype } = betProps;

  const isAb3 = gameid === 'ab3' || gameid === 'ab4';
  const dataKey = isAb3 ? 'child' : 'sub';

  const players = Array.isArray(bettingData?.[dataKey])
    ? bettingData[dataKey]
    : [];

  if (players.length === 0) return null;

  const andarCards = (bettingData?.aall || '').split(',').filter(Boolean);
  const baharCards = (bettingData?.ball || '').split(',').filter(Boolean);
  const dealtByTeam = { andar: andarCards, bahar: baharCards };

  const ab3Market = isAb3 ? bettingData?.sub?.[0] : null;
  const limitsSource = ab3Market || players[0];
  const minMax = limitsSource
    ? `${limitsSource.min} - ${limitsSource.max}`
    : '';
  const ab3Odds = ab3Market?.b;

  // No results dealt when both ares and bres are empty (no non-zero values).
  const aresResults = parseResult(bettingData?.ares).filter(Boolean);
  const bresResults = parseResult(bettingData?.bres).filter(Boolean);
  const noResults = aresResults.length === 0 && bresResults.length === 0;

  const isAb3GameSuspended = isAb3 && isSuspendedStatus(ab3Market?.gstatus);

  const handleSelect = (player, teamSuspended) => {
    if (teamSuspended || player.b <= 0 || player.gstatus === 'SUSPENDED')
      return;
    const odds = isAb3 ? ab3Odds : player.b;
    if (isAb3 && (!odds || odds <= 0)) return;
    setBetControl({
      ...player,
      type: 'back',
      odds,
      ...(isAb3 && {
        min: ab3Market?.min,
        max: ab3Market?.max,
      }),
      marketName: player.subtype,
      teamCount: 2,
    });
    setSelectedTeamSubtype(player.subtype);
    setValue(odds, player.nat, 'back', player.nat, player.sid);
  };

  return (
    <div className='mb-[2px]'>
      <SectionHeader title={MARKET_NAME} minMax={minMax} />

      <div className='overflow-hidden rounded-br-sm rounded-bl-sm border border-gray-400'>
        {TEAMS.map((team) => {
          const teamPlayers = players
            .filter((p) => p.sid >= team.minSid && p.sid <= team.maxSid)
            .sort((a, b) => a.sid - b.sid);

          if (teamPlayers.length === 0) return null;

          const results = parseResult(bettingData?.[team.resField]);
          const dealtCards = dealtByTeam[team.key] || [];
          const teamSuspended = isAb3
            ? isAb3TeamSuspended(teamPlayers, isAb3GameSuspended)
            : false;

          return (
            <div key={team.key}>
              <div
                className={`relative flex border-collapse border ${getTeamRowBg(team.key, isAb3)}`}
              >
                <div className='flex items-center justify-center border-r border-black px-6 py-8 text-[15px] font-bold uppercase'>
                  {team.label}
                </div>
                <div
                  className={`relative flex flex-1 flex-wrap justify-center gap-1.5 p-2`}
                >
                  {teamPlayers.map((player, index) => {
                    const rank = CARD_SEQUENCE[index]?.key;
                    const faceImg = CARD_SEQUENCE[index]?.img;

                    let cardImg = faceImg;
                    if (isAb3) {
                      cardImg = player.b === 0 ? zero : faceImg;
                    } else {
                      const isResult = results[index] !== 0;
                      const dealtCard = isResult
                        ? findDealtCard(rank, dealtCards)
                        : null;
                      if (dealtCard) {
                        cardImg = `/cards/${dealtCard}.jpg`;
                      } else if (!noResults && !isResult) {
                        cardImg = zero;
                      }
                    }
                    return (
                      <RankCell
                        key={player.sid}
                        player={player}
                        rank={rank}
                        cardImg={cardImg}
                        noResults={noResults}
                        teamSuspended={teamSuspended}
                        useTeamLock={isAb3}
                        onSelect={(selected) =>
                          handleSelect(selected, teamSuspended)
                        }
                        {...betProps}
                      />
                    );
                  })}
                </div>
                {teamSuspended && (
                  <div className='absolute inset-0 z-20 flex items-center justify-center bg-black/60'>
                    <FaLock className='size-4 text-white' />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default Layout9;

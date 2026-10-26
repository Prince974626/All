import { useState, useEffect } from 'react';
import { FaTrophy } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import api from '../redux/api';

const CASINOS = [
  { slug: 'teen20', name: '20-20 Teenpatti' },
  { slug: 'teen', name: 'Teenpatti 1-day' },
  { slug: 'teen20c', name: '20-20 Teenpatti C' },
  { slug: 'teen20v1', name: '20-20 Teenpatti VIP1' },
  { slug: 'teen20b', name: '20-20 Teenpatti B' },
  { slug: 'teen41', name: 'Queen Top Open Teenpatti' },
  { slug: 'teen42', name: 'Jack Top Open Teenpatti' },
  { slug: 'teen32', name: 'Instant Teenpatti 2.0' },
  { slug: 'teen33', name: 'Instant Teenpatti 3.0' },
  { slug: 'teen6', name: 'Teenpatti 6' },
  { slug: 'teen62', name: 'V VIP Teenpatti 1-day' },
  { slug: 'teen8', name: 'Teenpatti Open' },
  { slug: 'teen9', name: 'Teenpatti Test' },
  { slug: 'teensin', name: 'Teenpatti Sin' },
  { slug: 'teenmuf', name: 'Teenpatti Muflis' },
  { slug: 'teenjoker', name: 'Teenpatti Joker' },
  { slug: 'poison', name: 'Teenpatti Poison One Day' },
  { slug: 'poison20', name: 'Teenpatti Poison 20-20' },
  { slug: 'joker20', name: 'Teenpatti Joker 20-20' },
  { slug: 'patti2', name: '2 Card Teenpatti' },
  { slug: 'poker', name: 'Poker 1-Day' },
  { slug: 'poker20', name: '20-20 Poker' },
  { slug: 'poker6', name: 'Poker 6 Players' },
  { slug: 'baccarat', name: 'Baccarat' },
  { slug: 'baccarat2', name: 'Baccarat 2' },
  { slug: 'dt20', name: '20-20 Dragon Tiger' },
  { slug: 'dt6', name: '1 Day Dragon Tiger' },
  { slug: 'dt202', name: '20-20 Dragon Tiger 2' },
  { slug: 'dtl20', name: '20-20 D T L' },
  { slug: 'card32', name: '32 Cards A' },
  { slug: 'card32eu', name: '32 Cards B' },
  { slug: 'lucky7', name: 'Lucky 7 - A' },
  { slug: 'lucky7eu', name: 'Lucky 7 - B' },
  { slug: 'lucky7eu2', name: 'Lucky 7 - C' },
  { slug: 'ab20', name: 'Andar Bahar' },
  { slug: 'abj', name: 'Andar Bahar 2' },
  { slug: '3cardj', name: '3 Cards Judgement' },
];

const WINNER_MAPS = {
  baccarat: { 1: 'Player', 2: 'Banker', 3: 'Tie' },
  baccarat2: { 1: 'Player', 2: 'Banker', 3: 'Tie' },
  dt6: { 1: 'Dragon', 2: 'Tiger', 3: 'Tie' },
  dt20: { 1: 'Dragon', 2: 'Tiger', 3: 'Tie' },
  dt202: { 1: 'Dragon', 2: 'Tiger', 3: 'Tie' },
  dtl20: { 1: 'Dragon', 2: 'Tiger', 3: 'Lion' },
  card32: { 1: 'Player 8', 2: 'Player 9', 3: 'Player 10', 4: 'Player 11' },
  card32eu: {
    1: 'Player 8',
    2: 'Player 9',
    3: 'Player 10',
    4: 'Player 11',
  },
  lucky7: { 1: 'Low Card', 2: 'High Card', 3: 'Tie (Lucky 7)' },
  lucky7eu: { 1: 'Low Card', 2: 'High Card', 3: 'Tie (Lucky 7)' },
  lucky7eu2: { 1: 'Low Card', 2: 'High Card', 3: 'Tie (Lucky 7)' },
};
const DEFAULT_WINNER_MAP = { 1: 'Player A', 2: 'Player B', 3: 'Tie' };

const getWinnerLabel = (gameId, win) => {
  const map = WINNER_MAPS[gameId] || DEFAULT_WINNER_MAP;
  return map[win] || `Result ${win}`;
};

/* ============ Card distribution (same as client) ============ */

const GameConfig = {
  poison: {
    totalCards: 7,
    distribution: { poison: [0], playerA: [1, 3, 5], playerB: [2, 4, 6] },
  },
  poison20: {
    totalCards: 7,
    distribution: { poison: [0], playerA: [1, 3, 5], playerB: [2, 4, 6] },
  },
  joker20: {
    totalCards: 7,
    distribution: { poison: [0], playerA: [1, 3, 5], playerB: [2, 4, 6] },
  },
  teen20c: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teen41: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teen42: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teen33: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teen32: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teen: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teen6: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teen20: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teensin: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teenmuf: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teen20b: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  teen3: {
    totalCards: 6,
    distribution: { playerA: [0, 2, 4], playerB: [1, 3, 5] },
  },
  poker: {
    totalCards: 9,
    distribution: { playerA: [0, 1], playerB: [2, 3], board: [4, 5, 6, 7, 8] },
  },
  poker20: {
    totalCards: 9,
    distribution: { playerA: [0, 1], playerB: [2, 3], board: [4, 5, 6, 7, 8] },
  },
  patti2: { totalCards: 4, distribution: { playerA: [0, 2], playerB: [1, 3] } },
  baccarat: {
    totalCards: 6,
    distribution: { player: [4, 2, 0], banker: [1, 3, 5] },
  },
  baccarat2: {
    totalCards: 6,
    distribution: { player: [4, 2, 0], banker: [1, 3, 5] },
  },
  dt202: { totalCards: 2, distribution: { dragon: [0], tiger: [1] } },
  dt6: { totalCards: 2, distribution: { dragon: [0], tiger: [1] } },
  dt20: { totalCards: 2, distribution: { dragon: [0], tiger: [1] } },
  card32: {
    totalCards: 36,
    distribution: { player8: [0], player9: [1], player10: [2], player11: [3] },
  },
  card32eu: {
    totalCards: 36,
    distribution: { player8: [0], player9: [1], player10: [2], player11: [3] },
  },
  lucky7: { totalCards: 1, distribution: { card: [0] } },
  lucky7eu: { totalCards: 1, distribution: { card: [0] } },
  lucky7eu2: { totalCards: 1, distribution: { card: [0] } },
};

const distributeCards = (cards, gameId) => {
  if (!cards || !Array.isArray(cards)) return null;
  const config = GameConfig[gameId];
  if (!config) {
    return {
      playerA: [cards[0], cards[2], cards[4]],
      playerB: [cards[1], cards[3], cards[5]],
      poison: cards.length === 7 ? [cards[0]] : null,
      board: null,
    };
  }
  const result = {};
  Object.entries(config.distribution).forEach(([player, indices]) => {
    result[player] = indices.map((index) => cards[index]).filter(Boolean);
  });
  if (gameId === 'dt202' || gameId === 'dt6' || gameId === 'dt20') {
    result.playerA = result.dragon;
    result.playerB = result.tiger;
  }
  return result;
};

/* ============ Popup helpers (same as client CasinoResult1) ============ */

const isBaccarat = (gameId) => gameId === 'baccarat' || gameId === 'baccarat2';
const GAMES_WITH_TIE = new Set(['baccarat', 'baccarat2', 'dt202']);
const hasTie = (gameId) => GAMES_WITH_TIE.has(gameId);

const TEAM_LABELS = {
  baccarat: { A: 'PLAYER', B: 'BANKER' },
  baccarat2: { A: 'PLAYER', B: 'BANKER' },
  dt202: { A: 'DRAGON', B: 'TIGER' },
  lucky7: { A: 'LOW CARD (A to 6)', B: 'HIGH CARD (8 to K)' },
  lucky7eu: { A: 'LOW CARD (A to 6)', B: 'HIGH CARD (8 to K)' },
  lucky7eu2: { A: 'LOW CARD (A to 6)', B: 'HIGH CARD (8 to K)' },
};

const isCard32 = (gameId) => gameId === 'card32' || gameId === 'card32eu';
const CARD32_ORDER = [
  { key: 'player8', label: 'Player 8', winValue: '1' },
  { key: 'player9', label: 'Player 9', winValue: '2' },
  { key: 'player10', label: 'Player 10', winValue: '3' },
  { key: 'player11', label: 'Player 11', winValue: '4' },
];

const isLucky7 = (gameId) =>
  gameId === 'lucky7' || gameId === 'lucky7eu' || gameId === 'lucky7eu2';

const getTeamLabel = (gameId, side) =>
  TEAM_LABELS[gameId]?.[side] ?? `PLAYER ${side}`;

const normalizePlayers = (distributed) => ({
  A: distributed?.playerA ?? distributed?.player ?? distributed?.dragon ?? [],
  B: distributed?.playerB ?? distributed?.banker ?? distributed?.tiger ?? [],
});

const hasNumberNine = (cardString) =>
  cardString?.split(',').some((c) => c.includes('9')) ?? false;

/* ============ UI sub-components (identical to client) ============ */

const Trophy = ({ win }) =>
  win ? (
    <FaTrophy className='text-xs text-green-600 shadow' />
  ) : (
    <FaTrophy className='rotate-180 text-xs text-red-600 shadow' />
  );

const CardRow = ({ title, cards, isWinner, isTie, gameId, rotateIndex }) => (
  <div className='text-center md:pr-2.5'>
    <h3 className='font-bold'>{title}</h3>
    <div className='my-2 flex justify-center gap-2'>
      {cards.map((card, index) => {
        if (isBaccarat(gameId) && card === '1') return null;
        const rotate = isBaccarat(gameId) && index === rotateIndex;
        return (
          <img
            key={`${card}-${index}`}
            src={`/cards/${card}.jpg`}
            alt={card}
            className={`h-18 ${rotate ? 'mx-2 rotate-90' : ''}`}
          />
        );
      })}
    </div>
    {isWinner && (
      <div className='mt-2 inline-block rounded bg-green-600 px-3 py-1 text-lg font-semibold text-white'>
        Winner
      </div>
    )}
    {isTie && (
      <div className='mt-2 inline-block rounded bg-gray-600 px-3 py-1 text-lg font-semibold text-white'>
        Tie
      </div>
    )}
  </div>
);

const Lucky7UI = ({ distributed, item, gameId }) => (
  <>
    <div className='my-2 space-y-2'>
      <img
        src={`/cards/${distributed?.card}.jpg`}
        alt='card'
        className='m-auto h-14 w-auto rounded border border-gray-300 object-contain'
      />
    </div>
    <div className='border-t py-2 text-xs'>
      <div className='text-center font-semibold'>WINNER</div>
      <div className='grid grid-cols-2 py-1 text-[12px]'>
        <div className='flex justify-center gap-1'>
          {getTeamLabel(gameId, 'A')}
          <Trophy win={item.win === '1'} />
        </div>
        <div className='flex justify-center gap-1'>
          {getTeamLabel(gameId, 'B')}
          <Trophy win={item.win === '2'} />
        </div>
      </div>
    </div>
  </>
);

const Card32UI = ({ distributed, item }) => (
  <>
    <div className='my-2 space-y-2'>
      {CARD32_ORDER.map(({ key, label, winValue }) => {
        const playerCards = distributed[key] ?? [];
        const win = item.win === winValue;
        return (
          <div key={key} className='flex items-center gap-2'>
            <span className='min-w-[80px] text-sm font-medium'>{label} -</span>
            <div className='flex gap-1'>
              {playerCards.map((card) => (
                <img
                  key={card}
                  src={`/cards/${card}.jpg`}
                  alt={card}
                  className='h-14 w-auto rounded border border-gray-300 object-contain'
                />
              ))}
            </div>
            <Trophy win={win} />
          </div>
        );
      })}
    </div>
    <div className='border-t py-2 text-xs'>
      <div className='text-center font-semibold'>WINNER</div>
      <div className='grid grid-cols-2 gap-y-2 py-2 text-[12px]'>
        {CARD32_ORDER.map(({ key, label, winValue }) => (
          <div key={key} className='flex items-center justify-center gap-1'>
            {label} - <Trophy win={item.win === winValue} />
          </div>
        ))}
      </div>
    </div>
  </>
);

const DefaultGameUI = ({ players, item, gameId }) => (
  <>
    <div className='my-2 grid md:grid-cols-2'>
      <CardRow
        title={getTeamLabel(gameId, 'A')}
        cards={players.A}
        gameId={gameId}
        rotateIndex={0}
        isWinner={item.win === '1'}
        isTie={item.win === '3'}
      />
      <CardRow
        title={getTeamLabel(gameId, 'B')}
        cards={players.B}
        gameId={gameId}
        rotateIndex={2}
        isWinner={item.win === '2'}
        isTie={item.win === '3'}
      />
    </div>
    <div className='border-t py-2 text-xs'>
      <div className='text-center font-semibold'>WINNER</div>
      <div className='grid grid-cols-2 py-1 text-[12px]'>
        <div className='flex justify-center gap-1'>
          {getTeamLabel(gameId, 'A')}
          <Trophy win={item.win === '1'} />
        </div>
        {hasTie(gameId) && (
          <div className='flex justify-center gap-1'>
            TIE <Trophy win={item.win === '3'} />
          </div>
        )}
        <div className='flex justify-center gap-1'>
          {getTeamLabel(gameId, 'B')}
          <Trophy win={item.win === '2'} />
        </div>
      </div>
    </div>
  </>
);

/* ============ Result Popup (same design as client CasinoResult1) ============ */

const ResultPopup = ({ item, gameId, onClose }) => {
  const [resultDetail, setResultDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!item || !gameId) return;
    setLoading(true);
    api
      .get(`/casino-betting-result-detail?gameId=${gameId}&mid=${item.mid}`)
      .then((res) => setResultDetail(res.data?.data ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [item, gameId]);

  if (loading || !resultDetail) return null;

  const cards = resultDetail.card?.split(',') ?? [];
  const distributed = distributeCards(cards, gameId);
  const players = normalizePlayers(distributed);

  return (
    <div className='fixed inset-0 z-10 flex items-center justify-center bg-black/40'>
      <div className='w-full max-w-[500px] overflow-hidden rounded-md bg-white'>
        {/* Header */}
        <div className='flex justify-between bg-gradient-to-b from-[#315195] to-[#14213D] px-2 py-1 text-white'>
          <span className='text-sm font-semibold uppercase'>
            {resultDetail.ename}
          </span>
          <span onClick={onClose} className='cursor-pointer'>
            ✖
          </span>
        </div>

        {/* Content */}
        <div className='max-h-[80vh] overflow-y-auto px-4 pb-4'>
          <p className='text-end text-xs font-semibold'>
            Round Id: {resultDetail.rid}
          </p>

          {/* Board (poker games) */}
          {distributed?.board?.length > 0 && (
            <div className='flex gap-2 py-3 font-bold'>
              Board:
              {distributed.board.map((c) => (
                <img key={c} src={`/cards/${c}.jpg`} alt={c} className='h-18' />
              ))}
            </div>
          )}

          {/* Game-specific UI */}
          {(() => {
            if (isLucky7(gameId)) {
              return (
                <Lucky7UI
                  distributed={distributed}
                  item={item}
                  gameId={gameId}
                />
              );
            }
            if (isCard32(gameId)) {
              return <Card32UI distributed={distributed} item={item} />;
            }
            return (
              <DefaultGameUI players={players} item={item} gameId={gameId} />
            );
          })()}

          {/* Lucky 9 for teensin */}
          {gameId === 'teensin' && (
            <div className='border-t py-2 text-center text-xs'>
              LUCKY 9 <Trophy win={hasNumberNine(resultDetail.card)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============ Main Page ============ */

const CasinoResultReport = () => {
  const [date, setDate] = useState('');
  const [gameId, setGameId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSubmit = async () => {
    if (!gameId) {
      setError('Please select a casino game');
      return;
    }
    setError('');
    setLoading(true);
    setResults([]);
    try {
      const res = await api.get(`/casino-betting-result?gameId=${gameId}`);
      const data = res.data?.data?.res || res.data?.data || [];
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDate('');
    setGameId('');
    setResults([]);
    setError('');
    setSelectedItem(null);
  };

  const filteredResults = date
    ? results.filter((r) => {
        if (!r.gtime) return true;
        return r.gtime?.startsWith(date);
      })
    : results;

  return (
    <>
      <Navbar />
      <div className='px-[15px] md:px-7.5'>
        <div className='py-2 text-[22px]'>Casino Result Report</div>

        <div className='mt-3 mb-6 flex flex-wrap items-end gap-2'>
          <div className='grid'>
            <span className='text-sm'>Date</span>
            <input
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className='mt-1 min-w-[180px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
            />
          </div>
          <div className='grid'>
            <span className='text-sm'>Casino Game</span>
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
            >
              <option value=''>Select Casino</option>
              {CASINOS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div
            onClick={handleSubmit}
            className='ml-1 cursor-pointer rounded bg-[#0088cc] px-3 py-1.5 text-white'
          >
            {loading ? 'Loading...' : 'Submit'}
          </div>
          <div
            onClick={handleReset}
            className='ml-1 cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-black'
          >
            Reset
          </div>
        </div>

        {error && <div className='mb-4 text-red-500'>{error}</div>}

        <div className='overflow-x-auto'>
          <table className='w-full border-collapse border border-gray-300'>
            <thead>
              <tr>
                <th className='w-1/3 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Market Id</div>
                </th>
                <th className='w-2/3 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Winner</div>
                </th>
              </tr>
            </thead>
            <tbody className='border-t border-black'>
              {filteredResults.length > 0 ? (
                filteredResults.map((item, i) => (
                  <tr key={item.mid || i} className='odd:bg-[rgba(0,0,0,0.05)]'>
                    <td className='w-1/3 border-r border-[#dee2e6]'>
                      <div
                        className='cursor-pointer px-2 text-[13px] text-blue-800'
                        onClick={() => setSelectedItem(item)}
                      >
                        {item.mid}
                      </div>
                    </td>
                    <td className='w-2/3 py-2'>
                      <div className='px-2 text-[13px]'>
                        {getWinnerLabel(gameId, item.win)}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className='border border-gray-200/60 py-4 text-center text-gray-500'
                  >
                    {loading
                      ? 'Loading...'
                      : 'No data. Select casino game and click Submit.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && (
        <ResultPopup
          item={selectedItem}
          gameId={gameId}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
};

export default CasinoResultReport;

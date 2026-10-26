import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { toast } from 'react-toastify';
import { IoIosArrowDown } from 'react-icons/io';

// Score-based fancy markets (enter final runs/score)
const FANCY_SCORE_GAME_TYPES = [
  'Normal',
  'meter',
  'line',
  'ball',
  'khado',
  'Over By Over',
];
// Yes/No proposition markets (fancy1 + tied match family)
const YES_NO_GAME_TYPES = ['fancy1', 'Tied Match', 'Tied_Match'];
const TIED_MATCH_GAME_TYPES = ['Tied Match', 'Tied_Match'];
// Odd/Even proposition markets (teamName Odd or Even, not fancy score threshold)
const ODD_EVEN_GAME_TYPES = ['oddeven'];

const isValidOddEvenResult = (value) => {
  const normalized = String(value).trim().toLowerCase();
  if (['odd', 'odds', 'even', 'evens'].includes(normalized)) return true;
  const n = parseInt(normalized, 10);
  return Number.isFinite(n);
};

const getGameColor = (gameType) => {
  if (FANCY_SCORE_GAME_TYPES.includes(gameType) || YES_NO_GAME_TYPES.includes(gameType)) {
    return 'bg-orange-100 text-orange-800';
  }
  if (ODD_EVEN_GAME_TYPES.includes(gameType)) {
    return 'bg-violet-100 text-violet-800';
  }
  switch (gameType) {
    case 'OVER_UNDER_05':
    case 'OVER_UNDER_15':
    case 'OVER_UNDER_25':
      return 'bg-purple-100 text-purple-800';
    case 'Match Odds':
      return 'bg-blue-100 text-blue-800';
    case 'Bookmaker':
    case 'Bookmaker IPL CUP':
      return 'bg-green-100 text-green-800';
    case 'Tied Match':
    case 'Tied_Match':
      return 'bg-amber-100 text-amber-800';
    case 'Toss':
    case '1st 6 over':
      return 'bg-cyan-100 text-cyan-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getSportKey = (gameName = '') => {
  const name = gameName.toLowerCase();
  if (name.includes('cricket')) return 'Cricket';
  if (name.includes('soccer') || name.includes('football')) return 'Soccer';
  if (name.includes('tennis')) return 'Tennis';
  if (name.includes('horse')) return 'Horse Racing';
  return 'Other';
};

const ResultControl = () => {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);
  const isSuperAdmin =
    userInfo?.role === 'supperadmin' || userInfo?.role === 'superadmin';

  const [activeGameId, setActiveGameId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [unsettledLoading, setUnsettledLoading] = useState(false);
  const [unsettledError, setUnsettledError] = useState('');
  const [unsettledBets, setUnsettledBets] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);
  const [fancyScore, setFancyScore] = useState(''); // For fancy bet score input
  const [selectedGame, setSelectedGame] = useState(null); // Track selected game object

  const formatDateTime = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  useEffect(() => {
    if (userInfo && !isSuperAdmin) {
      toast.error('Only superadmin can access Manual Settlement');
      navigate('/home', { replace: true });
    }
  }, [userInfo, isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchPendingGames = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/manual-result/pending-games');
        const data = res.data || {};
        const payload = data.data || {};

        setGames(payload.games || []);
        setTotalPending(payload.totalPendingGames || 0);
      } catch (err) {
        const msg =
          err?.response?.data?.message || 'Failed to fetch pending games';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingGames();
  }, [isSuperAdmin]);

  const fetchUnsettledBets = async (gameId, gameType, marketName) => {
    if (!gameId) return;
    setUnsettledLoading(true);
    try {
      const res = await api.get('/manual-result/unsettled-bets', {
        params: { gameId, gameType, marketName }, // Include gameType and marketName to filter correctly
      });
      const data = res.data || {};
      const payload = data.data || {};
      setUnsettledBets(payload.bets || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message || 'Failed to fetch unsettled bets';
      setUnsettledError(msg);
      toast.error(msg);
      setUnsettledBets([]);
    } finally {
      setUnsettledLoading(false);
    }
  };

  const refreshPendingGames = async () => {
    try {
      const refreshRes = await api.get('/manual-result/pending-games');
      const data = refreshRes.data || {};
      const payload = data.data || {};
      setGames(payload.games || []);
      setTotalPending(payload.totalPendingGames || 0);
    } catch (err) {
      console.error('Failed to refresh pending games', err);
    }
  };

  const handleSettle = async (game, finalResult) => {
    if (!game || !finalResult) return;

    // Validate fancy score if it's a fancy bet (skip validation for void/tied)
    const isControlResult =
      typeof finalResult === 'string' &&
      ['void', 'tied'].includes(finalResult.toLowerCase());

    if (FANCY_SCORE_GAME_TYPES.includes(game.gameType) && !isControlResult) {
      if (isNaN(parseFloat(finalResult))) {
        toast.error('Please enter a valid numeric score for fancy bets');
        return;
      }
    }

    if (YES_NO_GAME_TYPES.includes(game.gameType) && !isControlResult) {
      const normalized = String(finalResult).trim().toLowerCase();
      const validYesNo = ['yes', 'no', 'y', 'n', '1', '0', 'true', 'false', 'tied'].includes(
        normalized
      );
      if (!validYesNo) {
        toast.error(
          TIED_MATCH_GAME_TYPES.includes(game.gameType)
            ? 'Tied Match markets require Yes or No (or 1/0)'
            : 'fancy1 markets require a Yes or No result'
        );
        return;
      }
    }

    if (ODD_EVEN_GAME_TYPES.includes(game.gameType) && !isControlResult) {
      if (!isValidOddEvenResult(finalResult)) {
        toast.error('Odd/Even markets require Odd, Even, or a numeric score');
        return;
      }
    }

    setSettleLoading(true);
    try {
      const res = await api.post('/manual-result/settle', {
        gameId: game.gameId,
        gameType: game.gameType,
        marketName: game.marketName, // Include marketName to settle only this specific market
        final_result: finalResult, // Can be team name OR score
      });

      toast.success(res?.data?.message || `Result settled: ${finalResult}`);
      setShowModal(false);
      setSelectedGame(null);
      setFancyScore('');
      await refreshPendingGames();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to settle result';
      toast.error(msg);
    } finally {
      setSettleLoading(false);
    }
  };

  // Void all unsettled bets for the selected game/market.
  // Uses the dedicated /manual-result/void endpoint which correctly
  // marks every bet + betHistory row as VOID (status 3, P/L 0) and
  // refunds the user's stake by recalculating exposure (avbalance).
  // Works for both fancy and sports bets.
  const handleVoid = async (game) => {
    if (!game) return;

    const isFancy =
      FANCY_SCORE_GAME_TYPES.includes(game.gameType) ||
      YES_NO_GAME_TYPES.includes(game.gameType) ||
      ODD_EVEN_GAME_TYPES.includes(game.gameType);
    const confirmMsg = isFancy
      ? `Void this fancy market "${game.marketName}"? All ${game.totalBets} bet(s) will be cancelled and the staked amount returned to users.`
      : `Void this market "${game.marketName}"? All ${game.totalBets} bet(s) will be cancelled and the staked amount returned to users.`;

    if (!window.confirm(confirmMsg)) return;

    setSettleLoading(true);
    try {
      const res = await api.post('/manual-result/void', {
        gameId: game.gameId,
        gameType: game.gameType,
        marketName: game.marketName,
      });

      toast.success(res?.data?.message || 'Bets voided successfully');
      setShowModal(false);
      setSelectedGame(null);
      setFancyScore('');
      await refreshPendingGames();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to void bets';
      toast.error(msg);
    } finally {
      setSettleLoading(false);
    }
  };
  const toggleTab = (tab) => {
    setActiveTab(activeTab === tab ? null : tab);
  };
  return (
    <>
      <Navbar />
      <div className='min-h-screen bg-gray-100 p-4'>
        <div className='mx-auto max-w-7xl'>
          <div className='mb-4 flex items-center justify-between'>
            <h1 className='text-xl font-semibold text-gray-800'>
              Pending Games (Manual Result)
            </h1>
            <div className='inline-flex items-center rounded-md px-2 py-0.5 text-[14px] font-bold text-black'>
              Total Pending:{' '}
              <span className='bg-color ml-0.5 flex w-fit items-center justify-center rounded-md px-1.5 py-0.5 text-white'>
                {totalPending}
              </span>
            </div>
          </div>

          {loading && (
            <div className='rounded bg-white p-4 text-center text-sm text-gray-600 shadow'>
              Loading pending games…
            </div>
          )}

          {!loading && error && (
            <div className='mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
              {error}
            </div>
          )}

          {!loading && !error && games.length === 0 && (
            <div className='rounded bg-white p-4 text-center text-sm text-gray-600 shadow'>
              No pending games found.
            </div>
          )}

          {!loading && !error && games.length > 0 && (
            <>
              {['Cricket', 'Soccer', 'Tennis', 'Horse Racing', 'Other'].map(
                (sport) => {
                  const groupGames = games.filter(
                    (g) => getSportKey(g.gameName) === sport
                  );
                  if (!groupGames.length) return null;

                  const tabId = sport; // use sport name as tab id

                  return (
                    <div key={sport} className='mb-4'>
                      {/* Collapsible section header */}
                      <div
                        className='section-header bg-dark mb-2 flex cursor-pointer items-center justify-between px-2 py-1 font-bold text-white'
                        onClick={() => toggleTab(tabId)}
                      >
                        <h2 className='text-sm font-semibold'>{sport} Games</h2>
                        <div
                          className={
                            activeTab === tabId
                              ? 'rotate-180 transition'
                              : 'transition'
                          }
                        >
                          <IoIosArrowDown />
                        </div>
                      </div>

                      {/* Only show this sport's games when no tab is selected OR this tab is active */}
                      {activeTab === tabId && (
                        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                          {groupGames.map((g) => (
                            <button
                              key={`${g.gameId}-${g.gameType}-${g.marketName}`}
                              onClick={() => {
                                setActiveGameId(g.gameId);
                                setSelectedGame(g); // Store the full game object
                                fetchUnsettledBets(
                                  g.gameId,
                                  g.gameType,
                                  g.marketName
                                );
                                setFancyScore(''); // Reset fancy score input
                                setShowModal(true);
                              }}
                              className='rounded-lg border bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-400 hover:shadow-md'
                            >
                              <div className='flex items-start justify-between gap-2'>
                                <div>
                                  <div className='text-[11px] text-gray-500 uppercase'>
                                    {g.gameName}
                                  </div>
                                  <div className='text-sm font-semibold text-gray-900'>
                                    {g.eventName}
                                  </div>
                                  <div className='mt-0.5 text-[11px] text-gray-600'>
                                    Market:{' '}
                                    <span className='font-medium'>
                                      {g.marketName}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={
                                    'rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ' +
                                    getGameColor(g.gameType)
                                  }
                                >
                                  {g.gameType}
                                </span>
                              </div>

                              <div className='mt-2 flex items-center justify-between text-[11px] text-gray-600'>
                                <span>
                                  Bets:{' '}
                                  <span className='font-semibold text-gray-900'>
                                    {g.totalBets}
                                  </span>
                                </span>
                                <span>
                                  Stake:{' '}
                                  <span className='font-semibold text-gray-900'>
                                    {g.totalStake}
                                  </span>
                                </span>
                              </div>

                              <div className='mt-1 text-[10px] text-gray-500'>
                                Oldest: {formatDateTime(g.oldestBet)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </>
          )}
        </div>
      </div>

      {/* Popup with details + settle buttons */}
      {showModal &&
        selectedGame &&
        (() => {
          const game = selectedGame;
          const isScoreFancy = FANCY_SCORE_GAME_TYPES.includes(game.gameType);
          const isFancy1Bet = game.gameType === 'fancy1';
          const isTiedMatchBet = TIED_MATCH_GAME_TYPES.includes(game.gameType);
          const isYesNoBet = isFancy1Bet || isTiedMatchBet;
          const isOddEvenBet = ODD_EVEN_GAME_TYPES.includes(game.gameType);
          const tiedMatchSelections = (game.selections || [])
            .filter(Boolean)
            .filter(
              (value, index, all) =>
                all.findIndex(
                  (item) =>
                    String(item).trim().toLowerCase() ===
                    String(value).trim().toLowerCase()
                ) === index
            );
          const [yesOption = 'Yes', noOption = 'No'] =
            tiedMatchSelections.length >= 2
              ? tiedMatchSelections
              : ['Yes', 'No'];
          const [teamA = 'Team A', teamB = 'Team B'] = (
            game.eventName || ''
          ).split(/ v | vs | - /i);

          return (
            <div
              className='fixed inset-0 z-[200] flex items-center justify-center bg-black/40'
              onClick={() => {
                setShowModal(false);
                setSelectedGame(null);
              }}
            >
              <div
                className='relative mx-4 w-full max-w-3xl rounded-xl bg-white shadow-lg'
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className='flex items-center justify-between border-b px-4 py-2'>
                  <div>
                    <div className='flex items-center gap-2 text-[11px] uppercase'>
                      <span className='text-gray-500'>
                        {getSportKey(game.gameName)} • {game.gameType}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          isOddEvenBet
                            ? 'bg-violet-100 text-violet-700'
                            : isScoreFancy
                              ? 'bg-orange-100 text-orange-700'
                              : isYesNoBet
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isTiedMatchBet
                          ? 'TIED MATCH (Yes/No)'
                          : isFancy1Bet
                          ? 'FANCY1 (Yes/No)'
                          : isOddEvenBet
                            ? 'ODD/EVEN'
                            : isScoreFancy
                              ? 'FANCY (Score)'
                              : 'SPORTS (Team)'}
                      </span>
                    </div>
                    <div className='text-sm font-semibold text-gray-900'>
                      {game.eventName}
                    </div>
                    <div className='text-[11px] text-gray-500'>
                      Market: {game.marketName}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedGame(null);
                    }}
                    className='px-2 text-lg leading-none text-gray-500 hover:text-gray-800'
                  >
                    ×
                  </button>
                </div>

                {/* Body */}
                <div className='max-h-[70vh] overflow-y-auto px-4 py-3 text-xs text-gray-800'>
                  {/* Summary */}
                  <div className='mb-3 grid gap-2 md:grid-cols-3'>
                    <div>
                      <div className='text-[11px] text-gray-500'>
                        Total Bets
                      </div>
                      <div className='text-base font-semibold'>
                        {game.totalBets}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] text-gray-500'>
                        Total Stake
                      </div>
                      <div className='text-base font-semibold'>
                        {game.totalStake}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] text-gray-500'>
                        Potential Payout
                      </div>
                      <div className='text-base font-semibold'>
                        {game.totalPotentialPayout}
                      </div>
                    </div>
                  </div>

                  {/* Settlement UI - Fancy1 (Yes/No), score fancy, or sports */}
                  <div className='mb-4'>
                    {isYesNoBet ? (
                      <div>
                        <div className='mb-1 text-[11px] text-gray-500'>
                          {isTiedMatchBet
                            ? 'Settle whether the match was tied. Yes = match tied, No = match not tied. Provider values 1/0 are also accepted.'
                            : 'Settle this proposition — did the outcome happen? (Back wins on Yes, Lay wins on No.)'}
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <button
                            disabled={settleLoading}
                            onClick={() =>
                              handleSettle(game, isTiedMatchBet ? yesOption : 'yes')
                            }
                            className='rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60'
                          >
                            {settleLoading
                              ? 'Settling...'
                              : `Settle: ${isTiedMatchBet ? yesOption : 'Yes'}`}
                          </button>
                          <button
                            disabled={settleLoading}
                            onClick={() =>
                              handleSettle(game, isTiedMatchBet ? noOption : 'no')
                            }
                            className='rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60'
                          >
                            {settleLoading
                              ? 'Settling...'
                              : `Settle: ${isTiedMatchBet ? noOption : 'No'}`}
                          </button>
                          {isTiedMatchBet && (
                            <>
                              <button
                                disabled={settleLoading}
                                onClick={() => handleSettle(game, '1')}
                                className='rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60'
                              >
                                {settleLoading ? 'Settling...' : 'Settle: 1 (Yes)'}
                              </button>
                              <button
                                disabled={settleLoading}
                                onClick={() => handleSettle(game, '0')}
                                className='rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60'
                              >
                                {settleLoading ? 'Settling...' : 'Settle: 0 (No)'}
                              </button>
                            </>
                          )}
                          <button
                            disabled={settleLoading}
                            onClick={() => handleVoid(game)}
                            className='rounded-full bg-gray-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-600 disabled:opacity-60'
                          >
                            {settleLoading ? 'Voiding...' : 'Void (Refund)'}
                          </button>
                        </div>
                      </div>
                    ) : isOddEvenBet ? (
                      <div>
                        <div className='mb-1 text-[11px] text-gray-500'>
                          Settle which side won for this proposition (bets are
                          on Odd or Even). You can also enter a final runs/score
                          — parity of that number decides the winner.
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <button
                            disabled={settleLoading}
                            onClick={() => handleSettle(game, 'odd')}
                            className='rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60'
                          >
                            {settleLoading ? 'Settling...' : 'Settle: Odd'}
                          </button>
                          <button
                            disabled={settleLoading}
                            onClick={() => handleSettle(game, 'even')}
                            className='rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60'
                          >
                            {settleLoading ? 'Settling...' : 'Settle: Even'}
                          </button>
                          <button
                            disabled={settleLoading}
                            onClick={() => handleVoid(game)}
                            className='rounded-full bg-gray-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-600 disabled:opacity-60'
                          >
                            {settleLoading ? 'Voiding...' : 'Void (Refund)'}
                          </button>
                        </div>
                        <div className='mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3'>
                          <input
                            type='number'
                            value={fancyScore}
                            onChange={(e) => setFancyScore(e.target.value)}
                            placeholder='Runs/score (parity)'
                            className='w-40 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none'
                          />
                          <button
                            disabled={settleLoading || !fancyScore}
                            onClick={() => handleSettle(game, fancyScore)}
                            className='rounded-full bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-60'
                          >
                            {settleLoading
                              ? 'Settling...'
                              : 'Settle by score parity'}
                          </button>
                        </div>
                      </div>
                    ) : isScoreFancy ? (
                      /* FANCY BET - Score Input + Void */
                      <div>
                        <div className='mb-1 text-[11px] text-gray-500'>
                          Enter final score to settle fancy bets, or void the
                          market if it didn't take place (e.g. over abandoned
                          due to rain).
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <input
                            type='number'
                            value={fancyScore}
                            onChange={(e) => setFancyScore(e.target.value)}
                            placeholder='Enter score (e.g., 156)'
                            className='w-40 rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none'
                          />
                          <button
                            disabled={settleLoading || !fancyScore}
                            onClick={() => handleSettle(game, fancyScore)}
                            className='rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-60'
                          >
                            {settleLoading
                              ? 'Settling...'
                              : 'Settle with Score'}
                          </button>

                          {/* Void - cancel and refund all bets in this fancy market */}
                          <button
                            disabled={settleLoading}
                            onClick={() => handleVoid(game)}
                            title='Cancel this fancy market and return staked amount to all users'
                            className='rounded-full bg-gray-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-600 disabled:opacity-60'
                          >
                            {settleLoading ? 'Voiding...' : 'Void (Refund)'}
                          </button>
                        </div>
                        {game.fancyScores && game.fancyScores.length > 0 && (
                          <div className='mt-2 text-[10px] text-gray-500'>
                            Bet scores in this market:{' '}
                            {game.fancyScores.filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* SPORTS BET - Team Selection */
                      <div>
                        <div className='mb-1 text-[11px] text-gray-500'>
                          Settle result (choose winning team)
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <button
                            disabled={settleLoading}
                            onClick={() => handleSettle(game, teamA)}
                            className='rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60'
                          >
                            {settleLoading ? 'Settling...' : `Settle: ${teamA}`}
                          </button>
                          <button
                            disabled={settleLoading}
                            onClick={() => handleSettle(game, teamB)}
                            className='rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60'
                          >
                            {settleLoading ? 'Settling...' : `Settle: ${teamB}`}
                          </button>
                          {/* Tied - refunds all bets */}
                          <button
                            disabled={settleLoading}
                            onClick={() => handleSettle(game, 'tied')}
                            className='rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-600 disabled:opacity-60'
                          >
                            {settleLoading ? 'Settling...' : 'Tied (Refund)'}
                          </button>

                          {/* Void - cancel and refund all bets */}
                          <button
                            disabled={settleLoading}
                            onClick={() => handleVoid(game)}
                            className='rounded-full bg-gray-500 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-600 disabled:opacity-60'
                          >
                            {settleLoading ? 'Voiding...' : 'Void (Cancel)'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Unsettled bets */}
                  <div className='border-t pt-3'>
                    <div className='mb-1 flex items-center justify-between'>
                      <h3 className='text-xs font-semibold text-gray-800'>
                        Unsettled Bets
                      </h3>
                      {unsettledLoading && (
                        <span className='text-[11px] text-gray-500'>
                          Loading…
                        </span>
                      )}
                    </div>

                    {unsettledError && (
                      <div className='mb-2 text-[11px] text-red-600'>
                        {unsettledError}
                      </div>
                    )}

                    {!unsettledLoading &&
                      !unsettledError &&
                      unsettledBets.length > 0 && (
                        <div className='max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-2'>
                          <table className='w-full text-[11px]'>
                            <thead className='text-gray-500'>
                              <tr>
                                <th className='px-1 py-1 text-left'>User</th>
                                <th className='px-1 py-1 text-left'>
                                  {isScoreFancy ? 'Market / Score' : isYesNoBet ? 'Outcome' : isOddEvenBet ? 'Market / Side' : 'Selection'}
                                </th>
                                <th className='px-1 py-1 text-center'>Type</th>
                                <th className='px-1 py-1 text-right'>P/L</th>
                              </tr>
                            </thead>
                            <tbody>
                              {unsettledBets.map((b) => (
                                <tr
                                  key={b._id}
                                  className='border-t border-gray-200'
                                >
                                  <td className='px-1 py-1'>{b.userName}</td>
                                  <td className='truncate px-1 py-1'>
                                    {isScoreFancy ? (
                                      <span>
                                        {b.teamName}{' '}
                                        <span className='font-bold text-orange-600'>
                                          @ {b.fancyScore}
                                        </span>
                                      </span>
                                    ) : isOddEvenBet ? (
                                      <span>
                                        <span className='text-gray-600'>
                                          {b.marketName}
                                        </span>{' '}
                                        <span className='font-bold uppercase text-violet-700'>
                                          {b.teamName}
                                        </span>
                                      </span>
                                    ) : (
                                      <span>
                                        {b.teamName}
                                        {isYesNoBet && (
                                          <span className={`ml-1 uppercase ${isTiedMatchBet ? 'text-amber-600' : 'text-orange-600'}`}>
                                            ({b.otype})
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </td>
                                  <td className='px-1 py-1 text-center uppercase'>
                                    {b.otype}
                                  </td>
                                  <td className='px-1 py-1 text-right font-semibold'>
                                    <span className='text-green-600'>
                                      {b.betAmount}
                                    </span>
                                    /
                                    <span className='text-red-600'>
                                      {b.price}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                    {!unsettledLoading &&
                      !unsettledError &&
                      unsettledBets.length === 0 && (
                        <div className='text-[11px] text-gray-500'>
                          No unsettled bets for this game.
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
};

export default ResultControl;

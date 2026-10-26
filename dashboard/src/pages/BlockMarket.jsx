import { useCallback, useEffect, useMemo, useState } from 'react';
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import {
  extractAvailableMarkets,
  fallbackMarkets,
  getBettingUrl,
} from '../utils/blockMarketMarkets';

const SPORTS = [
  { key: 'cricket', label: 'Cricket', url: '/cricket/matches?includeDeactivated=1' },
  { key: 'soccer', label: 'Soccer', url: '/soccer?includeDeactivated=1' },
  { key: 'tennis', label: 'Tennis', url: '/tennis?includeDeactivated=1' },
];

const MAIN_SECTIONS = [
  { key: 'sports', label: 'Sports' },
  { key: 'matches', label: 'Match Markets' },
  { key: 'casino', label: 'Casino' },
  { key: 'ggr', label: 'GGR Casino' },
];

const SPORT_SCOPE_OPTIONS = [
  { id: 'all', label: 'All Sports' },
  { id: 'cricket', label: 'Cricket' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'soccer', label: 'Football' },
];

const CASINO_CATEGORIES = [
  'All Casino',
  'Roulette',
  'Teenpatti',
  'Poker',
  'Baccarat',
  'Dragon Tiger',
  '32 Cards',
  'Andar Bahar',
  'Lucky 7',
  '3 Card Judgement',
];

/** Live Casino + Slot Game + Fantasy Game providers (same ids sent on launch) */
const GGR_PROVIDERS = [
  // Live Casino
  { id: 'creedroomz', label: 'Creedroomz' },
  { id: 'evolution', label: 'Evolution' },
  { id: 'ezugi', label: 'EZUGI' },
  { id: 'mac88', label: 'Mac88' },
  // Slot Game
  { id: 'pragmatic', label: 'Pragmatic Play' },
  { id: 'jili', label: 'JILI' },
  { id: 'pg', label: 'PG Soft' },
  { id: 'habanero', label: 'Habanero' },
  { id: 'redtiger', label: 'Red Tiger' },
  { id: 'playtech', label: 'Playtech' },
  { id: 'microgaming', label: 'Microgaming' },
  { id: 'cq9', label: 'CQ9' },
  { id: 'btg', label: 'Big Time Gaming' },
  { id: 'jdb', label: 'JDB' },
  { id: 'km', label: 'King Midas' },
  { id: 'nolimit', label: 'Nolimit City' },
  { id: 'relax', label: 'Relax Gaming' },
  { id: 'smartsoft', label: 'Smartsoft' },
  { id: 'onegame', label: 'One Game' },
  // Fantasy Game
  { id: 'smart', label: 'smart' },
  { id: 'spribe', label: 'spribe' },
];

const ALL_MARKET = 'All';

function normalizeLocks(locks) {
  return Array.isArray(locks) ? locks : [];
}

function normToken(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isScopeLocked(locks, lockType, marketName) {
  const name = normToken(marketName);
  return normalizeLocks(locks).some((lock) => {
    if (lock.isLocked === false) return false;
    if (String(lock.lockType || 'market') !== lockType) return false;
    return normToken(lock.marketName) === name;
  });
}

function isLocked(locks, gameId, marketName) {
  const gid = String(gameId || '');
  const m = String(marketName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return normalizeLocks(locks).some((lock) => {
    const lt = String(lock.lockType || 'market');
    if (lt !== 'market') return false;
    if (String(lock.gameId || '') !== gid) return false;
    if (lock.isLocked === false) return false;
    const lm = String(lock.marketName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (!lm) return false;
    if (
      lm === 'all' ||
      lm === 'allmarkets' ||
      lm === 'match' ||
      lm === 'entirematch'
    ) {
      return true;
    }
    if (m === 'fancy') {
      return lm === 'fancy';
    }
    if (m === 'matchodds') {
      return lm === 'matchodds' || lm === 'tournamentwinner';
    }
    if (m.includes('bookmaker')) {
      return lm.includes('bookmaker');
    }
    if (m === 'tiedmatch') {
      return lm === 'tiedmatch';
    }
    return lm === m;
  });
}

function BlockMarket() {
  const [mainSection, setMainSection] = useState('sports');
  const [sport, setSport] = useState('cricket');
  const [matches, setMatches] = useState([]);
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedTournaments, setExpandedTournaments] = useState(new Set());
  const [expandedMatches, setExpandedMatches] = useState(new Set());
  const [togglingKey, setTogglingKey] = useState(null);
  /** gameId → { lockName, label }[] */
  const [marketsByGame, setMarketsByGame] = useState({});
  const [marketsLoading, setMarketsLoading] = useState({});
  const [txModal, setTxModal] = useState(null); // { title, description, mode: 'toggle'|'bulk', payload }
  const [transactionCode, setTransactionCode] = useState('');
  const [txSaving, setTxSaving] = useState(false);

  const loadLocks = useCallback(async () => {
    try {
      const res = await api.get('/block-market/locks');
      if (res.data?.success) {
        setLocks(normalizeLocks(res.data.data));
      }
    } catch (err) {
      console.error('Failed to load locks', err);
    }
  }, []);

  const loadMatches = useCallback(async (sportKey) => {
    const cfg = SPORTS.find((s) => s.key === sportKey);
    if (!cfg) return;
    setLoading(true);
    setError(null);
    setMarketsByGame({});
    setExpandedMatches(new Set());
    try {
      const res = await api.get(cfg.url);
      const list =
        res.data?.matches ||
        res.data?.data ||
        (Array.isArray(res.data) ? res.data : []);
      setMatches(Array.isArray(list) ? list : []);
      const titles = [
        ...new Set((list || []).map((m) => m.title || m.cname || 'Other')),
      ];
      setExpandedTournaments(new Set(titles.slice(0, 3)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMarketsForMatch = useCallback(async (gameId) => {
    const mid = String(gameId);

    setMarketsLoading((prev) => ({ ...prev, [mid]: true }));
    try {
      const res = await api.get(getBettingUrl(sport, mid));
      const payload = res.data?.data ?? res.data;
      let markets = extractAvailableMarkets(sport, payload);
      if (!markets.length) {
        markets = extractAvailableMarkets(sport, payload?.data);
      }
      if (!markets.length) {
        markets = fallbackMarkets(sport);
      }
      setMarketsByGame((prev) => ({ ...prev, [mid]: markets }));
      return markets;
    } catch (err) {
      console.error('Failed to load markets for', mid, err);
      const markets = fallbackMarkets(sport);
      setMarketsByGame((prev) => ({ ...prev, [mid]: markets }));
      return markets;
    } finally {
      setMarketsLoading((prev) => ({ ...prev, [mid]: false }));
    }
  }, [sport]);

  useEffect(() => {
    loadLocks();
  }, [loadLocks]);

  useEffect(() => {
    loadMatches(sport);
  }, [sport, loadMatches]);

  const grouped = useMemo(() => {
    return matches.reduce((acc, m) => {
      const t = m.title || m.cname || 'Other';
      if (!acc[t]) acc[t] = [];
      acc[t].push(m);
      return acc;
    }, {});
  }, [matches]);

  const marketsFor = (matchId) =>
    marketsByGame[String(matchId)] || fallbackMarkets(sport);

  const toggleTournamentOpen = (name) => {
    setExpandedTournaments((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleMatchOpen = (id) => {
    const key = String(id);
    setExpandedMatches((prev) => {
      const next = new Set(prev);
      const willOpen = !next.has(key);
      if (willOpen) {
        next.add(key);
        if (!marketsByGame[key]) {
          loadMarketsForMatch(key);
        }
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const openTxModal = (modal) => {
    setTransactionCode('');
    setTxModal(modal);
  };

  const closeTxModal = () => {
    if (txSaving) return;
    setTxModal(null);
    setTransactionCode('');
  };

  const executeToggle = async (payload, code) => {
    const { gameId = '', eventName = '', marketName, lockType = 'market', nextLocked } =
      payload;
    const key = `${lockType}:${gameId}:${marketName}`;
    setTogglingKey(key);
    try {
      const res = await api.post('/block-market/toggle', {
        gameId: String(gameId || ''),
        eventName: eventName || '',
        marketName,
        lockType,
        isLocked: nextLocked,
        transactionCode: code,
      });
      if (res.data?.success) {
        setLocks(normalizeLocks(res.data.data?.marketLocks));
        toast.success(
          nextLocked
            ? `Blocked ${marketName} for downline`
            : `Unblocked ${marketName}`
        );
        return true;
      }
      toast.error(res.data?.message || 'Toggle failed');
      return false;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
      return false;
    } finally {
      setTogglingKey(null);
    }
  };

  const executeBulk = async (items, code, successMsg) => {
    setTogglingKey('bulk');
    try {
      const res = await api.post('/block-market/bulk', {
        locks: items,
        transactionCode: code,
      });
      if (res.data?.success) {
        setLocks(normalizeLocks(res.data.data));
        toast.success(successMsg);
        return true;
      }
      toast.error(res.data?.message || 'Toggle failed');
      return false;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
      return false;
    } finally {
      setTogglingKey(null);
    }
  };

  const confirmTxModal = async () => {
    if (!txModal) return;
    const code = String(transactionCode || '').trim();
    if (!code) {
      toast.error('Please enter Transaction Code / Master Password');
      return;
    }
    setTxSaving(true);
    try {
      let ok = false;
      if (txModal.mode === 'toggle') {
        ok = await executeToggle(txModal.payload, code);
      } else if (txModal.mode === 'bulk') {
        ok = await executeBulk(
          txModal.payload.items,
          code,
          txModal.payload.successMsg
        );
      }
      if (ok) {
        setTxModal(null);
        setTransactionCode('');
      }
    } finally {
      setTxSaving(false);
    }
  };

  const handleScopeToggle = (lockType, marketName, checked) => {
    openTxModal({
      title: checked ? 'Confirm Block' : 'Confirm Unblock',
      description: `${checked ? 'Block' : 'Unblock'} "${marketName}" for your downline?`,
      mode: 'toggle',
      payload: {
        lockType,
        marketName,
        gameId: '',
        eventName: '',
        nextLocked: checked,
      },
    });
  };

  const handleMarketCheck = (match, marketName, checked) => {
    openTxModal({
      title: checked ? 'Confirm Block' : 'Confirm Unblock',
      description: `${checked ? 'Block' : 'Unblock'} "${marketName}" on ${match.match}?`,
      mode: 'toggle',
      payload: {
        gameId: match.id,
        eventName: match.match,
        marketName,
        lockType: 'market',
        nextLocked: checked,
      },
    });
  };

  const handleMatchCheck = async (match, checked) => {
    const gameId = String(match.id);
    const eventName = match.match || '';
    const markets =
      marketsByGame[gameId] || (await loadMarketsForMatch(gameId));
    const items = [
      ...markets.map((m) => ({
        marketName: m.lockName,
        eventName,
        gameId,
        lockType: 'market',
        isLocked: false,
      })),
      {
        marketName: ALL_MARKET,
        eventName,
        gameId,
        lockType: 'market',
        isLocked: checked,
      },
    ];
    openTxModal({
      title: checked ? 'Confirm Block Match' : 'Confirm Unblock Match',
      description: `${checked ? 'Block' : 'Unblock'} entire match "${eventName}"?`,
      mode: 'bulk',
      payload: {
        items,
        successMsg: checked
          ? 'Entire match blocked for downline'
          : 'Match markets unblocked',
      },
    });
  };

  const handleTournamentCheck = (tournamentName, tourMatches, checked) => {
    const items = [];
    for (const match of tourMatches) {
      const gameId = String(match.id);
      const eventName = match.match || '';
      items.push({
        marketName: ALL_MARKET,
        eventName,
        gameId,
        lockType: 'market',
        isLocked: checked,
      });
      if (!checked) {
        for (const m of marketsFor(gameId)) {
          items.push({
            marketName: m.lockName,
            eventName,
            gameId,
            lockType: 'market',
            isLocked: false,
          });
        }
      }
    }
    openTxModal({
      title: checked ? 'Confirm Block Competition' : 'Confirm Unblock Competition',
      description: `${checked ? 'Block' : 'Unblock'} all matches in "${tournamentName}"?`,
      mode: 'bulk',
      payload: {
        items,
        successMsg: checked
          ? `Blocked all matches in ${tournamentName}`
          : `Unblocked ${tournamentName}`,
      },
    });
  };

  const matchFullyLocked = (match) => isLocked(locks, match.id, ALL_MARKET);

  const matchPartiallyLocked = (match) => {
    if (matchFullyLocked(match)) return true;
    return marketsFor(match.id).some((m) =>
      isLocked(locks, match.id, m.lockName)
    );
  };

  const tournamentFullyLocked = (tourMatches) =>
    tourMatches.length > 0 && tourMatches.every((m) => matchFullyLocked(m));

  return (
    <>
      <Navbar />
      <div className='mx-auto w-full md:max-w-250'>
        <div className='rounded-sm border border-gray-200 bg-white px-4 py-3'>
          <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
            <h1 className='text-base font-bold text-gray-800'>
              Block Market
            </h1>
            <p className='text-xs text-gray-500'>
              Block sports, match markets, casino categories, or GGR providers
              for your downline.
            </p>
          </div>

          <div className='mb-3 flex flex-wrap gap-1 border-b border-gray-200'>
            {MAIN_SECTIONS.map((s) => (
              <button
                key={s.key}
                type='button'
                onClick={() => setMainSection(s.key)}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  mainSection === s.key
                    ? 'bg-primary text-primary'
                    : 'text-gray-600 hover:bg-secondary70 hover:text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {mainSection === 'sports' && (
            <div className='mb-2 overflow-hidden rounded border border-gray-200'>
              <div className='bg-primary px-3 py-2 text-sm font-bold text-white'>
                Lock Sports (overall)
              </div>
              <div className='bg-white py-1'>
                {SPORT_SCOPE_OPTIONS.map((opt) => {
                  const locked = isScopeLocked(locks, 'sport', opt.id);
                  const busy = togglingKey === `sport::${opt.id}`;
                  return (
                    <label
                      key={opt.id}
                      className='flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'
                    >
                      <input
                        type='checkbox'
                        checked={locked}
                        disabled={!!busy}
                        onChange={(e) =>
                          handleScopeToggle('sport', opt.id, e.target.checked)
                        }
                        className='h-4 w-4'
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {mainSection === 'casino' && (
            <div className='mb-2 overflow-hidden rounded border border-gray-200'>
              <div className='bg-primary px-3 py-2 text-sm font-bold text-white'>
                Lock Our Casino
              </div>
              <div className='bg-white py-1'>
                <label className='flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50'>
                  <input
                    type='checkbox'
                    checked={isScopeLocked(locks, 'casino', 'All')}
                    disabled={togglingKey === 'casino::All'}
                    onChange={(e) =>
                      handleScopeToggle('casino', 'All', e.target.checked)
                    }
                    className='h-4 w-4'
                  />
                  <span>All Casino</span>
                </label>
                {CASINO_CATEGORIES.filter((c) => c !== 'All Casino').map(
                  (cat) => {
                    const locked = isScopeLocked(locks, 'casinoCategory', cat);
                    const busy = togglingKey === `casinoCategory::${cat}`;
                    const wholeCasino = isScopeLocked(locks, 'casino', 'All');
                    return (
                      <label
                        key={cat}
                        className='flex cursor-pointer items-center gap-2 px-3 py-2 pl-6 text-sm text-gray-700 hover:bg-gray-50'
                      >
                        <input
                          type='checkbox'
                          checked={locked || wholeCasino}
                          disabled={!!busy || wholeCasino}
                          onChange={(e) =>
                            handleScopeToggle(
                              'casinoCategory',
                              cat,
                              e.target.checked
                            )
                          }
                          className='h-4 w-4'
                        />
                        <span>{cat}</span>
                        {wholeCasino && (
                          <span className='text-[10px] text-gray-400'>
                            (via All Casino)
                          </span>
                        )}
                      </label>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {mainSection === 'ggr' && (
            <div className='mb-2 overflow-hidden rounded border border-gray-200'>
              <div className='bg-primary px-3 py-2 text-sm font-bold text-white'>
                Lock GGR Casino
              </div>
              <div className='bg-white py-1'>
                <label className='flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50'>
                  <input
                    type='checkbox'
                    checked={isScopeLocked(locks, 'ggr', 'All')}
                    disabled={togglingKey === 'ggr::All'}
                    onChange={(e) =>
                      handleScopeToggle('ggr', 'All', e.target.checked)
                    }
                    className='h-4 w-4'
                  />
                  <span>All GGR Casino</span>
                </label>
                {GGR_PROVIDERS.map((p) => {
                  const locked = isScopeLocked(locks, 'ggrProvider', p.id);
                  const busy = togglingKey === `ggrProvider::${p.id}`;
                  const wholeGgr = isScopeLocked(locks, 'ggr', 'All');
                  return (
                    <label
                      key={p.id}
                      className='flex cursor-pointer items-center gap-2 px-3 py-2 pl-6 text-sm text-gray-700 hover:bg-gray-50'
                    >
                      <input
                        type='checkbox'
                        checked={locked || wholeGgr}
                        disabled={!!busy || wholeGgr}
                        onChange={(e) =>
                          handleScopeToggle(
                            'ggrProvider',
                            p.id,
                            e.target.checked
                          )
                        }
                        className='h-4 w-4'
                      />
                      <span>{p.label}</span>
                      {wholeGgr && (
                        <span className='text-[10px] text-gray-400'>
                          (via All GGR Casino)
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {mainSection === 'matches' && (
            <>
          <div className='mb-3 flex flex-wrap gap-1 border-b border-gray-200'>
            {SPORTS.map((s) => (
              <button
                key={s.key}
                type='button'
                onClick={() => setSport(s.key)}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  sport === s.key
                    ? 'bg-primary text-primary'
                    : 'text-gray-600 hover:bg-secondary70 hover:text-secondary'
                }`}
              >
                {s.label}
                {sport === s.key && matches.length
                  ? ` (${matches.length})`
                  : ''}
              </button>
            ))}
          </div>

          {loading && (
            <div className='py-8 text-center text-sm text-gray-500'>
              Loading matches...
            </div>
          )}
          {error && (
            <div className='py-8 text-center text-sm text-red-500'>{error}</div>
          )}
          {!loading && !error && !matches.length && (
            <div className='py-8 text-center text-sm text-gray-500'>
              No matches found
            </div>
          )}

          <div className='flex flex-col gap-2'>
            {Object.entries(grouped).map(([tournamentName, tourMatches]) => {
              const tourOpen = expandedTournaments.has(tournamentName);
              const tourLocked = tournamentFullyLocked(tourMatches);
              const tourBusy = togglingKey === `tour:${tournamentName}`;

              return (
                <div
                  key={tournamentName}
                  className='overflow-hidden rounded border border-gray-200'
                >
                  <div className='bg-primary flex items-center gap-2 px-3 py-2 text-white'>
                    <input
                      type='checkbox'
                      checked={tourLocked}
                      disabled={!!tourBusy}
                      onChange={(e) =>
                        handleTournamentCheck(
                          tournamentName,
                          tourMatches,
                          e.target.checked
                        )
                      }
                      className='h-4 w-4'
                      title='Block all matches in this competition'
                    />
                    <button
                      type='button'
                      className='flex flex-1 items-center justify-between text-left text-sm font-bold'
                      onClick={() => toggleTournamentOpen(tournamentName)}
                    >
                      <span>{tournamentName}</span>
                      {tourOpen ? <IoIosArrowDown /> : <IoIosArrowForward />}
                    </button>
                  </div>

                  {tourOpen && (
                    <div className='bg-white'>
                      {tourMatches.map((match) => {
                        const mid = String(match.id);
                        const matchOpen = expandedMatches.has(mid);
                        const fully = matchFullyLocked(match);
                        const partial = matchPartiallyLocked(match);
                        const matchBusy =
                          togglingKey === `${mid}:All` ||
                          marketsFor(mid).some(
                            (m) => togglingKey === `${mid}:${m.lockName}`
                          );
                        const markets = marketsFor(mid);
                        const loadingMkts = !!marketsLoading[mid];

                        return (
                          <div key={mid} className='border-t border-gray-100'>
                            <div className='bg-secondary70 flex items-center gap-2 px-3 py-2 pl-6 text-white'>
                              <input
                                type='checkbox'
                                checked={fully || partial}
                                ref={(el) => {
                                  if (el) {
                                    el.indeterminate = !fully && partial;
                                  }
                                }}
                                disabled={!!matchBusy}
                                onChange={(e) =>
                                  handleMatchCheck(match, e.target.checked)
                                }
                                className='h-4 w-4'
                                title='Block entire match'
                              />
                              <button
                                type='button'
                                className='flex flex-1 items-center justify-between text-left text-sm font-semibold text-white'
                                onClick={() => toggleMatchOpen(mid)}
                              >
                                <span>
                                  {match.match}
                                  {(match.inplay || match.iplay) && (
                                    <span className='ml-2 text-xs font-bold text-green-300'>
                                      (In-Play)
                                    </span>
                                  )}
                                </span>
                                {matchOpen ? (
                                  <IoIosArrowDown />
                                ) : (
                                  <IoIosArrowForward />
                                )}
                              </button>
                            </div>

                            {matchOpen && (
                              <div className='bg-white py-1 pl-12 pr-3'>
                                {loadingMkts && (
                                  <p className='py-2 text-xs text-gray-500'>
                                    Loading markets for this match...
                                  </p>
                                )}
                                {!loadingMkts &&
                                  markets.map(({ lockName, label }) => {
                                    const locked =
                                      fully || isLocked(locks, mid, lockName);
                                    const busy =
                                      togglingKey === `${mid}:${lockName}`;
                                    return (
                                      <label
                                        key={lockName}
                                        className='flex cursor-pointer items-center gap-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50'
                                      >
                                        <input
                                          type='checkbox'
                                          checked={locked}
                                          disabled={!!busy || fully}
                                          onChange={(e) =>
                                            handleMarketCheck(
                                              match,
                                              lockName,
                                              e.target.checked
                                            )
                                          }
                                          className='h-4 w-4'
                                        />
                                        <span>{label}</span>
                                        {fully && (
                                          <span className='text-[10px] text-gray-400'>
                                            (via whole match)
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            </>
          )}
        </div>
      </div>

      {txModal && (
        <div
          className='fixed inset-0 z-[300]  flex items-center justify-center bg-black/60 p-4'
          onClick={closeTxModal}
        >
          <div
            className='w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='bg-primary rounded-lg  flex items-center justify-between px-4 py-3 text-white'>
              <h2 className='text-base font-bold'>{txModal.title}</h2>
              <button
                type='button'
                onClick={closeTxModal}
                disabled={txSaving}
                className='flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-lg font-bold text-white hover:bg-secondary70'
              >
                ×
              </button>
            </div>
            <div className='space-y-4 p-4'>
              <p className='text-sm text-gray-700'>{txModal.description}</p>
              <div>
                <label className='mb-1 block text-xs font-semibold text-gray-600'>
                  Transaction Code / Master Password
                </label>
                <input
                  type='password'
                  value={transactionCode}
                  onChange={(e) => setTransactionCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmTxModal();
                  }}
                  placeholder='Enter transaction password'
                  autoFocus
                  className='w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500'
                />
              </div>
              <div className='flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={closeTxModal}
                  disabled={txSaving}
                  className='rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={confirmTxModal}
                  disabled={txSaving}
                  className='bg-primary text-primary rounded px-4 py-2 text-sm font-semibold disabled:opacity-50'
                >
                  {txSaving ? 'Verifying...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BlockMarket;

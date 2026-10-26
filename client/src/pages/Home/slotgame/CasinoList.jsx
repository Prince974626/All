import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Casino from './Casino';
import api from '../../../redux/api';
import GgrGameFrame from '../../../components/casino/GgrGameFrame';

import ppGames from '../../../components/api_json/pp.json';
import jiliGames from '../../../components/api_json/jili.json';
import pgGames from '../../../components/api_json/pg.json';
import habaneroGames from '../../../components/api_json/Habanero.json';
import redTigerGames from '../../../components/api_json/redTiger.json';
import playtechGames from '../../../components/api_json/playtech.json';
import microgamingGames from '../../../components/api_json/Microgaming.json';
import cq9Games from '../../../components/api_json/CQ9.json';
import btgGames from '../../../components/api_json/BigTimeGaming.json';
import jdbGames from '../../../components/api_json/jdb.json';
import kmGames from '../../../components/api_json/km.json';
import nolimitGames from '../../../components/api_json/nolimit.json';
import relaxGames from '../../../components/api_json/relax.json';
import smartsoftGames from '../../../components/api_json/smartsoft.json';
import onegameGames from '../../../components/api_json/onegame.json';

const normalizeCategory = (gameType = '') => {
  const type = String(gameType).trim().toLowerCase();

  if (['video slots', 'slot', 'slot game', 'slots'].includes(type)) {
    return 'Slots';
  }
  if (['classic games', 'classic'].includes(type)) return 'Classic';
  if (['table games', 'table game', 'table', 'casinotable'].includes(type)) {
    return 'Table Games';
  }
  if (['fish game', 'fish'].includes(type)) return 'Fish Games';
  if (['arcade game', 'arcade'].includes(type)) return 'Arcade';
  if (['crash game', 'crash'].includes(type)) return 'Crash';
  if (['instant win', 'instant'].includes(type)) return 'Instant Win';
  if (['gamble game', 'gamble'].includes(type)) return 'Gamble';
  if (['india poker game', 'poker'].includes(type)) return 'Poker';
  if (type === 'keno') return 'Keno';
  if (type === 'xgames') return 'XGames';
  if (['casinolive', 'casino', 'casino games'].includes(type)) return 'Casino';
  if (type === 'roulette') return 'Roulette';

  if (!gameType) return 'Other';
  return String(gameType)
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const providers = [
  { id: 'pragmatic', name: 'Pragmatic Play', gamesList: ppGames },
  { id: 'jili', name: 'JILI', gamesList: jiliGames },
  { id: 'pg', name: 'PG Soft', gamesList: pgGames },
  { id: 'habanero', name: 'Habanero', gamesList: habaneroGames },
  { id: 'redtiger', name: 'Red Tiger', gamesList: redTigerGames },
  { id: 'playtech', name: 'Playtech', gamesList: playtechGames },
  { id: 'microgaming', name: 'Microgaming', gamesList: microgamingGames },
  { id: 'cq9', name: 'CQ9', gamesList: cq9Games },
  { id: 'btg', name: 'Big Time Gaming', gamesList: btgGames },
  { id: 'jdb', name: 'JDB', gamesList: jdbGames },
  { id: 'km', name: 'King Midas', gamesList: kmGames },
  { id: 'nolimit', name: 'Nolimit City', gamesList: nolimitGames },
  { id: 'relax', name: 'Relax Gaming', gamesList: relaxGames },
  { id: 'smartsoft', name: 'Smartsoft', gamesList: smartsoftGames },
  { id: 'onegame', name: 'One Game', gamesList: onegameGames },
];

export default function CasinoList() {
  const { userInfo } = useSelector((state) => state.auth);
  const [activeProvider, setActiveProvider] = useState('pragmatic');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameUrl, setGameUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const rawGames = useMemo(() => {
    const provider = providers.find((p) => p.id === activeProvider);
    const list = provider?.gamesList || [];
    const seen = new Set();
    return list.filter((game) => {
      const key = String(game.game_uid || game.id || '');
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activeProvider]);

  const availableCategories = useMemo(() => {
    const cats = new Set();
    rawGames.forEach((game) => {
      cats.add(normalizeCategory(game.game_type));
    });
    return ['All', ...Array.from(cats).sort()];
  }, [rawGames]);

  const filteredGames = useMemo(() => {
    if (activeCategory === 'All') return rawGames;
    return rawGames.filter(
      (game) => normalizeCategory(game.game_type) === activeCategory
    );
  }, [rawGames, activeCategory]);

  const handleProviderChange = (providerId) => {
    if (providerId === activeProvider) return;
    setActiveProvider(providerId);
    setActiveCategory('All');
    setSelectedGame(null);
    setGameUrl('');
  };

  const handleLaunchGame = async (game) => {
    if (!userInfo) {
      toast.error('Please login first to play.');
      return;
    }
    if (userInfo?.isDemo) {
      toast.error(
        'Demo accounts cannot play this casino. Please use a real account.'
      );
      return;
    }

    const balance = userInfo.avbalance || userInfo.balance || 0;
    if (balance < 100) {
      toast.error(
        'Insufficient balance to launch game! Minimum 100 balance required.'
      );
      return;
    }

    try {
      setLoading(true);
      setSelectedGame(game);
      const { data } = await api.post('/casino/start', {
        userName: userInfo.userName,
        game_uid: game.game_uid || game.id,
        credit_amount: balance,
        provider: game.provider || activeProvider,
      });

      if (data?.success && data?.gameUrl) {
        setGameUrl(data.gameUrl);
      } else {
        toast.error(data?.message || 'Failed to launch game');
        setSelectedGame(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Game launch failed');
      setSelectedGame(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex min-h-[500px] w-full flex-col items-center justify-center bg-[#f8fafc]'>
        <div className='mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[#0088cc]'></div>
        <p className='text-sm font-semibold text-slate-600'>
          Launching game, please wait...
        </p>
      </div>
    );
  }

  if (gameUrl) {
    return (
      <GgrGameFrame
        title={selectedGame?.game_name || 'Casino Game'}
        gameUrl={gameUrl}
        onExit={() => {
          setGameUrl('');
          setSelectedGame(null);
        }}
      />
    );
  }

  return (
    <div className='flex min-h-[600px] w-full flex-col bg-[#ffffff] min-[1200px]:flex-row'>
      <div className='scrollbar-hide mr-[5px] flex w-full flex-row overflow-x-auto bg-secondary text-white min-[1200px]:w-1/6 min-[1200px]:flex-col min-[1200px]:overflow-x-visible min-[1200px]:overflow-y-auto'>
        {providers.map((prov) => (
          <button
            key={prov.id}
            type='button'
            className={`h-[34px] px-4 py-2 text-center text-[12px] leading-none font-bold whitespace-nowrap uppercase transition-colors min-[1200px]:text-[16px] min-[1200px]:font-normal min-[1200px]:normal-case ${
              activeProvider === prov.id
                ? 'bg-primary text-white'
                : 'hover:bg-white/5'
            }`}
            onClick={() => handleProviderChange(prov.id)}
          >
            {prov.name}
          </button>
        ))}
      </div>

      <div className='flex w-full flex-col min-[1200px]:w-5/6'>
        <div className='min-[1200px]:px-[5px]'>
          <div className='scrollbar-hide flex overflow-x-auto border-b border-slate-200 bg-[#0088cca5] text-white'>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type='button'
                className={`h-[34px] px-4 py-2 text-[12px] leading-none whitespace-nowrap uppercase transition-colors duration-200 min-[1200px]:text-[16px] min-[1200px]:normal-case ${
                  activeCategory === cat
                    ? 'bg-[#0088cc] font-bold text-white'
                    : 'bg-transparent font-bold text-white min-[1200px]:font-normal'
                }`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className='mt-1.5'>
          {filteredGames.length > 0 ? (
            <Casino
              key={`${activeProvider}-${activeCategory}`}
              providerId={activeProvider}
              casinos={filteredGames}
              onLaunchGame={handleLaunchGame}
            />
          ) : (
            <div className='flex min-h-[200px] items-center justify-center text-sm text-slate-500'>
              No games found for this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

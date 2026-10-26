import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Casino from './Casino';
import api from '../../../redux/api';
import GgrGameFrame from '../../../components/casino/GgrGameFrame';
import Creedroomz from '../../../components/api_json/creedroomz.json';
import Evolution from '../../../components/api_json/Evolution.json';
import EZUGI from '../../../components/api_json/EZUGI.json';
import Mac88 from '../../../components/api_json/mac88.json';

const parseCreedroomzGames = (category) => {
  if (category === 'All Games' || category === 'All Casino') return Creedroomz;
  return Creedroomz.filter((game) => {
    const type = (game.game_type || '').trim();
    if (category === 'Game Show') {
      return type === 'Game Show' || type === 'GameShow';
    }
    if (category === 'Other') {
      return ![
        'Roulette',
        'Blackjack',
        'Baccarat',
        'Poker',
        'Keno',
        'Game Show',
        'GameShow',
      ].includes(type);
    }
    return type.toLowerCase() === category.toLowerCase();
  });
};

const parseMac88Games = (category) => {
  if (category === 'All Games') return Mac88;
  return Mac88.filter((game) => {
    const type = (game.game_type || '').trim().toLowerCase();
    if (category === 'Game Shows') {
      return (
        type === 'game shows' ||
        type === 'live game shows' ||
        type === 'game show'
      );
    }
    if (category === 'Virtual') {
      return type === 'virtual';
    }
    if (category === 'Other') {
      return ![
        'live',
        'live roulette',
        'virtual',
        'mini games',
        'crash games',
        'slot games',
        'casual games',
        'poker',
        'game shows',
        'live game shows',
        'game show',
      ].includes(type);
    }
    return type === category.toLowerCase();
  });
};

const parseJsonGames = (jsonGames, category) => {
  if (!Array.isArray(jsonGames)) return [];
  if (category === 'All Games' || category === 'All Casino') return jsonGames;

  return jsonGames.filter((game) => {
    const name = (game.game_name || '').toLowerCase();
    const type = (game.game_type || '').toLowerCase();
    const catLower = category.toLowerCase();

    if (catLower === 'roulette') {
      return (
        name.includes('roulette') ||
        name.includes('roleta') ||
        name.includes('ruleta') ||
        type.includes('roulette')
      );
    }
    if (catLower === 'blackjack') {
      return name.includes('blackjack') || type.includes('blackjack');
    }
    if (catLower === 'baccarat') {
      return (
        name.includes('baccarat') ||
        type.includes('baccarat') ||
        name.includes('dragon tiger') ||
        name.includes('sic bo')
      );
    }
    if (catLower === 'poker') {
      return (
        name.includes('poker') ||
        name.includes('holdem') ||
        name.includes('teen patti')
      );
    }
    if (catLower === 'keno') {
      return name.includes('keno') || type.includes('keno');
    }
    if (catLower === 'game show') {
      return (
        type.includes('gameshow') ||
        type.includes('game show') ||
        name.includes('monopoly') ||
        name.includes('crazy') ||
        name.includes('wheel') ||
        name.includes('mega')
      );
    }
    if (catLower === 'other') {
      return ![
        'roulette',
        'roleta',
        'ruleta',
        'blackjack',
        'baccarat',
        'poker',
        'keno',
        'game show',
      ].some((key) => name.includes(key) || type.includes(key));
    }
    return true;
  });
};

const providers = [
  {
    id: 'creedroomz',
    name: 'Creedroomz',
    categories: [
      'All Games',
      'Roulette',
      'Blackjack',
      'Baccarat',
      'Poker',
      'Keno',
      'Game Show',
      'Other',
    ],
    gamesByCategory: {
      'All Games': parseCreedroomzGames('All Games'),
      Roulette: parseCreedroomzGames('Roulette'),
      Blackjack: parseCreedroomzGames('Blackjack'),
      Baccarat: parseCreedroomzGames('Baccarat'),
      Poker: parseCreedroomzGames('Poker'),
      Keno: parseCreedroomzGames('Keno'),
      'Game Show': parseCreedroomzGames('Game Show'),
      Other: parseCreedroomzGames('Other'),
    },
  },
  {
    id: 'evolution',
    name: 'Evolution',
    categories: ['Blackjack', 'Roulette', 'Baccarat', 'Game Show', 'Other'],
    gamesByCategory: {
      Blackjack: parseJsonGames(Evolution, 'Blackjack'),
      Roulette: parseJsonGames(Evolution, 'Roulette'),
      Baccarat: parseJsonGames(Evolution, 'Baccarat'),
      'Game Show': parseJsonGames(Evolution, 'Game Show'),
      Other: parseJsonGames(Evolution, 'Other'),
    },
  },
  {
    id: 'ezugi',
    name: 'EZUGI',
    categories: ['Blackjack', 'Roulette', 'Baccarat', 'Other'],
    gamesByCategory: {
      Blackjack: parseJsonGames(EZUGI, 'Blackjack'),
      Roulette: parseJsonGames(EZUGI, 'Roulette'),
      Baccarat: parseJsonGames(EZUGI, 'Baccarat'),
      Other: parseJsonGames(EZUGI, 'Other'),
    },
  },
  {
    id: 'mac88',
    name: 'Mac88',
    categories: [
      'Live',
      'Live Roulette',
      'Virtual',
      'Mini Games',
      'Crash Games',
      'Slot Games',
      'Casual Games',
      'Game Shows',
      'Poker',
      'Other',
    ],
    gamesByCategory: {
      'All Games': parseMac88Games('All Games'),
      Live: parseMac88Games('Live'),
      'Live Roulette': parseMac88Games('Live Roulette'),
      Virtual: parseMac88Games('Virtual'),
      'Mini Games': parseMac88Games('Mini Games'),
      'Crash Games': parseMac88Games('Crash Games'),
      'Slot Games': parseMac88Games('Slot Games'),
      'Casual Games': parseMac88Games('Casual Games'),
      'Game Shows': parseMac88Games('Game Shows'),
      Poker: parseMac88Games('Poker'),
      Other: parseMac88Games('Other'),
    },
  },
];

export default function CasinoList() {
  const { userInfo } = useSelector((state) => state.auth);
  const [activeProvider, setActiveProvider] = useState('creedroomz');
  const [activeCategory, setActiveCategory] = useState('Roulette');
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameUrl, setGameUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const currentProviderObj = providers.find((p) => p.id === activeProvider);
  const availableCategories = currentProviderObj?.categories || [];
  const filteredGames =
    currentProviderObj?.gamesByCategory?.[activeCategory] || [];

  useEffect(() => {
    if (availableCategories.length === 0) return;
    if (!availableCategories.includes(activeCategory)) {
      setActiveCategory(availableCategories[0]);
    }
  }, [activeProvider]);

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
            className={`h-[34px] px-4 py-2 text-center text-[12px] leading-none font-bold whitespace-nowrap uppercase transition-colors min-[1200px]:text-[16px] min-[1200px]:font-normal min-[1200px]:normal-case ${
              activeProvider === prov.id
                ? 'bg-primary text-white'
                : 'hover:bg-white/5'
            }`}
            onClick={() => setActiveProvider(prov.id)}
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
          <Casino casinos={filteredGames} onLaunchGame={handleLaunchGame} />
        </div>
      </div>
    </div>
  );
}

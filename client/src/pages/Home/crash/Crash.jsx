import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../../../redux/api';
import GgrGameFrame from '../../../components/casino/GgrGameFrame';
import spribeGames from '../../../components/api_json/spribe.json';
import smartsoftGames from '../../../components/api_json/smartsoft.json';
import jiliOldGames from '../../../components/api_json/jili.json';
import inoutGames from '../../../components/api_json/inout.json';
import ppGames from '../../../components/api_json/pp.json';

const FALLBACK_ICON =
  'https://sitethemedata.com/casino_icons/other/bcslot/creedroomz/500000674.jpg';

const flattenGames = (data) => {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => (Array.isArray(item) ? item : [item]));
};

const CRASH_TITLES = [
  'aviator',
  'jetx',
  'jetx3',
  'helicopterx',
  'crash duel x',
  'go rush',
  'crash bonus',
  'limbo',
  'crash',
  'spaceman',
  'high flyer',
  'aviafly',
  'big bass crash',
];

const isCrashGame = (game) => {
  const type = String(game.game_type || '').toLowerCase();
  const name = String(game.game_name || '').toLowerCase().trim();
  if (type.includes('crash')) return true;
  return CRASH_TITLES.some(
    (title) => name === title || name.replace(/\s+/g, '') === title.replace(/\s+/g, '')
  );
};

const sourceLists = [
  { provider: 'Spribe', games: flattenGames(spribeGames) },
  { provider: 'smartsoft', games: flattenGames(smartsoftGames) },
  { provider: 'jili', games: flattenGames(jiliOldGames) },
  { provider: 'inout', games: flattenGames(inoutGames) },
  { provider: 'pp', games: flattenGames(ppGames) },
];

const crashGames = (() => {
  const seen = new Set();
  const list = [];

  sourceLists.forEach(({ provider, games }) => {
    games.forEach((game) => {
      if (!isCrashGame(game)) return;
      const key = String(game.game_uid || `${provider}-${game.game_name}`);
      if (seen.has(key)) return;
      seen.add(key);
      list.push({
        ...game,
        provider: game.provider || provider,
      });
    });
  });

  return list;
})();

function Crash() {
  const { userInfo } = useSelector((state) => state.auth);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameUrl, setGameUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const games = useMemo(() => crashGames, []);

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
        provider: game.provider,
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
        title={selectedGame?.game_name || 'Crash Game'}
        gameUrl={gameUrl}
        onExit={() => {
          setGameUrl('');
          setSelectedGame(null);
        }}
      />
    );
  }

  return (
    <div className='grid w-full grid-cols-3 p-1 gap-[2px] md:grid-cols-4 xl:grid-cols-7'>
      {games.map((game, index) => (
        <div
          key={game.game_uid || `${game.game_name}-${index}`}
          className='flex w-full cursor-pointer items-center justify-center bg-black'
          onClick={() => handleLaunchGame(game)}
        >
          <img
            src={game.icon}
            alt={game.game_name}
            className='h-[95px] w-full object-cover'
            loading='lazy'
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied === '1') return;
              img.dataset.fallbackApplied = '1';
              img.src = FALLBACK_ICON;
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default Crash;

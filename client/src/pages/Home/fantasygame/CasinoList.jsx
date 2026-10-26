import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Casino from './Casino';
import api from '../../../redux/api';
import GgrGameFrame from '../../../components/casino/GgrGameFrame';
import smartsoftGames from '../../../components/api_json/smartsoft.json';
import spribeGames from '../../../components/api_json/spribe.json';

const providers = [
  { id: 'smart', name: 'smart', gamesList: smartsoftGames },
  { id: 'spribe', name: 'spribe', gamesList: spribeGames },
];

export default function CasinoList() {
  const { userInfo } = useSelector((state) => state.auth);
  const [activeProvider, setActiveProvider] = useState('smart');
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameUrl, setGameUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredGames = useMemo(() => {
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
        title={selectedGame?.game_name || 'Fantasy Game'}
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
      <div className='scrollbar-hide mr-[5px] flex w-full flex-row overflow-x-auto bg-secondary  min-[1200px]:w-1/6 min-[1200px]:flex-col min-[1200px]:overflow-x-visible min-[1200px]:overflow-y-auto'>
        {providers.map((prov) => (
          <button
            key={prov.id}
            type='button'
            className={`h-[34px] px-4 py-2 text-center text-[12px] leading-none font-bold whitespace-nowrap lowercase transition-colors min-[1200px]:text-[16px] min-[1200px]:font-normal ${
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

      <div className='mt-1.5 w-full min-[1200px]:w-5/6'>
        {filteredGames.length > 0 ? (
          <Casino
            key={activeProvider}
            providerId={activeProvider}
            casinos={filteredGames}
            onLaunchGame={handleLaunchGame}
          />
        ) : (
          <div className='flex min-h-[200px] items-center justify-center text-sm text-slate-500'>
            No games found.
          </div>
        )}
      </div>
    </div>
  );
}

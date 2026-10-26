import React, { memo, useState, useEffect } from 'react';
import { getVideoStreamUrl } from '../utils/gameUtils';
import { VIDEO_LOAD_TIMEOUT } from '../constants';
import CardsDisplay from './CardsDisplay';
import RulesPopup from './RulesPopup';
import { motion } from 'framer-motion';
import BallBlack from '../../../assets/ball-blank.png';

/**
 * Casino TV — same stream URL path as dashboard (env getVideoStreamUrl).
 * Do not prefer Diamond /api/casino-stream; a bad stream_url blocks the working TV.
 */
const VideoStream = memo(function VideoStream({
  gameid,
  bettingData,
  showWinner,
  winnerLabel,
}) {
  const [videoload, setVideoload] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [localTimer, setLocalTimer] = useState(0);

  const streamUrl = getVideoStreamUrl(gameid);

  // Smooth local countdown timer
  useEffect(() => {
    const apiTimer = bettingData?.lt ?? 0;
    setLocalTimer(apiTimer);

    if (apiTimer <= 0) return;

    const interval = setInterval(() => {
      setLocalTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [bettingData?.lt]);

  // Reset load state when game / stream URL changes
  useEffect(() => {
    setVideoload(true);
    setFailed(false);
    setShowRules(false);
  }, [gameid, streamUrl]);

  // Video load timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (videoload) {
        setFailed(true);
      }
    }, VIDEO_LOAD_TIMEOUT);

    return () => clearTimeout(timeout);
  }, [videoload, gameid, streamUrl]);

  const isRoulette =
    gameid === 'roulette12' ||
    gameid === 'roulette13' ||
    gameid === 'roulette11' ||
    gameid === 'ourroullete';

  return (
    <>
      <div className='relative aspect-video bg-black sm:aspect-auto'>
        <div className='ml-auto items-center justify-center sm:w-[calc(100%-220px)]'>
          {gameid !== 'ballbyball' && (videoload || failed) && (
            <img
              src='/loader.gif'
              alt='Loading'
              className='m-auto h-32 w-32 md:h-40 md:w-40 lg:h-auto lg:w-auto'
            />
          )}

          <div className='aspect-video h-full w-full'>
            {streamUrl ? (
              <iframe
                src={streamUrl}
                title={`Casino TV ${gameid || ''}`}
                frameBorder='0'
                allowFullScreen
                className='h-full w-full'
                style={{
                  visibility: videoload || failed ? 'hidden' : 'visible',
                  opacity: videoload || failed ? 0 : 1,
                  transition: 'all 0.5s ease-in-out',
                }}
                onLoad={() => setVideoload(false)}
                onError={() => console.warn('Iframe load error')}
              />
            ) : (
              !failed && (
                <div className='flex h-full w-full items-center justify-center'>
                  <img
                    src='/loader.gif'
                    alt='Loading stream...'
                    className='h-16 w-16'
                  />
                </div>
              )
            )}
          </div>

          {!isRoulette && (
            <div className='absolute top-0 left-0 flex items-start rounded-md'>
              <div className='bg-black/50 px-3 pt-1'>
                <CardsDisplay bettingData={bettingData} />
              </div>
            </div>
          )}

          {isRoulette && (
            <div
              id='roulette-chip-panel-slot'
              className='absolute bottom-0 left-0 z-20 hidden sm:block'
            />
          )}

          {showRules && (
            <RulesPopup gameid={gameid} onClose={() => setShowRules(false)} />
          )}

          <div className='absolute top-2 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-black text-[20px] font-bold text-white'>
            {localTimer}
          </div>

          {showWinner &&
            winnerLabel &&
            (gameid === 'ballbyball' ? (
              <>
                <motion.img
                  src={BallBlack}
                  alt='ball'
                  className='absolute object-contain'
                  initial={{ scale: 0.3 }}
                  animate={{ scale: 1.2 }}
                  transition={{
                    duration: 0.2,
                    ease: 'easeOut',
                  }}
                />
                <span className='absolute z-10 text-[30px] font-bold text-white'>
                  {winnerLabel}
                </span>
              </>
            ) : (
              <div className='absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-tl-[15px] rounded-br-[15px] bg-gradient-to-t from-[#ff5100] to-[#ff8100] px-2 py-1 text-black'>
                {winnerLabel} Win
              </div>
            ))}
        </div>
      </div>
    </>
  );
});

export default VideoStream;

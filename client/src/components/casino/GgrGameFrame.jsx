import React from 'react';

function GgrGameFrame({ title = 'Casino Game', gameUrl, onExit }) {
  return (
    <div className='slot-iframe'>
      <div className='slot-header bg-secondary text-white'>
        <span className='text-sm font-bold tracking-wide uppercase sm:text-base'>
          {title}
        </span>
        <button type='button' className='slot-exit-btn' onClick={onExit}>
          EXIT
        </button>
      </div>
      <iframe
        src={gameUrl}
        title={title}
        className='slot-frame'
        allow='fullscreen; autoplay'
        allowFullScreen
      />
    </div>
  );
}

export default GgrGameFrame;

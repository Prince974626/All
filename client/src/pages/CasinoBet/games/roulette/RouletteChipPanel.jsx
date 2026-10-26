import React, { memo } from 'react';
import { FaUndo, FaRedo, FaTrash } from 'react-icons/fa';
import { ROULETTE_CHIPS } from './rouletteConstants';
import coin from '../../../../assets/coins/icon.svg';

const ChipButton = memo(function ChipButton({
  chip,
  selected,
  onSelect,
  compact,
}) {
  const size = compact
    ? 'h-9 w-9 text-[12px]'
    : 'h-[50px] w-[50px] text-[16px]';
  return (
    <button
      type='button'
      onClick={() => onSelect(chip.value)}
      className={`relative flex ${size} items-center justify-center rounded-full font-bold text-white shadow-md transition-transform ${
        selected ? 'scale-115' : ''
      }`}
      style={{ backgroundColor: chip.color }}
    >
      {chip.label}
      <img src={coin} alt='' className='absolute inset-0 h-full w-full' />
    </button>
  );
});

const RouletteChipPanel = memo(function RouletteChipPanel({
  selectedChip,
  onChipSelect,
  onUndo,
  onRepeat,
  onClear,
  disabled,
  variant = 'default',
}) {
  const isSidebar = variant === 'sidebar';

  return (
    <div
      className={`${isSidebar ? 'flex h-full flex-col p-1' : 'bg-black/80 p-2 sm:p-3'}`}
    >
      <div
        className={`grid justify-items-center ${
          isSidebar ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-2'
        }`}
      >
        {ROULETTE_CHIPS.map((chip) => (
          <ChipButton
            key={chip.value}
            chip={chip}
            selected={selectedChip === chip.value}
            onSelect={onChipSelect}
            compact={isSidebar}
          />
        ))}
      </div>

      {/* <div className='mt-2 grid grid-cols-3 gap-1'>
        <button
          type='button'
          disabled={disabled}
          onClick={onUndo}
          className='flex items-center justify-center gap-1 rounded bg-[#c62828] px-1 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50 sm:text-[11px]'
        >
          <FaUndo className='size-3' />
          Undo Bet
        </button>
        <button
          type='button'
          disabled={disabled}
          onClick={onRepeat}
          className='flex items-center justify-center gap-1 rounded bg-[#00897b] px-1 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50 sm:text-[11px]'
        >
          <FaRedo className='size-3' />
          Repeat
        </button>
        <button
          type='button'
          disabled={disabled}
          onClick={onClear}
          className='flex items-center justify-center gap-1 rounded bg-[#f9a825] px-1 py-1.5 text-[10px] font-semibold text-black disabled:opacity-50 sm:text-[11px]'
        >
          <FaTrash className='size-3' />
          Clear
        </button>
      </div> */}
    </div>
  );
});

export default RouletteChipPanel;

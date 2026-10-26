import React, { memo, useCallback, useState } from 'react';
import { FaLock } from 'react-icons/fa';
import PlacedChip from './PlacedChip';
import {
  COLUMN_BETS,
  DOZEN_BETS,
  MOBILE_COLUMN_BETS,
  MOBILE_ROWS,
  OUTSIDE_BETS,
  ROULETTE_ROWS,
  getNumberColor,
  getNumberHighlightClass,
  getNumberHoverClass,
} from './rouletteConstants';
import {
  findBetByNat,
  findBetByNumbers,
  getCornerNumbers,
  getHorizontalSplitNumbers,
  getMobileCornerNumbers,
  getMobileHorizontalSplitNumbers,
  getMobileStreetNumbers,
  getMobileVerticalSplitNumbers,
  getStreetNumbers,
  getActiveNumbers,
  getNumbersForNat,
  getVerticalSplitNumbers,
  isItemSuspended,
  isMultiBetZoneDisabled,
  isNumberSuspended,
  parseRouletteResultNumber,
  resolveMultiNumberBet,
} from './rouletteBetUtils';
import RouletteChipPanel from './RouletteChipPanel';
const SuspendedLock = memo(function SuspendedLock() {
  return (
    <div className='pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-white/70'>
      <FaLock className='text-base text-black sm:text-lg' />
    </div>
  );
});

const ResultNumberLabel = memo(function ResultNumberLabel({ value, isResult }) {
  return (
    <span className={isResult ? 'roulette-result-number' : undefined}>
      {value}
    </span>
  );
});

const BetZoneButton = memo(function BetZoneButton({
  numbers,
  onClick,
  onHighlight,
  chipAmount,
  className,
  ariaLabel,
  suspended,
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={suspended}
      onMouseEnter={() => onHighlight?.(numbers)}
      onMouseLeave={() => onHighlight?.(null)}
      className={`absolute z-50 disabled:pointer-events-none ${className}`}
      aria-label={ariaLabel}
    >
      <PlacedChip amount={chipAmount} className='top-1/2 left-1/2' />
    </button>
  );
});

const CreamCell = memo(function CreamCell({
  label,
  textClass = 'text-[#ff0000]',
  className = '',
  onClick,
  chipAmount,
  odds,
  suspended,
  highlightNat,
  onHighlightNat,
  gameId,
  vertical = false,
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={suspended}
      onMouseEnter={() => onHighlightNat?.(highlightNat)}
      onMouseLeave={() => onHighlightNat?.(null)}
      className={`relative justify-center border border-white bg-[#fff9c4] font-bold ${vertical ? 'w-[30px] flex-1 px-0 text-[9px]' : 'min-h-[50px] text-xs sm:flex sm:min-h-[70px] sm:items-center sm:text-[20px]'} ${textClass} ${className}`}
    >
      <div className={`${vertical ? 'flex w-[30px] justify-center' : ''} `}>
        <span
          className={
            vertical
              ? 'inline-block -rotate-90 leading-none whitespace-nowrap'
              : undefined
          }
        >
          {label}
        </span>
        {gameId === 'ourroullete' && odds != null && odds > 0 && (
          <span
            className={`block text-[10px] leading-none text-[#b2121f] sm:absolute sm:bottom-2 sm:text-[14px] ${vertical ? 'inline-block -rotate-90 whitespace-nowrap' : undefined}`}
          >
            {odds}
          </span>
        )}
      </div>
      <PlacedChip amount={chipAmount} className='top-1/2 left-1/2' />
      {suspended && <SuspendedLock />}
    </button>
  );
});

const NumberCell = memo(function NumberCell({
  num,
  onStraight,
  onCornerTR,
  onSplitRight,
  onSplitBottom,
  onStreet,
  chipStraight,
  chipCorner,
  chipSplitRight,
  chipSplitBottom,
  chipStreet,
  cornerNums,
  splitRightNums,
  splitBottomNums,
  streetNums,
  showCorner,
  showSplitRight,
  showSplitBottom,
  showStreet,
  isNumberSuspended: isNumSuspended,
  isMultiBetZoneDisabled: isZoneDisabled,
  getActiveNumbers: getActive,
  resultNumber,
  highlighted,
  onHighlightNumbers,
  layout = 'desktop',
}) {
  const straightSuspended = isNumSuspended(num);
  const showSuspendedLock = straightSuspended && resultNumber !== num;
  const isResult = resultNumber === num;
  const isMobile = layout === 'mobile';
  const zoneSize = isMobile ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5';

  return (
    <div
      className={`relative border border-white ${
        highlighted
          ? getNumberHighlightClass(num)
          : `${getNumberColor(num)} ${straightSuspended ? '' : getNumberHoverClass(num)}`
      }`}
    >
      <button
        type='button'
        onClick={onStraight}
        disabled={straightSuspended}
        className={`relative flex w-full items-center justify-center font-bold ${isMobile ? 'min-h-[40px] text-xs' : 'min-h-[34px] text-sm sm:min-h-[80px] sm:text-[24px]'} ${isResult ? '' : 'text-white'}`}
      >
        <ResultNumberLabel value={num} isResult={isResult} />
        <PlacedChip amount={chipStraight} className='top-1/2 left-1/2' />
        {showSuspendedLock && <SuspendedLock />}
      </button>

      {showStreet && (
        <BetZoneButton
          numbers={getActive(streetNums)}
          onClick={onStreet}
          onHighlight={onHighlightNumbers}
          chipAmount={chipStreet}
          className={
            isMobile
              ? `top-1/2 -left-2 h-3 w-3 -translate-y-1/2`
              : `-top-2.5 left-1/2 h-4 w-4 -translate-x-1/2 sm:h-5 sm:w-5`
          }
          ariaLabel='Street bet'
          suspended={isZoneDisabled(streetNums)}
        />
      )}

      {showCorner && (
        <BetZoneButton
          numbers={getActive(cornerNums)}
          onClick={onCornerTR}
          onHighlight={onHighlightNumbers}
          chipAmount={chipCorner}
          className={
            isMobile
              ? `-top-[9px] -left-[8px] ${zoneSize}`
              : `-top-[11px] -left-[10px] ${zoneSize}`
          }
          ariaLabel='Corner bet'
          suspended={isZoneDisabled(cornerNums)}
        />
      )}

      {showSplitRight && (
        <BetZoneButton
          numbers={getActive(splitRightNums)}
          onClick={onSplitRight}
          onHighlight={onHighlightNumbers}
          chipAmount={chipSplitRight}
          className={
            isMobile
              ? `top-1/2 -left-2 ${zoneSize} -translate-y-1/2`
              : `top-1/2 -left-2.5 ${zoneSize} -translate-y-1/2`
          }
          ariaLabel='Split bet'
          suspended={isZoneDisabled(splitRightNums)}
        />
      )}

      {showSplitBottom && (
        <BetZoneButton
          numbers={getActive(splitBottomNums)}
          onClick={onSplitBottom}
          onHighlight={onHighlightNumbers}
          chipAmount={chipSplitBottom}
          className={
            isMobile
              ? `-top-2 left-1/2 ${zoneSize} -translate-x-1/2`
              : `-bottom-2.5 left-1/2 ${zoneSize} -translate-x-1/2`
          }
          ariaLabel='Split bet'
          suspended={isZoneDisabled(splitBottomNums)}
        />
      )}
    </div>
  );
});

const ZeroCell = memo(function ZeroCell({
  onStraight,
  onSplit01,
  onSplit02,
  onSplit03,
  onTrio012,
  onTrio023,
  onBasket,
  chips,
  isNumberSuspended: isNumSuspended,
  isMultiBetZoneDisabled: isZoneDisabled,
  getActiveNumbers: getActive,
  resultNumber,
  highlighted,
  onHighlightNumbers,
  orientation = 'vertical',
}) {
  const straightSuspended = isNumSuspended(0);
  const showSuspendedLock = straightSuspended && resultNumber !== 0;
  const isResult = resultNumber === 0;
  const isHorizontal = orientation === 'horizontal';
  const zoneSize = isHorizontal ? 'h-3 w-3' : 'h-4 w-4 sm:h-5 sm:w-5';

  return (
    <div
      className={`relative flex border border-white ${
        isHorizontal ? 'ml-[60px] min-h-[28px] flex-row' : 'h-full flex-col'
      } ${
        highlighted
          ? 'bg-[#119933]'
          : `bg-[#17732e] ${straightSuspended ? '' : 'hover:bg-[#119933]'}`
      }`}
    >
      <button
        type='button'
        onClick={onStraight}
        disabled={straightSuspended}
        onMouseEnter={() => onHighlightNumbers?.([0])}
        onMouseLeave={() => onHighlightNumbers?.(null)}
        className={`relative flex flex-1 items-center justify-center font-bold ${isHorizontal ? 'text-sm' : 'text-lg sm:text-[24px]'} ${isResult ? '' : 'text-white'}`}
      >
        <ResultNumberLabel value={0} isResult={isResult} />
        <PlacedChip amount={chips.straight} className='top-1/2 left-1/2' />
        {showSuspendedLock && <SuspendedLock />}
      </button>

      <BetZoneButton
        numbers={getActive([0, 1, 2, 3])}
        onClick={onBasket}
        onHighlight={onHighlightNumbers}
        chipAmount={chips.basket}
        className={
          isHorizontal
            ? `-bottom-[8px] left-0 ${zoneSize} -translate-x-1/2`
            : `-right-[11px] -bottom-[10px] ${zoneSize}`
        }
        ariaLabel='Basket 0-1-2-3'
        suspended={isZoneDisabled([0, 1, 2, 3])}
      />
      <BetZoneButton
        numbers={getActive([0, 2, 3])}
        onClick={onTrio023}
        onHighlight={onHighlightNumbers}
        chipAmount={chips.trio023}
        className={
          isHorizontal
            ? `right-[32%] -bottom-[8px] ${zoneSize}`
            : `top-1/3 -right-[11px] ${zoneSize} -translate-y-1/2`
        }
        ariaLabel='Trio 0-2-3'
        suspended={isZoneDisabled([0, 2, 3])}
      />
      <BetZoneButton
        numbers={getActive([0, 1, 2])}
        onClick={onTrio012}
        onHighlight={onHighlightNumbers}
        chipAmount={chips.trio012}
        className={
          isHorizontal
            ? `-bottom-[8px] left-[32%] ${zoneSize}`
            : `top-2/3 -right-[11px] ${zoneSize} -translate-y-1/2`
        }
        ariaLabel='Trio 0-1-2'
        suspended={isZoneDisabled([0, 1, 2])}
      />
      <BetZoneButton
        numbers={getActive([0, 3])}
        onClick={onSplit03}
        onHighlight={onHighlightNumbers}
        chipAmount={chips.split03}
        className={
          isHorizontal
            ? `right-[15%] -bottom-[8px] ${zoneSize}`
            : `top-[12%] -right-[11px] ${zoneSize}`
        }
        ariaLabel='Split 0-3'
        suspended={isZoneDisabled([0, 3])}
      />
      <BetZoneButton
        numbers={getActive([0, 2])}
        onClick={onSplit02}
        onHighlight={onHighlightNumbers}
        chipAmount={chips.split02}
        className={
          isHorizontal
            ? `-bottom-[8px] left-1/2 ${zoneSize} -translate-x-1/2`
            : `top-1/2 -right-[11px] ${zoneSize} -translate-y-1/2`
        }
        ariaLabel='Split 0-2'
        suspended={isZoneDisabled([0, 2])}
      />
      <BetZoneButton
        numbers={getActive([0, 1])}
        onClick={onSplit01}
        onHighlight={onHighlightNumbers}
        chipAmount={chips.split01}
        className={
          isHorizontal
            ? `-bottom-[8px] left-[15%] ${zoneSize}`
            : `-right-[11px] bottom-[12%] ${zoneSize}`
        }
        ariaLabel='Split 0-1'
        suspended={isZoneDisabled([0, 1])}
      />
    </div>
  );
});

const RouletteTable = memo(function RouletteTable({
  betIndex,
  getDisplayChip,
  onPlaceBet,
  card,
  loading,
  gameid,
  selectedChip,
  onChipSelect,
  onUndo,
  onRepeat,
  onClear,
  chipPanelDisabled,
}) {
  const resultNumber = parseRouletteResultNumber(card);
  const getChip = useCallback(
    (nat) => (nat ? getDisplayChip(nat) : 0),
    [getDisplayChip]
  );

  const isNumSuspended = useCallback(
    (num) => isNumberSuspended(betIndex, num),
    [betIndex]
  );

  const getActive = useCallback(
    (numbers) => getActiveNumbers(betIndex, numbers),
    [betIndex]
  );

  const isZoneDisabled = useCallback(
    (numbers) => isMultiBetZoneDisabled(betIndex, numbers),
    [betIndex]
  );

  const isNatSuspended = useCallback(
    (nat) => isItemSuspended(findBetByNat(betIndex, nat)),
    [betIndex]
  );

  const placeByNumbers = useCallback(
    (numbers) => {
      if (loading || !numbers?.length) return;

      if (numbers.length === 1) {
        if (isNumSuspended(numbers[0])) return;
        const item = findBetByNumbers(betIndex, numbers);
        if (item) onPlaceBet(item);
        return;
      }

      const resolved = resolveMultiNumberBet(betIndex, numbers);
      if (resolved) onPlaceBet(resolved.item);
    },
    [betIndex, isNumSuspended, loading, onPlaceBet]
  );

  const placeByNat = useCallback(
    (nat) => {
      if (loading || isNatSuspended(nat)) return;
      const item = findBetByNat(betIndex, nat);
      if (item) onPlaceBet(item);
    },
    [betIndex, isNatSuspended, loading, onPlaceBet]
  );

  const natFor = (numbers) => {
    if (!numbers?.length) return undefined;
    if (numbers.length === 1) return findBetByNumbers(betIndex, numbers)?.nat;
    return resolveMultiNumberBet(betIndex, numbers)?.item?.nat;
  };

  const getBackOdds = useCallback(
    (nat) => {
      const b = Number(findBetByNat(betIndex, nat)?.b);
      return b > 0 ? b : null;
    },
    [betIndex]
  );

  const [hoveredNumbers, setHoveredNumbers] = useState(null);

  const highlightByNat = useCallback((nat) => {
    setHoveredNumbers(nat ? getNumbersForNat(nat) : null);
  }, []);

  const highlightByNumbers = useCallback((numbers) => {
    setHoveredNumbers(numbers?.length ? new Set(numbers) : null);
  }, []);

  const zeroChips = {
    straight: getChip('0'),
    split01: getChip(natFor([0, 1])),
    split02: getChip(natFor([0, 2])),
    split03: getChip(natFor([0, 3])),
    trio012: getChip(natFor([0, 1, 2])),
    trio023: getChip(natFor([0, 2, 3])),
    basket: getChip(natFor([0, 1, 2, 3])),
  };

  const zeroCellProps = {
    isNumberSuspended: isNumSuspended,
    isMultiBetZoneDisabled: isZoneDisabled,
    getActiveNumbers: getActive,
    resultNumber,
    highlighted: hoveredNumbers?.has(0),
    onHighlightNumbers: highlightByNumbers,
    onStraight: () => placeByNumbers([0]),
    onSplit01: () => placeByNumbers([0, 1]),
    onSplit02: () => placeByNumbers([0, 2]),
    onSplit03: () => placeByNumbers([0, 3]),
    onTrio012: () => placeByNumbers([0, 1, 2]),
    onTrio023: () => placeByNumbers([0, 2, 3]),
    onBasket: () => placeByNumbers([0, 1, 2, 3]),
    chips: zeroChips,
  };

  return (
    <>
      {/* Mobile portrait layout */}
      <div className='flex sm:hidden'>
        <div className='flex flex-1 flex-col'>
          <ZeroCell {...zeroCellProps} orientation='horizontal' />

          <div className='flex min-h-0'>
            <div className='flex w-[60px] shrink-0 flex-col'>
              {DOZEN_BETS.map((dozen, dozenIdx) => (
                <div key={dozen} className='flex min-h-0 flex-1'>
                  <div className='flex w-[30px] flex-col'>
                    <CreamCell
                      label={OUTSIDE_BETS[dozenIdx * 2].label}
                      onClick={() => placeByNat(OUTSIDE_BETS[dozenIdx * 2].api)}
                      chipAmount={getChip(OUTSIDE_BETS[dozenIdx * 2].api)}
                      odds={getBackOdds(OUTSIDE_BETS[dozenIdx * 2].api)}
                      suspended={isNatSuspended(OUTSIDE_BETS[dozenIdx * 2].api)}
                      highlightNat={OUTSIDE_BETS[dozenIdx * 2].api}
                      onHighlightNat={highlightByNat}
                      textClass={OUTSIDE_BETS[dozenIdx * 2].textClass}
                      gameId={gameid}
                      vertical
                    />
                    <CreamCell
                      label={OUTSIDE_BETS[dozenIdx * 2 + 1].label}
                      onClick={() =>
                        placeByNat(OUTSIDE_BETS[dozenIdx * 2 + 1].api)
                      }
                      chipAmount={getChip(OUTSIDE_BETS[dozenIdx * 2 + 1].api)}
                      odds={getBackOdds(OUTSIDE_BETS[dozenIdx * 2 + 1].api)}
                      suspended={isNatSuspended(
                        OUTSIDE_BETS[dozenIdx * 2 + 1].api
                      )}
                      highlightNat={OUTSIDE_BETS[dozenIdx * 2 + 1].api}
                      onHighlightNat={highlightByNat}
                      textClass={OUTSIDE_BETS[dozenIdx * 2 + 1].textClass}
                      gameId={gameid}
                      vertical
                    />
                  </div>
                  <CreamCell
                    label={dozen.replace(' ', '')}
                    onClick={() => placeByNat(dozen)}
                    chipAmount={getChip(dozen)}
                    odds={getBackOdds(dozen)}
                    suspended={isNatSuspended(dozen)}
                    highlightNat={dozen}
                    onHighlightNat={highlightByNat}
                    gameId={gameid}
                    vertical
                    className='flex-2'
                  />
                </div>
              ))}
            </div>

            <div className='flex min-w-0 flex-1 flex-col'>
              {MOBILE_ROWS.map((row, rowIdx) => (
                <div
                  key={`mobile-row-${rowIdx}`}
                  className='grid flex-1 grid-cols-3'
                >
                  {row.map((num, colIdx) => {
                    const cornerNums =
                      rowIdx > 0 && colIdx > 0
                        ? getMobileCornerNumbers(rowIdx, colIdx)
                        : null;
                    const splitRightNums =
                      colIdx > 0
                        ? getMobileHorizontalSplitNumbers(rowIdx, colIdx)
                        : null;
                    const splitBottomNums =
                      rowIdx > 0
                        ? getMobileVerticalSplitNumbers(rowIdx, colIdx)
                        : null;
                    const streetNums = getMobileStreetNumbers(rowIdx);

                    return (
                      <NumberCell
                        key={num}
                        num={num}
                        layout='mobile'
                        onStraight={() => placeByNumbers([num])}
                        onCornerTR={() =>
                          cornerNums && placeByNumbers(cornerNums)
                        }
                        onSplitRight={() =>
                          splitRightNums && placeByNumbers(splitRightNums)
                        }
                        onSplitBottom={() =>
                          splitBottomNums && placeByNumbers(splitBottomNums)
                        }
                        onStreet={() =>
                          streetNums && placeByNumbers(streetNums)
                        }
                        chipStraight={getChip(String(num))}
                        chipCorner={getChip(natFor(cornerNums))}
                        chipSplitRight={getChip(natFor(splitRightNums))}
                        chipSplitBottom={getChip(natFor(splitBottomNums))}
                        chipStreet={getChip(natFor(streetNums))}
                        cornerNums={cornerNums}
                        splitRightNums={splitRightNums}
                        splitBottomNums={splitBottomNums}
                        streetNums={streetNums}
                        showCorner={rowIdx > 0 && colIdx > 0}
                        showSplitRight={colIdx > 0}
                        showSplitBottom={rowIdx > 0}
                        showStreet={colIdx === 0}
                        isNumberSuspended={isNumSuspended}
                        isMultiBetZoneDisabled={isZoneDisabled}
                        getActiveNumbers={getActive}
                        resultNumber={resultNumber}
                        highlighted={hoveredNumbers?.has(num)}
                        onHighlightNumbers={highlightByNumbers}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className='ml-[60px] grid grid-cols-3 gap-0'>
            {MOBILE_COLUMN_BETS.map((columnBet) => (
              <CreamCell
                key={columnBet}
                label='2to1'
                onClick={() => placeByNat(columnBet)}
                chipAmount={getChip(columnBet)}
                odds={getBackOdds(columnBet)}
                suspended={isNatSuspended(columnBet)}
                highlightNat={columnBet}
                onHighlightNat={highlightByNat}
                gameId={gameid}
                className='min-h-[28px]'
              />
            ))}
          </div>
        </div>
        <div className='w-[44px] shrink-0 self-stretch'>
          <RouletteChipPanel
            variant='sidebar'
            selectedChip={selectedChip}
            onChipSelect={onChipSelect}
            onUndo={onUndo}
            onRepeat={onRepeat}
            onClear={onClear}
            disabled={chipPanelDisabled}
          />
        </div>
      </div>

      {/* Desktop layout */}
      <div
        className='hidden gap-0 sm:grid'
        style={{
          gridTemplateColumns: 'minmax(60px, 52px) 1fr minmax(60px, 52px)',
          gridTemplateRows: 'repeat(3, auto)',
        }}
      >
        <div className='row-span-3'>
          <ZeroCell {...zeroCellProps} />
        </div>

        {ROULETTE_ROWS.map((row, rowIdx) => (
          <React.Fragment key={`grid-row-${rowIdx}`}>
            <div className='col-start-2 grid grid-cols-12'>
              {row.map((num, colIdx) => {
                const cornerNums =
                  rowIdx > 0 && colIdx > 0
                    ? getCornerNumbers(rowIdx, colIdx)
                    : null;
                const splitRightNums =
                  colIdx > 0 ? getHorizontalSplitNumbers(rowIdx, colIdx) : null;
                const splitBottomNums =
                  rowIdx < 2 ? getVerticalSplitNumbers(rowIdx, colIdx) : null;
                const streetNums =
                  rowIdx === 0 ? getStreetNumbers(colIdx) : null;

                return (
                  <NumberCell
                    key={num}
                    num={num}
                    onStraight={() => placeByNumbers([num])}
                    onCornerTR={() => cornerNums && placeByNumbers(cornerNums)}
                    onSplitRight={() =>
                      splitRightNums && placeByNumbers(splitRightNums)
                    }
                    onSplitBottom={() =>
                      splitBottomNums && placeByNumbers(splitBottomNums)
                    }
                    onStreet={() => streetNums && placeByNumbers(streetNums)}
                    chipStraight={getChip(String(num))}
                    chipCorner={getChip(natFor(cornerNums))}
                    chipSplitRight={getChip(natFor(splitRightNums))}
                    chipSplitBottom={getChip(natFor(splitBottomNums))}
                    chipStreet={getChip(natFor(streetNums))}
                    cornerNums={cornerNums}
                    splitRightNums={splitRightNums}
                    splitBottomNums={splitBottomNums}
                    streetNums={streetNums}
                    showCorner={rowIdx > 0 && colIdx > 0}
                    showSplitRight={colIdx > 0}
                    showSplitBottom={rowIdx < 2}
                    showStreet={rowIdx === 0}
                    isNumberSuspended={isNumSuspended}
                    isMultiBetZoneDisabled={isZoneDisabled}
                    getActiveNumbers={getActive}
                    resultNumber={resultNumber}
                    highlighted={hoveredNumbers?.has(num)}
                    onHighlightNumbers={highlightByNumbers}
                  />
                );
              })}
            </div>
            <CreamCell
              label='2to1'
              onClick={() => placeByNat(COLUMN_BETS[rowIdx])}
              chipAmount={getChip(COLUMN_BETS[rowIdx])}
              odds={getBackOdds(COLUMN_BETS[rowIdx])}
              suspended={isNatSuspended(COLUMN_BETS[rowIdx])}
              highlightNat={COLUMN_BETS[rowIdx]}
              onHighlightNat={highlightByNat}
              gameId={gameid}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Dozens — desktop only */}
      <div className='mx-[90px] hidden grid-cols-3 gap-0 sm:grid'>
        {DOZEN_BETS.map((dozen) => (
          <CreamCell
            key={dozen}
            label={dozen.replace(' ', '')}
            onClick={() => placeByNat(dozen)}
            chipAmount={getChip(dozen)}
            odds={getBackOdds(dozen)}
            suspended={isNatSuspended(dozen)}
            highlightNat={dozen}
            onHighlightNat={highlightByNat}
            gameId={gameid}
          />
        ))}
      </div>

      {/* Outside bets — desktop only */}
      <div className='mx-[90px] hidden grid-cols-6 gap-0 sm:grid'>
        {OUTSIDE_BETS.map((bet) => (
          <CreamCell
            key={bet.api}
            label={bet.label}
            onClick={() => placeByNat(bet.api)}
            chipAmount={getChip(bet.api)}
            odds={getBackOdds(bet.api)}
            suspended={isNatSuspended(bet.api)}
            highlightNat={bet.api}
            onHighlightNat={highlightByNat}
            textClass={bet.textClass}
            gameId={gameid}
          />
        ))}
      </div>
    </>
  );
});

export default RouletteTable;

import React, { memo } from 'react';
import { FaLock } from 'react-icons/fa';
import A from '../../../assets/cards/A.jpeg';
import K from '../../../assets/cards/K.jpeg';
import Q from '../../../assets/cards/Q.jpeg';
import J from '../../../assets/cards/J.jpeg';
import ten from '../../../assets/cards/10.jpeg';
import nine from '../../../assets/cards/9.jpeg';
import eight from '../../../assets/cards/8.jpeg';
import seven from '../../../assets/cards/7.jpeg';
import six from '../../../assets/cards/6.jpeg';
import five from '../../../assets/cards/5.jpeg';
import four from '../../../assets/cards/4.jpeg';
import three from '../../../assets/cards/3.jpeg';
import two from '../../../assets/cards/2.jpeg';

const cardImageMap = {
  1: A,
  A: A,
  2: two,
  3: three,
  4: four,
  5: five,
  6: six,
  7: seven,
  8: eight,
  9: nine,
  10: ten,
  J: J,
  Q: Q,
  K: K,
};

const normalize = (str) => str?.toLowerCase()?.trim() || '';

// "Dragon Card 1" -> "A", "Tiger Card 10" -> "10", "Dragon Card J" -> "J"
const cardNatToLabel = (nat) => {
  const m = String(nat || '').match(/card\s+(.+)$/i);
  let v = m ? m[1].trim() : '';
  if (v === '1') v = 'A';
  return v;
};

const CARD_RANK_ORDER = {
  A: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 8,
  10: 9,
  J: 10,
  Q: 11,
  K: 12,
};

/** Resolve payload marketName from option nat */
const resolveMarketName = (item, gameid) => {
  const nat = normalize(item?.nat);
  if (['dragon', 'tie', 'tiger', 'pair'].includes(nat)) return gameid || 'dt20';
  if (nat === 'dragon even' || nat === 'dragon odd') return 'dragonEvenOdd';
  if (nat === 'dragon red' || nat === 'dragon black') return 'dragonRedBlack';
  if (/^dragon card\s+/i.test(String(item?.nat || ''))) return 'dragonCard';
  if (nat === 'tiger even' || nat === 'tiger odd') return 'tigerEvenOdd';
  if (nat === 'tiger red' || nat === 'tiger black') return 'tigerRedBlack';
  if (/^tiger card\s+/i.test(String(item?.nat || ''))) return 'tigerCard';
  return item?.nat;
};

/** Show price only for the placed team — after place bet */
const PlacedBetPL = memo(function PlacedBetPL({
  playerName,
  marketName,
  pendingBetAmounts,
  size = 'text-[10px]',
}) {
  if (!Array.isArray(pendingBetAmounts)) return null;

  const market = pendingBetAmounts.find(
    (m) => normalize(m.marketName) === normalize(marketName)
  );
  const detail = market?.details?.find(
    (d) => normalize(d.teamName) === normalize(playerName)
  );
  if (!detail) return null;

  const price = Number(detail.price);
  if (Number.isNaN(price)) return null;
  const isProfit = price >= 0;

  return (
    <span
      className={`${size} leading-none font-bold ${
        isProfit ? 'text-green-700' : 'text-red-600'
      }`}
    >
      {price.toFixed(2)}
    </span>
  );
});

const Lock = memo(function Lock({ className = '' }) {
  return (
    <span
      className={`absolute inset-0 z-20 flex items-center justify-center bg-[#33434d]/85 ${className}`}
    >
      <FaLock className='text-white' />
    </span>
  );
});

// Odds display + gradient blue button used for the top row and side bets
const OddsButton = memo(function OddsButton({
  item,
  label,
  labelClass = 'text-[15px]',
  onSelect,
  selected,
  pl,
  wrapperClass = 'flex-1',
}) {
  if (!item) return null;
  const suspended = item.gstatus === 'SUSPENDED';
  return (
    <div className={`flex flex-col ${wrapperClass}`}>
      <div className='text-center text-[18px] font-bold text-[#1f2d3a]'>
        {item.b}
      </div>
      <button
        type='button'
        disabled={suspended}
        onClick={() => onSelect(item)}
        className={`relative flex min-h-[46px] w-full items-center justify-center px-2 font-bold transition ${
          suspended
            ? 'bg-[#33434d] text-white/25'
            : 'bg-gradient-to-r from-[#876b12] to-[#b04834] text-white hover:brightness-105'
        } ${selected ? 'ring-2 ring-yellow-300 ring-inset' : ''}`}
      >
        <span className={`flex items-center gap-1 leading-none ${labelClass}`}>
          {label}
        </span>
        {suspended && <Lock />}
      </button>
      <div className='flex min-h-[16px] items-center justify-center'>{pl}</div>
    </div>
  );
});

// Single card cell inside the DRAGON/TIGER card panels
const CardCell = memo(function CardCell({ item, onSelect, pl }) {
  if (!item) return null;
  const suspended = item.gstatus === 'SUSPENDED';
  const label = cardNatToLabel(item.nat);
  return (
    <div className='flex flex-col items-center'>
      <button
        type='button'
        disabled={suspended}
        onClick={() => onSelect(item)}
        className='relative flex h-[45px] flex-col items-center justify-center'
      >
        <img
          src={cardImageMap[label]}
          alt={`Card ${label}`}
          className='h-full w-full object-contain'
        />
        {suspended && <Lock className='rounded-[3px]' />}
      </button>
      <div className='flex min-h-[14px] items-center justify-center'>{pl}</div>
    </div>
  );
});

// ============================================================================
// DT20 (Dragon Tiger 20-20) BOARD
// ============================================================================
const Layout5 = memo(function Layout5({
  gameid,
  bettingData,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  pendingBetAmounts,
}) {
  if (!bettingData?.sub) return null;

  const sub = bettingData.sub;
  const byNat = (nat) =>
    sub.find((s) => s.nat?.trim().toLowerCase() === nat.toLowerCase());

  const dragon = byNat('Dragon');
  const tiger = byNat('Tiger');
  const tie = byNat('Tie');
  const pair = byNat('Pair');

  const dragonEven = byNat('Dragon Even');
  const dragonOdd = byNat('Dragon Odd');
  const dragonRed = byNat('Dragon Red');
  const dragonBlack = byNat('Dragon Black');

  const tigerEven = byNat('Tiger Even');
  const tigerOdd = byNat('Tiger Odd');
  const tigerRed = byNat('Tiger Red');
  const tigerBlack = byNat('Tiger Black');

  const sortCards = (items) =>
    items.sort(
      (a, b) =>
        (CARD_RANK_ORDER[cardNatToLabel(a.nat)] ?? 99) -
        (CARD_RANK_ORDER[cardNatToLabel(b.nat)] ?? 99)
    );

  const dragonCards = sortCards(
    sub.filter((s) => /^dragon card\s+/i.test(s.nat || ''))
  );
  const tigerCards = sortCards(
    sub.filter((s) => /^tiger card\s+/i.test(s.nat || ''))
  );

  const isSelected = (item) => !!item && betControl?.sid === item?.sid;
  const isSuspended = (item) => item?.gstatus === 'SUSPENDED';

  const handleSelect = (item) => {
    if (!item || item.b <= 0 || isSuspended(item)) return;
    setBetControl({
      ...item,
      type: 'back',
      odds: item.b,
      marketName: resolveMarketName(item, gameid),
      teamCount: 1,
    });
    setSelectedTeamSubtype?.(item.subtype);
    setValue?.(item.b, item.nat, 'back');
  };

  const renderPL = (item, size = 'text-[10px]') => {
    if (!item) return null;
    return (
      <PlacedBetPL
        playerName={item.nat}
        marketName={resolveMarketName(item, gameid)}
        pendingBetAmounts={pendingBetAmounts}
        size={size}
      />
    );
  };

  const renderCardPanel = (title, cards) => {
    if (!cards.length) return null;
    const topRow = cards.slice(0);
    return (
      <div className='flex-1 rounded-md border border-gray-300 bg-white p-2'>
        <div className='mb-2 text-center text-[20px] leading-none font-bold text-[#1f2d3a]'>
          {title} {cards[0]?.b ?? 0}
        </div>
        <div className='flex flex-wrap justify-center gap-1'>
          {topRow.map((item) => (
            <CardCell
              key={item.sid}
              item={item}
              onSelect={handleSelect}
              pl={renderPL(item, 'text-[9px]')}
            />
          ))}
        </div>
      </div>
    );
  };

  const RED = (
    <span className='text-[20px] text-[#ff0000]'>&#9829; &#9830;</span>
  );
  const BLACK = (
    <span className='text-[20px] text-[#0b1b26]'>&#9824; &#9827;</span>
  );

  const renderSidePanel = (title, even, odd, red, black) => (
    <div className='flex-1'>
      <div className='mb-1 text-center text-[20px] leading-none font-bold text-[#1f2d3a]'>
        {title}
      </div>
      <div className='flex gap-1'>
        <OddsButton
          item={even}
          label='Even'
          onSelect={handleSelect}
          selected={isSelected(even)}
          pl={renderPL(even)}
        />
        <OddsButton
          item={odd}
          label='Odd'
          onSelect={handleSelect}
          selected={isSelected(odd)}
          pl={renderPL(odd)}
        />
        <OddsButton
          item={red}
          label={RED}
          onSelect={handleSelect}
          selected={isSelected(red)}
          pl={renderPL(red)}
        />
        <OddsButton
          item={black}
          label={BLACK}
          onSelect={handleSelect}
          selected={isSelected(black)}
          pl={renderPL(black)}
        />
      </div>
    </div>
  );

  return (
    <div className='bg-white p-2 select-none'>
      {/* Row 1: Dragon | Tie | Tiger  ||  Pair */}
      <div className='flex'>
        <div className='mr-2 w-[calc(29%-3px)]'>
          <OddsButton
            item={dragon}
            label='Dragon'
            wrapperClass='flex-[3]'
            onSelect={handleSelect}
            selected={isSelected(dragon)}
            pl={renderPL(dragon)}
          />
        </div>
        <div className='mr-2 w-[calc(13%-3px)]'>
          <OddsButton
            item={tie}
            label='Tie'
            wrapperClass='flex-[2]'
            onSelect={handleSelect}
            selected={isSelected(tie)}
            pl={renderPL(tie)}
          />
        </div>
        <div className='mr-2 w-[calc(29%-3px)]'>
          <OddsButton
            item={tiger}
            label='Tiger'
            wrapperClass='flex-[3]'
            onSelect={handleSelect}
            selected={isSelected(tiger)}
            pl={renderPL(tiger)}
          />
        </div>
        <div className='w-[calc(29%-3px)] border-l-[5px] border-[#2C3E50] pl-2'>
          <OddsButton
            item={pair}
            label='Pair'
            wrapperClass='flex-1'
            onSelect={handleSelect}
            selected={isSelected(pair)}
            pl={renderPL(pair)}
          />
        </div>
      </div>

      {/* Row 2: Dragon / Tiger side bets */}
      <div className='mt-4 flex gap-3'>
        {renderSidePanel(
          'DRAGON',
          dragonEven,
          dragonOdd,
          dragonRed,
          dragonBlack
        )}
        {renderSidePanel('TIGER', tigerEven, tigerOdd, tigerRed, tigerBlack)}
      </div>

      {/* Row 3: Dragon / Tiger card panels */}
      <div className='mt-4 flex gap-3'>
        {renderCardPanel('DRAGON', dragonCards)}
        {renderCardPanel('TIGER', tigerCards)}
      </div>
    </div>
  );
});

export default Layout5;

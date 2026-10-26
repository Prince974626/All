import React, { memo } from 'react';
import { distributeCards } from './utils';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import jokerCard from '../../../assets/cards/jokerCard.png';
const CARD32_PLAYER_NUMBERS = {
  player8: 8,
  player9: 9,
  player10: 10,
  player11: 11,
};

const getCardRankValue = (card) => {
  if (!card || card === '1') return null;
  const rank = card.replace(/[^0-9AJQK]/gi, '').toUpperCase();
  switch (rank) {
    case 'A':
      return 1;
    case 'J':
      return 11;
    case 'Q':
      return 12;
    case 'K':
      return 13;
    default:
      return Number(rank) || null;
  }
};

const getCard32Score = (playerKey, cards = []) => {
  const playerNum = CARD32_PLAYER_NUMBERS[playerKey] ?? 0;
  return (
    playerNum +
    cards
      .filter((card) => card !== '1')
      .reduce((sum, card) => sum + getCardRankValue(card), 0)
  );
};

const CardsDisplay = memo(function CardsDisplay({ bettingData }) {
  if (!bettingData?.card) return null;

  const cardCount = parseInt(
    bettingData?.sub?.[0]?.nat?.replace('Card ', ''),
    10
  );
  const side = cardCount % 2 !== 0 ? 'Andar' : 'Bahar';

  const cards = bettingData.card?.split(',');
  const gameType = bettingData.gtype;

  if (gameType === 'teenunique' || gameType === 'ballbyball') {
    return null;
  }

  const isABGame =
    gameType === 'ab20' || gameType === 'ab3' || gameType === 'ab4';
  const baharCards = cards.filter(
    (card, index) => index % 2 === 0 && card !== '1'
  );
  const andarCards = cards.filter(
    (card, index) => index % 2 === 1 && card !== '1'
  );

  const distributedCards = distributeCards(cards, bettingData.gtype, gameType);

  if (!distributedCards) return null;

  const isBaccaratGame = gameType === 'baccarat' || gameType === 'baccarat2';
  const isDragonTiger = gameType === 'dt6';
  const isCard32Game = gameType === 'card32' || gameType === 'card32eu';
  const isLuckyCard =
    gameType === 'lucky5' ||
    gameType === 'lucky7' ||
    gameType === 'lucky7eu' ||
    gameType === 'lucky7eu2';
  const is3cardJudgement =
    gameType === '3cardj' ||
    gameType === 'dtl20' ||
    gameType === 'dt20' ||
    gameType === 'dt202';
  const ispoker6 = gameType === 'poker6';
  const isteen8 = gameType === 'teen8';
  const isteen9 = gameType === 'teen9';
  // Build a generic list of player entries from the distributed cards
  const playerEntries = [];
  if (isCard32Game) {
    ['player8', 'player9', 'player10', 'player11'].forEach((key, idx) => {
      if (distributedCards[key]?.length > 0) {
        playerEntries.push({
          key,
          label: bettingData?.sub?.[idx]?.nat || key.toUpperCase(),
          cards: distributedCards[key],
        });
      }
    });
  } else if (isteen9) {
    const labels = { tiger: 'Tiger', lion: 'Lion', dragon: 'Dragon' };
    ['tiger', 'lion', 'dragon'].forEach((key) => {
      if (distributedCards[key]?.length > 0) {
        playerEntries.push({
          key,
          label: labels[key],
          cards: distributedCards[key],
        });
      }
    });
  } else if (isBaccaratGame) {
    ['player', 'banker'].forEach((key, idx) => {
      if (distributedCards[key]?.length > 0) {
        playerEntries.push({
          key,
          label: bettingData?.sub?.[idx]?.nat || key.toUpperCase(),
          cards: distributedCards[key],
        });
      }
    });
  } else if (isDragonTiger) {
    ['dragon', 'tiger'].forEach((key, idx) => {
      if (distributedCards[key]?.length > 0) {
        playerEntries.push({
          key,
          label: bettingData?.sub?.[idx]?.nat || key.toUpperCase(),
          cards: distributedCards[key],
        });
      }
    });
  } else if (isLuckyCard) {
    ['card'].forEach((key) => {
      if (distributedCards[key]?.length > 0) {
        playerEntries.push({
          key,
          label: 'card',
          cards: distributedCards[key],
        });
      }
    });
  } else if (is3cardJudgement) {
    ['card'].forEach((key) => {
      if (distributedCards[key]?.length > 0) {
        playerEntries.push({
          key,
          cards: distributedCards[key],
        });
      }
    });
  } else if (ispoker6) {
    ['card'].forEach((key) => {
      if (distributedCards[key]?.length > 0) {
        playerEntries.push({
          key,
          cards: distributedCards[key],
        });
      }
    });
  } else if (isteen8) {
    ['dealer'].forEach((key) => {
      if (distributedCards[key]?.length > 0) {
        playerEntries.push({
          key,
          label: 'Dealer',
          cards: distributedCards[key],
        });
      }
    });
  } else {
    // Default: playerA/player and playerB/banker
    const playerACards = distributedCards.playerA || distributedCards.player;
    const playerBCards = distributedCards.playerB || distributedCards.banker;
    if (playerACards) {
      playerEntries.push({
        key: 'playerA',
        label: 'player A',
        cards: playerACards,
      });
    }
    if (playerBCards) {
      playerEntries.push({
        key: 'playerB',
        label: 'player B',
        cards: playerBCards,
      });
    }
  }

  const cardSliderSettings = {
    dots: false,
    arrows: true,
    infinite: false,
    slidesToShow: 3,
    slidesToScroll: 3,
  };

  const card32Scores = isCard32Game
    ? Object.fromEntries(
        playerEntries.map((entry) => [
          entry.key,
          getCard32Score(entry.key, entry.cards),
        ])
      )
    : {};
  const card32MaxScore = isCard32Game
    ? Math.max(
        ...Object.values(card32Scores).filter((score) => score !== null),
        -Infinity
      )
    : null;
  const hasCard32Scores =
    isCard32Game && card32MaxScore !== null && card32MaxScore !== -Infinity;

  return (
    <div>
      {(gameType === 'joker120' || gameType === 'joker1') && (
        <div className='mb-1'>
          <h4 className='text-[14px] font-bold text-[#ef910f] md:text-[18px]'>
            JOKER
          </h4>
          <div className='flex gap-1'>
            <img
              src={jokerCard}
              alt={jokerCard}
              className='h-[20px] w-auto shadow-sm sm:h-[35px] md:h-[40px] lg:h-[60px]'
            />
          </div>
        </div>
      )}

      {/* Poison Cards */}
      {distributedCards.poison && distributedCards.poison.length > 0 && (
        <div className='mb-1'>
          <h4 className='text-[14px] font-bold text-[#ef910f] md:text-[18px]'>
            {gameType === 'joker20' ? 'JOKER' : 'POISON'}
          </h4>
          <div className='flex gap-1'>
            {distributedCards.poison.map((card, index) => (
              <img
                key={`poison-${index}`}
                src={`/cards/${card}.jpg`}
                alt={card}
                className='h-[20px] w-auto shadow-sm sm:h-[35px] md:h-[40px] lg:h-[45px]'
              />
            ))}
          </div>
        </div>
      )}

      {/* Board Cards */}
      {distributedCards.board && distributedCards.board.length > 0 && (
        <div className='mb-1'>
          <h4 className='text-[14px] font-bold text-white md:text-[18px]'>
            BOARD
          </h4>
          <div className='flex gap-1'>
            {distributedCards.board.map((card, index) => (
              <img
                key={`board-${index}`}
                src={`/cards/${card}.jpg`}
                alt={card}
                className='h-[20px] w-auto shadow-sm sm:h-[35px] md:h-[40px] lg:h-[45px]'
              />
            ))}
          </div>
        </div>
      )}

      {isABGame && (
        <>
          {gameType !== 'ab20' && cardCount > 1 && (
            <div className='text-[16px] text-white'>
              Next Card Count:{' '}
              <span className='text-[#ffc107]'>
                {cardCount}/{side}
              </span>
            </div>
          )}

          {andarCards.length > 0 && (
            <div className='mb-1'>
              <h4 className='text-[18px] font-bold text-white uppercase'>
                andar
              </h4>
              <div className='relative mx-6 w-[80px] md:w-[130px]'>
                <Slider {...cardSliderSettings}>
                  {andarCards.map((card, index) => (
                    <div key={`andar-${index}`}>
                      <img
                        src={`/cards/${card}.jpg`}
                        alt={card}
                        className='block h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px]'
                      />
                    </div>
                  ))}
                </Slider>
              </div>
            </div>
          )}

          {baharCards.length > 0 && (
            <div className='mb-1'>
              <h4 className='text-[18px] font-bold text-white uppercase'>
                bahar
              </h4>
              <div className='relative mx-6 w-[80px] md:w-[130px]'>
                <Slider {...cardSliderSettings}>
                  {baharCards.map((card, index) => (
                    <div key={`bahar-${index}`}>
                      <img
                        src={`/cards/${card}.jpg`}
                        alt={card}
                        className='block h-[30px] sm:h-[35px] md:h-[40px] lg:h-[50px]'
                      />
                    </div>
                  ))}
                </Slider>
              </div>
            </div>
          )}
        </>
      )}

      {!isABGame &&
        playerEntries.map((entry) => {
          const card32Score = card32Scores[entry.key];
          const isCard32Leader =
            hasCard32Scores &&
            card32Score !== null &&
            card32Score === card32MaxScore;
          const hasVisibleCard = entry.cards.some((card) => card !== '1');
          const showPlayerHeader = isCard32Game ? hasVisibleCard : true;

          return (
            <div key={entry.key} className='mb-1'>
              {showPlayerHeader && (
                <h4
                  className={`text-[14px] font-bold uppercase md:text-[18px] ${
                    isCard32Leader ? 'text-green-700' : 'text-white'
                  }`}
                >
                  {entry.label}
                  {isCard32Game && card32Score !== null && (
                    <span className='text-yellow-300'>: {card32Score}</span>
                  )}
                </h4>
              )}
              {showPlayerHeader && (
                <div className='flex gap-1'>
                  {entry.cards.map((card, index) => {
                    if (isCard32Game && card === '1') return null;
                    const isFirstCard = index === 0;
                    const isLastCard = index === entry.cards.length - 1;
                    const shouldRotateFirst =
                      isBaccaratGame && entry.key === 'player' && isFirstCard;
                    const shouldRotateLast =
                      isBaccaratGame && entry.key === 'banker' && isLastCard;
                    if (shouldRotateFirst && card === '1') return null;
                    if (shouldRotateLast && card === '1') return null;
                    return (
                      <img
                        key={`${entry.key}-${index}`}
                        src={`/cards/${card}.jpg`}
                        alt={card}
                        className={`h-[20px] w-auto shadow-sm sm:h-[35px] md:h-[40px] lg:h-[45px] ${shouldRotateFirst ? 'mr-1 rotate-90' : ''} ${shouldRotateLast ? 'ml-1 rotate-90' : ''}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
});

export default CardsDisplay;

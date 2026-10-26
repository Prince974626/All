import { useEffect, useState } from 'react';
import { FaTrophy } from 'react-icons/fa';
import api from '../../../redux/api';
import { formatBetType, distributeCards, evaluateSideBets } from './utils';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { motion } from 'framer-motion';
import BallBlack from '../../../assets/ball-blank.png';
/* ------------------ Helpers ------------------ */

const isBaccarat = (gameId) => gameId === 'baccarat' || gameId === 'baccarat2';

const GAMES_WITH_TIE = new Set(['baccarat', 'baccarat2', 'dt202']);

const hasTie = (gameId) => GAMES_WITH_TIE.has(gameId);

const TEAM_LABELS = {
  baccarat: { A: 'PLAYER', B: 'BANKER' },
  baccarat2: { A: 'PLAYER', B: 'BANKER' },
  dt202: { A: 'DRAGON', B: 'TIGER' },
  lucky7: { A: 'LOW CARD (A to 6)', B: 'HIGH CARD (8 to K)' },
  lucky7eu: { A: 'LOW CARD (A to 6)', B: 'HIGH CARD (8 to K)' },
  lucky7eu2: { A: 'LOW CARD (A to 6)', B: 'HIGH CARD (8 to K)' },
};

const isCard32 = (gameId) => gameId === 'card32' || gameId === 'card32eu';

const CARD32_ORDER = [
  { key: 'player8', label: 'Player 8', winValue: '1' },
  { key: 'player9', label: 'Player 9', winValue: '2' },
  { key: 'player10', label: 'Player 10', winValue: '3' },
  { key: 'player11', label: 'Player 11', winValue: '4' },
];

const POKER6_ORDER = [
  { key: 'player1', label: 'Player 1', winValue: '11' },
  { key: 'player2', label: 'Player 2', winValue: '12' },
  { key: 'player3', label: 'Player 3', winValue: '13' },
  { key: 'player4', label: 'Player 4', winValue: '14' },
  { key: 'player5', label: 'Player 5', winValue: '15' },
  { key: 'player6', label: 'Player 6', winValue: '16' },
];

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

const isLucky7 = (gameId) =>
  gameId === 'lucky5' ||
  gameId === 'lucky7' ||
  gameId === 'lucky7eu' ||
  gameId === 'lucky7eu2';

const isAndarBahar = (gameId) =>
  gameId === 'ab4' || gameId === 'ab20' || gameId === 'ab3';

const getTeamLabel = (gameId, side) =>
  TEAM_LABELS[gameId]?.[side] ?? `PLAYER ${side}`;

const normalizePlayers = (distributed) => ({
  A: distributed?.playerA ?? distributed?.player ?? distributed?.dragon ?? [],
  B: distributed?.playerB ?? distributed?.banker ?? distributed?.tiger ?? [],
});

const hasNumberNine = (cardString) =>
  cardString?.split(',').some((c) => c.includes('9')) ?? false;

/* ------------------ UI Components ------------------ */

const Trophy = ({ win }) =>
  win ? (
    <div className='winnerBox'>
      <FaTrophy className='text-[20px] text-green-600 shadow' />
    </div>
  ) : (
    <FaTrophy className='rotate-180 text-[20px] text-red-600 shadow' />
  );

const CardRow = ({ title, cards, isWinner, isTie, gameId, rotateIndex }) => (
  <div className='text-center md:pr-2.5'>
    <h3 className='font-bold'>{title}</h3>

    <div className='my-2 flex justify-center gap-2'>
      {cards.map((card, index) => {
        if (isBaccarat(gameId) && card === '1') return null;
        const rotate = isBaccarat(gameId) && index === rotateIndex;
        return (
          <img
            key={`${card}-${index}`}
            src={`/cards/${card}.jpg`}
            alt={card}
            className={`h-18 ${rotate ? 'mx-2 rotate-90' : ''}`}
          />
        );
      })}
    </div>

    {isWinner && (
      <div className='mt-2 inline-block rounded bg-green-600 px-3 py-1 text-lg font-semibold text-white'>
        Winner
      </div>
    )}

    {isTie && (
      <div className='mt-2 inline-block rounded bg-gray-600 px-3 py-1 text-lg font-semibold text-white'>
        Tie
      </div>
    )}
  </div>
);

// lucky7 result
const Lucky7UI = ({ distributed, item, gameId }) => (
  <>
    <div className='my-2 space-y-2'>
      <img
        src={`/cards/${distributed?.card}.jpg`}
        alt='card'
        className='m-auto h-14 w-auto rounded border border-gray-300 object-contain'
      />
    </div>

    <div className='border-t py-2 text-xs'>
      <div className='text-center font-semibold'>WINNER</div>
      <div className='grid grid-cols-2 py-1 text-[12px]'>
        <div className='flex justify-center gap-1'>
          {getTeamLabel(gameId, 'A')}
          <Trophy win={item.win === '1'} />
        </div>
        <div className='flex justify-center gap-1'>
          {getTeamLabel(gameId, 'B')}
          <Trophy win={item.win === '2'} />
        </div>
      </div>
    </div>
  </>
);

// card32 result
const Card32UI = ({ distributed, item }) => {
  return (
    <>
      <div className='my-2 flex w-full justify-evenly space-y-2'>
        {CARD32_ORDER.map(({ key, label, winValue }) => {
          const playerCards = distributed[key] ?? [];
          const win = item.win === winValue;
          const score = getCard32Score(key, playerCards);

          return (
            <div
              key={key}
              className='grid items-center justify-items-center gap-2'
            >
              <div className='min-w-[130px] text-[20px]'>
                {label} -
                {score !== null && (
                  <span className='text-yellow-500'> {score}</span>
                )}
              </div>

              <div className='flex items-center gap-3'>
                {playerCards
                  .filter((card) => card !== '1')
                  .map((card, index) => (
                    <img
                      key={`${card}-${index}`}
                      src={`/cards/${card}.jpg`}
                      alt={card}
                      className='h-14 w-auto rounded object-contain'
                    />
                  ))}
                <Trophy win={win} />
              </div>
            </div>
          );
        })}
      </div>

      <div className='border-t py-2 text-xs'>
        <div className='text-center font-semibold'>WINNER</div>
        <div className='grid grid-cols-2 gap-y-3 py-2 text-[16px]'>
          {CARD32_ORDER.map(({ key, label, winValue }) => (
            <div key={key} className='flex items-center justify-center gap-1'>
              {label} - <Trophy win={item.win === winValue} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const TeenUniqueUI = ({ cards, gameId }) => (
  <div className='my-2 flex flex-wrap items-center justify-center gap-2'>
    {cards.slice(0, 6).map((cardValue, index) => {
      const position = index + 1;
      const isHidden = !cardValue || cardValue === '1';

      return (
        <div key={position} className='flex flex-col items-center'>
          {gameId === 'teenunique' && (
            <span className='mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-[24px] font-bold text-black'>
              {position}
            </span>
          )}
          <img
            src={isHidden ? '/cards/1.jpg' : `/cards/${cardValue}.jpg`}
            alt={isHidden ? 'hidden' : cardValue}
            className='mt-1 h-14 w-auto rounded border border-gray-300 object-contain sm:h-20'
          />
        </div>
      );
    })}
  </div>
);

const CasinoCricket = ({ winnat, gameId }) => {
  const showBall = gameId === 'ballbyball' || gameId === 'lucky15';
  const itemBg = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  const number = Number(winnat);
  return (
    <div className='mb-10 text-center'>
      <div className='relative top-0 left-0 m-0 inline-block w-auto'>
        {showBall && (
          <motion.img
            src={BallBlack}
            alt='ball'
            className='w-[150px] align-middle'
            initial={{ scale: 0.3 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 0.2,
              ease: 'easeOut',
            }}
          />
        )}
        <span
          className={`absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 text-[26px] font-bold text-white uppercase`}
        >
          {showBall ? (
            winnat
          ) : (
            <svg width='90' height='60' viewBox='0 0 90 60'>
              <path
                d='M5 5 Q45 -5 85 5 L75 60 H15 Z'
                fill={`${number === 0 ? 'green' : itemBg.includes(number) ? 'red' : 'black'}`}
              />
              <text
                x='45'
                y='48'
                textAnchor='middle'
                fill='white'
                fontSize='50'
                fontWeight='700'
              >
                {winnat}
              </text>
            </svg>
          )}
        </span>
      </div>
    </div>
  );
};

const NextArrow = ({ onClick }) => (
  <div
    className='absolute top-1/2 -right-6 z-10 -translate-y-1/2 cursor-pointer'
    onClick={onClick}
  >
    <div className='flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 text-[15px]'>
      ❯
    </div>
  </div>
);

const PrevArrow = ({ onClick }) => (
  <div
    className='absolute top-1/2 -left-10 z-10 -translate-y-1/2 cursor-pointer'
    onClick={onClick}
  >
    <div className='flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 text-[15px]'>
      ❮
    </div>
  </div>
);

const cardSliderSettings = {
  dots: false,
  arrows: true,
  infinite: false,
  slidesToShow: 15,
  slidesToScroll: 15,
  draggable: false,
  nextArrow: <NextArrow />,
  prevArrow: <PrevArrow />,
  responsive: [
    {
      breakpoint: 1280, // lg
      settings: {
        slidesToShow: 12,
        slidesToScroll: 12,
      },
    },
    {
      breakpoint: 1024, // md
      settings: {
        slidesToShow: 8,
        slidesToScroll: 8,
      },
    },
    {
      breakpoint: 768, // sm
      settings: {
        slidesToShow: 6,
        slidesToScroll: 6,
      },
    },
    {
      breakpoint: 480, // small mobile
      settings: {
        slidesToShow: 5,
        slidesToScroll: 3,
      },
    },
  ],
};

const AndarBaharUI = ({ cards }) => (
  <div className='andarBahar my-2 mr-[8%] ml-[8%] w-[84%] space-y-4'>
    <Slider {...cardSliderSettings}>
      {cards
        .filter((_, index) => (index + 1) % 2 === 0)
        .map((cardValue, index) => {
          const position = (index + 1) * 2;
          const isHidden = !cardValue || cardValue === '1';
          return (
            <div key={position} className='flex flex-col items-center'>
              <span className='mx-auto flex justify-center text-[14px] text-black'>
                {position}
              </span>
              <img
                src={isHidden ? '/cards/1.jpg' : `/cards/${cardValue}.jpg`}
                alt={isHidden ? 'hidden' : cardValue}
                className='mt-1 h-12 w-auto rounded object-contain'
              />
            </div>
          );
        })}
    </Slider>

    <Slider {...cardSliderSettings}>
      {cards
        .filter((_, index) => (index + 1) % 2 !== 0)
        .map((cardValue, index) => {
          const position = index * 2 + 1;
          const isHidden = !cardValue || cardValue === '1';

          return (
            <div key={position} className='flex flex-col items-center'>
              <span className='mx-auto flex justify-center text-[14px] text-black'>
                {position}
              </span>
              <img
                src={isHidden ? '/cards/1.jpg' : `/cards/${cardValue}.jpg`}
                alt={isHidden ? 'hidden' : cardValue}
                className='mt-1 h-12 w-auto rounded object-contain'
              />
            </div>
          );
        })}
    </Slider>
  </div>
);

const Poker6UI = ({ cards, item }) => (
  <>
    <div className='my-2 flex flex-wrap items-center justify-center gap-2'>
      <div className='flex w-full flex-col items-center'>
        <span className='mx-auto flex items-center justify-center text-[20px] text-black'>
          Board
        </span>
        <div className='flex gap-2'>
          {cards.slice(11, 16).map((cardValue, index) => (
            <img
              key={index}
              src={`/cards/${cardValue}.jpg`}
              className='mt-1 h-12 w-auto rounded object-contain'
            />
          ))}
        </div>
      </div>

      <div className='grid w-full grid-cols-6 justify-items-center'>
        <div className='col-span-1'></div>
        <div className='col-span-2'>
          <span className='mx-auto flex items-center justify-center text-[20px] text-black'>
            1
          </span>
          <div className='flex items-center gap-2'>
            {[0, 6].map(
              (i) =>
                cards[i] && (
                  <img
                    key={i}
                    src={`/cards/${cards[i]}.jpg`}
                    className='mt-1 h-12 w-auto rounded object-contain'
                  />
                )
            )}
            {item.win === '11' && <Trophy win={item.win === '11'} />}
          </div>
        </div>
        <div className='col-span-2'>
          <span className='mx-auto flex items-center justify-center text-[20px] text-black'>
            6
          </span>
          <div className='flex items-center gap-2'>
            {[5, 11].map(
              (i) =>
                cards[i] && (
                  <img
                    key={i}
                    src={`/cards/${cards[i]}.jpg`}
                    className='mt-1 h-12 w-auto rounded object-contain'
                  />
                )
            )}
            {item.win === '16' && <Trophy win={item.win === '16'} />}
          </div>
        </div>
      </div>

      <div className='grid w-full grid-cols-7 justify-items-center'>
        <div className='col-span-1'></div>
        <div className='col-span-2'>
          <span className='mx-auto flex items-center justify-center text-[20px] text-black'>
            2
          </span>
          <div className='flex items-center gap-2'>
            {[1, 7].map(
              (i) =>
                cards[i] && (
                  <img
                    key={i}
                    src={`/cards/${cards[i]}.jpg`}
                    className='mt-1 h-12 w-auto rounded object-contain'
                  />
                )
            )}
            {item.win === '12' && <Trophy win={item.win === '12'} />}
          </div>
        </div>
        <div className='col-span-1'></div>
        <div className='col-span-2'>
          <span className='mx-auto flex items-center justify-center text-[20px] text-black'>
            5
          </span>
          <div className='flex items-center gap-2'>
            {[4, 10].map(
              (i) =>
                cards[i] && (
                  <img
                    key={i}
                    src={`/cards/${cards[i]}.jpg`}
                    className='mt-1 h-12 w-auto rounded object-contain'
                  />
                )
            )}
            {item.win === '15' && <Trophy win={item.win === '15'} />}
          </div>
        </div>
      </div>

      <div className='grid w-full grid-cols-6 justify-items-center'>
        <div className='col-span-1'></div>
        <div className='col-span-2'>
          <span className='mx-auto flex items-center justify-center text-[20px] text-black'>
            3
          </span>
          <div className='flex items-center gap-2'>
            {[2, 8].map(
              (i) =>
                cards[i] && (
                  <img
                    key={i}
                    src={`/cards/${cards[i]}.jpg`}
                    className='mt-1 h-12 w-auto rounded object-contain'
                  />
                )
            )}

            {item.win === '13' && <Trophy win={item.win === '13'} />}
          </div>
        </div>
        <div className='col-span-2'>
          <span className='mx-auto flex items-center justify-center text-[20px] text-black'>
            4
          </span>
          <div className='flex items-center gap-2'>
            {[3, 9].map(
              (i) =>
                cards[i] && (
                  <img
                    key={i}
                    src={`/cards/${cards[i]}.jpg`}
                    className='mt-1 h-12 w-auto rounded object-contain'
                  />
                )
            )}
            {item.win === '14' && <Trophy win={item.win === '14'} />}
          </div>
        </div>
      </div>
    </div>

    <div className='border-t py-2 text-xs'>
      <div className='text-center font-semibold'>WINNER</div>
      <div className='grid grid-cols-2 gap-y-3 py-2 text-[16px]'>
        {POKER6_ORDER.map(({ key, label, winValue }) => (
          <div key={key} className='flex items-center justify-center gap-1'>
            {label} - <Trophy win={item.win === winValue} />
          </div>
        ))}
      </div>
    </div>
  </>
);
// default result
const DefaultGameUI = ({ players, item, gameId }) => (
  <>
    <div className='my-2 grid md:grid-cols-2'>
      <CardRow
        title={getTeamLabel(gameId, 'A')}
        cards={players.A}
        gameId={gameId}
        rotateIndex={0}
        isWinner={item.win === '1'}
        isTie={item.win === '3'}
      />

      <CardRow
        title={getTeamLabel(gameId, 'B')}
        cards={players.B}
        gameId={gameId}
        rotateIndex={2}
        isWinner={item.win === '2'}
        isTie={item.win === '3'}
      />
    </div>

    <div className='border-t py-2 text-xs'>
      <div className='text-center font-semibold'>WINNER</div>
      <div className='grid grid-cols-2 py-1 text-[12px]'>
        <div className='flex justify-center gap-1'>
          {getTeamLabel(gameId, 'A')}
          <Trophy win={item.win === '1'} />
        </div>

        {hasTie(gameId) && (
          <div className='flex justify-center gap-1'>
            TIE <Trophy win={item.win === '3'} />
          </div>
        )}

        <div className='flex justify-center gap-1'>
          {getTeamLabel(gameId, 'B')}
          <Trophy win={item.win === '2'} />
        </div>
      </div>
    </div>
  </>
);

/* ------------------ Main Component ------------------ */

const ResultPopup = ({ item, onClose, showSideBets, gameId }) => {
  // Store the detail together with the mid it belongs to so we can derive the
  // loading state during render (avoids synchronous setState in the effect).
  const [fetched, setFetched] = useState({ mid: null, detail: null });

  useEffect(() => {
    if (!item || !gameId) return;
    let isActive = true;
    api
      .get(`/casino-betting-result-detail?gameId=${gameId}&mid=${item.mid}`)
      .then((res) => {
        if (isActive)
          setFetched({ mid: item.mid, detail: res.data?.data ?? null });
      })
      .catch(console.error);
    return () => {
      isActive = false;
    };
  }, [item, gameId]);

  const resultDetail = fetched.mid === item?.mid ? fetched.detail : null;
  const loading = !resultDetail;

  const cards = resultDetail?.card?.split(',') ?? [];
  const distributed = distributeCards(cards, gameId, gameId);
  const sideBets = evaluateSideBets(distributed, gameId);
  const players = normalizePlayers(distributed);

  return (
    <div className='fixed inset-0 z-99 flex items-center justify-center bg-black/60'>
      <div className='w-full max-w-[500px] overflow-hidden bg-white min-[992px]:max-w-[800px] min-[1180px]:max-w-[1100px]'>
        {/* Header */}
        <div className='bg-primary flex justify-between px-2 py-2 text-white'>
          <span className='text-[20px] font-semibold'>
            {resultDetail?.ename ?? 'Loading...'} Result
          </span>
          <span
            onClick={onClose}
            className='cursor-pointer text-[20px] text-white'
          >
            ✖
          </span>
        </div>

        {/* Loading State */}
        {(loading || !resultDetail) && (
          <div className='flex min-h-[200px] items-center justify-center px-2 py-10'>
            <div className='h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600' />
          </div>
        )}

        {/* Content */}
        {!loading && resultDetail && (
          <div className='max-h-[80vh] overflow-y-auto px-2 pb-4'>
            <div className='flex justify-between py-2 text-[16px] font-semibold'>
              <div>
                Round Id:{' '}
                <span className='font-normal'>{resultDetail.rid}</span>
              </div>
              <div>
                Match Time:{' '}
                <span className='font-normal'>{resultDetail.mtime}</span>
              </div>
            </div>
            {/* Board */}
            {distributed?.board?.length > 0 && (
              <div className='flex gap-2 py-3 font-bold'>
                Board:
                {distributed.board.map((c) => (
                  <img
                    key={c}
                    src={`/cards/${c}.jpg`}
                    alt={c}
                    className='h-18'
                  />
                ))}
              </div>
            )}

            {(() => {
              const isLucky = isLucky7(gameId);
              const is32 = isCard32(gameId);
              const isAB = isAndarBahar(gameId);

              if (isLucky) {
                return (
                  <Lucky7UI
                    distributed={distributed}
                    item={item}
                    gameId={gameId}
                  />
                );
              }

              if (is32) {
                return <Card32UI distributed={distributed} item={item} />;
              }

              if (gameId === 'teenunique' || gameId === '3cardj') {
                return <TeenUniqueUI cards={cards} gameId={gameId} />;
              }

              if (
                gameId === 'lucky15' ||
                gameId === 'ballbyball' ||
                gameId === 'roulette11' ||
                gameId === 'roulette12' ||
                gameId === 'roulette13' ||
                gameId === 'ourroullete'
              ) {
                return (
                  <CasinoCricket winnat={resultDetail.winnat} gameId={gameId} />
                );
              }

              if (gameId === 'poker6') {
                return <Poker6UI cards={cards} item={item} />;
              }

              if (isAB) {
                return <AndarBaharUI cards={cards} />;
              }

              return (
                <DefaultGameUI players={players} item={item} gameId={gameId} />
              );
            })()}

            {/* Side Bets */}
            {showSideBets &&
              Object.keys(sideBets).length > 0 &&
              Object.entries(sideBets).map(([type, value]) => (
                <div key={type} className='border-t py-2 text-xs'>
                  <div className='text-center font-semibold'>
                    {formatBetType(type, gameId)}
                  </div>
                  <div className='grid grid-cols-2 py-1 text-[12px]'>
                    <div className='flex justify-center gap-1'>
                      {getTeamLabel(gameId, 'A')} <Trophy win={value.A} />
                    </div>
                    <div className='flex justify-center gap-1'>
                      {getTeamLabel(gameId, 'B')} <Trophy win={value.B} />
                    </div>
                  </div>
                </div>
              ))}

            {/* Lucky 9 */}
            {gameId === 'teensin' && (
              <div className='border-t py-2 text-center text-xs'>
                LUCKY 9 <Trophy win={hasNumberNine(resultDetail.card)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPopup;

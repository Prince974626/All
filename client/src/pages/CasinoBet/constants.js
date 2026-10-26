// Quick bet amount options with chip images
export const QUICK_AMOUNTS = [
  { amt: 100, img: 'chips1.svg' },
  { amt: 200, img: 'chips1.svg' },
  { amt: 500, img: 'chips1.svg' },
  { amt: 5000, img: 'chips5.svg' },
  { amt: 10000, img: 'chips10.svg' },
  { amt: 25000, img: 'chips20.svg' },
  { amt: 100000, img: 'chips1k.svg' },
];

// Games that should only show Player A and Player B
export const TWO_PLAYER_GAMES = [
  // 'teen20',
  // 'teenmuf',
  // 'poison',
  // 'poison20',
  // 'teen20c',
  // 'teen20b',
  // 'joker20',
  // 'teen41',
  // 'teen42',
  // 'teen',
  // 'teen6',
  // 'poker',
  // 'patti2',
  // 'teenjoker',
  // 'teen20v1',
  // 'teen62',
  // 'teen9',
];

// Teen20 side bet sections (static data)
export const TEEN20_SIDE_BETS = [
  {
    title: 'PAIR ( DUBBLE )',
    ratio: '1:4',
    players: [
      {
        sid: 'pair_player_a',
        nat: 'Player A ( Pair )',
        b: 4,
        amount: 500000,
        subtype: 'pair',
      },
      {
        sid: 'pair_player_b',
        nat: 'Player B ( Pair )',
        b: 4,
        amount: 500000,
        subtype: 'pair',
      },
    ],
  },
  {
    title: 'FLUSH ( COLOR )',
    ratio: '1:8',
    players: [
      {
        sid: 'flush_player_a',
        nat: 'Player A ( Flush )',
        b: 8,
        amount: 500000,
        subtype: 'flush',
      },
      {
        sid: 'flush_player_b',
        nat: 'Player B ( flush )',
        b: 8,
        amount: 500000,
        subtype: 'flush',
      },
    ],
  },
  {
    title: 'STRAIGHT ( ROWN )',
    ratio: '1:14',
    players: [
      {
        sid: 'Straight_player_a',
        nat: 'Player A ( Straight )',
        b: 14,
        amount: 500000,
        subtype: 'straight',
      },
      {
        sid: 'Straight_player_b',
        nat: 'Player B ( Straight )',
        b: 14,
        amount: 500000,
        subtype: 'staright',
      },
    ],
  },
  {
    title: 'STRAIGHT FLUSH ( PAKKI ROWN )',
    ratio: ' 1:40',
    players: [
      {
        sid: 'Straight_flush_a',
        nat: 'Player A ( Straight Flush )',
        b: 40,
        amount: 500000,
        subtype: 'straightFlush',
      },
      {
        sid: 'Straight_flush_b',
        nat: 'Player B ( Straight Flush )',
        b: 40,
        amount: 500000,
        subtype: 'straightFlush',
      },
    ],
  },
  {
    title: 'TRIO ( TEEN )',
    ratio: '1:75',
    players: [
      {
        sid: 'player_trio_a',
        nat: 'Player A ( Trio )',
        b: 75,
        amount: 500000,
        subtype: 'trio',
      },
      {
        sid: 'player_trio_b',
        nat: 'Player B ( Trio )',
        b: 75,
        amount: 500000,
        subtype: 'trio',
      },
    ],
  },
  {
    title: 'PUTLA ( 1 PICTURE IN GAME )',
    ratio: '1:0.70',
    players: [
      {
        sid: 'player_putla1_a',
        nat: 'Player A ( Putla 1 )',
        b: 1.7,
        amount: 1000000,
        subtype: 'putla1',
      },
      {
        sid: 'player_putla1_b',
        nat: 'Player B ( Putla 1 )',
        b: 1.7,
        amount: 1000000,
        subtype: 'putla1',
      },
    ],
  },
  {
    title: 'PUTLA ( 2 PICTURE IN GAME )',
    ratio: '1:4',
    players: [
      {
        sid: 'player_putla2_a',
        nat: 'Player A ( Putla 2 )',
        b: 4,
        amount: 1000000,
        subtype: 'putla2',
      },
      {
        sid: 'player_putla2_b',
        nat: 'Player B ( Putla 2 )',
        b: 4,
        amount: 1000000,
        subtype: 'putla2',
      },
    ],
  },
  {
    title: 'PUTLA ( 3 PICTURE IN GAME )',
    ratio: '1:25',
    players: [
      {
        sid: 'player_putla3_a',
        nat: 'Player A ( Putla 3 )',
        b: 25,
        amount: 1000000,
        subtype: 'putla3',
      },
      {
        sid: 'player_putla3_b',
        nat: 'Player B ( Putla 3 )',
        b: 25,
        amount: 1000000,
        subtype: 'putla3',
      },
    ],
  },
  {
    title: 'LOVE MARRIAGE ( Q & K WITH SAME SUIT )',
    ratio: '1:25',
    players: [
      {
        sid: 'player_qk_a',
        nat: 'Player A ( Queen & King )',
        b: 25,
        amount: 500000,
        subtype: 'loveMarriage',
      },
      {
        sid: 'player_qk_b',
        nat: 'Player B ( Queen & King )',
        b: 25,
        amount: 500000,
        subtype: 'loveMarriage',
      },
    ],
  },
  {
    title: 'BF LOVE GF ( J & Q WITH SAME SUIT )',
    ratio: '1:25',
    players: [
      {
        sid: 'player_jq_a',
        nat: 'Player A ( Jack & Queen )',
        b: 25,
        amount: 500000,
        subtype: 'bfAndGf',
      },
      {
        sid: 'player_jq_b',
        nat: 'Player B ( Jack & Queen )',
        b: 25,
        amount: 500000,
        subtype: 'bfAndGf',
      },
    ],
  },
];

// Winner labels for different game types
export const getWinnerMap = (gameid) => {
  if (gameid === 'baccarat' || gameid === 'baccarat2') {
    return {
      1: 'Player',
      2: 'Banker',
      3: 'Tie',
    };
  } else if (gameid === 'dt6' || gameid === 'dt202' || gameid === 'dt20') {
    return {
      1: 'Dragon',
      2: 'Tiger',
      3: 'Tie',
    };
  } else if (gameid === 'card32' || gameid === 'card32eu') {
    return {
      1: 'Player 8',
      2: 'Player 9',
      3: 'Player 10',
      4: 'Player 11',
    };
  } else if (gameid === 'ballbyball') {
    return {
      1: '0 Runs',
      2: '1 Runs',
      3: '2 Runs',
      4: '3 Runs',
      5: '4 Runs',
      6: '6 run',
      7: 'Boundary',
      8: 'Wicket',
      9: 'LBW',
      13: 'No Ball',
      14: 'Extra Run',
      16: 'Leg Bye',
    };
  } else if (
    gameid === 'lucky7' ||
    gameid === 'lucky7eu' ||
    gameid === 'lucky7eu2' ||
    gameid === 'lucky5'
  ) {
    return {
      1: 'Low Card',
      2: 'High Card',
      3: 'Tie',
    };
  }
  return {
    1: 'Player A',
    2: 'Player B',
  };
};

// Result display labels
export const getResultLabel = (gameid, win) => {
  const isBaccarat = gameid === 'baccarat' || gameid === 'baccarat2';
  const isDt6 =
    gameid === 'dt6' ||
    gameid === 'dt202' ||
    gameid === 'dt20' ||
    gameid === 'dtl20';
  const isDtl20 = gameid === 'teen9';
  const isCard32 = gameid === 'card32' || gameid === 'card32eu';
  const isLuck7 =
    gameid === 'lucky5' ||
    gameid === 'lucky7' ||
    gameid === 'lucky7eu' ||
    gameid === 'lucky7eu2';
  const isBallByBall = gameid === 'ballbyball' || gameid === 'teen8';
  const isLucky15 = gameid === 'lucky15';
  const isPoker6 = gameid === 'poker6';
  const isTeenUnique =
    gameid === 'teenunique' ||
    gameid === 'ab4' ||
    gameid === 'ab3' ||
    gameid === 'ab20' ||
    gameid === '3cardj';
  const isRoulette12 =
    gameid === 'roulette11' ||
    gameid === 'roulette12' ||
    gameid === 'roulette13' ||
    gameid === 'ourroullete';
  if (isBaccarat) {
    switch (win) {
      case '1':
        return 'P';
      case '2':
        return 'B';
      case '3':
        return 'T';
      default:
        return 'T';
    }
  } else if (isDt6) {
    switch (win) {
      case '1':
        return 'D';
      case '41':
        return 'L';
      case '21':
        return 'T';
      default:
        return 'T';
    }
  } else if (isDtl20) {
    switch (win) {
      case '1':
        return 'T';
      case '2':
        return 'L';
      default:
        return 'D';
    }
  } else if (isTeenUnique) {
    switch (win) {
      default:
        return 'R';
    }
  } else if (isCard32) {
    switch (win) {
      case '1':
        return '8';
      case '2':
        return '9';
      case '3':
        return '10';
      default:
        return '11';
    }
  } else if (isPoker6) {
    switch (win) {
      case '11':
        return '1';
      case '12':
        return '2';
      case '13':
        return '3';
      case '14':
        return '4';
      case '15':
        return '5';
      case '16':
        return '6';
      default:
        return 'T';
    }
  } else if (isLuck7) {
    switch (win) {
      case '1':
        return 'L';
      case '2':
        return 'H';
      default:
        return 'T';
    }
  } else if (isBallByBall) {
    switch (win) {
      default:
        return 'R';
    }
  } else if (isLucky15) {
    switch (win) {
      case '1':
        return '0';
      case '2':
        return '1';
      case '3':
        return '2';
      case '4':
        return '4';
      case '5':
        return '6';
      case '6':
        return 'W';
    }
  } else if (isRoulette12) {
    return win;
  } else {
    switch (win) {
      case '1':
        return 'A';
      case '2':
        return 'B';
      default:
        return 'T';
    }
  }
};

// Result background colors
export const getResultBgColor = (gameid, win) => {
  const isBaccarat = gameid === 'baccarat' || gameid === 'baccarat2';
  const isDt6 = gameid === 'dt6';
  const isDtl20 =
    gameid === 'dtl20' ||
    gameid === 'dt20' ||
    gameid === 'dt202' ||
    gameid === 'teen9';
  const isCard32 = gameid === 'card32' || gameid === 'card32eu';
  const isLuck7 =
    gameid === 'lucky5' ||
    gameid === 'lucky7' ||
    gameid === 'lucky7eu' ||
    gameid === 'lucky7eu2';
  const isBallByBall = gameid === 'ballbyball';
  const isLucky15 = gameid === 'lucky15';
  const isPoker6 = gameid === 'poker6';
  const isTeenUnique =
    gameid === 'teenunique' ||
    gameid === 'ab4' ||
    gameid === 'ab3' ||
    gameid === 'ab20' ||
    gameid === 'teen8' ||
    gameid === '3cardj';
  const isRoulette12 =
    gameid === 'roulette11' ||
    gameid === 'roulette12' ||
    gameid === 'roulette13' ||
    gameid === 'ourroullete';
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  if (isBaccarat) {
    switch (win) {
      case '1':
        return 'bg-[#086cb8] text-white';
      case '2':
        return 'bg-[#ae2130] text-white';
      case '3':
        return 'bg-[#355e3b] text-white';
      default:
        return 'bg-gray-400';
    }
  } else if (isDt6) {
    switch (win) {
      case '1':
        return 'bg-[#355e3b] text-[red]';
      case '2':
        return 'bg-[#355e3b] text-[yellow]';
      default:
        return 'bg-gray-400';
    }
  } else if (isDtl20) {
    switch (win) {
      case '41':
        return 'bg-[#355e3b] text-[#33c6ff]';
      case '21':
        return 'bg-[#355e3b] text-[#ffff33]';
      case '1':
        return 'bg-[#355e3b] text-[red]';
      case '2':
        return 'bg-[#355e3b] text-[yellow]';
      case '3':
        return 'bg-[#355e3b] text-[#33c6ff]';
      default:
        return 'bg-[#355e3b] text-[#ff4500]';
    }
  } else if (isTeenUnique) {
    switch (win) {
      default:
        return 'bg-green-800 text-yellow-300';
    }
  } else if (isCard32) {
    switch (win) {
      default:
        return 'bg-[green] text-[yellow]';
    }
  } else if (isPoker6) {
    switch (win) {
      case '0':
        return 'bg-green-800 text-white';
      default:
        return 'bg-green-800 text-yellow-300';
    }
  } else if (isLucky15) {
    switch (win) {
      default:
        return 'bg-green-800 text-white';
    }
  } else if (isLuck7) {
    switch (win) {
      case '1':
        return 'bg-[#355e3b] text-[red]';
      case '2':
        return 'bg-[#355e3b] text-[yellow]';
      default:
        return 'bg-[#355e3b] text-[white]';
    }
  } else if (isRoulette12) {
    const number = Number(win);
    if (number === 0) {
      return 'bg-green-800 text-white';
    }
    if (redNumbers.includes(number)) {
      return 'bg-[#b2121f] text-white';
    }
    return 'bg-black text-white';
  } else if (isBallByBall) {
    switch (win) {
      default:
        return 'bg-green-800 text-white';
    }
  } else {
    switch (win) {
      case '1':
        return 'bg-[#355e3b] text-[#ff4500]';
      case '2':
        return 'bg-[#355e3b] text-[#ffff33]';
      default:
        return 'bg-[#355e3b] text-[#33c6ff]';
    }
  }
};

// Video stream timeout (ms)
export const VIDEO_LOAD_TIMEOUT = 20000;

// Winner popup display duration (ms)
export const WINNER_POPUP_DURATION = 5000;

// Default bet odds
export const DEFAULT_BET_ODDS = 1.29;

// Default max bet amount
export const DEFAULT_MAX_AMOUNT = 100000;

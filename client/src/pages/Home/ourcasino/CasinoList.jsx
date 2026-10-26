import React, { useState, useEffect } from 'react';
import Casino from './Casino';
import { useParams } from 'react-router-dom';
const casinosold = [
  {
    id: 1,
    slug: 'worli3',
    name: 'Matka',
    category: 'Others',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/worli3.gif',
  },
  {
    id: 2,
    slug: 'teen62',
    name: 'V VIP Teenpatti 1-day',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen62.gif',
  },
  {
    id: 3,
    slug: 'dolidana',
    name: 'Dolidana',
    category: 'Others',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dolidana.gif',
  },
  {
    id: 4,
    slug: 'mogambo',
    name: 'Mogambo',
    category: 'Others',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/mogambo.gif',
  },
  {
    id: 5,
    slug: 'teen20v1',
    name: '20-20 Teenpatti VIP1',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20v1.jpg',
  },
  {
    id: 6,
    slug: 'lucky5',
    name: 'Lucky 6',
    category: 'Others',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky5.jpg',
  },
  {
    id: 7,
    slug: 'roulette12',
    name: 'Beach Roulette',
    category: 'Roulette',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/roulette12.jpg',
  },
  {
    id: 8,
    slug: 'roulette13',
    name: 'Roulette',
    category: 'Roulette',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/roulette13.jpg',
  },
  {
    id: 9,
    slug: 'roulette11',
    name: 'Golden Roulette',
    category: 'Roulette',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/roulette11.jpg',
  },
  {
    id: 10,
    slug: 'poison',
    name: 'Teenpatti Poison One Day',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poison.jpg',
  },
  {
    id: 11,
    slug: 'teenunique',
    name: 'Unique Teenpatti',
    category: 'Teenpatti',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/teenunique.jpg',
  },
  {
    id: 12,
    slug: 'poison20',
    name: 'Teenpatti Poison 20-20',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poison20.jpg',
  },
  {
    id: 13,
    slug: 'joker120',
    name: 'Unlimited Joker 20-20',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/joker120.jpg',
  },
  {
    id: 14,
    slug: 'joker20',
    name: 'Teenpatti Joker 20-20',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/joker20.jpg',
  },
  {
    id: 15,
    slug: 'joker1',
    name: 'Unlimited Joker Oneday',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/joker1.jpg',
  },
  {
    id: 16,
    slug: 'teen20c',
    name: '20-20 Teenpatti C',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20c.jpg',
  },
  {
    id: 17,
    slug: 'btable2',
    name: 'Bollywood Casino 2',
    category: 'Bollywood',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/btable2.jpg',
  },
  {
    id: 18,
    slug: 'ourroullete',
    name: 'Unique Roulette',
    category: 'Roulette',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/ourroullete.jpg',
  },
  {
    id: 19,
    slug: 'superover3',
    name: 'Mini Superover',
    category: 'Others',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/superover3.jpg',
  },
  {
    id: 20,
    slug: 'goal',
    name: 'Goal',
    category: 'Others',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/goal.jpg',
  },
  {
    id: 21,
    slug: 'ab4',
    name: 'ANDAR BAHAR 150 cards',
    category: 'Andar Bahar',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/ab4.jpg',
  },
  {
    id: 22,
    slug: 'lucky15',
    name: 'Lucky 15',
    category: 'Others',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky15.jpg',
  },
  {
    id: 23,
    slug: 'superover2',
    name: 'Super Over2',
    category: 'Others',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/superover2.jpg',
  },
  {
    id: 24,
    slug: 'teen41',
    name: 'Queen Top Open Teenpatti',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen41.jpg',
  },
  {
    id: 25,
    slug: 'teen42',
    name: 'Jack Top Open Teenpatti',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen42.jpg',
  },
  {
    id: 26,
    slug: 'sicbo2',
    name: 'Sic Bo2',
    category: 'Others',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/sicbo2.jpg',
  },
  {
    id: 27,
    slug: 'teen33',
    name: 'Instant Teenpatti 3.0',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen33.jpg',
  },
  {
    id: 28,
    slug: 'sicbo',
    name: 'Sic Bo',
    category: 'Others',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/sicbo.jpg',
  },
  {
    id: 29,
    slug: 'ballbyball',
    name: 'Ball by Ball',
    category: 'Others',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/ballbyball.jpg',
  },
  {
    id: 30,
    slug: 'teen32',
    name: 'Instant Teenpatti 2.0',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen32.jpg',
  },
  {
    id: 31,
    slug: 'teen',
    name: 'Teenpatti 1-day',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen.jpg',
  },
  {
    id: 32,
    slug: 'teen20',
    name: '20-20 Teenpatti',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20.jpg',
  },
  {
    id: 33,
    slug: 'teen9',
    name: 'Teenpatti Test',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen9.jpg',
  },
  {
    id: 34,
    slug: 'teen8',
    name: 'Teenpatti Open',
    category: 'Teenpatti',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen8.jpg',
  },
  {
    id: 35,
    slug: 'poker',
    name: 'Poker 1-Day',
    category: 'Poker',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poker.jpg',
  },
  {
    id: 36,
    slug: 'poker20',
    name: '20-20 Poker',
    category: 'Poker',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poker20.jpg',
  },
  {
    id: 37,
    slug: 'poker6',
    name: 'Poker 6 Players',
    category: 'Poker',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poker6.jpg',
  },
  {
    id: 38,
    slug: 'baccarat',
    name: 'Baccarat',
    category: 'Baccarat',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/baccarat.jpg',
  },
  {
    id: 39,
    slug: 'baccarat2',
    name: 'Baccarat 2',
    category: 'Baccarat',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/baccarat2.jpg',
  },
  {
    id: 40,
    slug: 'dt20',
    name: '20-20 Dragon Tiger',
    category: 'Dragon Tiger',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dt20.jpg',
  },
  {
    id: 41,
    slug: 'dt6',
    name: '1 Day Dragon Tiger',
    category: 'Dragon Tiger',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dt6.jpg',
  },
  {
    id: 42,
    slug: 'dtl20',
    name: '20-20 D T L',
    category: 'Dragon Tiger',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dtl20.jpg',
  },
  {
    id: 43,
    slug: 'dt202',
    name: '20-20 Dragon Tiger 2',
    category: 'Dragon Tiger',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dt202.jpg',
  },
  {
    id: 44,
    slug: 'card32',
    name: '32 Cards A',
    category: '32 Cards',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/card32.jpg',
  },
  {
    id: 45,
    slug: 'card32eu',
    name: '32 Cards B',
    category: '32 Cards',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/card32eu.jpg',
  },
  {
    id: 46,
    slug: 'ab20',
    name: 'Andar Bahar',
    category: 'Andar Bahar',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/ab20.jpg',
  },
  {
    id: 47,
    slug: 'abj',
    name: 'Andar Bahar 2',
    category: 'Andar Bahar',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/abj.jpg',
  },
  {
    id: 48,
    slug: 'lucky7',
    name: 'Lucky 7 - A',
    category: 'Lucky 7',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky7.jpg',
  },
  {
    id: 49,
    slug: 'lucky7eu',
    name: 'Lucky 7 - B',
    category: 'Lucky 7',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky7eu.jpg',
  },
  {
    id: 50,
    slug: '3cardj',
    name: '3 Cards Judgement',
    category: '3 Card Judgement',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/3cardj.jpg',
  },
];

const casinos = [
  {
    id: 1,
    slug: 'goal',
    name: 'Goal 2',
    category: 'Sports',
    position : 1,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/goal2.jpg',
  },
  {
    id: 2,
    slug: 'worli',
    name: 'matka',
    category: 'Worli',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/worli3.gif',
  },
  {
    id: 3,
    slug: 'teen62',
    name: 'V VIP Teenpatti 1-day',
    category: 'Teenpatti',
    position : 1,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen62.gif',
  },
  {
    id: 4,
    slug: 'dolidana',
    name: 'dolidana',
    category: 'Others',
    position : 1,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dolidana.gif',
  },
  {
    id: 5,
    slug: 'mogambo',
    name: 'mogambo',
    category: 'Others',
    position : 2,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/mogambo.gif',
  },
  {
    id: 6,
    slug: 'teen20v1',
    name: '20-20 Teenpatti VIP1',
    category: 'Teenpatti',
    position : 2,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20v1_green.gif',
  },
  {
    id: 7,
    slug: 'lucky5',
    name: 'Lucky 6',
    category: 'Lucky 7',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky5.jpg',
  },
  {
    id: 8,
    slug: 'roulette12',
    name: 'Beach Roulette',
    category: 'Roulette',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/roulette12.jpg',
  },
  {
    id: 9,
    slug: 'roulette13',
    name: 'Roulette',
    category: 'Roulette',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/roulette13.jpg',
  },
  {
    id: 10,
    slug: 'roulette11',
    name: 'Golden Roulette',
    category: 'Roulette',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/roulette11.jpg',
  },
  {
    id: 11,
    slug: 'poison',
    name: 'Teenpatti Poison One Day',
    category: 'Others',
    position : 3,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poison.jpg',
  },
  {
    id: 12,
    slug: 'teenunique',
    name: 'Unique Teenpatti',
    category: 'Teenpatti',
    position : 3,
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/teenunique.jpg',
  },
  {
    id: 13,
    slug: 'poison20',
    name: 'Teenpatti Poison 20-20',
    category: 'Others',
    position : 6,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poison20.jpg',
  },
  {
    id: 14,
    slug: 'joker20',
    name: 'Teenpatti Joker 20-20',
    category: 'Teenpatti',
    position : 4,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/joker20.jpg',
  },
  {
    id: 15,
    slug: 'joker120',
    name: 'Unlimited Joker 20-20',
    category: 'Teenpatti',
    position : 5,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/joker120.jpg',
  },
  {
    id: 16,
    slug: 'joker1',
    name: 'Unlimited Joker Oneday',
    category: 'Teenpatti',
    position : 6,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/joker1.jpg',
  },
  {
    id: 17,
    slug: 'teen20c',
    name: '20-20 Teenpatti C',
    category: 'Teenpatti',
    position : 7,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20c.jpg',
  },
  {
    id: 18,
    slug: 'btable2',
    name: 'Bollywood Casino 2',
    category: 'Bollywood',
    position: 1,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/btable2.jpg',
  },
  {
    id: 19,
    slug: 'ourroullete',
    name: 'Unique Roulette',
    category: 'Roulette',
    image:
      'https://dataobj.ecoassetsservice.com/casino-icons/lc/ourroullete.jpg',
  },
  {
    id: 20,
    slug: 'superover3',
    name: 'mini superover',
    category: 'Sports',
    position : 4,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/superover3.jpg',
  },
  {
    id: 21,
    slug: 'goal',
    name: 'Goal',
    category: 'Sports',
    position : 3,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/goal.jpg',
  },

  {
    id: 22,
    slug: 'ab4',
    name: 'ANDAR BAHAR 150 cards',
    category: 'Andar Bahar',
    position : 1,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/ab4.jpg',
  },
  {
    id: 23,
    slug: 'lucky15',
    name: 'Lucky 15',
    category: 'Lucky 7',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky15.jpg',
  },
  {
    id: 24,
    slug: 'superover2',
    name: 'Super Over2',
    category: 'Sports',
    position : 2,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/superover2.jpg',
  },
  {
    id: 25,
    slug: 'teen41',
    name: 'Queen Top Open Teenpatti',
    category: 'Teenpatti',
    position : 8,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen41.jpg',
  },
  {
    id: 26,
    slug: 'teen42',
    name: 'Jack Top Open Teenpatti',
    category: 'Teenpatti',
    position : 9,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen42.jpg',
  },
  {
    id: 27,
    slug: 'sicbo2',
    name: 'Sic Bo2',
    category: 'Others',
    position : 5,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/sicbo2.jpg',
  },
  {
    id: 28,
    slug: 'teen33',
    name: 'Instant Teenpatti 3.0',
    category: 'Teenpatti',
    position : 10,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen33.jpg',
  },
  {
    id: 29,
    slug: 'sicbo',
    name: 'Sic Bo',
    category: 'Others',
    position : 7,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/sicbo.jpg',
  },
  {
    id: 30,
    slug: 'ballbyball',
    name: 'Ball by Ball',
    category: 'Others',
    position : 4,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/ballbyball.jpg',
  },
  {
    id: 31,
    slug: 'teen32',
    name: 'Instant Teenpatti 2.0',
    category: 'Teenpatti',
    position : 12,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen32.jpg',
  },
  {
    id: 32,
    slug: 'teen',
    name: 'Teenpatti 1-day',
    category: 'Teenpatti',
    position : 16,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen.jpg',
  },
  {
    id: 33,
    slug: 'teen20',
    name: '20-20 Teenpatti',
    category: 'Teenpatti',
    position : 17,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20.jpg',
  },
  {
    id: 34,
    slug: 'teen9',
    name: 'Teenpatti Test',
    category: 'Teenpatti',
    position : 18,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen9.jpg',
  },
  {
    id: 35,
    slug: 'teen8',
    name: 'Teenpatti Open',
    category: 'Teenpatti',
    position : 19,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen8.jpg',
  },
  {
    id: 36,
    slug: 'poker',
    name: 'Poker 1-Day',
    category: 'Poker',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poker.jpg',
  },
  {
    id: 37,
    slug: 'poker20',
    name: '20-20 Poker',
    category: 'Poker',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poker20.jpg',
  },
  {
    id: 38,
    slug: 'poker6',
    name: 'Poker 6 Players',
    category: 'Poker',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/poker6.jpg',
  },
  {
    id: 39,
    slug: 'baccarat',
    name: 'Baccarat',
    category: 'Baccarat',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/baccarat.jpg',
  },
  {
    id: 40,
    slug: 'baccarat2',
    name: 'Baccarat 2',
    category: 'Baccarat',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/baccarat2.jpg',
  },
  {
    id: 41,
    slug: 'dt20',
    name: '20-20 Dragon Tiger',
    category: 'Dragon Tiger',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dt20.jpg',
  },
  {
    id: 42,
    slug: 'dt6',
    name: '1 Day Dragon Tiger',
    category: 'Dragon Tiger',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dt6.jpg',
  },
  {
    id: 43,
    slug: 'dtl20',
    name: '20-20 D T L',
    category: 'Dragon Tiger',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dtl20.jpg',
  },
  {
    id: 44,
    slug: 'dt202',
    name: '20-20 Dragon Tiger 2',
    category: 'Dragon Tiger',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dt202.jpg',
  },
  {
    id: 45,
    slug: 'card32',
    name: '32 Cards A',
    category: '32 Cards',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/card32.jpg',
  },
  {
    id: 46,
    slug: 'card32eu',
    name: '32 Cards B',
    category: '32 Cards',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/card32eu.jpg',
  },
  {
    id: 47,
    slug: 'ab20',
    name: 'Andar Bahar',
    category: 'Andar Bahar',
    position : 3,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/ab20.jpg',
  },
  {
    id: 48,
    slug: 'abj',
    name: 'Andar Bahar 2',
    category: 'Andar Bahar',
    position : 4,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/abj.jpg',
  },
  {
    id: 49,
    slug: 'lucky7',
    name: 'Lucky 7 - A',
    category: 'Lucky 7',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky7.jpg',
  },
  {
    id: 50,
    slug: 'lucky7eu',
    name: 'Lucky 7 - B',
    category: 'Lucky 7',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky7eu.jpg',
  },
  {
    id: 51,
    slug: '3cardj',
    name: '3 Cards Judgement',
    category: '3 Card Judgement',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/3cardj.jpg',
  },
  {
    id: 52,
    slug: 'war',
    name: 'casino war',
    category: 'Casino War',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/war.jpg',
  },
  {
    id: 53,
    slug: 'worli',
    name: 'Worli Matka',
    category: 'Worli',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/worli.jpg',
  },
  {
    id: 54,
    slug: 'worli2',
    name: 'instant worli',
    category: 'Worli',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/worli2.jpg',
  },
  {
    id: 55,
    slug: 'aaa',
    name: 'Amar Akbar Anthony',
    category: 'Bollywood',
    position: 3,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/aaa.jpg',
  },
  {
    id: 56,
    slug: 'btable',
    name: 'Bollywood Casino',
    category: 'Bollywood',
    position: 4,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/btable.jpg',
  },
  {
    id: 57,
    slug: 'lottcard',
    name: 'lottery',
    category: 'Lottery',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lottcard.jpg',
  },
  {
    id: 58,
    slug: 'cricketv3',
    name: '5Five Cricket',
    category: 'Sports',
    position : 6,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/cricketv3.jpg',
  },
  {
    id: 59,
    slug: 'cmatch20',
    name: 'Cricket Match 20-20',
    category: 'Sports',
    position : 7,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/cmatch20.jpg',
  },
  {
    id: 60,
    slug: 'cmeter',
    name: 'Casino Meter',
    category: 'Sports',
    position : 8,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/cmeter.jpg',
  },
  {
    id: 61,
    slug: 'teen6',
    name: 'Teenpatti - 2.0',
    category: 'Teenpatti',
    position : 20,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen6.jpg',
  },
  {
    id: 62,
    slug: 'Queen',
    name: 'Queen',
    category: 'Queen',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/queen.jpg',
  },
  {
    id: 63,
    slug: 'race20',
    name: 'race20',
    category: 'Race',
    position : 2,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/race20.jpg',
  },
  {
    id: 64,
    slug: 'lucky7eu2',
    name: 'Lucky 7 - C',
    category: 'Lucky 7',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky7eu2.jpg',
  },
  {
    id: 65,
    slug: 'superover',
    name: 'Super Over',
    category: 'Sports',
    position : 9,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/superover.jpg',
  },
  {
    id: 66,
    slug: 'trap',
    name: 'The Trap',
    category: 'Others',
    position : 13,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/trap.jpg',
  },
  {
    id: 67,
    slug: 'patti2',
    name: '2 Cards Teenpatti',
    category: 'Teenpatti',
    position : 15,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/patti2.jpg',
  },
  {
    id: 68,
    slug: 'teensin',
    name: '29Card Baccarat',
    category: 'Baccarat',
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teensin.jpg',
  },
  {
    id: 69,
    slug: 'teenmuf',
    name: 'Muflis Teenpatti',
    category: 'Teenpatti',
    position : 14,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teenmuf.jpg',
  },
  {
    id: 70,
    slug: 'race17',
    name: 'Race To 17',
    category: 'Race',
    position : 3,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/race17.jpg',
  },
  {
    id: 71,
    slug: 'teen20b',
    name: '20-20 Teenpatti B',
    category: 'Teenpatti',
    position : 13,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20b.jpg',
  },
  {
    id: 72,
    slug: 'trio',
    name: 'Trio',
    category: 'Others',
    position : 12,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/trio.jpg',
  },
  {
    id: 73,
    slug: 'notenum',
    name: 'Note Number',
    category: 'Others',
    position : 11,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/notenum.jpg',
  },
  {
    id: 74,
    slug: 'teen120',
    name: '1 CARD 20-20',
    category: 'Others',
    position : 10,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen120.jpg',
  },
  {
    id: 75,
    slug: 'teen1',
    name: '1 CARD ONE-DAY',
    category: 'Others',
    position : 9,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen1.jpg',
  },
  {
    id: 76,
    slug: 'ab3',
    name: 'ANDAR BAHAR 50 cards',
    category: 'Andar Bahar',
    position : 2,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/ab3.jpg',
  },
  {
    id: 77,
    slug: 'aaa2',
    name: 'Amar Akbar Anthony 2',
    category: 'Bollywood',
    position: 2,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/aaa2.jpg',
  },
  {
    id: 78,
    slug: 'race2',
    name: 'Race to 2nd',
    category: 'Race',
    position : 1,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/race2.jpg',
  },
  {
    id: 79,
    slug: 'teen3',
    name: 'Instant Teenpatti',
    category: 'Teenpatti',
    position : 11,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/teen3.jpg',
  },
  {
    id: 80,
    slug: 'dum10',
    name: 'Dus ka Dum',
    category: 'Others',
    position : 8,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/dum10.jpg',
  },
  {
    id: 81,
    slug: 'cmeter1',
    name: '1 Card Meter',
    category: 'Sports',
    position : 5,
    image: 'https://dataobj.ecoassetsservice.com/casino-icons/lc/cmeter1.jpg',
  },

];

// const casinos=[
//   {
//     "id": 3,
//     "slug": "teen62",
//     "name": "V VIP Teenpatti 1-day",
//     "category": "Teenpatti",
//     "position": 1,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen62.gif"
//   },
//   {
//     "id": 6,
//     "slug": "teen20v1",
//     "name": "20-20 Teenpatti VIP1",
//     "category": "Teenpatti",
//     "position": 2,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20v1_green.gif"
//   },
//   {
//     "id": 7,
//     "slug": "lucky5",
//     "name": "Lucky 6",
//     "category": "Lucky 7",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky5.jpg"
//   },
//   {
//     "id": 8,
//     "slug": "roulette12",
//     "name": "Beach Roulette",
//     "category": "Roulette",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/roulette12.jpg"
//   },
//   {
//     "id": 9,
//     "slug": "roulette13",
//     "name": "Roulette",
//     "category": "Roulette",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/roulette13.jpg"
//   },
//   {
//     "id": 10,
//     "slug": "roulette11",
//     "name": "Golden Roulette",
//     "category": "Roulette",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/roulette11.jpg"
//   },
//   {
//     "id": 12,
//     "slug": "teenunique",
//     "name": "Unique Teenpatti",
//     "category": "Teenpatti",
//     "position": 3,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teenunique.jpg"
//   },
//   {
//     "id": 14,
//     "slug": "joker20",
//     "name": "Teenpatti Joker 20-20",
//     "category": "Teenpatti",
//     "position": 4,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/joker20.jpg"
//   },
//   {
//     "id": 15,
//     "slug": "joker120",
//     "name": "Unlimited Joker 20-20",
//     "category": "Teenpatti",
//     "position": 5,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/joker120.jpg"
//   },
//   {
//     "id": 16,
//     "slug": "joker1",
//     "name": "Unlimited Joker Oneday",
//     "category": "Teenpatti",
//     "position": 6,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/joker1.jpg"
//   },
//   {
//     "id": 17,
//     "slug": "teen20c",
//     "name": "20-20 Teenpatti C",
//     "category": "Teenpatti",
//     "position": 7,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20c.jpg"
//   },
//   {
//     "id": 19,
//     "slug": "ourroullete",
//     "name": "Unique Roulette",
//     "category": "Roulette",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/ourroullete.jpg"
//   },
//   {
//     "id": 22,
//     "slug": "ab4",
//     "name": "ANDAR BAHAR 150 cards",
//     "category": "Andar Bahar",
//     "position": 1,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/ab4.jpg"
//   },
//   {
//     "id": 23,
//     "slug": "lucky15",
//     "name": "Lucky 15",
//     "category": "Lucky 7",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky15.jpg"
//   },
//   {
//     "id": 25,
//     "slug": "teen41",
//     "name": "Queen Top Open Teenpatti",
//     "category": "Teenpatti",
//     "position": 8,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen41.jpg"
//   },
//   {
//     "id": 26,
//     "slug": "teen42",
//     "name": "Jack Top Open Teenpatti",
//     "category": "Teenpatti",
//     "position": 9,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen42.jpg"
//   },
//   {
//     "id": 28,
//     "slug": "teen33",
//     "name": "Instant Teenpatti 3.0",
//     "category": "Teenpatti",
//     "position": 10,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen33.jpg"
//   },
//   {
//     "id": 31,
//     "slug": "teen32",
//     "name": "Instant Teenpatti 2.0",
//     "category": "Teenpatti",
//     "position": 12,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen32.jpg"
//   },
//   {
//     "id": 32,
//     "slug": "teen",
//     "name": "Teenpatti 1-day",
//     "category": "Teenpatti",
//     "position": 16,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen.jpg"
//   },
//   {
//     "id": 33,
//     "slug": "teen20",
//     "name": "20-20 Teenpatti",
//     "category": "Teenpatti",
//     "position": 17,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20.jpg"
//   },
//   {
//     "id": 34,
//     "slug": "teen9",
//     "name": "Teenpatti Test",
//     "category": "Teenpatti",
//     "position": 18,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen9.jpg"
//   },
//   {
//     "id": 35,
//     "slug": "teen8",
//     "name": "Teenpatti Open",
//     "category": "Teenpatti",
//     "position": 19,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen8.jpg"
//   },
//   {
//     "id": 36,
//     "slug": "poker",
//     "name": "Poker 1-Day",
//     "category": "Poker",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/poker.jpg"
//   },
//   {
//     "id": 37,
//     "slug": "poker20",
//     "name": "20-20 Poker",
//     "category": "Poker",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/poker20.jpg"
//   },
//   {
//     "id": 38,
//     "slug": "poker6",
//     "name": "Poker 6 Players",
//     "category": "Poker",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/poker6.jpg"
//   },
//   {
//     "id": 39,
//     "slug": "baccarat",
//     "name": "Baccarat",
//     "category": "Baccarat",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/baccarat.jpg"
//   },
//   {
//     "id": 40,
//     "slug": "baccarat2",
//     "name": "Baccarat 2",
//     "category": "Baccarat",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/baccarat2.jpg"
//   },
//   {
//     "id": 41,
//     "slug": "dt20",
//     "name": "20-20 Dragon Tiger",
//     "category": "Dragon Tiger",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/dt20.jpg"
//   },
//   // {
//   //   "id": 42,
//   //   "slug": "dt6",
//   //   "name": "1 Day Dragon Tiger",
//   //   "category": "Dragon Tiger",
//   //   "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/dt6.jpg"
//   // },
//   {
//     "id": 43,
//     "slug": "dtl20",
//     "name": "20-20 D T L",
//     "category": "Dragon Tiger",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/dtl20.jpg"
//   },
//   {
//     "id": 44,
//     "slug": "dt202",
//     "name": "20-20 Dragon Tiger 2",
//     "category": "Dragon Tiger",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/dt202.jpg"
//   },
//   {
//     "id": 45,
//     "slug": "card32",
//     "name": "32 Cards A",
//     "category": "32 Cards",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/card32.jpg"
//   },
//   {
//     "id": 46,
//     "slug": "card32eu",
//     "name": "32 Cards B",
//     "category": "32 Cards",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/card32eu.jpg"
//   },
//   // {
//   //   "id": 47,
//   //   "slug": "ab20",
//   //   "name": "Andar Bahar",
//   //   "category": "Andar Bahar",
//   //   "position": 3,
//   //   "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/ab20.jpg"
//   // },
//   // {
//   //   "id": 48,
//   //   "slug": "abj",
//   //   "name": "Andar Bahar 2",
//   //   "category": "Andar Bahar",
//   //   "position": 4,
//   //   "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/abj.jpg"
//   // },
//   {
//     "id": 49,
//     "slug": "lucky7",
//     "name": "Lucky 7 - A",
//     "category": "Lucky 7",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky7.jpg"
//   },
//   {
//     "id": 50,
//     "slug": "lucky7eu",
//     "name": "Lucky 7 - B",
//     "category": "Lucky 7",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky7eu.jpg"
//   },
//   {
//     "id": 51,
//     "slug": "3cardj",
//     "name": "3 Cards Judgement",
//     "category": "3 Card Judgement",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/3cardj.jpg"
//   },
//   // {
//   //   "id": 61,
//   //   "slug": "teen6",
//   //   "name": "Teenpatti - 2.0",
//   //   "category": "Teenpatti",
//   //   "position": 20,
//   //   "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen6.jpg"
//   // },
//   {
//     "id": 64,
//     "slug": "lucky7eu2",
//     "name": "Lucky 7 - C",
//     "category": "Lucky 7",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/lucky7eu2.jpg"
//   },
//   {
//     "id": 67,
//     "slug": "patti2",
//     "name": "2 Cards Teenpatti",
//     "category": "Teenpatti",
//     "position": 15,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/patti2.jpg"
//   },
//   {
//     "id": 68,
//     "slug": "teensin",
//     "name": "29Card Baccarat",
//     "category": "Baccarat",
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teensin.jpg"
//   },
//   {
//     "id": 69,
//     "slug": "teenmuf",
//     "name": "Muflis Teenpatti",
//     "category": "Teenpatti",
//     "position": 14,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teenmuf.jpg"
//   },
//   {
//     "id": 71,
//     "slug": "teen20b",
//     "name": "20-20 Teenpatti B",
//     "category": "Teenpatti",
//     "position": 13,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen20b.jpg"
//   },
//   {
//     "id": 76,
//     "slug": "ab3",
//     "name": "ANDAR BAHAR 50 cards",
//     "category": "Andar Bahar",
//     "position": 2,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/ab3.jpg"
//   },
//   {
//     "id": 79,
//     "slug": "teen3",
//     "name": "Instant Teenpatti",
//     "category": "Teenpatti",
//     "position": 11,
//     "image": "https://dataobj.ecoassetsservice.com/casino-icons/lc/teen3.jpg"
//   }
// ]
const casinoCategories = [
  { id: 1, name: 'All Casino' },
  { id: 2, name: 'Roulette' },
  { id: 3, name: 'Teenpatti' },
  { id: 4, name: 'Poker' },
  { id: 5, name: 'Baccarat' },
  { id: 6, name: 'Dragon Tiger' },
  { id: 7, name: '32 Cards' },
  { id: 8, name: 'Andar Bahar' },
  { id: 9, name: 'Lucky 7' },
  { id: 10, name: '3 Card Judgement' },
  // { id: 11, name: 'Casino War' },
  // { id: 12, name: 'Worli' },
  // { id: 13, name: 'Sports' },
  // { id: 14, name: 'Bollywood' },
  // { id: 15, name: 'Lottery' },
  // { id: 16, name: 'Queen' },
  // { id: 17, name: 'Race' },
  // { id: 18, name: 'Others' },
];
function CasinoList() {
  const { category } = useParams();
  useEffect(() => {
    if (category) {
      setActiveCategory(category);
    }
  }, [category]);
  const [activeCategory, setActiveCategory] = useState(
    category || 'All Casino'
  );

  return (
    <>
      {/* <OurCasino  selectedNav="Our Casino"/> */}
      <div className='flex w-full h-full flex-col md:flex-row md:p-0.5'>
        {/* Categories Bar - Horizontal scrollable on mobile, Vertical sidebar on desktop */}
        <div className='scrollbar-hide bg-primary text-primary md-desktop-bg flex w-full flex-row overflow-x-auto md:w-1/6 md:flex-col md:overflow-x-visible md:overflow-y-auto'>
          {casinoCategories.map((category) => (
            <button
              key={category.id}
              className={`flex-shrink-0 px-2 py-1 text-sm text-[16px] font-[400] whitespace-nowrap md:p-1 ${activeCategory === category.name ? 'bg-primary' : ''}`}
              onClick={() => {
                setActiveCategory(category.name);
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
        {/* Casino Grid */}
        <div className='w-full md:w-5/6'>
          <Casino
            casinos={
              activeCategory === 'All Casino'
                ? casinos
                : casinos.filter((casino) => casino.category === activeCategory)
            }
          />
        </div>
      </div>
    </>
  );
}

export default CasinoList;

import SoccerOdds from './SoccerOdds';

const SoccerOver5 = ({ matcUnder5List, gameid }) => (
  <div className='mt-2.5'>
  <SoccerOdds
    matchOddsList={matcUnder5List}
    gameid={gameid}
    marketName='OVER_UNDER_05'
  />
  </div>
);

export default SoccerOver5;

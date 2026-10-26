import SoccerOdds from './SoccerOdds';

const SoccerOver25 = ({ matcUnder25List, gameid }) => (
    <div className='mt-2.5'>
  <SoccerOdds
    matchOddsList={matcUnder25List}
    gameid={gameid}
    marketName='OVER_UNDER_25'
  /></div>
);

export default SoccerOver25;

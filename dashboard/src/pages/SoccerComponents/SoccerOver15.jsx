import SoccerOdds from './SoccerOdds';

const SoccerOver15 = ({ matcUnder15List, gameid }) => (
    <div className='mt-2.5'>
  <SoccerOdds
    matchOddsList={matcUnder15List}
    gameid={gameid}
    marketName='OVER_UNDER_15'
  /></div>
);

export default SoccerOver15;

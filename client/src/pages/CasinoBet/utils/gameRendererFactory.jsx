import React from 'react';
import LayoutDefault from '../games/LayoutDefault';
import Layout1 from '../games/Layout1';
import Layout2 from '../games/Layout2';
import Layout3 from '../games/Layout3';
import Layout4 from '../games/Layout4';
import Layout5 from '../games/Layout5';
import Layout6 from '../games/Layout6';
import Layout7 from '../games/Layout7';
import Layout8 from '../games/Layout8';
import Layout9 from '../games/Layout9';
import Layout10 from '../games/Layout10';
import Layout11 from '../games/Layout11';
import Layout12 from '../games/Layout12';
import Layout13 from '../games/Layout13';
import Layout14 from '../games/Layout14';
import Layout15 from '../games/Layout15';
import Layout16 from '../games/Layout16';
import Layout17 from '../games/Layout17';
import Layout18 from '../games/Layout18';
/**
 * Factory function to get the appropriate game renderer based on game ID
 */
export const getGameRenderer = (gameid) => {
  switch (gameid) {
    case 'poker':
      return Layout1;
    case 'teensin':
    case 'teenmuf':
    case 'poker20':
      return Layout2;
    case 'baccarat':
    case 'baccarat2':
      return Layout3;
    case 'dtl20':
    case 'teen9':
    case 'lucky7eu':
    case 'lucky5':
    case 'lucky7':
    case 'lucky7eu2':
      return Layout4;
    case 'dt202':
    case 'dt20':
      return Layout5;
    case 'card32eu':
    case 'card32':
      return Layout6;
    case 'ballbyball':
    case 'lucky15':
      return Layout7;
    case '3cardj':
      return Layout8;
    case 'ab20':
    case 'ab3':
    case 'ab4':
      return Layout9;
    case 'teenunique':
      return Layout10;
    case 'roulette11':
    case 'roulette12':
    case 'roulette13':
    case 'ourroullete':
      return Layout11;
    case 'teen20c':
    case 'teen20b':
    case 'teen20':
      return Layout12;
    case 'poker6':
      return Layout13;
    case 'dt6':
    case 'joker20':
      return Layout14;
    case 'teen32':
    case 'teen3':
    case 'teen33':
    case 'patti2':
    case 'teen42':
    case 'teen41':
    case 'joker1':
    case 'joker120':
      return Layout15;
    case 'teen':
    case 'teen62':
      return Layout16;
    case 'teen6':
      return Layout17;
    case 'teen8':
      return Layout18;
    default:
      return LayoutDefault;
  }
};

/**
 * Render the appropriate game UI based on game ID
 */
export const renderGameUI = ({
  gameid,
  displayData,
  bettingData,
  resultData,
  betControl,
  setBetControl,
  setValue,
  setSelectedTeamSubtype,
  betAmount,
  betOdds,
  setBetOdds,
  updateAmount,
  placeBet,
  loading,
  pendingBetAmounts,
  selectedTeamSubtype,
  resetBettingState,
  hasPendingBetForControl,
  pendingBet,
}) => {
  const Renderer = getGameRenderer(gameid);

  return (
    <Renderer
      displayData={displayData}
      bettingData={bettingData}
      resultData={resultData}
      gameid={gameid}
      betControl={betControl}
      setBetControl={setBetControl}
      setValue={setValue}
      setSelectedTeamSubtype={setSelectedTeamSubtype}
      betAmount={betAmount}
      betOdds={betOdds}
      setBetOdds={setBetOdds}
      updateAmount={updateAmount}
      placeBet={placeBet}
      loading={loading}
      pendingBetAmounts={pendingBetAmounts}
      pendingBet={pendingBet}
      selectedTeamSubtype={selectedTeamSubtype}
      resetBettingState={resetBettingState}
      hasPendingBetForControl={hasPendingBetForControl}
    />
  );
};

export default renderGameUI;

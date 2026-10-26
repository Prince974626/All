import React from 'react';
import Layout1 from '../games/Layout1';
import Layout2 from '../games/Layout2';
import Layout3 from '../games/Layout3';
import Layout4 from '../games/Layout4';
import Layout5 from '../games/Layout5';
import LayoutDefault from '../games/LayoutDefault';

/**
 * Factory function to get the appropriate game renderer based on game ID
 */
export const getGameRenderer = (gameid) => {
  switch (gameid) {
    case 'teenmuf':
      return Layout1;
    case 'poker20':
    case 'teensin':
      return Layout2;
    case 'baccarat':
    case 'baccarat2':
      return Layout3;
    case 'dt202':
      return Layout4;
    case 'dt6':
      return Layout5;
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
      selectedTeamSubtype={selectedTeamSubtype}
      resetBettingState={resetBettingState}
      hasPendingBetForControl={hasPendingBetForControl}
    />
  );
};

export default renderGameUI;

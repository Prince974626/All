import { useState, useEffect, useRef } from 'react';
import BetControlPanel from './components/BetControlPanel';
import BetControlPanelMob from './components/BetControlPanelMob';
import { formatToK } from './utils/bettingUtils';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import RulesPopup from './components/RulesPopup';
// Redux actions
import {
  fetchCasinoBatingData,
  clearCasinoResultData,
} from '../../redux/reducer/casinoSlice';

import {
  getPendingBet,
  getPendingBetAmo,
  clearPendingBetAmounts,
} from '../../redux/reducer/betReducer';
import { getUser } from '../../redux/reducer/authReducer';

// Components
import VideoStream from './components/VideoStream';
import RecentResults from './components/RecentResults';
import ResultPopup from './components/CasinoResult1';
import Spinner2 from './components/Spinner2';

// Hooks
import useBetting from './hooks/useBetting';
import useCasinoResults from './hooks/useCasinoResults';
import useCasinoWebSocket from './hooks/useCasinoWebSocket';

// Utils & Constants
import { renderGameUI } from './utils/gameRendererFactory';
import {
  groupBettingData,
  filterPlayersForTwoPlayerGames,
} from './utils/bettingUtils';
import { TWO_PLAYER_GAMES, getWinnerMap } from './constants';

export default function CasinoBet() {
  const dispatch = useDispatch();
  const { gameid } = useParams() || {};

  const [visibleGame, setVisibleGame] = useState(true);
  const [showRules, setShowRules] = useState(false);
  // Local state
  const [bettingData, setBettingData] = useState(null);
  // const [videoPageLoader, setVideoPageLoader] = useState(true);

  // Refs
  const previousMidRef = useRef(null);
  const hasInitializedRef = useRef(false);

  // Redux selectors
  const { battingData } = useSelector((state) => state.casino);
  const { userInfo } = useSelector((state) => state.auth);

  // Custom hooks
  const betting = useBetting({ gameid, bettingData });
  const results = useCasinoResults({ gameid });

  // WebSocket connection
  const { isConnected } = useCasinoWebSocket({
    gameid,
    userId: userInfo?._id,
    bettingDataMid: bettingData?.mid,
    onBettingDataUpdate: setBettingData,
  });

  // Winner map for result display
  const winnerMap = getWinnerMap(gameid);

  // ============== EFFECTS ==============

  // Fetch betting data when game changes
  useEffect(() => {
    if (gameid) {
      // Reset round tracking so the new game is treated as a fresh load.
      previousMidRef.current = null;
      hasInitializedRef.current = false;
      dispatch(clearCasinoResultData());
      dispatch(clearPendingBetAmounts());
      dispatch(fetchCasinoBatingData(gameid));
      dispatch(getPendingBet(gameid));
      // Pending amounts will be fetched with roundId when bettingData loads
    }
  }, [gameid, dispatch]);

  // Sync betting data from Redux
  useEffect(() => {
    setBettingData(battingData?.data);
  }, [battingData]);

  // Reset betting state when game becomes suspended
  useEffect(() => {
    if (!betting.betControl?.sid || !bettingData?.sub) return;
    const selectedSub = bettingData.sub.find(
      (s) => s.sid === betting.betControl.sid
    );
    if (selectedSub?.gstatus === 'SUSPENDED') {
      betting.resetBettingState();
    }
  }, [bettingData?.sub, betting.betControl?.sid, betting.resetBettingState]);

  // Handle round: fetch pending bets with roundId, clear on round change
  useEffect(() => {
    if (!bettingData?.mid || !gameid) return;

    const currentMid = bettingData.mid;
    const previousMid = previousMidRef.current;

    if (hasInitializedRef.current && previousMid !== currentMid) {
      // Round changed - clear Redux and refetch for current round only
      console.log('🔄 Round changed, clearing pending bets');
      betting.resetAllBettingState();
      dispatch(clearPendingBetAmounts());

      setTimeout(() => {
        dispatch(getUser());
        dispatch(getPendingBet(gameid));
        dispatch(getPendingBetAmo({ gameId: gameid, roundId: currentMid }));
      }, 100);
    } else if (!hasInitializedRef.current) {
      // First load - fetch pending bets for current round
      dispatch(getPendingBetAmo({ gameId: gameid, roundId: currentMid }));
    }

    previousMidRef.current = currentMid;
    hasInitializedRef.current = true;
  }, [bettingData?.mid, gameid, dispatch, betting.resetAllBettingState]);

  // Fetch user data when game changes
  useEffect(() => {
    if (gameid) {
      dispatch(getUser());
    }
  }, [gameid, dispatch]);

  // Fallback polling when WebSocket disconnected
  useEffect(() => {
    if (!gameid || isConnected) return;

    const pollInterval = setInterval(() => {
      dispatch(fetchCasinoBatingData(gameid));
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [gameid, dispatch, isConnected]);

  // ============== DATA PROCESSING ==============

  // Group and filter betting data
  const groupedData = groupBettingData(bettingData?.sub, gameid);
  const displayData = filterPlayersForTwoPlayerGames(
    groupedData,
    gameid,
    bettingData?.sub,
    TWO_PLAYER_GAMES
  );

  const selectedSub = betting.betControl?.sid
    ? (bettingData?.sub || bettingData?.child || []).find(
        (item) => item.sid === betting.betControl.sid
      ) || null
    : null;

  const isBetPanelVisible =
    !!betting.betControl &&
    betting.betControl.gstatus !== 'SUSPENDED' &&
    selectedSub?.gstatus !== 'SUSPENDED';

  const minRange = betting.betControl?.min ?? selectedSub?.min ?? 100;
  const maxRange = betting.betControl?.max ?? selectedSub?.max ?? 100000;
  const formatMax =
    maxRange >= 100000
      ? `${maxRange / 100000}L`
      : formatToK(maxRange) || maxRange;
  const rangeLabel = `Range: ${minRange} to ${formatMax}`;

  const pendingBets = Array.isArray(betting.pendingBet)
    ? betting.pendingBet
    : betting.pendingBet
      ? [betting.pendingBet]
      : [];

  const myBets = pendingBets.filter((bet) => {
    const sameGame =
      bet.gameId === gameid ||
      bet.gameid === gameid ||
      bet.eventName === gameid ||
      bet.gname === gameid;
    const sameRound =
      !bettingData?.mid ||
      !bet.roundId ||
      String(bet.roundId) === String(bettingData.mid);
    return bet.status === 0 && sameGame && sameRound;
  });

  const rouletteGame =
    gameid !== 'roulette11' &&
    gameid !== 'roulette12' &&
    gameid !== 'roulette13' &&
    gameid !== 'ourroullete';
  // ============== RENDER ==============

  return (
    <>
      <div className='flex gap-1 md:p-1'>
        <div className='ml-0 w-full min-[1200px]:w-[calc(100%-400px)]'>
          {/* Bet Placement Loader */}
          <div className='flex items-center justify-between bg-secondary px-1 text-white'>
            <div className='flex justify-between p-1'>
              <span className='text-[17px] font-bold uppercase'>
                {bettingData?.gtype}
              </span>
              <button
                className='cursor-pointer pl-2 text-[13px] text-white underline transition-colors hover:text-yellow-100'
                onClick={() => setShowRules(true)}
              >
                Rules
              </button>
            </div>
            <div className='hidden text-[13px] md:block'>
              {bettingData?.mid}
            </div>
          </div>
          <div className='min-[1200px]:hidden'>
            <div className='flex items-center justify-between bg-primary py-2.5 text-[12px] text-white'>
              <div className='flex items-center font-bold'>
                <div
                  className='border-r border-white px-1'
                  onClick={() => setVisibleGame(true)}
                >
                  GAME
                </div>
                <div
                  className='border-r border-white px-1'
                  onClick={() => setVisibleGame(false)}
                >
                  PLACED BET
                </div>
              </div>
              <div className='px-2'>Round ID :{bettingData?.mid}</div>
            </div>

            {!visibleGame && (
              <>
                <div className='flex items-center border-b border-gray-300 px-2 py-1 text-[14px] font-bold'>
                  <div className='w-[70%]'>Matched Bet</div>
                  <div className='w-[15%] text-right'>Odds</div>
                  <div className='w-[15%] text-right'>Stake</div>
                </div>
                {myBets.length === 0 ? (
                  <div className='px-2 py-3 text-center text-[13px] text-gray-500'>
                    No matched bets
                  </div>
                ) : (
                  myBets.map((bet) => (
                    <div
                      key={
                        bet._id || `${bet.teamName}-${bet.xValue}-${bet.price}`
                      }
                      className={`flex items-center border-b border-gray-300 ${bet.otype === 'back' ? 'bg-[#beddf4]' : 'bg-[#f3dce2]'} px-2 py-1.5 text-[14px]`}
                    >
                      <div className='w-[70%] truncate font-bold'>
                        {bet.teamName}
                      </div>
                      <div className='w-[15%] text-right'>
                        {Number(bet.xValue || 0).toFixed(2)}
                      </div>
                      <div className='w-[15%] text-right'>
                        {Number(
                          bet.otype === 'back'
                            ? bet.price
                            : (bet.betAmount ?? bet.price)
                        ).toFixed(0)}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
          {visibleGame && (
            <>
              {betting.loader && (
                <div className='fixed inset-0 z-50 flex items-center justify-center'>
                  <Spinner2 />
                </div>
              )}

              {/* Video Stream with Cards and Timer */}
              <VideoStream
                gameid={gameid}
                bettingData={bettingData}
                showWinner={results.showWinner}
                winnerLabel={winnerMap[results.resultData?.res?.[0]?.win]}
              />
              {/* Game-Specific Betting UI */}
              <div className='mt-[5px]'>
                {(bettingData?.sub?.length || bettingData?.child?.length) &&
                  renderGameUI({
                    gameid,
                    displayData,
                    bettingData,
                    resultData: results.resultData,
                    betControl: betting.betControl,
                    setBetControl: betting.setBetControl,
                    setValue: betting.setValue,
                    setSelectedTeamSubtype: betting.setSelectedTeamSubtype,
                    betAmount: betting.betAmount,
                    betOdds: betting.betOdds,
                    setBetOdds: betting.setBetOdds,
                    updateAmount: betting.updateAmount,
                    placeBet: betting.placeBet,
                    loading: betting.loading,
                    pendingBetAmounts: betting.pendingBetAmounts,
                    selectedTeamSubtype: betting.selectedTeamSubtype,
                    resetBettingState: betting.resetBettingState,
                    hasPendingBetForControl: betting.hasPendingBetForControl,
                    pendingBet: betting.pendingBet,
                  })}
              </div>
            </>
          )}

          {/* Recent Results */}
          <RecentResults
            gameid={gameid}
            currentGameId={results.currentGameId}
            results={results.resultData?.res}
            onItemClick={results.setSelectedItem}
          />

          {/* Result Detail Popup */}
          {results.selectedItem && (
            <ResultPopup
              mid={bettingData?.mid}
              gameId={gameid}
              item={results.selectedItem}
              onClose={() => results.setSelectedItem(null)}
              showSideBets={true}
            />
          )}
        </div>
        <div className='sticky top-0 hidden h-fit min-[1200px]:block'>
          <div className='w-[400px] border border-gray-300 bg-white'>
            {rouletteGame && (
              <>
                {betting.betControl && (
                  <div className='flex items-center justify-between bg-secondary p-1 text-[14px] font-bold text-white'>
                    <span>Place Bet</span>
                    <span className='text-[12px] font-normal'>
                      {rangeLabel}
                    </span>
                  </div>
                )}
                <BetControlPanel
                  betControl={betting.betControl}
                  betOdds={betting.betOdds}
                  setBetOdds={betting.setBetOdds}
                  betAmount={betting.betAmount}
                  updateAmount={betting.updateAmount}
                  loading={betting.loading}
                  onCancel={betting.resetBettingState}
                  onPlaceBet={betting.placeBet}
                  isVisible={isBetPanelVisible}
                />
              </>
            )}

            <div className='bg-secondary p-1 text-[14px] font-bold text-white'>
              My Bet
            </div>

            <div className='flex items-center border-b border-gray-300 px-2 py-1 text-[14px] font-bold'>
              <div className='w-[70%]'>Matched Bet</div>
              <div className='w-[15%] text-right'>Odds</div>
              <div className='w-[15%] text-right'>Stake</div>
            </div>

            {myBets.length === 0 ? (
              <div className='px-2 py-3 text-center text-[13px] text-gray-500'>
                No matched bets
              </div>
            ) : (
              myBets.map((bet) => (
                <div
                  key={bet._id || `${bet.teamName}-${bet.xValue}-${bet.price}`}
                  className={`flex items-center border-b border-gray-300 ${bet.otype === 'back' ? 'bg-[#beddf4]' : 'bg-[#f3dce2]'} px-2 py-1.5 text-[14px]`}
                >
                  <div className='w-[70%] truncate font-bold'>
                    {bet.teamName}
                  </div>
                  <div className='w-[15%] text-right'>
                    {Number(bet.xValue || 0).toFixed(2)}
                  </div>
                  <div className='w-[15%] text-right'>
                    {Number(
                      bet.otype === 'back'
                        ? bet.price
                        : (bet.betAmount ?? bet.price)
                    ).toFixed(0)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile-only bet slip popup */}
      {isBetPanelVisible && rouletteGame && (
        <>
          <div className="fade modal-backdrop show" onClick={betting.resetBettingState} />
          <div className="fade modal show !h-auto">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <div className="modal-title h4">Place Bet</div>
                        <button type="button" className="btn-close" onClick={betting.resetBettingState}></button>
                    </div>
                    <BetControlPanelMob 
                    betControl={betting.betControl}
                    betOdds={betting.betOdds}
                    setBetOdds={betting.setBetOdds}
                    betAmount={betting.betAmount}
                    updateAmount={betting.updateAmount}
                    loading={betting.loading}
                    onCancel={betting.resetBettingState}
                    onPlaceBet={betting.placeBet}
                    isVisible={isBetPanelVisible}
                    rangeLabel={rangeLabel}/>
                </div>
            </div>
          </div> 
        </>
      )}

      {showRules && (
        <RulesPopup gameid={gameid} onClose={() => setShowRules(false)} />
      )}
    </>
  );
}

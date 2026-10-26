import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';

import {
  getPendingBetAmo,
  fetchCasinoBattingData,
  getBetPerents,
  casinoMasterBookReducer,
  casinoMasterBookReducerDownline,
} from '../redux/reducer/marketAnalyzeReducer';

// Components

import VideoStream from './CasinoBet/components/VideoStream';
import RecentResults from './CasinoBet/components/RecentResults';

// Hooks
import useBetting from './CasinoBet/hooks/useBetting';
import useCasinoResults from './CasinoBet/hooks/useCasinoResults';
import useCasinoWebSocket from './CasinoBet/hooks/useCasinoWebSocket';

// Utils & Constants
import { renderGameUI } from './CasinoBet/utils/gameRendererFactory';
import {
  groupBettingData,
  filterPlayersForTwoPlayerGames,
} from './CasinoBet/utils/bettingUtils';
import { TWO_PLAYER_GAMES, getWinnerMap } from './CasinoBet/constants';

import Navbar from '../components/Navbar';
import api from '../redux/api';
import Spinner2 from '../components/Spinner2';

export default function CasinoBet() {
  const dispatch = useDispatch();
  const { gameid } = useParams() || {};
  const [searchParams] = useSearchParams();
  const isFromMarket = searchParams.get('from') === 'market';
  const [viewMoreDetail, setViewMoreDetail] = useState(false);
  const [viewMoreTab, setViewMoreTab] = useState('matched'); // 'matched' or 'deleted'
  const [filterUsername, setFilterUsername] = useState('');
  const [filterAmountFrom, setFilterAmountFrom] = useState('');
  const [filterAmountTo, setFilterAmountTo] = useState('');
  const [filterIp, setFilterIp] = useState('');
  const [filterOtype, setFilterOtype] = useState('all'); // 'all', 'back', 'lay', 'deleted'

  const handleDeleteBet = async (bet) => {
    const password = window.prompt("Enter Master Password to delete bet:");
    if (password === null) return; // user cancelled
    if (!password) {
      alert("Master Password is required");
      return;
    }
    try {
      const res = await api.delete(`/delete-bet/${bet._id}`, {
        data: { masterPassword: password },
        withCredentials: true
      });
      alert(res.data?.message || 'Bet soft deleted successfully');
      dispatch(getPendingBetAmo(gameid));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete bet');
    }
  };

  const handleRestoreBet = async (bet) => {
    const password = window.prompt("Enter Master Password to restore bet:");
    if (password === null) return; // user cancelled
    if (!password) {
      alert("Master Password is required");
      return;
    }
    try {
      const res = await api.put(`/restore-bet/${bet._id}`, {
        masterPassword: password
      }, {
        withCredentials: true
      });
      alert(res.data?.message || 'Bet restored successfully');
      dispatch(getPendingBetAmo(gameid));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to restore bet');
    }
  };
  const [scoreUrl, setScoreUrl] = useState(false);
  const [url, setUrl] = useState('');
  // Local state
  const [bettingData, setBettingData] = useState(null);
  const [videoPageLoader, setVideoPageLoader] = useState(true);

  // Refs
  const previousMidRef = useRef(null);
  const hasInitializedRef = useRef(false);

  const {
    loading,
    battingData,
    betsData,
    betPerantsData,
    casinoMasterData,
    casinoMasterDataDownline,
  } = useSelector((state) => state.market);
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
      dispatch(getPendingBetAmo(gameid));
      const interval = setInterval(() => {
        dispatch(getPendingBetAmo(gameid));
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [gameid, dispatch]);

  // Sync betting data from Redux
  useEffect(() => {
    setBettingData(battingData?.data);
  }, [battingData]);

  // Reset betting state when game becomes suspended
  useEffect(() => {
    const gstatus = bettingData?.sub?.[0]?.gstatus;
    if (gstatus === 'SUSPENDED') {
      betting.resetBettingState();
    }
  }, [bettingData?.sub, betting.resetBettingState]);

  // Handle round changes - clear bets and refresh data when new round starts

  // ============== DATA PROCESSING ==============

  // Group and filter betting data
  const groupedData = groupBettingData(bettingData?.sub, gameid);
  const displayData = filterPlayersForTwoPlayerGames(
    groupedData,
    gameid,
    bettingData?.sub,
    TWO_PLAYER_GAMES
  );

  // add new code

  const casinoData = battingData;
  const activeCasinoOptions = Array.isArray(battingData?.sub?.[0])
    ? battingData.sub[0]
    : (battingData?.sub?.[0]?.options ?? []);

  const [masterpopup, setMasterpopup] = useState(false);
  const [userMasterpopup, setUserMasterpopup] = useState(false);
  const [liveBets, setLiveBets] = useState([]);
  const [userBet, setUserBet] = useState([]);
  const [storedGameType, setStoredGameType] = useState(null);
  const [storedMatchOddsList, setStoredMatchOddsList] = useState([]);
  const [teamHeaders, setTeamHeaders] = useState([]);
  const [casinoMasterDownline, setCasinoMasterDownline] = useState([]);
  const [popup, setPopup] = useState(false);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const casinoGameInfo = {
    gameType: casinoData?.gtype || 'Casino',
    card: casinoData?.card || '',
    mid: casinoData?.mid || '',
    min: activeCasinoOptions[0]?.min || 100,
    max: activeCasinoOptions[0]?.max || 300000,
  };
  // For master book functionality - use casino data structure
  const matchOdd = [
    {
      gameType: casinoGameInfo.gameType,
      mname: casinoGameInfo.gameType,
    },
  ];

  const matchOddsList = [
    {
      section: activeCasinoOptions,
      status: 'ACTIVE',
      min: casinoGameInfo.min,
      max: casinoGameInfo.max,
    },
  ];

  useEffect(() => {
    document.body.style.overflow = masterpopup ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [masterpopup]);

  const hendalUserBetsData = (gameType, code, matchOddsList) => {
    console.log('🔍 hendalUserBetsData called with:', {
      gameType,
      code,
      matchOddsList,
    });
    console.log('🔍 betsData:', betsData);
    console.log(
      '🔍 betsData type:',
      typeof betsData,
      'Array:',
      Array.isArray(betsData)
    );
    const userBet = Array.isArray(betsData)
      ? betsData.filter((item) => {
          // Only check gameType, not code

          const gameTypeMatch = item?.gameType === gameType;
          const gameNameMatch = item?.gameName === gameType;
          const eventNameMatch = item?.eventName === gameType;
          const matches = gameTypeMatch || gameNameMatch || eventNameMatch;
          console.log('🔍 Filtering item:', {
            itemGameType: item?.gameType,
            itemGameName: item?.gameName,
            itemEventName: item?.eventName,
            searchGameType: gameType,
            gameTypeMatch,
            gameNameMatch,
            eventNameMatch,
            matches,
          });
          return matches;
        })
      : [];
    console.log('🔍 Filtered userBet:', userBet);
    console.log('🔍 userBet length:', userBet.length);

    userBet.forEach((bet, index) => {
      console.log(`🔍 Bet ${index}:`, {
        userName: bet.userName,
        userRole: bet.userRole,
        otype: bet.otype,
        playerName: bet.playerName,
        totalBetAmount: bet.totalBetAmount,
        totalPrice: bet.totalPrice,
        price: bet.price,
        betAmount: bet.betAmount,
        teamName: bet.teamName,
        gameName: bet.gameName,
        eventName: bet.eventName,
        marketName: bet.marketName,
      });
    });

    // Extract teams from matchOddsList
    const teams = Array.isArray(matchOddsList[0]?.section)
      ? matchOddsList[0].section
          .map((sec) => sec.nat)
          .filter((team) => team.includes('Player'))
      : [];
    setTeamHeaders(teams); // Set teams to render in table header
    // console.log("userbetas", userBet)
    setUserBet(userBet);
    console.log('🔍 Set userBet state to:', userBet);
  };

  const hemdelMasterBook = async (userId, gameType, matchOddsList) => {
    try {
      // Reset UI
      // setMasterDownline([]);
      setCasinoMasterDownline([]);
      setTeamHeaders([]);

      // Use stored values if not passed (for downline use)
      const finalGameType = gameType || storedGameType;

      // Save for future
      if (gameType && matchOddsList) {
        setStoredGameType(gameType);
        setStoredMatchOddsList(matchOddsList);
      }

      // Dispatch reset action if needed
      dispatch({ type: 'RESET_MASTER_BOOK' });

      // Fetch new data
      await dispatch(
        casinoMasterBookReducer({ userId, gameid, gameType: finalGameType })
      );

      // Update headers - use casino active options
      const teams = activeCasinoOptions.map((option) => option.nat);
      setTeamHeaders(teams);
    } catch (error) {
      console.log(error);
    }
  };

  const hemdelMasterBookDownline = async (userId) => {
    try {
      console.log('🎰 [DOWNLINE] Starting downline fetch for userId:', userId);

      // Reset UI
      // setMasterDownline([]);
      setCasinoMasterDownline([]);
      setTeamHeaders([]);

      const finalGameType = storedGameType;
      console.log(
        '🎰 [DOWNLINE] Using gameType:',
        finalGameType,
        'gameid:',
        gameid
      );

      // Dispatch new downline request
      console.log(
        '🎰 [DOWNLINE] Dispatching casinoMasterBookReducerDownline...'
      );
      await dispatch(
        casinoMasterBookReducerDownline({
          userId,
          gameid,
          gameType: finalGameType,
        })
      );

      // Update headers - use casino active options
      const teams = activeCasinoOptions.map((option) => option.nat);
      console.log('🎰 [DOWNLINE] Setting team headers:', teams);
      setTeamHeaders(teams);
    } catch (error) {
      console.log('❌ [DOWNLINE] Error:', error);
    }
  };

  useEffect(() => {
    console.log('🎰 [CASINO MASTER DATA] Received:', casinoMasterData);
    if (casinoMasterData?.length > 0) {
      console.log(
        '🎰 [CASINO MASTER DATA] Setting master downline with',
        casinoMasterData.length,
        'items'
      );
      setCasinoMasterDownline(casinoMasterData); // ⬅️ For first-level data
    }
  }, [casinoMasterData]);

  useEffect(() => {
    console.log(
      '🎰 [CASINO MASTER DATA DOWNLINE] Received:',
      casinoMasterDataDownline
    );
    if (casinoMasterDataDownline?.length > 0) {
      console.log(
        '🎰 [CASINO MASTER DATA DOWNLINE] Setting master downline with',
        casinoMasterDataDownline.length,
        'items'
      );
      setCasinoMasterDownline(casinoMasterDataDownline); // ⬅️ For downline drill
    }
  }, [casinoMasterDataDownline]);

  // Inside your React functional component (e.g., in a file like MyComponent.jsx)
  const handelpopup = async (id) => {
    setPopup(true);
    await dispatch(getBetPerents(id));
    // console.log("idddd", id);
  };
  const pratnerShip = (role, amount, part) => {
    if (role === 'user') {
      return amount;
    } else {
      return Math.floor(amount * ((100 - part) / 100));
    }
  };
  const processedBets = (betsData || []).filter((item) => {
    const betIsDeleted = item.isDeleted === true;
    if (viewMoreTab === 'matched' && betIsDeleted) {
      return false;
    }
    if (viewMoreTab === 'deleted' && !betIsDeleted) {
      return false;
    }

    if (filterOtype !== 'all') {
      if (filterOtype === 'back' && item.otype?.toLowerCase() !== 'back') return false;
      if (filterOtype === 'lay' && item.otype?.toLowerCase() !== 'lay') return false;
    }

    if (filterUsername && !item.userName?.toLowerCase().includes(filterUsername.toLowerCase())) {
      return false;
    }

    if (filterIp && !item.ip?.toLowerCase().includes(filterIp.toLowerCase())) {
      return false;
    }

    const amt = parseFloat(item.price || item.betAmount) || 0;
    if (filterAmountFrom && amt < parseFloat(filterAmountFrom)) {
      return false;
    }

    if (filterAmountTo && amt > parseFloat(filterAmountTo)) {
      return false;
    }

    if (searchTerm) {
      const matchSearch =
        item.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.gameType?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
    }

    return true;
  });

  const totalSoda = processedBets.length;
  const totalAmount = processedBets.reduce((sum, item) => sum + (parseFloat(item.price || item.betAmount) || 0), 0);

  const filteredBetOdd = processedBets.slice(0, entriesPerPage);
  return (
    <div className='relative'>
      <Navbar />

      {loading ? (
        <div className='py-4 text-center'>
          <Spinner2 />
        </div>
      ) : (
        <div className='flex w-full flex-col gap-4 px-1 md:flex-row md:p-4'>
          <div className='sm:w-full md:w-[60%]'>
            <VideoStream
              gameid={gameid}
              bettingData={bettingData}
              showWinner={results.showWinner}
              winnerLabel={winnerMap[results.resultData?.res?.[0]?.win]}
            />

            {/* Game-Specific Betting UI */}
            <div>
              {bettingData?.sub &&
                renderGameUI({
                  gameid,
                  displayData,
                  bettingData,
                  resultData: results.resultData,
                  // betControl: betting.betControl,
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
                })}
            </div>
          </div>

          <div className='md-mt-0 sm:w-full md:w-[40%]'>
            <div>
              {/* <div>
                <div className='bg-[#2c3e50b3] flex items-center cursor-pointer uppercase rounded-t-md px-3 py-1 min-h-[42px] text-white'
                    onClick={() => setUrl(!url)}
                  >
                    Live Streaming
                  </div>
                  {url ? (
                    <iframe
                      src={`https://live.cricketid.xyz/directStream?gmid=${gameid}&key=a1bett20252026`}
                      title='Watch Live'
                      className='w-full rounded-lg'
                      style={{ height: '50vh' }}
                      allowFullScreen
                      loading='lazy'
                      allow='
                      autoplay;
                      encrypted-media;
                      fullscreen;
                      picture-in-picture;
                      accelerometer;
                      gyroscope
                    '
                    />
                  ) : null}
              </div>
              <div className='mt-4'>
                <div
                  className='bg-[#2c3e50b3] flex items-center cursor-pointer uppercase rounded-t-md px-3 py-1 min-h-[42px] text-white'
                  onClick={() => setScoreUrl(!scoreUrl)}
                >
                  Score Card
                </div>
                {scoreUrl ? (
                  <iframe
                    src={`https://score.akamaized.uk/diamond-live-score?gmid=${gameid}`}
                    allowFullScreen
                    className='w-full rounded-lg'
                    title='Live Score'
                    allow='
                    autoplay;
                    encrypted-media;
                    fullscreen;
                    picture-in-picture;
                    accelerometer;
                    gyroscope
                  '
                  />
                ) : null}
              </div> */}

              {!isFromMarket && (
                <>
                  <div className='flex min-h-[42px] cursor-pointer items-center justify-between rounded-t-md bg-secondary70 px-3 py-1 text-white uppercase'>
                    <span>My Bets</span>
                    <div
                      className='h-full rounded-sm bg-secondary px-2.5 py-1.5'
                      onClick={() => setViewMoreDetail(true)}
                    >
                      View More
                    </div>
                  </div>

                  <div className='bg-white'>
                    <div className='grid grid-cols-14 border-b border-gray-400 bg-white px-2 py-2 text-[14px] font-bold'>
                      <div className='col-span-3'>UserName</div>
                      <div className='col-span-3'>Nation</div>
                      <div className='col-span-2'>Rate</div>
                      <div className='col-span-2'>Amount</div>
                      <div className='col-span-2'>PlaceDate</div>
                      <div className='col-span-2 text-right'>GameType</div>
                    </div>
                    {betsData.length > 0 ? (
                      <>
                        {betsData.map((item, index) => (
                          <div
                            key={index}
                            className={`${item.otype === 'back' ? 'border-[#89c9f8] bg-[#b6defa]' : 'border-[#f8e8eb] bg-[#f8e8eb]'} border px-2 py-1 text-sm`}
                          >
                            <div className='flex items-center justify-between'>
                              <div className='font-bold'>{item.gameType}</div>
                              <div className='text-[10px] text-gray-600 uppercase'>
                                {new Date(item.date).toLocaleString('en-IN')}
                              </div>
                            </div>
                            <div
                              className={`${item.otype === 'back' ? ' bg-[#beddf4]' : 'bg-[#f8e8eb]'} grid grid-cols-14 gap-2 text-sm`}
                            >
                              <div className='col-span-3 text-[14px]'>
                                {item.userName}
                              </div>
                              <div className='col-span-3 text-[14px] uppercase'>
                                {item.teamName}
                              </div>
                              <div className='col-span-2 text-[14px]'>
                                {item.gameType === 'Normal'
                                  ? `${item.fancyScore}/`
                                  : ''}
                                {item.xValue}
                              </div>
                              <div className='col-span-2 text-[14px]'>
                                {item.otype === 'lay'
                                  ? item.betAmount
                                  : item.price}
                              </div>
                              <div className='col-span-2 text-[14px]'>
                                {new Date(item.date).toLocaleDateString(
                                  'en-IN'
                                )}
                              </div>
                              <div className='col-span-2 text-right text-[14px]'>
                                {item.gameType}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className='items-center py-8 text-center'>
                        <h2>There are no any bet.</h2>
                      </div>
                    )}
                  </div>
                </>
              )}

              {isFromMarket && (
                <div className='mt-4 bg-white'>
                  <div className='flex min-h-[42px] cursor-pointer items-center rounded-t-md bg-secondary70 px-3 py-1 text-white uppercase'>
                    Book
                  </div>
                  <div className='flex w-full justify-between p-4'>
                    <button
                      className='bg-dark w-[47%] cursor-pointer rounded-md px-4 py-1 font-semibold text-white'
                      onClick={() => setMasterpopup(true)}
                    >
                      Master Book
                    </button>
                    <button
                      className='bg-dark w-[47%] cursor-pointer rounded-md px-4 py-1 font-semibold text-white'
                      onClick={() => setUserMasterpopup(true)}
                    >
                      User Book
                    </button>
                  </div>
                </div>
              )}

              {isFromMarket && (
                <div className='mt-4 bg-white'>
                  <div className='flex min-h-[42px] cursor-pointer items-center rounded-t-md bg-secondary70 px-3 py-1 text-white uppercase'>
                    <div className='flex w-2/3 justify-between p-0 md:w-[60%] md:p-4'>
                      <div className='flex gap-2 md:gap-5'>
                        <span className='mt-4 md:mt-1'>Live Bet</span>
                        <div className='inline-flex items-center'>
                          <label className='relative flex cursor-pointer items-center'>
                            <input
                              type='checkbox'
                              className='peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white shadow transition-all checked:border-slate-800 checked:bg-slate-800 hover:shadow-md'
                              id='uncheck'
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setLiveBets(betsData); // ✅ If checked
                                } else {
                                  setLiveBets([]); // ❌ If unchecked
                                }
                              }}
                            />
                            <span className='pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform bg-white text-blue-500 opacity-0 peer-checked:opacity-100'>
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                className='h-3.5 w-3.5'
                                viewBox='0 0 20 20'
                                fill='currentColor'
                                stroke='currentColor'
                                strokeWidth={1}
                              >
                                <path
                                  fillRule='evenodd'
                                  d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                  clipRule='evenodd'
                                />
                              </svg>
                            </span>
                          </label>
                        </div>
                      </div>
                      <div className='flex gap-2 md:gap-5'>
                        <span className='mt-4 md:mt-1'>Partnership Book</span>
                        <div className='inline-flex items-center'>
                          <label className='relative flex cursor-pointer items-center'>
                            <input
                              type='checkbox'
                              className='peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 bg-white shadow transition-all checked:border-slate-800 checked:bg-slate-800 hover:shadow-md'
                              id='check'
                            />
                            <span className='pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform bg-white text-blue-500 opacity-0 peer-checked:opacity-100'>
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                className='h-3.5 w-3.5'
                                viewBox='0 0 20 20'
                                fill='currentColor'
                                stroke='currentColor'
                                strokeWidth={1}
                              >
                                <path
                                  fillRule='evenodd'
                                  d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                  clipRule='evenodd'
                                />
                              </svg>
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div
                      className='flex w-1/3 justify-end p-4 text-end md:w-[40%]'
                      onClick={() => setViewMoreDetail(true)}
                    >
                      View More
                    </div>
                  </div>
                  {liveBets.length > 0 ? (
                    <div className='w-full border-t border-gray-300 p-2'>
                      <div className='grid grid-cols-10 border-b border-gray-400 bg-white py-2 text-[11px]'>
                        <div className='col-span-4'>Market Name</div>
                        <div className='col-span-2'>Odds</div>
                        <div className='col-span-2'>Stake</div>
                        <div className='col-span-2'>Username</div>
                      </div>

                      {liveBets.map((item, index) => (
                        <div
                          key={index}
                          className={`${item.otype === 'back' ? 'border-[#89c9f8] bg-[#b6defa]' : 'border-[#f8e8eb] bg-[#f8e8eb]'} border px-2 py-1 text-sm`}
                        >
                          <div>
                            <p className='text-[10px] text-gray-600'>
                              Time: {item.date}
                            </p>
                          </div>
                          <div
                            className={`${item.otype === 'back' ? ' bg-[#beddf4]' : 'bg-[#f8e8eb]'} grid grid-cols-10 items-center gap-2 text-sm`}
                          >
                            <div className='col-span-4'>
                              <div className='flex items-center gap-2'>
                                <div
                                  className={`${item.otype === 'back' ? 'bg-[#79c0f4] ' : 'bg-[#faa9ba]'} rounded px-2 py-1 text-[10px] font-bold text-white`}
                                >
                                  {item.otype}
                                </div>
                                <div className='flex flex-col'>
                                  <span className='text-[10px] text-gray-400'>
                                    {item.teamName}
                                  </span>
                                  <span className='text-[11px] font-semibold'>
                                    {item.gameType}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className='col-span-2 text-[11px]'>
                              <div>
                                {/* {item.xValue} */}
                                {item.gameType === 'Normal'
                                  ? `${item.fancyScore}/`
                                  : ''}
                                {item.xValue}
                              </div>
                            </div>
                            <div className='col-span-2 text-[11px]'>
                              <div>
                                {item.otype === 'lay'
                                  ? item.betAmount
                                  : item.price}
                              </div>
                            </div>
                            <div className='col-span-2 text-[11px]'>
                              <div>
                                <div
                                  className='cursor-pointer text-gray-700 underline'
                                  onClick={() => handelpopup(item.userId)}
                                >
                                  {item.userName}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='items-center py-8 text-center'>
                      <h2>There are no any bet.</h2>
                    </div>
                  )}
                </div>
              )}

              {viewMoreDetail && (
                <div className='modal-overlay fixed h-full z-[9999] overflow-y-auto bg-black/50 inset-0 flex items-center justify-center p-4'>
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                    className='relative max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-2xl w-full max-w-6xl border border-gray-200'
                  >
                    {/* Header */}
                    <div className='bg-secondary flex items-center justify-between px-4 py-3 text-white'>
                      <h4 className='text-md font-bold uppercase tracking-wider'>
                        View More Bets
                      </h4>
                      <button
                        className='text-xl font-bold text-white hover:text-gray-200 transition-colors'
                        onClick={() => setViewMoreDetail(false)}
                      >
                        ×
                      </button>
                    </div>

                    {/* Body */}
                    <div className='p-6'>
                      {loading ? (
                        <div className='flex items-center justify-center py-12'>
                          <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent'>
                            Loading...
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Search Filters Row */}
                          <div className='mb-4 p-4 bg-gray-50 rounded border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end'>
                            <div>
                              <label className='block text-xs font-bold text-gray-700 mb-1'>Search Username</label>
                              <input
                                type='text'
                                placeholder='Search Username'
                                className='w-full rounded border border-gray-300 px-3 py-1.5 text-xs bg-white outline-none focus:border-[#0088cc]'
                                value={filterUsername}
                                onChange={(e) => setFilterUsername(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className='block text-xs font-bold text-gray-700 mb-1'>Amount From</label>
                              <input
                                type='number'
                                placeholder='Amount From'
                                className='w-full rounded border border-gray-300 px-3 py-1.5 text-xs bg-white outline-none focus:border-[#0088cc]'
                                value={filterAmountFrom}
                                onChange={(e) => setFilterAmountFrom(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className='block text-xs font-bold text-gray-700 mb-1'>Amount To</label>
                              <input
                                type='number'
                                placeholder='Amount To'
                                className='w-full rounded border border-gray-300 px-3 py-1.5 text-xs bg-white outline-none focus:border-[#0088cc]'
                                value={filterAmountTo}
                                onChange={(e) => setFilterAmountTo(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className='block text-xs font-bold text-gray-700 mb-1'>IP Address</label>
                              <input
                                type='text'
                                placeholder='IP Address'
                                className='w-full rounded border border-gray-300 px-3 py-1.5 text-xs bg-white outline-none focus:border-[#0088cc]'
                                value={filterIp}
                                onChange={(e) => setFilterIp(e.target.value)}
                              />
                            </div>
                            <div className='md:col-span-4 flex justify-between items-center mt-2'>
                              <div className='flex items-center text-xs text-gray-600'>
                                <span className='mr-2'>Show</span>
                                <select
                                  className='rounded border border-gray-300 px-2 py-1 bg-white outline-none'
                                  value={entriesPerPage}
                                  onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                                >
                                  <option value='5'>5 entries</option>
                                  <option value='10'>10 entries</option>
                                  <option value='25'>25 entries</option>
                                  <option value='50'>50 entries</option>
                                </select>
                              </div>
                              <button
                                onClick={() => {
                                  setFilterUsername('');
                                  setFilterAmountFrom('');
                                  setFilterAmountTo('');
                                  setFilterIp('');
                                  setFilterOtype('all');
                                  setSearchTerm('');
                                }}
                                className='px-4 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold text-gray-700 transition-colors'
                              >
                                Reset Filters
                              </button>
                            </div>
                          </div>

                          {/* Tabs Row */}
                          <div className='flex border-b border-gray-300 mb-4 bg-gray-50 rounded-t'>
                            <button
                              onClick={() => {
                                setViewMoreTab('matched');
                                setFilterOtype('all');
                              }}
                              className={`px-6 py-3 text-xs uppercase font-bold tracking-wider transition-all border-b-2 ${viewMoreTab === 'matched' ? 'border-[#0088cc] text-[#0088cc] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 bg-transparent'}`}
                            >
                              Matched Bets
                            </button>
                            <button
                              onClick={() => {
                                setViewMoreTab('deleted');
                                setFilterOtype('all');
                              }}
                              className={`px-6 py-3 text-xs uppercase font-bold tracking-wider transition-all border-b-2 ${viewMoreTab === 'deleted' ? 'border-[#0088cc] text-[#0088cc] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 bg-transparent'}`}
                            >
                              Deleted Bets
                            </button>
                          </div>

                          {/* Radios & Stats Row */}
                          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 bg-sky-50/50 p-3 rounded border border-sky-100'>
                            <div className='flex items-center gap-5 text-xs text-gray-700 font-bold'>
                              <label className='flex items-center gap-1.5 cursor-pointer'>
                                <input
                                  type='radio'
                                  name='otypeFilter'
                                  checked={filterOtype === 'all'}
                                  onChange={() => setFilterOtype('all')}
                                  className='accent-[#0088cc] h-3.5 w-3.5'
                                />
                                All
                              </label>
                              <label className='flex items-center gap-1.5 cursor-pointer'>
                                <input
                                  type='radio'
                                  name='otypeFilter'
                                  checked={filterOtype === 'back'}
                                  onChange={() => setFilterOtype('back')}
                                  className='accent-[#0088cc] h-3.5 w-3.5'
                                />
                                Back
                              </label>
                              <label className='flex items-center gap-1.5 cursor-pointer'>
                                <input
                                  type='radio'
                                  name='otypeFilter'
                                  checked={filterOtype === 'lay'}
                                  onChange={() => setFilterOtype('lay')}
                                  className='accent-[#0088cc] h-3.5 w-3.5'
                                />
                                Lay
                              </label>
                            </div>
                            <div className='flex gap-5 text-xs font-bold text-gray-800'>
                              <div>Total Soda: <span className='text-[#0088cc] text-sm'>{totalSoda}</span></div>
                              <div>Total Amount: <span className='text-[#0088cc] text-sm'>{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            </div>
                          </div>

                          {/* Table Container */}
                          <div className='overflow-x-auto rounded border border-gray-200'>
                            <table className='w-full border-collapse text-center text-xs'>
                              <thead className='bg-gray-100 text-gray-700 font-bold border-b border-gray-200'>
                                <tr>
                                  <th className='border-r border-gray-200 px-3 py-2.5'>Username</th>
                                  <th className='border-r border-gray-200 px-3 py-2.5'>Nation</th>
                                  <th className='border-r border-gray-200 px-3 py-2.5'>Rate</th>
                                  <th className='border-r border-gray-200 px-3 py-2.5'>Amount</th>
                                  <th className='border-r border-gray-200 px-3 py-2.5'>Date</th>
                                  <th className='border-r border-gray-200 px-3 py-2.5'>IP Address</th>
                                  <th className='px-3 py-2.5'>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredBetOdd.length > 0 ? (
                                  filteredBetOdd.map((item, index) => {
                                    const isBack = item.otype?.toLowerCase() === 'back';
                                    const rowBg = isBack ? 'bg-[#72bbef]' : 'bg-[#faa9ba]';
                                    return (
                                      <tr key={item._id || index} className={`${rowBg} hover:opacity-95 transition-opacity border-b border-gray-100`}>
                                        <td
                                          className='border-r border-gray-200 p-2.5 font-bold text-blue-900 cursor-pointer hover:underline'
                                          onClick={() => handelpopup(item.userId)}
                                        >
                                          {item.userName}
                                        </td>
                                        <td className='border-r border-gray-200 p-2.5 font-medium'>{item.teamName}</td>
                                        <td className='border-r border-gray-200 p-2.5 font-mono font-bold'>{item.xValue}</td>
                                        <td className='border-r border-gray-200 p-2.5 font-mono font-bold'>
                                          {(item.price || item.betAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className='border-r border-gray-200 p-2.5 text-gray-800'>
                                          {new Date(item.createdAt || item.date).toLocaleString('en-IN')}
                                        </td>
                                        <td className='border-r border-gray-200 p-2.5 relative group cursor-help font-mono font-semibold text-gray-800'>
                                          {item.ip || '-'}
                                          {item.device && (
                                            <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-64 p-2 bg-black text-white text-[10px] rounded shadow-xl break-words text-left leading-normal font-normal font-sans opacity-95'>
                                              {item.device}
                                            </div>
                                          )}
                                        </td>
                                        {/* <td className='p-2.5'>
                                          {item.isDeleted ? (
                                            <button
                                              onClick={() => handleRestoreBet(item)}
                                              className='bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] px-3 py-1 rounded shadow-md transition-colors cursor-pointer uppercase tracking-wider'
                                            >
                                              Restore
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => handleDeleteBet(item)}
                                              className='bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-3 py-1 rounded shadow-md transition-colors cursor-pointer uppercase tracking-wider'
                                            >
                                              Delete
                                            </button>
                                          )}
                                        </td> */}
                                        <td></td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={7} className='py-8 text-gray-500 font-semibold text-center'>
                                      No bets found matching criteria
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* master list popup */}

              {masterpopup && (
                <div className='modal-overlay fixed top-10 left-[25%] h-full'>
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                    className='modal-content h-fit w-[95%] md:w-[50%]'
                  >
                    <div className='modal-header bg-color flex items-center justify-between'>
                      <span>Market List</span>
                      <span
                        className='text-lg'
                        onClick={() => setMasterpopup(false)}
                      >
                        ×
                      </span>
                    </div>
                    <div className='modal-body p-4'>
                      <div className='border border-gray-300'>
                        {matchOdd?.length > 0 && (
                          <h2
                            className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                            onClick={() =>
                              hemdelMasterBook(
                                '',
                                matchOdd[0]?.gameType,
                                matchOddsList
                              )
                            }
                          >
                            {matchOdd[0]?.gameType}
                          </h2>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* master Book popup */}
              {casinoMasterDownline?.length > 0 && (
                <div className='modal-overlay1 fixed top-10 left-[25%] z-[9999] h-full'>
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                    className='modal-content h-fit w-[95%] rounded-lg bg-white shadow-lg md:w-[30%]'
                  >
                    <div className='modal-header bg-color flex justify-between border-b p-3'>
                      <span className='font-semibold'>Master Book</span>
                      <span
                        className='cursor-pointer text-2xl'
                        onClick={() => setCasinoMasterDownline([])}
                      >
                        ×
                      </span>
                    </div>
                    <div className='modal-body p-4'>
                      <div className='overflow-x-auto'>
                        <table className='w-full border-collapse'>
                          <thead>
                            <tr className='bg-gray-200 text-center text-sm'>
                              <th className='border p-2'>Username</th>
                              <th className='border p-2'>Role</th>
                              {teamHeaders.map((team, idx) => (
                                <th key={idx} className='border p-2'>
                                  {team}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {loading && (
                              <tr>
                                <td colSpan={6} className='p-4 text-center'>
                                  Loading...
                                </td>
                              </tr>
                            )}

                            {!loading && casinoMasterDownline?.length > 0 ? (
                              casinoMasterDownline.map((item, index) => (
                                <tr
                                  key={index}
                                  className='text-center text-sm hover:bg-gray-100'
                                >
                                  <td
                                    className='cursor-pointer border p-2 text-blue-500'
                                    onClick={() => {
                                      console.log(
                                        '🎰 [CLICK] Opening downline for user:',
                                        item.userName,
                                        'ID:',
                                        item.id
                                      );
                                      hemdelMasterBookDownline(item.id);
                                    }}
                                  >
                                    {item.userName}
                                  </td>
                                  <td className='border p-2'>
                                    {item.userRole}
                                  </td>
                                  {teamHeaders.map((team, i) => (
                                    <td key={i} className='border p-2'>
                                      {item.otype === 'back' ? (
                                        item.playerName === team ? (
                                          <span className='text-green-600'>
                                            {pratnerShip(
                                              item.userRole,
                                              item.totalBetAmount,
                                              item.partnership || 0
                                            )}
                                          </span>
                                        ) : (
                                          <span className='text-red-500'>
                                            -
                                            {pratnerShip(
                                              item.userRole,
                                              item.totalPrice,
                                              item.partnership || 0
                                            )}
                                          </span>
                                        )
                                      ) : item.playerName === team ? (
                                        <span className='text-red-500'>
                                          -
                                          {pratnerShip(
                                            item.userRole,
                                            item.totalPrice,
                                            item.partnership || 0
                                          )}
                                        </span>
                                      ) : (
                                        <span className='text-green-600'>
                                          {pratnerShip(
                                            item.userRole,
                                            item.totalBetAmount,
                                            item.partnership || 0
                                          )}
                                        </span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className='py-4 text-center'>
                                  No data available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* user master list popup */}

              {userMasterpopup && (
                <div className='modal-overlay fixed top-10 left-[25%] h-full'>
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                    className='modal-content h-fit w-[95%] md:w-[50%]'
                  >
                    <div className='modal-header bg-color flex items-center justify-between'>
                      <span>Market List</span>
                      <span
                        className='text-2xl'
                        onClick={() => setUserMasterpopup(false)}
                      >
                        ×
                      </span>
                    </div>
                    <div className='modal-body p-4'>
                      <div className='border border-gray-300'>
                        {matchOdd?.length > 0 && (
                          <h2
                            className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                            onClick={() =>
                              hendalUserBetsData(
                                matchOdd[0]?.gameType,
                                userInfo.code,
                                matchOddsList
                              )
                            }
                          >
                            {matchOdd[0]?.gameType}
                          </h2>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

            </div>

            {/* user bet presents popup */}
          </div>
          <div>
            {popup && (
              <div className='bg-opacity-50 fixed inset-0 z-[100] flex items-start justify-center bg-[#0000005d]'>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className='mt-1 w-94 rounded-lg bg-white shadow-lg md:w-150'
                >
                  {/* Header */}
                  <div className='bg-color flex justify-between px-4 py-1.5 font-bold text-white'>
                    <span>Parent List</span>
                    <button
                      onClick={() => setPopup(false)}
                      className='text-xl text-white'
                    >
                      X
                    </button>
                  </div>

                  {/* Commission List */}
                  <div className='space-y-2 p-4'>
                    {[...betPerantsData]
                      .slice(0, 2)
                      .reverse()
                      .map((item, index) => (
                        <div
                          key={index}
                          className='flex items-center justify-center border border-gray-300 px-4 py-2 text-center font-semibold'
                        >
                          <span>{item.userName}</span>
                          <span>({item.role.toUpperCase()})</span>
                        </div>
                      ))}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

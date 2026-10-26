import { useEffect, useState, Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getPendingBetAmo,
  fetchSoccerBatingData,
  getBetPerents,
  masterBookReducer,
  masterBookReducerDownline,
} from '../redux/reducer/marketAnalyzeReducer';
import Spinner2 from '../components/Spinner2';
import SoccerOdds from './SoccerComponents/SoccerOdds';
import SoccerOver15 from './SoccerComponents/SoccerOver15';
import SoccerOver5 from './SoccerComponents/SoccerOver_5';
import SoccerOver25 from './SoccerComponents/SoccerOver25';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import api, { host } from '../redux/api';
import { fetchLiveMedia } from '../utils/liveMedia';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { getAdmin } from '../redux/reducer/authReducer';
import { motion } from 'framer-motion';
import { MdOutlineKeyboardArrowRight } from 'react-icons/md';
import UserBookModal from '../components/UserBookModal';
import BetLockModal from '../components/BetLockModal';

export default function Soccerbet() {
  const [bettingData, setBettingData] = useState(null);
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const isFromMarket = searchParams.get('from') === 'market';
  const [matchedTab, setMatchedTab] = useState(true);
  const { gameid } = useParams() || {};
  const { gameName } = useParams() || {};
  const { gameTitle } = useParams() || {};
  const { match } = useParams() || {};
  const location = useLocation();
  const streamGmid = location.state?.eventId || gameid;
  const [url, setUrl] = useState('');
  const [scoreUrl, setScoreUrl] = useState(false);
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [scoreIframeUrl, setScoreIframeUrl] = useState('');
  const [masterpopup, setMasterpopup] = useState(false);
  const [userMasterpopup, setUserMasterpopup] = useState(false);
  const [liveBets, setLiveBets] = useState([]);
  const [userBet, setUserBet] = useState([]);
  const [showUserBookModal, setShowUserBookModal] = useState(false);
  const [showBetLockModal, setShowBetLockModal] = useState(false);
  const [betLockMarketName, setBetLockMarketName] = useState('Market');
  const [betLockEventName, setBetLockEventName] = useState('');
  const [betLockGameId, setBetLockGameId] = useState('');

  const handleOpenBetLock = (mName, eName = '', gId = '') => {
    setBetLockMarketName(mName || 'Market');
    setBetLockEventName(eName || gameName || match || '');
    setBetLockGameId(gId || gameid || '');
    setShowBetLockModal(true);
  };
  const [storedGameType, setStoredGameType] = useState(null);
  const [storedMatchOddsList, setStoredMatchOddsList] = useState([]);
  const [teamHeaders, setTeamHeaders] = useState([]);
  const [masterDownline, setMasterDownline] = useState([]);
  const [viewMoreDetail, setViewMoreDetail] = useState(false);
  const [showBookSummary, setShowBookSummary] = useState(true);
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
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { userInfo } = useSelector((state) => state.auth);

  const {
    loading,
    battingData,
    betsData,
    betPerantsData,
    masterData,
    masterDataDownline,
    lastUpdateddate,
  } = useSelector((state) => state.market);

  let sharedSocket;

  useEffect(() => {
    const loadLiveMedia = async () => {
      if (!streamGmid) return;
      try {
        const media = await fetchLiveMedia(streamGmid, 1);
        setScoreIframeUrl(media.score_url || '');
        setLiveStreamUrl(media.stream_url || '');
      } catch (error) {
        console.error('Error fetching live media URLs:', error);
        setScoreIframeUrl('');
        setLiveStreamUrl('');
      }
    };
    loadLiveMedia();
  }, [streamGmid]);

  useEffect(() => {
    if (!gameid) return;

    if (!sharedSocket || sharedSocket.readyState !== 1) {
      sharedSocket = new WebSocket(host);

      sharedSocket.onopen = () => {
        console.log('✅ Socket connected');
        sharedSocket.send(
          JSON.stringify({ type: 'subscribe', gameid, apitype: 'soccer' })
        );
      };

      sharedSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.gameid === gameid) {
            setBettingData(message.data);
          }
        } catch (e) {
          console.error('❌ Message error', e);
        }
      };

      sharedSocket.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      sharedSocket.onclose = () => {
        console.log('Socket closed');
      };
    } else {
      // Already connected, just send subscription
      sharedSocket.send(
        JSON.stringify({ type: 'subscribe', gameid, apitype: 'soccer' })
      );
    }

    return () => {
      // Optionally leave socket open for reuse
    };
  }, [gameid]);

  useEffect(() => {
    // let intervalId;

    if (gameid) {
      dispatch(fetchSoccerBatingData(gameid)); // initial
    }
  }, [dispatch, gameid]);

  useEffect(() => {
    setBettingData(battingData);
  }, [battingData]);

  useEffect(() => {
    dispatch(getAdmin());
  }, [dispatch]);

  const matchOddsList =
    bettingData?.filter((item) => item.mname === 'MATCH_ODDS') || [];

  const matchOdd = Array.isArray(betsData)
    ? betsData.filter((item) => item?.gameType === 'Match Odds')
    : [];

  const matcUnder5List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_05') || [];

  const matcUnder5 = Array.isArray(betsData)
    ? betsData.filter((item) => item?.gameType === 'OVER_UNDER_05')
    : [];

  const matcUnder15List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_15') || [];

  const matcUnder15 = Array.isArray(betsData)
    ? betsData.filter((item) => item?.gameType === 'OVER_UNDER_15')
    : [];

  const matcUnder25List =
    bettingData?.filter((item) => item.mname === 'OVER_UNDER_25') || [];

  const matcUnder25 = Array.isArray(betsData)
    ? betsData.filter((item) => item?.gameType === 'OVER_UNDER_25')
    : [];

  useEffect(() => {
    dispatch(getPendingBetAmo(gameid));
    const interval = setInterval(() => {
      dispatch(getPendingBetAmo(gameid));
    }, 10000);
    return () => clearInterval(interval);
  }, [dispatch, gameid]);

  useEffect(() => {
    document.body.style.overflow = masterpopup ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [masterpopup]);

  const hendalUserBetsData = (gameType, code, matchOddsList) => {
    const userBet = Array.isArray(betsData)
      ? betsData.filter(
        (item) => item?.gameType === gameType || item?.gameType === code
      )
      : [];

    let teams = [];
    if (Array.isArray(matchOddsList) && matchOddsList.length > 0 && Array.isArray(matchOddsList[0]?.section)) {
      teams = matchOddsList[0].section.map((sec) => sec.nat);
    } else if (matchOddsList?.section) {
      teams = matchOddsList.section.map((sec) => sec.nat);
    } else if (Array.isArray(matchOddsList) && matchOddsList.length > 0 && matchOddsList[0]?.nat) {
      teams = matchOddsList.map((sec) => sec.nat);
    }
    if (teams.length === 0) {
      teams = ['The Draw', 'Team 1', 'Team 2'];
    }

    setTeamHeaders(teams);
    setUserBet(userBet);
    setShowUserBookModal(true);
  };

  const hemdelMasterBook = async (userId, gameType, matchOddsList) => {
    try {
      // Reset UI
      setMasterDownline([]);
      setTeamHeaders([]);

      // Use stored values if not passed (for downline use)
      const finalGameType = gameType || storedGameType;
      const finalMatchOddsList = matchOddsList?.length
        ? matchOddsList
        : storedMatchOddsList;

      // Save for future
      if (gameType && matchOddsList) {
        setStoredGameType(gameType);
        setStoredMatchOddsList(matchOddsList);
      }

      // Dispatch reset action if needed
      dispatch({ type: 'RESET_MASTER_BOOK' });

      // Fetch new data
      await dispatch(
        masterBookReducer({ userId, gameid, gameType: finalGameType })
      );

      // Update headers
      const teams = Array.isArray(finalMatchOddsList[0]?.section)
        ? finalMatchOddsList[0].section.map((sec) => sec.nat)
        : [];
      setTeamHeaders(teams);
    } catch (error) {
      console.log(error);
    }
  };

  const hemdelMasterBookDownline = async (userId) => {
    try {
      // Reset UI
      setMasterDownline([]);
      setTeamHeaders([]);

      const finalGameType = storedGameType;
      const finalMatchOddsList = storedMatchOddsList;

      // Dispatch new downline request
      await dispatch(
        masterBookReducerDownline({ userId, gameid, gameType: finalGameType })
      );

      // Update headers
      const teams = Array.isArray(finalMatchOddsList[0]?.section)
        ? finalMatchOddsList[0].section.map((sec) => sec.nat)
        : [];
      setTeamHeaders(teams);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (masterData?.length > 0) {
      setMasterDownline(masterData); //  For first-level data
    }
  }, [masterData]);

  useEffect(() => {
    if (masterDataDownline?.length > 0) {
      setMasterDownline(masterDataDownline); //  For downline drill
    }
  }, [masterDataDownline]);

  useEffect(() => {
    const fetchVideoUrl = async () => {
      try {
        const response = await axios.get(
          `https://live.cricketid.xyz/directStream?gmid=${gameid}&key=a1bett20252026`
        );
        const data = response?.data;
        setUrl(data?.tv_url);
      } catch (error) {
        console.error(
          'Video API Error:',
          error?.response?.data || error.message
        );
      }
    };
    if (gameid) {
      fetchVideoUrl();
    }
  }, [gameid]);

  const [popup, setPopup] = useState(false);
  const handelpopup = async (id) => {
    setPopup(true);
    await dispatch(getBetPerents(id));
  };

  // Inside your React functional component (e.g., in a file like MyComponent.jsx)

  const formatToK = (num) => {
    if (!num || num < 1000) return num;
    const n = Number(num);
    return `${n / 1000}k`;
  };

  const pratnerShip = (role, amount, part) => {
    const roundedAmount = Math.round(amount * 100) / 100; // Round to 2 decimals
    if (role === 'user') {
      return roundedAmount;
    } else {
      return Math.round(roundedAmount * ((100 - part) / 100) * 100) / 100;
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
      <div className='w-full'>
        {loading ? (
          <div className='fixed top-52 left-[40%] py-4 text-center'>
            <Spinner2 />
          </div>
        ) : (
          <div className='flex w-full flex-col  bg-[#fbfbfc] p-1 md:flex-row px-[25px] pt-[20px] pb-[80px]'>

            <div className='sm:w-full md:w-[65%] pr-[17px]'>
              <div className='z-0'>
                <div className='flex items-center justify-between bg-secondary py-2.5 px-5 font-bold text-white text-[16px] leading-none'>
                  <span className='flex items-center'>
                    {gameTitle} &gt; {gameName}
                  </span>
                  <span>
                    {lastUpdateddate
                      ? new Date(lastUpdateddate).toLocaleString('en-IN')
                      : '—'}
                  </span>
                </div>
                <SoccerOdds
                  matchOddsList={matchOddsList}
                  gameid={gameid}
                  match={match}
                  onUserBook={(mName, list) => hendalUserBetsData(mName, userInfo?.code, list)}
                  onBetLock={handleOpenBetLock}
                />
                <SoccerOver5
                  matcUnder5List={matcUnder5List}
                  gameid={gameid}
                  match={match}
                />
                <SoccerOver15
                  matcUnder15List={matcUnder15List}
                  gameid={gameid}
                  match={match}
                />
                <SoccerOver25
                  matcUnder25List={matcUnder25List}
                  gameid={gameid}
                  match={match}
                />
              </div>
            </div>
            <div className='md-mt-0 sm:w-full md:w-[35%]'>
              <div
                className='flex text-[14px] cursor-pointer items-center bg-[#2c3e50b3] p-1.5 text-white h-[27px]'
                onClick={() => setShowBookSummary(!showBookSummary)}
              >
                Book Summary
              </div>
              {showBookSummary && (
                <div className='flex flex-wrap justify-between p-[5px] gap-[5px] transition-all duration-300'>
                  <span className='w-full text-center text-[14px] py-2 text-gray-500 bg-[#f6f6f6] border border-gray-300 rounded'>
                    No data found
                  </span>
                </div>
              )}

              <div className='mt-[7px]'>
                <div
                  className='flex min-h-[42px] text-[14px] cursor-pointer items-center bg-[#2c3e50b3] px-3 py-1 text-white uppercase'
                  onClick={() => setUrl(!url)}
                >
                  Live Match
                </div>
                {url && liveStreamUrl ? (
                  <iframe
                    src={liveStreamUrl}
                    title='Watch Live'
                    className='w-full rounded-lg h-full aspect-video'
                    // style={{ height: '50vh' }}
                    allowFullScreen
                    loading='lazy'
                    referrerPolicy='origin'
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

              <div className='mt-[7px]'>
                <div
                  className='flex min-h-[42px] text-[14px] cursor-pointer items-center rounded-t-md bg-[#2c3e50b3] px-3 py-1 text-white uppercase'
                  onClick={() => setScoreUrl(!scoreUrl)}
                >
                  Score Card
                </div>
                {scoreUrl && scoreIframeUrl ? (
                  <iframe
                    src={scoreIframeUrl}
                    allowFullScreen
                    className='w-full rounded-lg'
                    title='Live Score'
                    referrerPolicy='origin'
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

              <div className='mt-[7px] text-[14px] flex min-h-[42px] cursor-pointer items-center justify-between rounded-t-md bg-[#2c3e50b3] px-3 py-1 text-white uppercase'>
                <span>My Bets</span>
                <div
                  className='h-full rounded-sm bg-[#2c3e50] px-2.5 py-1.5 text-[12px] mr-[3px]'
                  onClick={() => setViewMoreDetail(true)}
                >
                  View More
                </div>
              </div>

              <div className='p-2'>
                <ul className="flex border-b border-[#ced4da]">
                  <li
                    className={`py-[7px] px-[14px] text-[#495057] text-[0.698rem] cursor-pointer -mb-px ${matchedTab
                      ? "border border-[color:#ced4da_#ced4da_#fff]"
                      : ""
                      }`}
                    onClick={() => setMatchedTab(true)}
                  >
                    Matched Bets
                  </li>

                  <li
                    className={`py-[7px] px-[14px] text-[#495057] text-[0.698rem] cursor-pointer -mb-px ${!matchedTab
                      ? "border border-[color:#ced4da_#ced4da_#fff]"
                      : ""
                      }`}
                    onClick={() => setMatchedTab(false)}
                  >
                    Unmatched Bets
                  </li>
                </ul>

                <table className='bg-white w-full'>
                  <thead>
                    <tr className=' bg-white text-[14px]'>
                      <th className='min-w-[90px] py-1 px-[0.65627rem] text-left border-b-[2px] border-[#eff2f7] text-[#1e1e1e]'>UserName</th>
                      <th className='min-w-[90px] py-1 px-[0.65627rem] text-left border-b-[2px] border-[#eff2f7] text-[#1e1e1e]'>Nation</th>
                      <th className='min-w-[50px] py-1 px-[0.65627rem] text-right border-b-[2px] border-[#eff2f7] text-[#1e1e1e]'>Rate</th>
                      <th className='min-w-[70px] py-1 px-[0.65627rem] text-right border-b-[2px] border-[#eff2f7] text-[#1e1e1e]'>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {betsData.length > 0 && matchedTab ? (
                      <>
                        {betsData.map((item, index) => {
                          const isBack =
                            String(item.otype || '').toLowerCase() === 'back';
                          const rowBg = isBack
                            ? 'bg-[#72bbef57] shadow-[inset_3px_0_0px_#72bbef]'
                            : 'bg-[#faa9ba57] shadow-[inset_3px_0_0px_#faa9ba]';
                          return (
                            <Fragment key={item._id || `${item.userName}-${item.teamName}-${index}`}>
                              <tr className={`${rowBg} leading-[15px]`}>
                                <td className='py-1 px-[0.65627rem] text-[14px] text-[#1e1e1e]' colSpan={4}>
                                  <b>{item.gameType}</b>
                                  <span className='float-right'>
                                    {new Date(item.date).toLocaleString('en-IN', { hour12: false, })}
                                  </span>
                                </td>
                              </tr>
                              <tr className={`${rowBg} leading-[15px] text-[#1e1e1e] text-[14px]`}>
                                <td className='py-1 px-[0.65627rem]'>{item.userName}</td>
                                <td className='py-1 px-[0.65627rem]'>{item.teamName}</td>
                                <td className='text-right py-1 px-[0.65627rem]'>{item.gameType === 'Normal' ? `${item.fancyScore}/` : ''}{item.xValue}</td>
                                <td className='text-right py-1 px-[0.65627rem]'>{item.otype === 'lay' ? item.betAmount : item.price}</td>
                              </tr>
                              <tr><td className='p-0 h-[3px]' colSpan={4}></td></tr>
                            </Fragment>
                          );
                        })}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={4} className='text-center'>No records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div>

              {popup && (
                <div className='bg-opacity-50 fixed inset-0 z-9999 flex items-start justify-center bg-[#0000005d]'>
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                    className='mt-7 w-[96%] rounded-lg bg-white shadow-lg md:w-150'
                  >
                    {/* Header */}
                    <div className='bg-color flex items-center justify-between px-4 py-1.5 font-bold text-white'>
                      <span>Parent List</span>
                      <button
                        onClick={() => setPopup(false)}
                        className='text-xl text-white'
                      >
                        ×
                      </button>
                    </div>

                    {/* Commission List */}
                    <div className='space-y-2 p-4'>
                      {[...betPerantsData].reverse().map((item, index) => (
                        <div
                          key={index}
                          className='flex items-center justify-center border border-gray-300 px-4 py-2 text-center font-semibold'
                        >
                          <span>{item.userName}</span>
                          <span>
                            <span>({item.role.toUpperCase()})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* view more popup */}
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
                    <div className='modal-header bg-color flex justify-between'>
                      <span> Market List</span>
                      <span
                        className='text-lg'
                        onClick={() => setMasterpopup(false)}
                      >
                        {' '}
                        X
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
                        {matcUnder5?.length > 0 && (
                          <h2
                            className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                            onClick={() =>
                              hemdelMasterBook(
                                '',
                                matcUnder5[0]?.gameType,
                                matcUnder5List
                              )
                            }
                          >
                            {matcUnder5[0]?.gameType}
                          </h2>
                        )}
                        {matcUnder15?.length > 0 && (
                          <h2
                            className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                            onClick={() =>
                              hemdelMasterBook(
                                '',
                                matcUnder15[0]?.gameType,
                                matcUnder15List
                              )
                            }
                          >
                            {matcUnder15[0]?.gameType}
                          </h2>
                        )}
                        {matcUnder25?.length > 0 && (
                          <h2
                            className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                            onClick={() =>
                              hemdelMasterBook(
                                '',
                                matcUnder25[0]?.gameType,
                                matcUnder25List
                              )
                            }
                          >
                            {matcUnder25[0]?.gameType}
                          </h2>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* master Book popup */}
              {masterDownline?.length > 0 && (
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
                        onClick={() => setMasterDownline([])}
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

                            {!loading && masterDownline?.length > 0 ? (
                              masterDownline.map((item, index) => (
                                <tr
                                  key={index}
                                  className='text-center text-sm hover:bg-gray-100'
                                >
                                  <td
                                    className='cursor-pointer border p-2 text-blue-500'
                                    onClick={() =>
                                      hemdelMasterBookDownline(item.id)
                                    }
                                  >
                                    {item.userName}
                                  </td>
                                  <td className='border p-2'>
                                    {item.userRole}
                                  </td>
                                  {teamHeaders.map((team, i) => {
                                    // Calculate the value to display
                                    let displayValue;
                                    if (item.otype === 'back') {
                                      displayValue =
                                        item.teamName === team
                                          ? item.totalBetAmount // Profit if this team wins
                                          : -item.totalPrice; // Loss if other team wins
                                    } else {
                                      // lay
                                      displayValue =
                                        item.teamName === team
                                          ? -item.totalPrice // Liability if this team wins
                                          : item.totalBetAmount; // Profit if other team wins
                                    }

                                    const roundedValue = pratnerShip(
                                      item.userRole,
                                      displayValue,
                                      item.partnership
                                    );
                                    const numericValue =
                                      parseFloat(roundedValue) || 0;
                                    const colorClass =
                                      numericValue >= 0
                                        ? 'text-green-600'
                                        : 'text-red-500';

                                    return (
                                      <td key={i} className='border p-2'>
                                        <span className={colorClass}>
                                          {roundedValue}
                                        </span>
                                      </td>
                                    );
                                  })}
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
                    <div className='modal-header bg-color flex justify-between'>
                      <span> Market List</span>
                      <span
                        className='text-2xl'
                        onClick={() => setUserMasterpopup(false)}
                      >
                        {' '}
                        X
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
                        {matcUnder5?.length > 0 && (
                          <h2
                            className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                            onClick={() =>
                              hendalUserBetsData(
                                matcUnder5[0]?.gameType,
                                userInfo.code,
                                matcUnder5List
                              )
                            }
                          >
                            {matcUnder5[0]?.gameType}
                          </h2>
                        )}
                        {matcUnder15?.length > 0 && (
                          <h2
                            className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                            onClick={() =>
                              hendalUserBetsData(
                                matcUnder15[0]?.gameType,
                                userInfo.code,
                                matcUnder15List
                              )
                            }
                          >
                            {matcUnder15[0]?.gameType}
                          </h2>
                        )}
                        {matcUnder25?.length > 0 && (
                          <h2
                            className='cursor-pointer border-b border-gray-300 p-2 text-sm hover:bg-gray-200'
                            onClick={() =>
                              hendalUserBetsData(
                                matcUnder25[0]?.gameType,
                                userInfo.code,
                                matcUnder25List
                              )
                            }
                          >
                            {matcUnder25[0]?.gameType}
                          </h2>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <UserBookModal
        isOpen={showUserBookModal}
        onClose={() => setShowUserBookModal(false)}
        userBets={userBet}
        teamHeaders={teamHeaders}
      />
      <BetLockModal
        isOpen={showBetLockModal}
        onClose={() => setShowBetLockModal(false)}
        marketName={betLockMarketName}
        eventName={betLockEventName}
        gameId={betLockGameId}
      />
    </div>
  );
}

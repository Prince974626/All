import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { fetchCricketBatingData } from '../../redux/reducer/cricketSlice';
import useRefreshBettingOnVisible from '../../hooks/useRefreshBettingOnVisible';
import MatchOdds from './MatchOdds';
import Bookmaker from './Bookmaker';
import Bookmaker2 from './Bookmaker2';
import TiedMatch from './TiedMatch';
import Tied_Match from './Tied_Match';
import Normal from './Normal';
import Fancy1 from './Fancy1';
import Khado from './Khado';
import OddEven from './OddEven';
import OverByOver from './OverByOver';
import MatchedBet from './MatchedBet';
import PlaceBet from './PlaceBet';
import PlaceBetMob from './PlaceBetMob';
import { getUser } from '../../redux/reducer/authReducer';
import { useDispatch, useSelector } from 'react-redux';
import { FaTv } from 'react-icons/fa6';
import axios from 'axios';
import {
  createBet,
  createfancyBet,
  applyOpenBetsUpdate,
  getPendingBet,
  getPendingBetAmo,
  messageClear,
} from '../../redux/reducer/betReducer';
import { toast } from 'react-toastify';
import { host } from '../../redux/api';
import { fetchLiveMedia } from '../../utils/liveMedia';
import LiveTv from './LiveTv';
import LiveScore from './LiveScore';
function CricketBet() {
  const { game, id } = useParams();
  const location = useLocation();
  const time = location.state?.time;
  const gameid = id;
  const match = game;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [bettingData, setBettingData] = useState(null);
  const [betOdds, setBetOdds] = useState(null);
  const [betAmount, setBetAmount] = useState(0);
  const [loader, setLoader] = useState(false);
  const [showodds, setshowodds] = useState(true);
  const [selectedBet, setSelectedBet] = useState(null);
  const { battingData } = useSelector((state) => state.cricket);
  const { pendingBetAmounts, successMessage, errorMessage } = useSelector(
    (state) => state.bet
  );
  const { userInfo } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    gameId: gameid,
    sid: 4,
    otype: '',
    price: null,
    xValue: '',
    gameType: '',
    gameName: 'Cricket Game',
    teamName: '',
  });
  const [activeSubTab, setActiveSubTab] = useState('Normal');
  const [item, setitem] = useState(null);
  const [showLive, setShowLive] = useState(false);
  const [showlivetv, setshowlivetv] = useState(false);
  const [isScoreCardAvailable, setIsScoreCardAvailable] = useState(true);
  const [isCheckingScoreCard, setIsCheckingScoreCard] = useState(false);
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [scoreIframeUrl, setScoreIframeUrl] = useState('');
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const streamGmid =
    (Array.isArray(bettingData)
      ? bettingData.find((item) => item?.gmid)?.gmid
      : bettingData?.gmid) || gameid;
  // const streamGmid = gameid;
  console.log('streamGmid', streamGmid);

  const subTabs = [
    { id: 'Normal', name: 'ALL' },
    { id: 'Fancy', name: 'Fancy' },
    { id: 'line', name: 'Line Markets' },
    { id: 'ball', name: 'Ball by Ball' },
    { id: 'meter', name: 'Meter Markets' },
    { id: 'khado', name: 'Khado Markets' },
  ];
  // Extract team names from match title
  const matchTitle = decodeURIComponent(game || 'Team 1 v Team 2');
  const teams = matchTitle.split(' v ');
  const team1 = teams[0] || 'Team 1';
  const team2 = teams[1] || 'Team 2';
  console.log(showodds);

  const handleBetSelect = (betData) => {
    setSelectedBet(betData);
  };

  const handleBetChange = (updatedBet) => {
    setSelectedBet(updatedBet);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setshowodds(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const refreshBettingData = useCallback(
    (id) => {
      if (!id) return;
      dispatch(fetchCricketBatingData(id));
    },
    [dispatch]
  );

  useRefreshBettingOnVisible(gameid, refreshBettingData);

  // Initial REST fetch
  useEffect(() => {
    if (gameid) {
      setLoader(true);
      dispatch(fetchCricketBatingData(gameid)).finally(() => {
        setLoader(false);
      });
    }
  }, [dispatch, gameid]);

  // Live WS with reconnect (missed updates while tab was backgrounded)
  useEffect(() => {
    if (!gameid) return;

    let socket;
    let reconnectTimer;
    let closedByCleanup = false;
    let attempt = 0;

    const subscribePayload = () =>
      JSON.stringify({
        type: 'subscribe',
        gameid,
        apitype: 'cricket',
        userId: userInfo?._id,
      });

    const connect = () => {
      socket = new WebSocket(host);

      socket.onopen = () => {
        attempt = 0;
        socket.send(subscribePayload());
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'open_bets_update') {
            const sameUser =
              String(message.userId) === String(userInfo?._id);
            const sameGame = String(message.gameId) === String(gameid);
            if (sameUser || sameGame) {
              dispatch(applyOpenBetsUpdate(message));
            }
            return;
          }
          if (message.gameid === gameid) {
            setBettingData(message.data);
          }
        } catch (err) {
          console.error('❌ Error parsing message:', err);
        }
      };

      socket.onerror = (err) => {
        console.error('❌ WebSocket error:', err);
      };

      socket.onclose = () => {
        if (closedByCleanup) return;
        const delay = Math.min(1000 * 2 ** attempt, 10000);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedByCleanup = true;
      clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [gameid, userInfo?._id]);

  useEffect(() => {
    setBettingData(battingData);
  }, [battingData]);

  useEffect(() => {
    dispatch(getUser());
  }, [dispatch]);

  useEffect(() => {
    if (gameid) {
      dispatch(getPendingBetAmo(gameid));
      dispatch(getPendingBet(gameid));
    }
  }, [dispatch, gameid]);

  // Show toast messages for success/error (centralized to prevent duplicates)
  useEffect(() => {
    if (successMessage) {
      toast.success(successMessage);
      dispatch(messageClear());
      setSelectedBet(null);
      if (gameid) {
        dispatch(getPendingBetAmo(gameid));
        dispatch(getPendingBet(gameid));
      }
    }
    if (errorMessage) {
      toast.error(errorMessage);
      dispatch(messageClear());
    }
  }, [successMessage, errorMessage, dispatch, gameid]);

  // Score + stream iframes from backend (follows API_PROVIDER)
  useEffect(() => {
    const loadLiveMedia = async () => {
      if (!streamGmid) return;
      setIsLoadingStream(true);
      setIsCheckingScoreCard(true);
      try {
        const media = await fetchLiveMedia(streamGmid, 4);
        setScoreIframeUrl(media.score_url || '');
        setLiveStreamUrl(media.stream_url || '');
        setIsScoreCardAvailable(Boolean(media.score_url));
      } catch (error) {
        console.error('Error fetching live media URLs:', error);
        setScoreIframeUrl('');
        setLiveStreamUrl('');
        setIsScoreCardAvailable(false);
      } finally {
        setIsLoadingStream(false);
        setIsCheckingScoreCard(false);
      }
    };

    loadLiveMedia();
  }, [streamGmid]);

  console.log('bettting data', bettingData);

  const matchOddsList = Array.isArray(bettingData)
    ? bettingData.filter(
        (item) =>
          item?.mname === 'MATCH_ODDS' || item?.mname === 'TOURNAMENT_WINNER'
      )
    : [];

  console.log('matchodds from cricketbet', matchOddsList);

  const tiedMatchList = Array.isArray(bettingData)
    ? bettingData.filter(
        (item) =>
          item?.mname === 'Tied Match' || item?.mname === 'Bookmaker IPL CUP'
      )
    : [];

  const newtiedMatchList = Array.isArray(bettingData)
    ? bettingData.filter((item) => item?.mname === 'TIED_MATCH')
    : [];

  const BookmakerList = Array.isArray(bettingData)
    ? bettingData.filter((item) => item.mname === 'Bookmaker')
    : [];

  const Bookmaker2List = Array.isArray(bettingData)
    ? bettingData.filter((item) => item.mname === 'Bookmaker 2')
    : [];

  const fancy1List = bettingData?.filter((item) => item.mname === 'fancy1');

  const fancy1Data =
    Array.isArray(fancy1List) && fancy1List.length > 0 && fancy1List[0].section
      ? fancy1List[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: fancy1List[0].mname, // ✅ Access from first item
          status: fancy1List[0].status, // ✅ Access from first item
        }))
      : [];

  console.log('fancy1Data from cricketbet', fancy1Data);

  const NormalList = bettingData?.filter((item) => item.mname === 'Normal');
  const NormalData =
    Array.isArray(NormalList) && NormalList.length > 0 && NormalList[0].section
      ? NormalList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: NormalList[0].mname, // ✅ Access from first item
          status: sec.gstatus, // ✅ Access from first item
        }))
      : [];

  console.log('NormalData from cricketbet', NormalList);

  const OverByOverList = bettingData?.filter((item) => item.mname === 'Over By Over');
  const OverByOverData =
    Array.isArray(OverByOverList) && OverByOverList.length > 0 && OverByOverList[0].section
      ? OverByOverList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: OverByOverList[0].mname, // ✅ Access from first item
          status: sec.gstatus, // ✅ Access from first item
        }))
      : [];

  console.log('OverByOverData from cricketbet', OverByOverData);

  const khadoList = bettingData?.filter((item) => item.mname === 'khado');
  const khadoData =
    Array.isArray(khadoList) && khadoList.length > 0 && khadoList[0].section
      ? khadoList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: khadoList[0].mname, // ✅ Access from first item
          status: sec.gstatus, // ✅ Access from first item
        }))
      : [];

  console.log('khadoData from cricketbet', khadoData);

  const oddEvenList = bettingData?.filter((item) => item.mname === 'oddeven');
  const oddEvenData =
    Array.isArray(oddEvenList) &&
    oddEvenList.length > 0 &&
    oddEvenList[0].section
      ? oddEvenList[0].section.map((sec) => ({
          team: sec.nat,
          sid: sec.sid,
          odds: sec.odds,
          max: sec.max,
          min: sec.min,
          mname: oddEvenList[0].mname, // ✅ Access from first item
          status: sec.gstatus, // ✅ Access from first item
        }))
      : [];

  console.log('oddEvenData from cricketbet', oddEvenData);

  return (
    <div className='mt-0.5 flex gap-px'>
      <div className='ml-0 w-full md:ml-1 lg:w-[calc(100%-352px)]'>
        <div className='bg-secondary text-secondary flex items-center justify-between p-1 text-[12px] font-bold lg:text-[15px]'>
          <span>{game}</span>
          <span>{time}</span>
        </div>
        <div className='bg-primary text-primary flex items-center justify-around text-[12px] font-bold lg:hidden'>
          <div
            className={`flex w-full items-center justify-center border-r border-r-[#FFFFFF] p-2 ${showodds ? 'border-t-2 border-t-[#cccccc]' : ''}`}
            onClick={() => {
              setshowodds(true);
              
            }}
          >
            ODDS
          </div>
          <div
            className={`flex w-full items-center justify-center border-r border-r-[#FFFFFF] p-2 ${showodds ? '' : 'border-t-2 border-t-[#cccccc]'}`}
            onClick={() => setshowodds(false)}
          >
            MATCHED BET
          </div>
          <div
            className={`flex w-full cursor-pointer items-center justify-center p-2`}
            onClick={() => {
              setShowLive(!showLive);
              setshowodds(true);
            }}
          >
            <FaTv className='text-sm' />
          </div>
        </div>

        {showodds && (
          <div>
            {showLive && (
              <div className='w-full aspect-video'>
                {isLoadingStream ? (
                  <div className='flex h-[50vh] w-full items-center justify-center bg-gray-200'>
                    <span>Loading stream...</span>
                  </div>
                ) : liveStreamUrl ? (
                  <iframe
                    src={liveStreamUrl}
                    title='Watch Live'
                    className='w-full h-full'
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
            )}
            {
              !isCheckingScoreCard &&
              isScoreCardAvailable &&
              scoreIframeUrl && (
              <iframe
                src={scoreIframeUrl}
                allowFullScreen
                className='w-full h-[127px] md:h-[25vh]'
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
            )}
            
            {/** Match Odds */}
            {matchOddsList.length > 0 && (
              <MatchOdds
                gameid={gameid}
                onBetSelect={handleBetSelect}
                matchOddsList={matchOddsList}
                setitem={setitem}
                pendingBetAmounts={pendingBetAmounts}
                selectedBet={selectedBet}
              />
            )}


            <div className='flex flex-col items-start gap-1 md:flex-row'>
              <div className={`w-full ${Bookmaker2List.length > 0 ?'md:w-2/3':''}`}>
                {BookmakerList.length > 0 && (
                  <Bookmaker
                    gameid={gameid}
                    onBetSelect={handleBetSelect}
                    BookmakerList={BookmakerList}
                    pendingBetAmounts={pendingBetAmounts}
                    selectedBet={selectedBet}
                  />
                )}
              </div>
              {Bookmaker2List.length > 0 && (
              <div className={`w-full ${Bookmaker2List.length > 0 ?'md:w-1/3':''}`}>
                <Bookmaker2
                  gameid={gameid}
                  onBetSelect={handleBetSelect}
                  BookmakerList={Bookmaker2List}
                  pendingBetAmounts={pendingBetAmounts}
                  selectedBet={selectedBet}
                />
            </div>)}
            </div>
            
            {/** Bookmaker */}
            

            {/** Bookmaker 2 */}
            

            {/** Tied Match */}
            {tiedMatchList.length > 0 && (
              <TiedMatch
                gameid={gameid}
                onBetSelect={handleBetSelect}
                tiedMatchList={tiedMatchList}
                pendingBetAmounts={pendingBetAmounts}
                selectedBet={selectedBet}
              />
            )}

            {/** Normal */}
            {NormalData.length > 0 && (
              <Normal
                onBetSelect={handleBetSelect}
                NormalData={NormalData}
                pendingBetAmounts={pendingBetAmounts}
                selectedBet={selectedBet}
              />
            )}

            {/** Over By Over */}
            {OverByOverData.length > 0 && (
              <OverByOver
                onBetSelect={handleBetSelect}
                OverByOverData={OverByOverData}
                pendingBetAmounts={pendingBetAmounts}
                selectedBet={selectedBet}
              />
            )}

            {/** Fancy1  */}
            {fancy1Data.length > 0 && (
              <Fancy1
                onBetSelect={handleBetSelect}
                fancy1Data={fancy1Data}
                pendingBetAmounts={pendingBetAmounts}
                selectedBet={selectedBet}
              />
            )}

            {/** */}
            {khadoData.length > 0 && (
              <Khado
                onBetSelect={handleBetSelect}
                khadoData={khadoData}
                pendingBetAmounts={pendingBetAmounts}
                selectedBet={selectedBet}
              />
            )}

            {/** OddEven */}
            {oddEvenData.length > 0 && (
              <OddEven
                onBetSelect={handleBetSelect}
                oddEvenData={oddEvenData}
                pendingBetAmounts={pendingBetAmounts}
                selectedBet={selectedBet}
              />
            )}

            {/** New Tied Match */}
            {newtiedMatchList.length > 0 && (
              <Tied_Match
                onBetSelect={handleBetSelect}
                tiedMatchList={newtiedMatchList}
                pendingBetAmounts={pendingBetAmounts}
                selectedBet={selectedBet}
              />
            )}
          </div>
        )}
        {!showodds && (
          <div className='block lg:hidden'>
            <MatchedBet gameid={gameid} />
          </div>
        )}
      </div>
      <div className='sticky top-0 hidden h-fit lg:block'>
        <div className='w-[350px]'>
          <div className='mb-1'>
            <div
              className='bg-secondary text-secondary cursor-pointer p-1'
              onClick={() => setshowlivetv((prev) => !prev)}
            >
              <span className='font-bold'>Live Match</span>
            </div>
            {showlivetv && (
              <div className='w-full aspect-video'>
                {isLoadingStream ? (
                  <div className='flex h-[50vh] w-full items-center justify-center bg-gray-200'>
                    <span>Loading stream...</span>
                  </div>
                ) : liveStreamUrl ? (
                  <iframe
                    src={liveStreamUrl}
                    title='Watch Live'
                    className='w-full h-full'
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
            )}
          </div>
          <div className=''>
            <PlaceBet
              selectedBet={selectedBet}
              onBetChange={handleBetChange}
              onClose={() => setSelectedBet(null)}
              team1={team1}
              team2={team2}
              item={item}
              gameId={gameid}
              eventName={match}
              sid={4}
              marketName={selectedBet?.marketName}
              gameType={selectedBet?.gameType}
              gameName='Cricket Game'
              maxAmount={selectedBet?.maxAmount}
              minAmount={selectedBet?.minAmount}
            />
          </div>
          <div className='bg-secondary text-secondary p-1'>
            <span className='font-bold'>My Bet</span>
          </div>
          <MatchedBet gameid={gameid} />
        </div>
      </div>

      {/* Mobile PlaceBet Modal */}
      {selectedBet && (
        <>
          <div className="fade modal-backdrop show" onClick={() => setSelectedBet(null)}></div>
            <PlaceBetMob
              selectedBet={selectedBet}
              onBetChange={handleBetChange}
              onClose={() => setSelectedBet(null)}
              team1={team1}
              team2={team2}
              item={item}
              gameId={gameid}
              eventName={match}
              sid={4}
              marketName={selectedBet?.marketName}
              gameType={selectedBet?.gameType}
              gameName='Cricket Game'
              maxAmount={selectedBet?.maxAmount}
              minAmount={selectedBet?.minAmount}
            />
        </>
      )}
    </div>
  );
}

export default CricketBet;

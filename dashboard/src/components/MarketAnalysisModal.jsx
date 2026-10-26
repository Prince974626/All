import React, { useEffect, useState } from 'react';
import { IoMdClose } from 'react-icons/io';
import api from '../redux/api';
import BetLockModal from './BetLockModal';

import { FaCheckSquare, FaRegSquare } from 'react-icons/fa';

const MarketAnalysisModal = ({ isOpen, onClose, clientUser }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBetLockModal, setShowBetLockModal] = useState(false);
  const [selectedLockMarket, setSelectedLockMarket] = useState('Market');
  const [selectedLockEvent, setSelectedLockEvent] = useState('');
  const [selectedLockGameId, setSelectedLockGameId] = useState('');

  const handleOpenLockModal = (e, mName = 'Market', eName = '', gId = '') => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    setSelectedLockMarket(mName);
    setSelectedLockEvent(eName);
    setSelectedLockGameId(gId);
    setShowBetLockModal(true);
  };

  const handleBackdropClose = () => {
    // Keep Market Analysis open while Bet Lock is showing
    if (showBetLockModal) return;
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !clientUser?._id) {
      setData(null);
      return;
    }

    const fetchMarketAnalysis = async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const res = await api.get(`/user-market-analysis/${clientUser._id}`);
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching market analysis:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    };

    fetchMarketAnalysis(false);

    const interval = setInterval(() => {
      fetchMarketAnalysis(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen, clientUser?._id]);

  if (!isOpen) return null;

  const gameDetail = data?.gameDetail || {
    userName: clientUser?.userName || 'N/A',
    accountType: clientUser?.role === 'user' ? 'User' : clientUser?.role || 'User',
    general: clientUser?.avbalance ?? 0,
    exposure: clientUser?.exposure ?? clientUser?.totalExposure ?? 0,
    creditReference: clientUser?.creditReference ?? 0,
  };

  const userLock = Array.isArray(data?.userLock)
    ? data.userLock
    : data?.userLock
      ? [data.userLock]
      : [];

  const gameLock = data?.gameLock || [];
  const matchExposures = data?.matchExposures || [];

  return (
    <>
      {/* Single overlay: modal above backdrop so clicks on the panel do not close it */}
      <div
        className='fixed inset-0 z-[200] flex items-start justify-center bg-black/50 overflow-y-auto pt-6 pb-6'
        onClick={handleBackdropClose}
      >
      <div
        className='relative z-[201] w-full max-w-[90%] ml-[15px] flex flex-col bg-white shadow-2xl overflow-hidden'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className='flex items-center justify-between bg-secondary px-4 py-2.5 text-white'>
          <div className='flex items-center gap-3'>
            <h2 className='text-base font-bold tracking-wide'>Market Analysis</h2>
            {/* <button
              type='button'
              onClick={(e) => handleOpenLockModal(e, 'Market Analysis')}
              className='bg-primary hover:bg-primary/80 text-white text-xs font-bold px-3 py-1 rounded cursor-pointer uppercase shadow transition-colors'
            >
              Bet Lock
            </button> */}
          </div>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              if (!showBetLockModal) onClose();
            }}
            className='flex h-[35px] w-[35px] text-[22px] items-center justify-center rounded-full bg-primary text-white font-[600] text-shadow-[0_1px_0_#fff]'
          >
            ×
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className='flex-1 overflow-y-auto p-[14px] text-xs'>
          {loading ? (
            <div className='p-8 text-center text-sm font-semibold text-gray-600'>
              Loading Market Analysis...
            </div>
          ) : (
            <>
              {/* Top Row Cards Grid */}
              <div className='grid grid-cols-1 md:grid-cols-12 -mx-[5px] items-start'>
                {/* Card 1: Game Detail */}
                <div className='md:col-span-3 px-[5px] bg-white'>
                  <div className='px-2 py-1.5 text-gray-800 text-[21px] leading-[15px] text-[#1e1e1e] mb-[5px]'>
                    Game Detail
                  </div>
                  <div className='p-[5px] max-h-[250px] text-[14px] overflow-y-auto overflow-x-hidden text-[#1e1e1e] rounded-tr-sm rounded-tl-sm border border-[#00000080] shadow-[1px_1px_4px_#000]'>
                    <div className='flex justify-between -mx-[5px]'>
                      <div className='px-[5px] mb-[7px] leading-[15px]'><b>Username</b></div>
                      <div className='px-[5px] mb-[7px] leading-[15px]'><b>{gameDetail.userName}</b></div>
                    </div>
                    <div className='flex justify-between -mx-[5px]'>
                      <div className='px-[5px] mb-[7px] leading-[15px]'>Account Type</div>
                      <div className='px-[5px] mb-[7px] leading-[15px]'>{gameDetail.accountType}</div>
                    </div>
                    <div className='flex justify-between -mx-[5px]'>
                      <div className='px-[5px] mb-[7px] leading-[15px]'>General</div>
                      <div className='px-[5px] mb-[7px] leading-[15px]'>
                        {Number(gameDetail.general).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className='flex justify-between -mx-[5px]'>
                      <div className='px-[5px] mb-[7px] leading-[15px]'>Exposure</div>
                      <div className={`px-[5px] mb-[7px] leading-[15px] ${gameDetail.exposure > 0 ? 'text-red-600' : ''}`}>
                        {Number(gameDetail.exposure).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className='flex justify-between -mx-[5px]'>
                      <div className='px-[5px] mb-[7px] leading-[15px]'>Credit Reference</div>
                      <div className='px-[5px] mb-[7px] leading-[15px]'>
                        {Number(gameDetail.creditReference).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: User Lock */}
                <div className='md:col-span-4 px-[5px] bg-white'>
                  <div className='px-2 py-1.5 text-gray-800 text-[21px] leading-[15px] text-[#1e1e1e] mb-[5px]'>
                    User Lock
                  </div>
                  <div className='overflow-x-auto'>
                    <table className='w-full bg-[#343a40] text-left border-collapse text-sm'>
                      <thead>
                        <tr className=' text-white font-bold'>
                          <th className='px-[0.6562rem] py-1 border-b-[2px] border-[#454d55] leading-[1.2]'>Master Name</th>
                          <th className='px-[0.6562rem] py-1 border-b-[2px] border-[#454d55] leading-[1.2] text-center'>User Act</th>
                          <th className='px-[0.6562rem] py-1 border-b-[2px] border-[#454d55] leading-[1.2] text-center'>Bet Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userLock.length > 0 ? (
                          userLock.map((row, idx) => (
                            <tr key={idx} className='bg-[#ffffff0d] text-white'>
                              <td className='px-[0.6562rem] py-1 border-t border-[#454d55] leading-[1.2]'>
                                {row.masterName}
                              </td>
                              <td className='px-[0.6562rem] py-1 border-t border-[#454d55] leading-[1.2] text-center'>
                                {row.userAct ? (
                                  <FaCheckSquare size={16} className='mx-auto' />
                                ) : (
                                  <FaRegSquare size={16} className='mx-auto opacity-70' />
                                )}
                              </td>
                              <td className='px-[0.6562rem] py-1 border-t border-[#454d55] leading-[1.2] text-center'>
                                {row.betActive ? (
                                  <FaCheckSquare size={16} className='mx-auto' />
                                ) : (
                                  <FaRegSquare size={16} className='mx-auto opacity-70' />
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className='text-white'>
                            <td
                              colSpan={3}
                              className='px-[0.6562rem] py-1 border-t border-[#454d55] leading-[1.2] text-center'
                            >
                              No records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Card 3: Game Lock */}
                <div className='md:col-span-4 rounded border border-gray-300 bg-white shadow-sm overflow-hidden'>
                  <div className='bg-gray-100 border-b border-gray-200 px-3 py-1.5 font-bold text-gray-800 text-sm flex items-center justify-between'>
                    <span>Game Lock</span>
                    {/* <button
                      type='button'
                      onClick={(e) => handleOpenLockModal(e, 'Game Lock')}
                      className='bg-[#0088cc] hover:bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded cursor-pointer uppercase shadow-sm'
                    >
                      Bet Lock
                    </button> */}
                  </div>
                  <div className='overflow-x-auto'>
                    <table className='w-full bg-[#343a40] text-left border-collapse text-sm'>
                      <thead>
                        <tr className='text-white font-bold'>
                          <th className='px-[0.6562rem] py-1 border-b-[2px] border-[#454d55] leading-[1.2] text-left'>S.No.</th>
                          <th className='px-[0.6562rem] py-1 border-b-[2px] border-[#454d55] leading-[1.2] text-left'>Master Name</th>
                          <th className='px-[0.6562rem] py-1 border-b-[2px] border-[#454d55] leading-[1.2]'>Bet Lock</th>
                          <th className='px-[0.6562rem] py-1 border-b-[2px] border-[#454d55] leading-[1.2] text-left'>Event Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameLock.length > 0 ? (
                          gameLock.map((item, idx) => (
                            <tr key={idx} className='bg-[#ffffff0d] text-white'>
                              <td className='px-[0.6562rem] py-1 border-t border-[#454d55] leading-[1.2]'>{idx + 1}</td>
                              <td className='px-[0.6562rem] py-1 border-t border-[#454d55] leading-[1.2]'>{item.masterName}</td>
                              <td className='px-[0.6562rem] py-1 border-t border-[#454d55] leading-[1.2] text-center'>{item.betLock ? 'Yes' : 'No'}</td>
                              <td className='px-[0.6562rem] py-1 border-t border-[#454d55] leading-[1.2]'>{item.eventName}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className='text-white'>
                            <td colSpan={4} className='px-[0.6562rem] py-1 border-t border-[#454d55] leading-[1.2] text-center'>
                              No records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Match Exposure Cards */}
              <div className='my-2.5 space-y-3'>
                {matchExposures.length > 0 ? (
                  matchExposures.map((match, mIdx) => (
                    <div
                      key={mIdx}
                      className='rounded border border-gray-300 bg-white shadow-sm overflow-hidden'
                    >
                      <div className='flex items-center justify-between bg-secondary px-4 py-2 text-white font-bold text-sm'>
                        <span>{match.matchName}</span>
                        <span className='text-xs font-normal text-gray-300'>{match.matchDate}</span>
                      </div>

                      <div className='p-3 space-y-3'>
                        {match.markets.map((market, mkIdx) => (
                          <div key={mkIdx} className='border-b border-gray-100 last:border-0 pb-2'>
                            <div className='flex items-center justify-between mb-2'>
                              <span className='inline-block bg-gray-200 text-gray-800 font-bold px-3 py-0.5 rounded text-xs tracking-wide uppercase'>
                                {market.marketName}
                              </span>
                              <button
                                type='button'
                                onClick={(e) =>
                                  handleOpenLockModal(
                                    e,
                                    market.marketName,
                                    match.matchName,
                                    match.gameId
                                  )
                                }
                                className='bg-primary hover:bg-primary/80 text-white text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer uppercase shadow-sm'
                              >
                                Lock Market ({market.marketName})
                              </button>
                            </div>
                            <div className='max-w-xs space-y-1 pl-1 text-xs'>
                              {market.runners.map((runner, rIdx) => (
                                <div
                                  key={rIdx}
                                  className='flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0'
                                >
                                  <span className='font-semibold text-gray-700'>{runner.runnerName}</span>
                                  <span
                                    className={`font-bold ${
                                      runner.exposure < 0 ? 'text-red-600' : 'text-gray-900'
                                    }`}
                                  >
                                    {runner.exposure}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='rounded border border-gray-300 bg-white p-4 text-center text-gray-500 font-semibold'>
                    No active match exposures or bets found for this client.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </div>
      <BetLockModal
        isOpen={showBetLockModal}
        onClose={() => setShowBetLockModal(false)}
        marketName={selectedLockMarket}
        eventName={selectedLockEvent}
        gameId={selectedLockGameId}
      />
    </>
  );
};

export default MarketAnalysisModal;

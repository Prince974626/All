import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useDispatch, useSelector } from 'react-redux';
import { geAllBetHistory, getBetPerents } from '../redux/reducer/authReducer';
import { motion, AnimatePresence } from 'framer-motion';
import { formatGameName } from '../utils/formatGameName';

const BetList = () => {
  const { bethistoryData, betPerantsData, loading } = useSelector(
    (state) => state.auth
  );
  console.log('bethistoryData', bethistoryData);
  const [selectedGame, setSelectedGame] = useState('Cricket Game');
  const [selectedVoid, setSelectedVoid] = useState('unsettel');
  const [selectedType, setSelectedType] = useState('');
  const [popup, setPopup] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('sports');
  const fetchData = () => {
    dispatch(
      geAllBetHistory({
        page,
        limit,
        selectedGame,
        selectedVoid,
        selectedType,
        betType: activeTab,
      })
    );
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedVoid, page, limit]);
  // console.log(bethistoryData, "bet history data");

  const handelpopup = async (id) => {
    setPopup(true);
    await dispatch(getBetPerents(id));
    console.log('idddd', id);
  };

  return (
    <>
      <Navbar />
      <div className='px-[15px] md:px-7.5'>
        {/* Filter Section */}
        {/* <div className='mb-6 rounded-sm border border-gray-900 bg-[#e0e6e6] pt-2.5 pb-4 text-[13px]'>
          <div className='grid grid-cols-2 items-center md:grid-cols-6'>
            <div className='col-span-1 w-full px-3'>
              <label className='mb-1 block'>Choose Type</label>
              <select
                value={selectedVoid}
                onChange={(e) => setSelectedVoid(e.target.value)}
                className='w-full rounded-[4px] bg-white px-[10px] py-[8px] text-[14px] text-[#5c6873]'
              >
                <option value=''>Choose Type</option>
                <option value='settel'>Settel</option>
                <option value='void'>Void</option>
                <option value='unsettel'>Unsettel</option>
              </select>
            </div>
            <div className='col-span-1 w-full px-3'>
              <label className='mb-1 block'>Choose Sports</label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className='w-full rounded-[4px] bg-white px-[10px] py-[8px] text-[14px] text-[#5c6873]'
              >
                <option value=''>All</option>
                <option value='Cricket Game'>Cricket</option>
                <option value='Tennis Game'>Tennis</option>
                <option value='Soccer Game'>Soccer</option>
                <option value='Casino'>Casino</option>
                <option value='Horse Racing Game'>Horse Racing</option>
                <option value='Greyhound Racing Game'>Greyhound Racing</option>
                <option value='Basket Ball Game'>Basket Ball</option>
                <option value='Lottery Game'>Lottery</option>
              </select>
            </div>
            <div className='col-span-1 w-full px-3'>
              <label className='mb-1 block'>From</label>
              <div className='relative'>
                <input
                  type='date'
                  className='w-full rounded-[4px] border border-[#ccc] px-[10px] py-[8px] text-[14px] text-[#5c6873]'
                  value={pastdate}
                  onChange={(e) => setPastDate(e.target.value)}
                />
              </div>
            </div>
            <div className='col-span-1 w-full px-3'>
              <label className='mb-1 block'>To</label>
              <div className='relative'>
                <input
                  type='date'
                  className='w-full rounded-[4px] border border-[#ccc] px-[10px] py-[8px] text-[14px] text-[#5c6873]'
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <button className='bg-dark w-fit rounded-md px-2.5 py-[5px] text-[14px] font-extrabold text-white'>
                Get History
              </button>
            </div>
          </div>
        </div> */}

        <div className='p-2 text-[18px]'>Current Bets</div>
        <div className='flex border-b border-gray-300'>
          <div
            className={`relative -bottom-[1px] cursor-pointer px-4 py-2 ${activeTab === 'sports' ? 'border border-gray-300 border-b-white bg-white' : ''}`}
            onClick={() => setActiveTab('sports')}
          >
            <input
              type='radio'
              checked={selectedGame === 'Cricket Game'}
              value='unsettel'
              onChange={(e) => {
                setSelectedVoid(e.target.value);
                setSelectedGame('Cricket Game');
              }}
              className='absolute top-0 left-0 h-full w-full opacity-0'
            />{' '}
            Sports
          </div>
          <div
            className={`relative -bottom-[1px] cursor-pointer px-4 py-2 ${activeTab === 'casino' ? 'border border-gray-300 border-b-white bg-white' : ''}`}
            onClick={() => setActiveTab('casino')}
          >
            <input
              type='radio'
              checked={selectedGame === 'Casino'}
              value='unsettel'
              onChange={(e) => {
                setSelectedVoid(e.target.value);
                setSelectedGame('Casino');
              }}
              className='absolute top-0 left-0 h-full w-full opacity-0'
            />{' '}
            Casino
          </div>
        </div>

        {activeTab === 'sports' && (
          <div className='flex items-center gap-2 pt-2'>
            <label className='flex items-center gap-1'>
              <input
                type='radio'
                name='match'
                checked={selectedVoid === 'unsettel'}
                value='unsettel'
                onChange={(e) => {
                  setSelectedVoid(e.target.value);
                  setSelectedGame('Cricket Game');
                }}
              />{' '}
              Matched
            </label>
            <label className='flex items-center gap-1'>
              <input
                type='radio'
                name='match'
                checked={selectedVoid === 'void'}
                value='void'
                onChange={(e) => {
                  setSelectedVoid(e.target.value);
                  setSelectedGame('Cricket Game');
                }}
              />{' '}
              Deleted
            </label>
          </div>
        )}

        <div className='flex items-center gap-2 py-2'>
          <label className='flex items-center gap-1'>
            <input
              type='radio'
              name='gameType'
              checked={selectedType === ''}
              value=''
              onChange={(e) => setSelectedType(e.target.value)}
            />{' '}
            All
          </label>
          <label className='flex items-center gap-1'>
            <input
              type='radio'
              name='gameType'
              checked={selectedType === 'back'}
              value='back'
              onChange={(e) => setSelectedType(e.target.value)}
            />{' '}
            Back
          </label>
          <label className='flex items-center gap-1'>
            <input
              type='radio'
              name='gameType'
              checked={selectedType === 'lay'}
              value='lay'
              onChange={(e) => setSelectedType(e.target.value)}
            />{' '}
            Lay
          </label>
          <div
            className='cursor-pointer rounded-sm bg-[#0088cc] px-2 py-1 text-white'
            onClick={fetchData}
          >
            Load
          </div>
        </div>

        {/* Statement Table */}

        <div>
          <div className='mb-4 flex items-center gap-1 py-1 font-[500]'>
            <span>Show</span>
            <select
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className='border border-gray-300 px-2 py-1'
            >
              <option value='10'>10</option>
              <option value='25'>25</option>
              <option value='50'>50</option>
              <option value='100'>100</option>
            </select>
            <span>entries</span>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full border-collapse border border-gray-300'>
              <thead>
                <tr>
                  <th className='border border-gray-300 p-2 text-left'>
                    <div className='relative flex items-center justify-center pr-5 text-[13px]'>
                      Event Type
                    </div>
                  </th>
                  <th className='border border-gray-300 p-2 text-left'>
                    <div className='relative flex items-center justify-center pr-5 text-[13px]'>
                      Event Name
                    </div>
                  </th>
                  <th className='border border-gray-300 p-2 text-left'>
                    <div className='relative flex items-center justify-center pr-5 text-[13px]'>
                      User Name
                    </div>
                  </th>

                  <th className='border border-gray-300 p-2 text-left'>
                    <div className='relative flex items-center justify-center pr-5 text-[13px]'>
                      M Name
                    </div>
                  </th>
                  <th className='border border-gray-300 p-2 text-left'>
                    <div className='relative flex items-center justify-center pr-5 text-[13px]'>
                      Nation
                    </div>
                  </th>
                  <th className='border border-gray-300 p-2 text-left'>
                    <div className='relative flex items-center justify-center pr-5 text-[13px]'>
                      U Rate
                    </div>
                  </th>
                  <th className='border border-gray-300 p-2 text-left'>
                    <div className='relative flex items-center justify-center pr-5 text-[13px]'>
                      Amount
                    </div>
                  </th>
                  <th className='border border-gray-300 p-2 text-left'>
                    <div className='relative flex items-center justify-center pr-5 text-[13px]'>
                      Place Time
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>Loading</tr>
                ) : bethistoryData.length > 0 ? (
                  bethistoryData.map((item, index) => (
                    <tr
                      key={index}
                      className={`text-center ${item.otype === 'lay' ? 'bg-[#f994ba57]' : 'bg-[#72bbef57]'}`}
                    >
                      <td className='border border-gray-300 p-2'>
                        {formatGameName(item?.gameName)}
                      </td>
                      <td className='border border-gray-300 p-2'>
                        {item?.eventName}
                      </td>
                      <td className='border border-gray-300 p-2'>
                        {item?.userName}
                      </td>
                      <td className='border border-gray-300 p-2'>
                        {item?.marketName}
                      </td>
                      <td className='border border-gray-300 p-2'>
                        {item?.teamName}
                      </td>

                      <td className='border border-gray-300 p-2'>
                        {item.gameType === 'Normal'
                          ? `${item.fancyScore}/`
                          : ''}
                        {item?.xValue}
                      </td>
                      <td className='border border-gray-300 p-2'>
                        {item?.otype === 'back' ? item?.price : item?.betAmount}
                      </td>
                      {/* <td className="border border-gray-300 p-2">
                          <span className="text-green-500">{item?.resultAmount}.00</span> /
                          <span className="text-red-500">-{item?.price}</span>
                        </td>
                        <td className="border border-gray-300 p-2">
                          {item?.status === 0
                            ? <span className="text-red-500">Pending</span>
                            : item?.status === 1 ? <span className="text-green-500">Win</span> : <span className="text-red-500">Lose</span>}
                        </td> */}
                      <td className='border border-gray-300 p-2'>
                        {new Date(item?.createdAt).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='8' className='p-4 text-center'>
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className='mt-4 flex flex-col items-center justify-between md:flex-row'>
            <div className='mb-2 md:mb-0'>
              Showing {limit} entries of {page} page
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setPage(page - 1)}
                className='mx-1 border border-gray-300 px-3 py-1'
              >
                Previous
              </button>
              <p>{page}</p>
              <button
                onClick={() => setPage(page + 1)}
                className='mx-1 border border-gray-300 px-3 py-1'
              >
                Next
              </button>
            </div>
          </div>
        </div>
        {popup && (
          <div
            className='bg-opacity-50 fixed inset-0 z-[100] flex items-start justify-center bg-[#00000082]'
            onClick={() => setPopup(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='mt-8 w-64 rounded-lg bg-white shadow-lg md:w-[300px]'
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className='bg-blue flex h-[38px] items-center justify-between rounded-t-lg p-2 font-bold text-white'>
                <span className='text-[15px]'>Parent List</span>
                <button
                  onClick={() => setPopup(false)}
                  className='text-xl text-white'
                >
                  ×
                </button>
              </div>

              {/* Commission List */}
              <div className='p-4'>
                <div className='rounded-md border border-gray-300'>
                  {[...betPerantsData].reverse().map((item, index) => (
                    <div
                      key={index}
                      className='flex items-center justify-center border-t border-gray-300 px-4 py-3 text-center font-semibold first-of-type:border-t-0'
                    >
                      <span>{item.userName}</span>
                      <span>
                        <span>({item.role.toUpperCase()})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
};

export default BetList;

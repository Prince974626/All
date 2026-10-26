import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { formatGameName } from '../utils/formatGameName';

const DeleteBet = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const isSuperAdmin =
    userInfo?.role === 'supperadmin' || userInfo?.role === 'superadmin';

  const [view, setView] = useState('open');
  const [game, setGame] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const res = await api.get('/admin/delete-bets', {
        params: { view, game, search: search.trim(), page, limit: 25 },
      });
      setRows(res.data?.data || []);
      setPages(res.data?.pagination?.pages || 1);
      setTotal(res.data?.pagination?.total || 0);
    } catch (error) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Failed to load bets');
    } finally {
      setLoading(false);
    }
  }, [game, isSuperAdmin, page, search, view]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, restore) => {
    setBusyId(id);
    try {
      const res = await api.post(
        restore
          ? `/admin/delete-bets/${id}/restore`
          : `/admin/delete-bets/${id}`
      );
      toast.success(res.data?.message || 'Done');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Action failed');
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      <Navbar />
      <div className='px-[15px] pb-8 md:px-7.5'>
        <div className='p-2 text-[18px] font-semibold'>Delete Bet</div>
        {!isSuperAdmin ? (
          <p className='text-sm text-red-600'>
            Only superadmin can delete or restore open bets.
          </p>
        ) : (
          <>
            <div className='mb-3 flex flex-wrap items-center gap-2 text-[13px]'>
              <button
                type='button'
                onClick={() => {
                  setView('open');
                  setPage(1);
                }}
                className={`rounded px-3 py-1 ${view === 'open' ? 'bg-secondary text-white' : 'border'}`}
              >
                Open Bets
              </button>
              <button
                type='button'
                onClick={() => {
                  setView('deleted');
                  setPage(1);
                }}
                className={`rounded px-3 py-1 ${view === 'deleted' ? 'bg-secondary text-white' : 'border'}`}
              >
                Deleted Bets
              </button>
              <select
                value={game}
                onChange={(e) => {
                  setGame(e.target.value);
                  setPage(1);
                }}
                className='h-[32px] rounded border px-2'
              >
                <option value='all'>All</option>
                <option value='cricket'>Cricket</option>
                <option value='casino'>Casino</option>
              </select>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder='Search user name'
                className='h-[32px] rounded border px-2'
              />
              <span className='text-gray-600'>{total} bets</span>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full border-collapse border border-gray-300 text-[13px]'>
                <thead>
                  <tr className='bg-[#e0e6e6]'>
                    {[
                      'User',
                      'Game',
                      'Event',
                      'Market',
                      'Selection',
                      'Side',
                      'Rate',
                      'Amount',
                      'Time',
                      'Action',
                    ].map((label) => (
                      <th key={label} className='border border-gray-300 p-2'>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className='p-4 text-center'>
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className='p-4 text-center'>
                        No bets
                      </td>
                    </tr>
                  ) : (
                    rows.map((bet) => {
                      const amount =
                        String(bet.otype).toLowerCase() === 'back'
                          ? bet.price
                          : bet.betAmount;
                      return (
                        <tr
                          key={bet._id}
                          className={
                            String(bet.otype).toLowerCase() === 'lay'
                              ? 'bg-[#faa9ba]'
                              : 'bg-[#72bbef]'
                          }
                        >
                          <td className='border border-gray-300 p-2'>
                            {bet.userName}
                          </td>
                          <td className='border border-gray-300 p-2'>
                            {formatGameName(bet.gameName)}
                          </td>
                          <td className='border border-gray-300 p-2'>
                            {bet.eventName}
                          </td>
                          <td className='border border-gray-300 p-2'>
                            {bet.marketName}
                          </td>
                          <td className='border border-gray-300 p-2'>
                            {bet.teamName}
                          </td>
                          <td className='border border-gray-300 p-2 uppercase'>
                            {bet.otype}
                          </td>
                          <td className='border border-gray-300 p-2'>
                            {bet.gameType === 'Normal' && bet.fancyScore
                              ? `${bet.fancyScore}/`
                              : ''}
                            {bet.xValue}
                          </td>
                          <td className='border border-gray-300 p-2'>{amount}</td>
                          <td className='border border-gray-300 p-2 whitespace-nowrap'>
                            {bet.createdAt
                              ? new Date(bet.createdAt).toLocaleString('en-IN')
                              : '-'}
                          </td>
                          <td className='border border-gray-300 p-2'>
                            {view === 'open' ? (
                              <button
                                type='button'
                                disabled={busyId === bet._id}
                                onClick={() => act(bet._id, false)}
                                className='rounded bg-red-600 px-2 py-1 text-white disabled:opacity-50'
                              >
                                Delete
                              </button>
                            ) : (
                              <button
                                type='button'
                                disabled={busyId === bet._id}
                                onClick={() => act(bet._id, true)}
                                className='rounded bg-green-700 px-2 py-1 text-white disabled:opacity-50'
                              >
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className='mt-3 flex items-center gap-2 text-[13px]'>
              <button
                type='button'
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className='rounded border px-3 py-1 disabled:opacity-50'
              >
                Prev
              </button>
              <span>
                {page} / {pages}
              </span>
              <button
                type='button'
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className='rounded border px-3 py-1 disabled:opacity-50'
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default DeleteBet;

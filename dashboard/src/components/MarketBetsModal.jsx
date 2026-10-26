import { useMemo, useState } from 'react';
import api from '../redux/api';

const formatModalDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${min}:${sec}`;
};

const MarketBetsModal = ({
  open,
  loading,
  rows,
  total,
  onClose,
  statementRow = null,
}) => {
  const [betFilter, setBetFilter] = useState('all');

  const filteredRows = useMemo(() => {
    if (!rows?.length) return [];
    if (betFilter === 'all') return rows;
    if (betFilter === 'back') {
      return rows.filter((r) => String(r.side || r.otype).toLowerCase() === 'back');
    }
    if (betFilter === 'lay') {
      return rows.filter((r) => String(r.side || r.otype).toLowerCase() === 'lay');
    }
    if (betFilter === 'deleted') {
      return rows.filter((r) => String(r.status || '').toUpperCase() === 'VOID');
    }
    return rows;
  }, [rows, betFilter]);

  const totalWin = useMemo(
    () =>
      filteredRows.reduce((sum, r) => sum + (Number(r.profitLoss) || 0), 0),
    [filteredRows]
  );

  const first = rows?.[0] || {};
  const eventPath = [
    first.competition || statementRow?.gameName,
    first.eventName || statementRow?.eventName,
    first.marketName || statementRow?.marketName || statementRow?.gameType,
  ]
    .filter((p) => p && String(p).toUpperCase() !== 'CASINO')
    .join(' -> ') ||
    [first.competition, first.eventName, first.marketName]
      .filter(Boolean)
      .join(' -> ') ||
    statementRow?.description ||
    '-';

  const winnerLabel =
    first.winner ||
    first.betResult ||
    first.line ||
    statementRow?.betResult ||
    '-';

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-[9999] flex items-start justify-center overflow-auto bg-black/50 pt-10'>
      <div className='w-[98%] max-w-5xl rounded-lg bg-white shadow-lg'>
        <div className='flex items-center justify-between rounded-t-lg bg-primary px-4 py-2 text-white'>
          <span className='text-[18px] font-semibold'>Details</span>
          <button
            type='button'
            onClick={onClose}
            className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white/20 text-lg leading-none hover:bg-white/30'
            aria-label='Close'
          >
            ×
          </button>
        </div>

        <div className='max-h-[75vh] overflow-auto p-4'>
          {loading ? (
            <div className='py-8 text-center text-[14px] text-gray-500'>
              Loading...
            </div>
          ) : (
            <>
              <div className='mb-3 flex flex-wrap items-start justify-between gap-3 text-[13px]'>
                <div className='min-w-0 flex-1 font-medium text-gray-800'>
                  {eventPath}
                </div>
                <div className='space-y-1 text-right text-gray-700'>
                  <div>
                    <span className='font-semibold'>Winner:</span> {winnerLabel}
                  </div>
                  <div>
                    <span className='font-semibold'>Game Time:</span>{' '}
                    {formatModalDate(first.date || statementRow?.date)}
                  </div>
                </div>
              </div>

              <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex flex-wrap gap-4 text-[13px]'>
                  {['all', 'back', 'lay', 'deleted'].map((key) => (
                    <label
                      key={key}
                      className='flex cursor-pointer items-center gap-1 capitalize'
                    >
                      <input
                        type='radio'
                        name='marketBetFilter'
                        checked={betFilter === key}
                        onChange={() => setBetFilter(key)}
                      />
                      {key}
                    </label>
                  ))}
                </div>
                <div className='text-[13px] font-semibold'>
                  Total Bets: {filteredRows.length}{' '}
                  <span className='ml-2'>
                    Total Win:{' '}
                    <span
                      className={
                        totalWin < 0
                          ? 'text-red-600'
                          : totalWin > 0
                            ? 'text-green-700'
                            : ''
                      }
                    >
                      {totalWin.toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>

              <div className='overflow-x-auto'>
                <table className='w-full min-w-[900px] border-collapse border border-gray-300 text-[13px]'>
                  <thead>
                    <tr className='bg-[#e0e6e6] text-left'>
                      {[
                        'Username',
                        'Nation',
                        'Rate',
                        'Bhav',
                        'Amount',
                        'Win',
                        'Date',
                        'IP',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className='border border-gray-300 px-2 py-1.5 font-bold whitespace-nowrap'
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length > 0 ? (
                      filteredRows.map((row, index) => {
                        const isLay =
                          String(row.side || row.otype).toLowerCase() === 'lay';
                        const isBack =
                          String(row.side || row.otype).toLowerCase() ===
                          'back';
                        const pl = Number(row.profitLoss);
                        return (
                          <tr
                            key={`${row.userName}-${index}`}
                            className={
                              isLay
                                ? 'bg-[#faa9ba]'
                                : isBack
                                  ? 'bg-[#72bbef]'
                                  : 'bg-white'
                            }
                          >
                            <td className='border border-gray-300 px-2 py-1.5'>
                              {row.userName || '-'}
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5'>
                              {row.runner || row.marketName || '-'}
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5 text-right font-semibold'>
                              {row.line !== '-' ? row.line : row.rate}
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5 text-right font-semibold'>
                              {row.line !== '-' ? row.rate : '-'}
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5 text-right font-semibold'>
                              {row.amount}
                            </td>
                            <td
                              className={`border border-gray-300 px-2 py-1.5 text-right font-semibold ${
                                pl < 0
                                  ? 'text-red-600'
                                  : pl > 0
                                    ? 'text-green-700'
                                    : ''
                              }`}
                            >
                              {row.profitLoss}
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5 whitespace-nowrap'>
                              {formatModalDate(row.date)}
                            </td>
                            <td className='border border-gray-300 px-2 py-1.5'>
                              {row.clientIp || '-'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className='px-2 py-6 text-center text-gray-500'
                        >
                          No bets found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className='border-t px-4 py-3 text-[13px] text-gray-600'>
          Showing {filteredRows.length > 0 ? `1 - ${filteredRows.length}` : '0'}{' '}
          of {total || filteredRows.length} entries
        </div>
      </div>
    </div>
  );
};

export const fetchMarketBetsForStatementRow = async (row) => {
  const query = new URLSearchParams();
  // GGR third-party only uses CasinoBetHistory (type/sourceType === 'casino').
  // Our-casino (Lucky5 etc.) is stored in betHistory like sports — keep sourceType sports.
  const isGgrCasino =
    row.sourceType === 'casino' || row.type === 'casino';

  if (row.sourceId) {
    query.append(
      'sourceType',
      isGgrCasino ? 'casino' : row.sourceType || 'sports'
    );
    query.append('sourceId', row.sourceId);
  }
  if (row.userName) query.append('userName', row.userName);
  if (row.date) query.append('rowDate', new Date(row.date).toISOString());
  if (row.gameName) query.append('gameName', row.gameName);
  if (row.eventName) query.append('eventName', row.eventName);
  if (row.marketName) query.append('marketName', row.marketName);

  const res = await api.get(
    `/admin/account-statement/market-bets?${query.toString()}`,
    { withCredentials: true }
  );
  return {
    rows: res.data?.data || [],
    total: res.data?.pagination?.total || 0,
  };
};

export default MarketBetsModal;

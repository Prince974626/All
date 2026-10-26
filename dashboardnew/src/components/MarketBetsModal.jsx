import api from '../redux/api';

const formatModalDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${min}:${sec} ${ampm}`;
};

const MarketBetsModal = ({ open, loading, rows, total, onClose }) => {
  if (!open) return null;

  return (
    <div className='fixed inset-0 z-[9999] flex items-start justify-center overflow-auto bg-black/50 pt-10'>
      <div className='w-[98%] max-w-6xl rounded-lg bg-white shadow-lg'>
        <div className='flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#5ecbdd] to-[#146578] px-4 py-2 text-white'>
          <span className='text-[18px] font-semibold'>Market Bets</span>
          <button
            type='button'
            onClick={onClose}
            className='cursor-pointer text-2xl leading-none text-white hover:opacity-80'
          >
            ×
          </button>
        </div>

        <div className='max-h-[70vh] overflow-x-auto p-3'>
          <table className='w-full min-w-[1100px] border-collapse border border-gray-300'>
            <thead>
              <tr className='bg-black text-white'>
                {[
                  'User',
                  'Competition',
                  'Event',
                  'Market',
                  'Runner',
                  'Side',
                  'Line',
                  'Rate',
                  'Amount',
                  'P/L',
                  'Status',
                  'Client IP',
                  'Date & Time',
                ].map((heading) => (
                  <th
                    key={heading}
                    className='border-r border-white px-2 py-1.5 text-left text-[13px] font-bold whitespace-nowrap last:border-r-0'
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={13}
                    className='px-2 py-6 text-center text-[14px] text-gray-500'
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row, index) => {
                  const isLay = String(row.side).toLowerCase() === 'lay';
                  const isBack = String(row.side).toLowerCase() === 'back';
                  const pl = Number(row.profitLoss);
                  return (
                    <tr
                      key={`${row.userName}-${index}`}
                      className={`border border-gray-300 text-[13px] ${
                        isLay
                          ? 'bg-[#faa9ba]'
                          : isBack
                            ? 'bg-[#72bbef]'
                            : 'bg-white'
                      }`}
                    >
                      <td className='border border-gray-300 px-2 py-1.5'>
                        {row.userName}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5'>
                        {row.competition}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5'>
                        {row.eventName}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5'>
                        {row.marketName}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5'>
                        {row.runner}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5'>
                        {row.side}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5 text-right font-bold'>
                        {row.line}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5 text-right font-bold'>
                        {row.rate}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5 text-right font-bold'>
                        {row.amount}
                      </td>
                      <td
                        className={`border border-gray-300 px-2 py-1.5 text-right font-bold ${
                          pl < 0
                            ? 'text-red-600'
                            : pl > 0
                              ? 'text-green-700'
                              : ''
                        }`}
                      >
                        {row.profitLoss}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5'>
                        {row.status}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5'>
                        {row.clientIp}
                      </td>
                      <td className='border border-gray-300 px-2 py-1.5 whitespace-nowrap'>
                        {formatModalDate(row.date)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={13}
                    className='px-2 py-6 text-center text-[14px] text-gray-500'
                  >
                    No bets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className='flex items-center justify-between border-t px-4 py-3 text-[13px]'>
          <div>
            Showing {rows.length > 0 ? `1 - ${rows.length}` : '0'} of {total}{' '}
            entries
          </div>
          <div className='flex'>
            <button
              type='button'
              className='pgBtn rounded-l-sm px-[13px] py-[6.5px] opacity-50'
              disabled
            >
              First
            </button>
            <button
              type='button'
              className='pgBtn px-[12px] py-[6px] opacity-50'
              disabled
            >
              Prev
            </button>
            <button className='bg-gradient-to-b from-[#11859c] to-[#181818] px-[13px] py-[6.5px] leading-none text-white'>
              1
            </button>
            <button
              type='button'
              className='pgBtn px-[13px] py-[6.5px] opacity-50'
              disabled
            >
              Next
            </button>
            <button
              type='button'
              className='pgBtn rounded-r-sm px-[13px] py-[6.5px] opacity-50'
              disabled
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const fetchMarketBetsForStatementRow = async (row) => {
  const query = new URLSearchParams();
  if (row.sourceId) {
    query.append('sourceType', row.sourceType || 'sports');
    query.append('sourceId', row.sourceId);
  }
  if (row.userName) query.append('userName', row.userName);
  if (row.date) query.append('rowDate', new Date(row.date).toISOString());

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

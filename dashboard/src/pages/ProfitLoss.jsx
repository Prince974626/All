import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { toast } from 'react-toastify';

const ROLE_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'user', label: 'User' },
  { key: 'agent', label: 'Agent' },
  { key: 'master', label: 'Master' },
  { key: 'admin', label: 'Admin' },
];

const formatNumber = (val) => {
  const num = Number(val || 0);
  return num.toFixed(2);
};

const ptsClass = (val) => {
  const n = Number(val || 0);
  if (n > 0) return 'text-[#0e7926] font-medium';
  if (n < 0) return 'text-[#c7313f] font-medium';
  return 'text-gray-700 font-medium';
};

const ProfitLoss = () => {
  const [selectedRole, setSelectedRole] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const loadReport = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedRole && selectedRole !== 'all') {
        queryParams.append('role', selectedRole);
      }
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await api.get(
        `/get/profit-loss-by-user?${queryParams.toString()}`,
        { withCredentials: true }
      );

      if (res.data?.success) {
        setReportData(res.data?.data || []);
      } else {
        setReportData([]);
      }
      setHasLoaded(true);
      setPage(1);
    } catch (error) {
      console.error('Error loading Profit/Loss report:', error);
      toast.error(
        error.response?.data?.message || 'Failed to load Profit & Loss report'
      );
      setReportData([]);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return reportData;
    const q = tableSearch.trim().toLowerCase();
    return reportData.filter(
      (row) =>
        String(row.userName || '')
          .toLowerCase()
          .includes(q) ||
        String(row.level || '')
          .toLowerCase()
          .includes(q)
    );
  }, [reportData, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, item) => {
        acc.casinoPts += Number(item.casinoPts || 0);
        acc.sportsPts += Number(item.sportsPts || 0);
        acc.thirdPartyPts += Number(item.thirdPartyPts || 0);
        acc.profitLoss += Number(item.profitLoss || 0);
        return acc;
      },
      { casinoPts: 0, sportsPts: 0, thirdPartyPts: 0, profitLoss: 0 }
    );
  }, [filteredRows]);

  return (
    <>
      <Navbar />
      <div className='px-[15px] md:px-7.5 py-4'>
        <div className='py-2 text-[22px] font-bold text-[#1e1e1e]'>
          Profit Loss
        </div>

        <div className='mt-3 mb-4 flex flex-wrap items-end gap-3'>
          <div className='flex flex-col'>
            <label className='mb-1 text-[13px] font-bold text-gray-700'>
              Level
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className='h-[34px] min-w-[160px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className='flex flex-col'>
            <label className='mb-1 text-[13px] font-bold text-gray-700'>
              From
            </label>
            <input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='h-[34px] rounded border border-gray-300 px-2 py-1 text-[13px] outline-none'
            />
          </div>

          <div className='flex flex-col'>
            <label className='mb-1 text-[13px] font-bold text-gray-700'>
              To
            </label>
            <input
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className='h-[34px] rounded border border-gray-300 px-2 py-1 text-[13px] outline-none'
            />
          </div>

          <button
            onClick={loadReport}
            disabled={loading}
            className='h-[34px] cursor-pointer rounded bg-secondary px-5 text-[13px] font-medium text-white hover:bg-secondary70 disabled:opacity-60'
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-2 text-[13px]'>
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className='h-[30px] rounded border border-gray-300 px-2 outline-none'
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>entries</span>
          </div>
          <div className='flex items-center gap-2 text-[13px]'>
            <span>Search:</span>
            <input
              type='text'
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setPage(1);
              }}
              className='h-[30px] w-[180px] rounded border border-gray-300 px-2 outline-none'
            />
          </div>
        </div>

        <div className='overflow-x-auto rounded-md border border-gray-200 bg-white shadow-sm'>
          <table className='w-full border-collapse border border-gray-200'>
            <thead>
              <tr className='border-b border-gray-200 bg-[#f8f9fa] text-[13px] font-semibold text-gray-700'>
                <th className='w-14 border-r border-gray-200 px-3 py-2.5 text-left'>
                  No
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                  User Name
                </th>
                <th className='w-32 border-r border-gray-200 px-3 py-2.5 text-left'>
                  Level
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Casino Pts
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Sport Pts
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Third Party Pts
                </th>
                <th className='px-3 py-2.5 text-right'>Profit/Loss</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className='py-8 text-center font-medium text-gray-500'
                  >
                    Loading Profit & Loss data...
                  </td>
                </tr>
              ) : pageRows.length > 0 ? (
                <>
                  {pageRows.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className={`border-b border-gray-200 text-[13px] ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfc]'
                      } hover:bg-gray-50`}
                    >
                      <td className='border-r border-gray-200 px-3 py-2 text-left text-gray-600'>
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td className='border-r border-gray-200 px-3 py-2 text-left font-semibold text-[#0088cc]'>
                        {item.userName}
                      </td>
                      <td className='border-r border-gray-200 px-3 py-2 text-left capitalize text-gray-600'>
                        {item.level || 'User'}
                      </td>
                      <td
                        className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(item.casinoPts)}`}
                      >
                        {formatNumber(item.casinoPts)}
                      </td>
                      <td
                        className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(item.sportsPts)}`}
                      >
                        {formatNumber(item.sportsPts)}
                      </td>
                      <td
                        className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(item.thirdPartyPts)}`}
                      >
                        {formatNumber(item.thirdPartyPts)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-bold ${ptsClass(item.profitLoss)}`}
                      >
                        {formatNumber(item.profitLoss)}
                      </td>
                    </tr>
                  ))}

                  <tr className='border-t-2 border-gray-300 bg-[#eef5fa] text-[13px] font-bold'>
                    <td
                      colSpan={3}
                      className='border-r border-gray-300 px-3 py-2.5 text-right text-gray-800'
                    >
                      Total:
                    </td>
                    <td
                      className={`border-r border-gray-300 px-3 py-2.5 text-right ${ptsClass(totals.casinoPts)}`}
                    >
                      {formatNumber(totals.casinoPts)}
                    </td>
                    <td
                      className={`border-r border-gray-300 px-3 py-2.5 text-right ${ptsClass(totals.sportsPts)}`}
                    >
                      {formatNumber(totals.sportsPts)}
                    </td>
                    <td
                      className={`border-r border-gray-300 px-3 py-2.5 text-right ${ptsClass(totals.thirdPartyPts)}`}
                    >
                      {formatNumber(totals.thirdPartyPts)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right ${ptsClass(totals.profitLoss)}`}
                    >
                      {formatNumber(totals.profitLoss)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className='py-8 text-center font-medium text-gray-500'
                  >
                    {hasLoaded
                      ? 'No Profit & Loss records found'
                      : 'Click Load to fetch Profit & Loss'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 0 && (
          <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]'>
            <div className='text-gray-600'>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredRows.length)} of{' '}
              {filteredRows.length} entries
            </div>
            <div className='flex items-center gap-1'>
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage(1)}
                className='rounded border border-gray-300 px-2 py-1 disabled:opacity-40'
              >
                First
              </button>
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className='rounded border border-gray-300 px-2 py-1 disabled:opacity-40'
              >
                Prev
              </button>
              <span className='px-2 font-semibold'>{currentPage}</span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className='rounded border border-gray-300 px-2 py-1 disabled:opacity-40'
              >
                Next
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
                className='rounded border border-gray-300 px-2 py-1 disabled:opacity-40'
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProfitLoss;

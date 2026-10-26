import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import ClientNameSearch from '../components/ClientNameSearch';
import api from '../redux/api';
import { toast } from 'react-toastify';
import { FaFilePdf } from 'react-icons/fa';
import { AiFillFileExcel } from 'react-icons/ai';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const formatPts = (val) => Number(val || 0).toFixed(2);

const ptsClass = (val) => {
  const n = Number(val || 0);
  if (n > 0) return 'text-[#0e7926] font-medium';
  if (n < 0) return 'text-[#c7313f] font-medium';
  return 'text-gray-700 font-medium';
};

const toLocalYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 10);
  return { start: toLocalYmd(start), end: toLocalYmd(end) };
};

const UserWinLoss = () => {
  const initial = defaultRange();
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  const handleLoad = async (override = {}) => {
    const from = override.startDate ?? startDate;
    const to = override.endDate ?? endDate;
    const search =
      override.clientSearch ??
      (selectedClientName || clientSearch);

    if (!from || !to) {
      toast.error('Please select both start and end dates');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/get/users/win-loss', {
        params: {
          startDate: from,
          endDate: to,
          ...(String(search || '').trim()
            ? { searchQuery: String(search).trim() }
            : {}),
        },
        withCredentials: true,
      });
      setData(res.data?.data || []);
      setHasLoaded(true);
    } catch (err) {
      setData([]);
      setHasLoaded(true);
      toast.error(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    const range = defaultRange();
    setStartDate(range.start);
    setEndDate(range.end);
    setClientSearch('');
    setSelectedClientName('');
    setTableSearch('');
    handleLoad({
      startDate: range.start,
      endDate: range.end,
      clientSearch: '',
    });
  };

  const filteredData = useMemo(() => {
    if (!tableSearch.trim()) return data;
    const q = tableSearch.trim().toLowerCase();
    return data.filter((row) =>
      String(row.userName || '')
        .toLowerCase()
        .includes(q)
    );
  }, [data, tableSearch]);

  const totals = useMemo(
    () =>
      filteredData.reduce(
        (acc, row) => ({
          casinoPL: acc.casinoPL + Number(row.casinoPL || 0),
          sportsPL: acc.sportsPL + Number(row.sportsPL || 0),
          thirdPartyPL: acc.thirdPartyPL + Number(row.thirdPartyPL || 0),
          totalPL: acc.totalPL + Number(row.totalPL || 0),
        }),
        { casinoPL: 0, sportsPL: 0, thirdPartyPL: 0, totalPL: 0 }
      ),
    [filteredData]
  );

  const downloadPDF = () => {
    if (!filteredData.length) {
      toast.error('No data to export. Load the report first.');
      return;
    }
    const doc = new jsPDF();
    doc.text('User Win Loss', 14, 15);
    const body = filteredData.map((row, i) => [
      i + 1,
      row.userName,
      formatPts(row.casinoPL),
      formatPts(row.sportsPL),
      formatPts(row.thirdPartyPL),
      formatPts(row.totalPL),
    ]);
    body.push([
      '',
      'Total',
      formatPts(totals.casinoPL),
      formatPts(totals.sportsPL),
      formatPts(totals.thirdPartyPL),
      formatPts(totals.totalPL),
    ]);
    autoTable(doc, {
      head: [['No', 'User Name', 'Casino', 'Sport', 'Third Party', 'Profit/Loss']],
      body,
      startY: 20,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 136, 204] },
    });
    doc.save('user-win-loss.pdf');
  };

  const downloadExcel = () => {
    if (!filteredData.length) {
      toast.error('No data to export. Load the report first.');
      return;
    }
    const tableData = filteredData.map((row, i) => ({
      No: i + 1,
      'User Name': row.userName,
      Casino: Number(row.casinoPL || 0),
      Sport: Number(row.sportsPL || 0),
      'Third Party': Number(row.thirdPartyPL || 0),
      'Profit/Loss': Number(row.totalPL || 0),
    }));
    tableData.push({
      No: '',
      'User Name': 'Total',
      Casino: totals.casinoPL,
      Sport: totals.sportsPL,
      'Third Party': totals.thirdPartyPL,
      'Profit/Loss': totals.totalPL,
    });
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'User Win Loss');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    saveAs(
      new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'user-win-loss.xlsx'
    );
  };

  return (
    <>
      <Navbar />
      <div className='px-[15px] py-4 md:px-7.5'>
        <div className='py-2 text-[22px] font-bold text-[#1e1e1e]'>
          User Win Loss
        </div>

        <div className='mt-3 mb-4 flex flex-wrap items-end gap-2'>
          <ClientNameSearch
            value={clientSearch}
            selectedUserName={selectedClientName}
            onChange={setClientSearch}
            onSelect={setSelectedClientName}
          />
          <div className='flex flex-col'>
            <label className='mb-1 text-[13px] font-bold text-gray-700'>
              Select Date Range
            </label>
            <div className='flex items-center gap-1'>
              <input
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className='h-[34px] min-w-[140px] rounded border border-gray-300 px-2 text-[13px] outline-none'
              />
              <span className='text-[13px] text-gray-500'>-</span>
              <input
                type='date'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className='h-[34px] min-w-[140px] rounded border border-gray-300 px-2 text-[13px] outline-none'
              />
            </div>
          </div>
          <button
            type='button'
            onClick={() => handleLoad()}
            disabled={loading}
            className='h-[34px] cursor-pointer rounded bg-secondary px-4 text-[13px] font-medium text-white hover:bg-secondary70 disabled:opacity-60'
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
          <button
            type='button'
            onClick={handleReset}
            className='h-[34px] cursor-pointer rounded border border-gray-300 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50'
          >
            Reset
          </button>
          <button
            type='button'
            title='Excel'
            onClick={downloadExcel}
            className='flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded bg-green-500 text-white hover:bg-green-600'
          >
            <AiFillFileExcel className='size-4' />
          </button>
          <button
            type='button'
            title='PDF'
            onClick={downloadPDF}
            className='flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded bg-red-500 text-white hover:bg-red-600'
          >
            <FaFilePdf className='size-4' />
          </button>
        </div>

        <div className='mb-2 flex justify-end text-[13px]'>
          <div className='flex items-center gap-2'>
            <span>Search:</span>
            <input
              type='text'
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
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
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Casino
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Sport
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Third Party
                </th>
                <th className='px-3 py-2.5 text-right'>Profit/Loss</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className='py-8 text-center font-medium text-gray-500'
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                <>
                  {filteredData.map((row, i) => (
                    <tr
                      key={row.userId || i}
                      className={`border-b border-gray-200 text-[13px] ${
                        i % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfc]'
                      }`}
                    >
                      <td className='border-r border-gray-200 px-3 py-2 text-gray-600'>
                        {i + 1}
                      </td>
                      <td className='border-r border-gray-200 px-3 py-2 font-semibold text-[#0088cc]'>
                        {row.userName}
                      </td>
                      <td
                        className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.casinoPL)}`}
                      >
                        {formatPts(row.casinoPL)}
                      </td>
                      <td
                        className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.sportsPL)}`}
                      >
                        {formatPts(row.sportsPL)}
                      </td>
                      <td
                        className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.thirdPartyPL)}`}
                      >
                        {formatPts(row.thirdPartyPL)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-bold ${ptsClass(row.totalPL)}`}
                      >
                        {formatPts(row.totalPL)}
                      </td>
                    </tr>
                  ))}
                  <tr className='border-t-2 border-gray-300 bg-[#eef5fa] text-[13px] font-bold'>
                    <td
                      className='border-r border-gray-300 px-3 py-2.5'
                      colSpan={2}
                    />
                    <td
                      className={`border-r border-gray-300 px-3 py-2.5 text-right ${ptsClass(totals.casinoPL)}`}
                    >
                      {formatPts(totals.casinoPL)}
                    </td>
                    <td
                      className={`border-r border-gray-300 px-3 py-2.5 text-right ${ptsClass(totals.sportsPL)}`}
                    >
                      {formatPts(totals.sportsPL)}
                    </td>
                    <td
                      className={`border-r border-gray-300 px-3 py-2.5 text-right ${ptsClass(totals.thirdPartyPL)}`}
                    >
                      {formatPts(totals.thirdPartyPL)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right ${ptsClass(totals.totalPL)}`}
                    >
                      {formatPts(totals.totalPL)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className='py-8 text-center font-medium text-gray-500'
                  >
                    {hasLoaded
                      ? 'No data found for selected range.'
                      : 'Select date range and click Load.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default UserWinLoss;

import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { toast } from 'react-toastify';
import { FaFilePdf } from 'react-icons/fa';
import { AiFillFileExcel } from 'react-icons/ai';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

const formatNumber = (value) => Number(value || 0).toFixed(2);

const ptsClass = (val) => {
  const n = Number(val || 0);
  if (n > 0) return 'text-[#0e7926] font-medium';
  if (n < 0) return 'text-[#c7313f] font-medium';
  return 'text-gray-700 font-medium';
};

const TotalProfitLoss = () => {
  const initial = defaultRange();
  const [gameType, setGameType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sportsReport, setSportsReport] = useState([]);
  const [casinoReport, setCasinoReport] = useState([]);
  const [thirdPartyReport, setThirdPartyReport] = useState([]);
  const [sportsTotal, setSportsTotal] = useState(0);
  const [casinoTotal, setCasinoTotal] = useState(0);
  const [thirdPartyTotal, setThirdPartyTotal] = useState(0);
  const [tableSearch, setTableSearch] = useState('');
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const loadReport = async (override = {}) => {
    const from = override.startDate ?? startDate;
    const to = override.endDate ?? endDate;
    const q = override.searchQuery ?? searchQuery;
    const selected = override.selectedUserName ?? selectedUserName;

    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (q) query.append('searchQuery', q);
      if (selected) query.append('userName', selected);
      if (from) query.append('startDate', from);
      if (to) query.append('endDate', to);

      const res = await api.get(`/get/total-profit-loss?${query.toString()}`, {
        withCredentials: true,
      });

      const data = res.data?.data || {};
      setSportsReport(data.sportsReport || []);
      setCasinoReport(data.casinoReport || []);
      setThirdPartyReport(
        data.thirdPartyReport || [
          { name: 'Third Party', opening: 0, closing: 0, profitLoss: 0 },
        ]
      );
      setSportsTotal(Number(data.sportsTotal || 0));
      setCasinoTotal(Number(data.casinoTotal || 0));
      setThirdPartyTotal(Number(data.thirdPartyTotal || 0));
      setHasLoaded(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load report');
      setSportsReport([]);
      setCasinoReport([]);
      setThirdPartyReport([
        { name: 'Third Party', opening: 0, closing: 0, profitLoss: 0 },
      ]);
      setSportsTotal(0);
      setCasinoTotal(0);
      setThirdPartyTotal(0);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    const range = defaultRange();
    setSearchQuery('');
    setSelectedUserName('');
    setStartDate(range.start);
    setEndDate(range.end);
    setGameType('all');
    setTableSearch('');
    loadReport({
      startDate: range.start,
      endDate: range.end,
      searchQuery: '',
      selectedUserName: '',
    });
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(
          `/get/all-only-user?page=1&limit=10&searchQuery=${encodeURIComponent(searchQuery.trim())}`,
          { withCredentials: true }
        );
        const suggestions = (res.data?.data || [])
          .map((u) => u?.userName)
          .filter(Boolean);
        setUserSuggestions([...new Set(suggestions)]);
        setShowSuggestions(true);
      } catch {
        setUserSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const q = tableSearch.trim().toLowerCase();
  const filteredSports = useMemo(
    () =>
      !q
        ? sportsReport
        : sportsReport.filter(
            (row) =>
              String(row.eventName || '')
                .toLowerCase()
                .includes(q) ||
              String(row.gameType || '')
                .toLowerCase()
                .includes(q)
          ),
    [sportsReport, q]
  );
  const filteredCasino = useMemo(
    () =>
      !q
        ? casinoReport
        : casinoReport.filter((row) =>
            String(row.name || row.eventName || '')
              .toLowerCase()
              .includes(q)
          ),
    [casinoReport, q]
  );
  const filteredThirdParty = useMemo(
    () =>
      !q
        ? thirdPartyReport
        : thirdPartyReport.filter((row) =>
            String(row.name || '')
              .toLowerCase()
              .includes(q)
          ),
    [thirdPartyReport, q]
  );

  const downloadExcel = () => {
    if (!hasLoaded) {
      toast.error('Load the report first.');
      return;
    }
    const sheets = {};
    if (gameType === 'all' || gameType === 'sports') {
      sheets.Sports = [
        ...filteredSports.map((row) => ({
          'Event Name': row.eventName,
          'Game Type': row.gameType,
          Opening: Number(row.opening || 0),
          Closing: Number(row.closing || 0),
          'Profit/Loss': Number(row.profitLoss || 0),
        })),
        {
          'Event Name': 'Total Profit/Loss',
          'Game Type': '',
          Opening: '',
          Closing: '',
          'Profit/Loss': sportsTotal,
        },
      ];
    }
    if (gameType === 'all' || gameType === 'casino') {
      sheets.Casino = [
        ...filteredCasino.map((row) => ({
          'Casino Name': row.name || row.eventName,
          Opening: Number(row.opening || 0),
          Closing: Number(row.closing || 0),
          'Profit/Loss': Number(row.profitLoss || 0),
        })),
        {
          'Casino Name': 'Total Profit/Loss',
          Opening: '',
          Closing: '',
          'Profit/Loss': casinoTotal,
        },
      ];
    }
    if (gameType === 'all' || gameType === 'thirdparty') {
      sheets['Third Party'] = [
        ...filteredThirdParty.map((row) => ({
          'Third Party Name': row.name,
          Opening: Number(row.opening || 0),
          Closing: Number(row.closing || 0),
          'Profit/Loss': Number(row.profitLoss || 0),
        })),
        {
          'Third Party Name': 'Total Profit/Loss',
          Opening: '',
          Closing: '',
          'Profit/Loss': thirdPartyTotal,
        },
      ];
    }
    const workbook = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([name, rows]) => {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(rows),
        name
      );
    });
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'total-profit-loss.xlsx'
    );
  };

  const downloadPDF = () => {
    if (!hasLoaded) {
      toast.error('Load the report first.');
      return;
    }
    const doc = new jsPDF();
    let y = 15;
    doc.text('Total Profit Loss', 14, y);
    y += 6;

    const addSection = (title, head, body) => {
      doc.setFontSize(11);
      doc.text(title, 14, y);
      y += 2;
      autoTable(doc, {
        head: [head],
        body,
        startY: y,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 136, 204] },
      });
      y = (doc.lastAutoTable?.finalY || y) + 10;
    };

    if (gameType === 'all' || gameType === 'sports') {
      const body = filteredSports.map((row) => [
        row.eventName,
        row.gameType,
        formatNumber(row.opening),
        formatNumber(row.closing),
        formatNumber(row.profitLoss),
      ]);
      body.push(['', '', '', 'Total Profit/Loss', formatNumber(sportsTotal)]);
      addSection(
        'Sports Report',
        ['Event Name', 'Game Type', 'Opening', 'Closing', 'Profit/Loss'],
        body.length ? body : [['There are no records to show', '', '', '', '']]
      );
    }
    if (gameType === 'all' || gameType === 'casino') {
      const body = filteredCasino.map((row) => [
        row.name || row.eventName,
        formatNumber(row.opening),
        formatNumber(row.closing),
        formatNumber(row.profitLoss),
      ]);
      body.push(['', '', 'Total Profit/Loss', formatNumber(casinoTotal)]);
      addSection(
        'Casino Report',
        ['Casino Name', 'Opening', 'Closing', 'Profit/Loss'],
        body.length ? body : [['There are no records to show', '', '', '']]
      );
    }
    if (gameType === 'all' || gameType === 'thirdparty') {
      const body = filteredThirdParty.map((row) => [
        row.name,
        formatNumber(row.opening),
        formatNumber(row.closing),
        formatNumber(row.profitLoss),
      ]);
      body.push(['', '', 'Total Profit/Loss', formatNumber(thirdPartyTotal)]);
      addSection(
        'Third Party Report',
        ['Third Party Name', 'Opening', 'Closing', 'Profit/Loss'],
        body
      );
    }

    doc.save('total-profit-loss.pdf');
  };

  const renderEmptyRow = (colSpan) => (
    <tr>
      <td
        colSpan={colSpan}
        className='border-r border-gray-200 px-3 py-4 text-center text-[13px] text-gray-500'
      >
        There are no records to show
      </td>
    </tr>
  );

  return (
    <>
      <Navbar />
      <div className='px-[15px] py-4 md:px-7.5'>
        <div className='py-2 text-[22px] font-bold text-[#1e1e1e]'>
          Total Profit Loss
        </div>

        <div className='mt-3 mb-4 flex flex-wrap items-end gap-2'>
          <div className='relative flex flex-col' ref={searchRef}>
            <label className='mb-1 text-[13px] font-bold text-gray-700'>
              Search By Client Name
            </label>
            <input
              type='text'
              className='h-[34px] min-w-[200px] rounded border border-gray-300 px-2 text-[13px] outline-none'
              placeholder='Select option'
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedUserName('');
              }}
              onFocus={() =>
                searchQuery.trim().length >= 3 &&
                userSuggestions.length > 0 &&
                setShowSuggestions(true)
              }
            />
            {showSuggestions && userSuggestions.length > 0 && (
              <div className='absolute top-[58px] z-20 max-h-56 min-w-[200px] overflow-y-auto rounded border border-gray-200 bg-white shadow-lg'>
                {userSuggestions.map((name) => (
                  <button
                    key={name}
                    type='button'
                    onClick={() => {
                      setSearchQuery(name);
                      setSelectedUserName(name);
                      setShowSuggestions(false);
                    }}
                    className='block w-full cursor-pointer px-2 py-1.5 text-left text-sm hover:bg-gray-100'
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className='flex flex-col'>
            <label className='mb-1 text-[13px] font-bold text-gray-700'>
              Select Date Range
            </label>
            <div className='flex items-center gap-1'>
              <input
                type='date'
                className='h-[34px] min-w-[140px] rounded border border-gray-300 px-2 text-[13px] outline-none'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className='text-[13px] text-gray-500'>-</span>
              <input
                type='date'
                className='h-[34px] min-w-[140px] rounded border border-gray-300 px-2 text-[13px] outline-none'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className='flex flex-col'>
            <label className='mb-1 text-[13px] font-bold text-gray-700'>
              Type
            </label>
            <select
              className='h-[34px] min-w-[180px] rounded border border-gray-300 px-2 text-[13px] outline-none'
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
            >
              <option value='all'>All</option>
              <option value='sports'>Sports Report</option>
              <option value='casino'>Casino Report</option>
              <option value='thirdparty'>Third Party Report</option>
            </select>
          </div>

          <button
            type='button'
            onClick={() => loadReport()}
            disabled={loading}
            className='h-[34px] cursor-pointer rounded bg-[#0088cc] px-4 text-[13px] font-medium text-white hover:bg-[#0077b3] disabled:opacity-60'
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
          <button
            type='button'
            onClick={resetFilters}
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

        {(gameType === 'all' || gameType === 'sports') && (
          <div className='mb-6'>
            <div className='pb-1 text-[14px] font-semibold'>Sports Report</div>
            <div className='overflow-x-auto rounded-md border border-gray-200 bg-white shadow-sm'>
              <table className='w-full border-collapse border border-gray-200'>
                <thead>
                  <tr className='border-b border-gray-200 bg-[#f8f9fa] text-[13px] font-semibold text-gray-700'>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                      Event Name
                    </th>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                      Game Type
                    </th>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                      Opening
                    </th>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                      Closing
                    </th>
                    <th className='px-3 py-2.5 text-right'>Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className='py-6 text-center text-[13px] text-gray-500'
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : filteredSports.length === 0 ? (
                    renderEmptyRow(5)
                  ) : (
                    filteredSports.map((row, index) => (
                      <tr
                        key={`${row.eventName}-${row.gameType}-${index}`}
                        className='border-b border-gray-200 text-[13px]'
                      >
                        <td className='border-r border-gray-200 px-3 py-2'>
                          {row.eventName}
                        </td>
                        <td className='border-r border-gray-200 px-3 py-2'>
                          {row.gameType}
                        </td>
                        <td
                          className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.opening)}`}
                        >
                          {formatNumber(row.opening)}
                        </td>
                        <td
                          className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.closing)}`}
                        >
                          {formatNumber(row.closing)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${ptsClass(row.profitLoss)}`}
                        >
                          {formatNumber(row.profitLoss)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className='border-t-2 border-gray-300 bg-[#eef5fa] text-[13px] font-bold'>
                    <td
                      className='border-r border-gray-300 px-3 py-2.5 text-right'
                      colSpan={4}
                    >
                      Total Profit/Loss
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right ${ptsClass(sportsTotal)}`}
                    >
                      {formatNumber(sportsTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(gameType === 'all' || gameType === 'casino') && (
          <div className='mb-6'>
            <div className='pb-1 text-[14px] font-semibold'>Casino Report</div>
            <div className='overflow-x-auto rounded-md border border-gray-200 bg-white shadow-sm'>
              <table className='w-full border-collapse border border-gray-200'>
                <thead>
                  <tr className='border-b border-gray-200 bg-[#f8f9fa] text-[13px] font-semibold text-gray-700'>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                      Casino Name
                    </th>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                      Opening
                    </th>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                      Closing
                    </th>
                    <th className='px-3 py-2.5 text-right'>Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className='py-6 text-center text-[13px] text-gray-500'
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : filteredCasino.length === 0 ? (
                    renderEmptyRow(4)
                  ) : (
                    filteredCasino.map((row, index) => (
                      <tr
                        key={`${row.name || row.eventName}-${index}`}
                        className='border-b border-gray-200 text-[13px]'
                      >
                        <td className='border-r border-gray-200 px-3 py-2'>
                          {row.name || row.eventName}
                        </td>
                        <td
                          className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.opening)}`}
                        >
                          {formatNumber(row.opening)}
                        </td>
                        <td
                          className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.closing)}`}
                        >
                          {formatNumber(row.closing)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${ptsClass(row.profitLoss)}`}
                        >
                          {formatNumber(row.profitLoss)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className='border-t-2 border-gray-300 bg-[#eef5fa] text-[13px] font-bold'>
                    <td
                      className='border-r border-gray-300 px-3 py-2.5 text-right'
                      colSpan={3}
                    >
                      Total Profit/Loss
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right ${ptsClass(casinoTotal)}`}
                    >
                      {formatNumber(casinoTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(gameType === 'all' || gameType === 'thirdparty') && (
          <div className='mb-6'>
            <div className='pb-1 text-[14px] font-semibold'>
              Third Party Report
            </div>
            <div className='overflow-x-auto rounded-md border border-gray-200 bg-white shadow-sm'>
              <table className='w-full border-collapse border border-gray-200'>
                <thead>
                  <tr className='border-b border-gray-200 bg-[#f8f9fa] text-[13px] font-semibold text-gray-700'>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                      Third Party Name
                    </th>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                      Opening
                    </th>
                    <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                      Closing
                    </th>
                    <th className='px-3 py-2.5 text-right'>Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className='py-6 text-center text-[13px] text-gray-500'
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    filteredThirdParty.map((row, index) => (
                      <tr
                        key={`${row.name}-${index}`}
                        className='border-b border-gray-200 text-[13px]'
                      >
                        <td className='border-r border-gray-200 px-3 py-2'>
                          {row.name}
                        </td>
                        <td
                          className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.opening)}`}
                        >
                          {formatNumber(row.opening)}
                        </td>
                        <td
                          className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.closing)}`}
                        >
                          {formatNumber(row.closing)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${ptsClass(row.profitLoss)}`}
                        >
                          {formatNumber(row.profitLoss)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className='border-t-2 border-gray-300 bg-[#eef5fa] text-[13px] font-bold'>
                    <td
                      className='border-r border-gray-300 px-3 py-2.5 text-right'
                      colSpan={3}
                    >
                      Total Profit/Loss
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right ${ptsClass(thirdPartyTotal)}`}
                    >
                      {formatNumber(thirdPartyTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TotalProfitLoss;

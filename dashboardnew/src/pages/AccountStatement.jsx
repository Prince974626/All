import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { hasClientSearchAccess } from '../utils/roleUtils';
import MarketBetsModal, {
  fetchMarketBetsForStatementRow,
} from '../components/MarketBetsModal';
import { formatAbsDisplayValue } from '../utils/formatDisplayAmount';

const formatStatementBalance = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return { text: '0.00', className: 'text-black' };
  const text = formatAbsDisplayValue(n, 2);
  if (n === 0) return { text, className: 'font-bold text-black' };
  if (n > 0) return { text, className: 'font-bold text-[#0e7926]' };
  return { text, className: 'font-bold text-[#c7313f]' };
};

const StatementBalance = ({ value, className = '' }) => {
  const { text, className: colorClass } = formatStatementBalance(value);
  return <span className={`${colorClass} ${className}`.trim()}>{text}</span>;
};

const CATEGORY_STYLES = {
  Settlement: 'bg-purple-100 text-purple-800',
  Deposit: 'bg-green-100 text-green-800',
  Withdraw: 'bg-red-100 text-red-800',
  Bonus: 'bg-amber-100 text-amber-800',
  Sports: 'bg-blue-100 text-blue-800',
  Casino: 'bg-indigo-100 text-indigo-800',
  'Opening Balance': 'bg-gray-100 text-gray-800',
};

const CASINOS = [
  { key: 'all', label: 'ALL' },
  { key: 'livecasino', label: 'Indian Poker / Live Casino' },
  { key: 'indianpoker2', label: 'Indian Poker II' },
  { key: 'pragmatic', label: 'Pragmatic' },
  { key: 'evolution', label: 'Evolution' },
  { key: 'casino2', label: 'Casino II' },
  { key: 'vivo', label: 'Vivo' },
  { key: 'betgames', label: 'Bet Games' },
  { key: 'casino3', label: 'Casino III' },
  { key: 'spribe', label: 'Spribe' },
];

const getStatementExportMeta = (accountType) => ({
  hideType: accountType === 'settlement' || accountType === 'sports',
  creditLabel: accountType === 'casino' ? 'Net Win' : 'Credit',
  debitLabel: accountType === 'casino' ? 'Net Loss' : 'Debit',
});

const formatStatementExportDate = (value) =>
  value ? new Date(value).toLocaleString('en-US') : '-';

const formatStatementCreditDebit = (v) => {
  const num = Number(v) || 0;
  return num > 0 ? num : '-';
};

const buildStatementQuery = ({
  startDate,
  endDate,
  pageNum,
  limitNum,
  accountType,
  gameType,
  sportsGameType,
  sportsList,
  canSearchByClient,
  selectedUserName,
  searchQuery,
}) => {
  const query = new URLSearchParams();
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);
  query.append('page', pageNum);
  query.append('limit', limitNum);

  if (accountType === 'casino' || accountType === 'sports') {
    query.append('gameType', accountType);
  } else if (
    gameType &&
    gameType !== 'all' &&
    accountType !== 'settlement' &&
    accountType !== 'deposit' &&
    accountType !== 'bonus'
  ) {
    query.append('gameType', gameType);
  }

  if (
    accountType === 'sports' ||
    accountType === 'all' ||
    accountType === 'casino'
  ) {
    if (sportsGameType) query.append('sportsGameType', sportsGameType);
    if (sportsList && sportsList !== 'all')
      query.append('sportsName', sportsList);
  }
  if (canSearchByClient && (selectedUserName || searchQuery.trim())) {
    query.append('userName', selectedUserName || searchQuery.trim());
  }

  query.append('accountType', accountType);
  return query;
};

const buildStatementExcelRows = ({
  rows,
  accountType,
  startDate,
  endDate,
  closingBalance,
  ledgerOpeningBalance,
  includeClosingRow = true,
  includeOpeningRow = true,
}) => {
  const { hideType, creditLabel, debitLabel } =
    getStatementExportMeta(accountType);

  const buildRow = ({
    dateTime,
    type,
    credit,
    debit,
    closing,
    description,
    fromTo,
  }) => {
    const row = { 'Date & Time': dateTime };
    if (!hideType) row.Type = type;
    row[creditLabel] = credit;
    row[debitLabel] = debit;
    row.Closing = closing;
    row.Description = description;
    row['From → to'] = fromTo;
    return row;
  };

  const tableData = [];

  if (includeClosingRow && rows.length > 0) {
    tableData.push(
      buildRow({
        dateTime: formatStatementExportDate(endDate),
        type: 'Closing Balance',
        credit: '-',
        debit: '-',
        closing: closingBalance,
        description: 'Closing Balance (C/F)',
        fromTo: '',
      })
    );
  }

  rows.forEach((row) => {
    tableData.push(
      buildRow({
        dateTime: formatStatementExportDate(row.date),
        type: row.category || '-',
        credit: formatStatementCreditDebit(row.credit),
        debit: formatStatementCreditDebit(row.debit),
        closing: row.closing !== undefined ? Number(row.closing) : '-',
        description: row.description || '-',
        fromTo: row.fromto || row.userName || '-',
      })
    );
  });

  if (
    includeOpeningRow &&
    rows.length > 0 &&
    Math.abs(ledgerOpeningBalance) > 0.01
  ) {
    tableData.push(
      buildRow({
        dateTime: formatStatementExportDate(startDate),
        type: 'Opening Balance',
        credit: '-',
        debit: '-',
        closing: ledgerOpeningBalance,
        description: 'Opening Balance (B/F)',
        fromTo: '',
      })
    );
  }

  return tableData;
};

const buildStatementPdfHtml = ({
  rows,
  accountType,
  startDate,
  endDate,
  closingBalance,
  ledgerOpeningBalance,
  includeClosingRow = true,
  includeOpeningRow = true,
}) => {
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const formatTableMoney = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return '0.00';
    return n.toFixed(2);
  };

  const moneyClosing = (n) => {
    const num = Number(n) || 0;
    const absText = formatAbsDisplayValue(num, 2);
    const color = num === 0 ? '#212529' : num > 0 ? '#0e7926' : '#c7313f';
    return `<td class="num" style="color:${color}">${absText}</td>`;
  };

  const creditCell = (v) => {
    const num = Number(v) || 0;
    if (num <= 0) return '<td class="num">-</td>';
    return `<td class="num" style="color:#0e7926">${formatTableMoney(num)}</td>`;
  };

  const debitCell = (v) => {
    const num = Number(v) || 0;
    if (num <= 0) return '<td class="num">-</td>';
    return `<td class="num" style="color:#c7313f">${formatTableMoney(num)}</td>`;
  };

  const { hideType, creditLabel, debitLabel } =
    getStatementExportMeta(accountType);
  const typeHeader = hideType ? '' : '<th>Type</th>';
  const rowParts = [];

  if (includeClosingRow && rows.length > 0) {
    rowParts.push(`
      <tr>
        <td>${esc(formatStatementExportDate(endDate))}</td>
        ${hideType ? '' : '<td>Closing Balance</td>'}
        <td class="num">-</td>
        <td class="num">-</td>
        ${moneyClosing(closingBalance)}
        <td>Closing Balance (C/F)</td>
        <td></td>
      </tr>`);
  }

  rows.forEach((row) => {
    rowParts.push(`
      <tr>
        <td>${esc(formatStatementExportDate(row.date))}</td>
        ${hideType ? '' : `<td>${esc(row.category || '-')}</td>`}
        ${creditCell(row.credit)}
        ${debitCell(row.debit)}
        ${row.closing !== undefined ? moneyClosing(row.closing) : '<td class="num">-</td>'}
        <td>${esc(row.description || '-')}</td>
        <td>${esc(row.fromto || row.userName || '-')}</td>
      </tr>`);
  });

  if (
    includeOpeningRow &&
    rows.length > 0 &&
    Math.abs(ledgerOpeningBalance) > 0.01
  ) {
    rowParts.push(`
      <tr>
        <td>${esc(formatStatementExportDate(startDate))}</td>
        ${hideType ? '' : '<td>Opening Balance</td>'}
        <td class="num">-</td>
        <td class="num">-</td>
        ${moneyClosing(ledgerOpeningBalance)}
        <td>Opening Balance (B/F)</td>
        <td></td>
      </tr>`);
  }

  return `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8" />
    <title>Account Statement</title>
    <style>
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; }
      table { border-collapse: collapse; width: 100%; font-size: 12px; }
      th {
        background: #000000;
        color: #ffffff;
        font-weight: bold;
        border: 1px solid #fff;
        padding: 6px 6px;
        text-align: left;
        font-size: 20px;
        line-height: 17px;
        vertical-align: bottom;
      }
      td {
        border: 1px solid #e5e7eb;
        padding: 3px 6px;
        font-weight: bold;
        color: #212529;
        vertical-align: middle;
        font-size: 20px;
        line-height: 1;
      }
      td.num { text-align: right; white-space: nowrap; }
    </style>
    </head>
    <body>
    <table>
      <thead>
        <tr>
          <th>Date &amp; Time</th>
          ${typeHeader}
          <th>${creditLabel}</th>
          <th>${debitLabel}</th>
          <th>Closing</th>
          <th>Description</th>
          <th>From → to</th>
        </tr>
      </thead>
      <tbody>
        ${rowParts.join('')}
      </tbody>
    </table>
    </body>
    </html>`;
};

const printStatementPdf = (html) => {
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';

  document.body.appendChild(printFrame);

  const frameDoc =
    printFrame.contentDocument || printFrame.contentWindow.document;

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  printFrame.onload = () => {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();

    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  };
};

const saveStatementExcel = (tableData, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(tableData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Statement');

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  const fileData = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(fileData, filename);
};

/* ============ Main Page ============ */

const AccountStatement = () => {
  const [accountType, setAccountType] = useState('all');
  const [gameType, setGameType] = useState('all');
  const [sportsGameType, setSportsGameType] = useState('');
  const [sportsList, setSportsList] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const getFormattedDateTime = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    let hours = '' + d.getHours();
    let minutes = '' + d.getMinutes();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    if (hours.length < 2) hours = '0' + hours;
    if (minutes.length < 2) minutes = '0' + minutes;

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return getFormattedDateTime(d);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return getFormattedDateTime(d);
  });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [ledgerOpeningBalance, setLedgerOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const { userInfo } = useSelector((state) => state.auth);

  const canSearchByClient = hasClientSearchAccess(userInfo?.role);
  const hideTypeColumn =
    accountType === 'settlement' || accountType === 'sports';
  const tableColSpan = hideTypeColumn ? 8 : 9;
  const [marketBetsModal, setMarketBetsModal] = useState({
    open: false,
    loading: false,
    rows: [],
    total: 0,
  });

  const isClickableGameRow = (row) =>
    accountType === 'sports' &&
    Boolean(row?.sourceId) &&
    ['bet', 'commission', 'casino'].includes(row?.type);

  const displayRows = useMemo(() => rows, [rows]);

  const getQueryParams = (pageNum, limitNum) =>
    buildStatementQuery({
      startDate,
      endDate,
      pageNum,
      limitNum,
      accountType,
      gameType,
      sportsGameType,
      sportsList,
      canSearchByClient,
      selectedUserName,
      searchQuery,
    });

  const fetchReportPage = async (pageNum, limitNum) => {
    const res = await api.get(
      `/account-statement/history?${getQueryParams(pageNum, limitNum).toString()}`,
      { withCredentials: true }
    );
    return res.data;
  };

  const getCurrentPageExportPayload = () => ({
    rows: displayRows,
    closingBalance,
    ledgerOpeningBalance,
    includeClosingRow: page === 1,
    includeOpeningRow:
      page === totalPages && Math.abs(ledgerOpeningBalance) > 0.01,
  });

  const downloadPDF = () => {
    if (!hasSearched || displayRows.length === 0) {
      toast.error('No data to export. Run a search first.');
      return;
    }

    printStatementPdf(
      buildStatementPdfHtml({
        ...getCurrentPageExportPayload(),
        accountType,
        startDate,
        endDate,
      })
    );
  };

  const downloadExcel = () => {
    if (!hasSearched || displayRows.length === 0) {
      toast.error('No data to export. Run a search first.');
      return;
    }

    saveStatementExcel(
      buildStatementExcelRows({
        ...getCurrentPageExportPayload(),
        accountType,
        startDate,
        endDate,
      }),
      `account-statement-${accountType}.xlsx`
    );
  };

  const fetchAllReportData = async () => {
    if (!hasSearched) {
      toast.error('Run a search first.');
      return null;
    }
    if (total === 0) {
      toast.error('No data to export.');
      return null;
    }

    const data = await fetchReportPage(1, total);
    const allRows = data?.data || [];
    if (allRows.length === 0) {
      toast.error('No data to export.');
      return null;
    }

    return {
      rows: allRows,
      closingBalance: data?.closingBalance || 0,
      ledgerOpeningBalance:
        data?.ledgerOpeningBalance ?? data?.openingBalance ?? 0,
    };
  };

  const downloadPDFAll = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const payload = await fetchAllReportData();
      if (!payload) return;

      printStatementPdf(
        buildStatementPdfHtml({
          ...payload,
          accountType,
          startDate,
          endDate,
          includeClosingRow: true,
          includeOpeningRow: true,
        })
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to export full PDF'
      );
    } finally {
      setExporting(false);
    }
  };

  const downloadExcelAll = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const payload = await fetchAllReportData();
      if (!payload) return;

      saveStatementExcel(
        buildStatementExcelRows({
          ...payload,
          accountType,
          startDate,
          endDate,
          includeClosingRow: true,
          includeOpeningRow: true,
        }),
        `account-statement-${accountType}-all.xlsx`
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to export full Excel'
      );
    } finally {
      setExporting(false);
    }
  };

  const openMarketBetsModal = async (row) => {
    setMarketBetsModal({ open: true, loading: true, rows: [], total: 0 });
    try {
      const { rows: marketRows, total } =
        await fetchMarketBetsForStatementRow(row);
      setMarketBetsModal({
        open: true,
        loading: false,
        rows: marketRows,
        total,
      });
    } catch (error) {
      setMarketBetsModal({ open: true, loading: false, rows: [], total: 0 });
      toast.error(
        error?.response?.data?.message || 'Failed to load market bets'
      );
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSelectedUserName('');
    if (!query) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await api.get(
        `/get/all-downline-members?page=1&limit=10&searchQuery=${encodeURIComponent(query)}`,
        { withCredentials: true }
      );
      const suggestions = (res.data?.data || [])
        .map((u) => u?.userName)
        .filter(Boolean);
      setUserSuggestions([...new Set(suggestions)]);
      setShowSuggestions(true);
    } catch (error) {
      setUserSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const resetFilters = () => {
    setAccountType('all');
    setGameType('all');
    setSportsGameType('');
    setSportsList('');
    setSearchQuery('');
    setSelectedUserName('');
    const dEnd = new Date();
    dEnd.setDate(dEnd.getDate() + 1);
    dEnd.setHours(0, 0, 0, 0);
    setEndDate(getFormattedDateTime(dEnd));
    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 1);
    dStart.setHours(0, 0, 0, 0);
    setStartDate(getFormattedDateTime(dStart));
    setUserSuggestions([]);
    setShowSuggestions(false);
    setRows([]);
    setPage(1);
    setLimit(25);
    setTotal(0);
    setTotalPages(1);
    setOpeningBalance(0);
    setLedgerOpeningBalance(0);
    setClosingBalance(0);
    setHasSearched(false);
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await fetchReportPage(page, limit);

      setRows(data?.data || []);
      setTotal(data?.pagination?.total || 0);
      setTotalPages(data?.pagination?.pages || 1);
      setOpeningBalance(data?.openingBalance || 0);
      setLedgerOpeningBalance(
        data?.ledgerOpeningBalance ?? data?.openingBalance ?? 0
      );
      setClosingBalance(data?.closingBalance || 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setOpeningBalance(0);
      setLedgerOpeningBalance(0);
      setClosingBalance(0);
      toast.error(error?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  // Trigger load on component mount or filter changes
  useEffect(() => {
    if (hasSearched) {
      loadReport();
    }
  }, [page, limit]);

  const renderClientSearch = () =>
    canSearchByClient ? (
      <div className='relative grid' ref={searchRef}>
        <input
          type='text'
          className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 outline-0'
          placeholder='Search by client'
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (userSuggestions.length > 0) setShowSuggestions(true);
          }}
        />
        {showSuggestions && userSuggestions.length > 0 && (
          <ul className='absolute top-full z-20 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg'>
            {userSuggestions.map((name) => (
              <li
                key={name}
                className='cursor-pointer px-2 py-1.5 text-left text-sm hover:bg-black hover:text-white'
                onClick={() => {
                  setSearchQuery(name);
                  setSelectedUserName(name);
                  setShowSuggestions(false);
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : null;

  return (
    <>
      <Navbar />
      <div className='scrollbar-hide pb-10 md:px-[15px] md:pt-[13px]'>
        <div className='min-h-[600px] rounded-lg bg-white px-[15px] py-[7px]'>
          <div className='text-[15px] font-bold'>Account Statement Report</div>

          <div className='mt-2 mb-2 grid items-end gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7'>
            <select
              className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value);
                setSportsList('');
              }}
            >
              <option value='all'>ALL</option>
              <option value='deposit'>BALANCE REPORT</option>
              <option value='sports'>GAME REPORT</option>
              <option value='settlement'>SETTLEMENT REPORT</option>
              <option value='bonus'>BONUS REPORT</option>
              <option value='casino'>CASINO REPORT</option>
            </select>

            {accountType === 'all' && (
              <>
                <select className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
                  <option value=''>ALL</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            {accountType === 'deposit' && (
              <>
                <select className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
                  <option value=''>ALL</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            {accountType === 'sports' && (
              <>
                <select
                  className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
                  value={sportsList}
                  onChange={(e) => setSportsList(e.target.value)}
                >
                  <option value='all'>ALL</option>
                  <option value='cricket'>Cricket</option>
                  <option value='tennis'>Tennis</option>
                  <option value='soccer'>Soccer</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            {accountType === 'casino' && (
              <>
                <select
                  className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
                  value={sportsList}
                  onChange={(e) => setSportsList(e.target.value)}
                >
                  {CASINOS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {renderClientSearch()}
              </>
            )}

            {accountType === 'settlement' && (
              <>
                <select className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
                  <option value=''>ALL</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            {accountType === 'bonus' && (
              <>
                <select className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'>
                  <option value=''>ALL</option>
                </select>
                {renderClientSearch()}
              </>
            )}

            <input
              type='datetime-local'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
            />

            <input
              type='datetime-local'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className='col-span-1 h-[30px] w-full rounded-sm border border-gray-300 px-2 py-1.5 text-gray-500 outline-0'
            />

            <div className='col-span-1 flex gap-1 outline-0'>
              <button
                type='button'
                onClick={() => {
                  setHasSearched(true);
                  if (page === 1) {
                    loadReport();
                  } else {
                    setPage(1);
                  }
                }}
                className='cursor-pointer rounded bg-[#0088cc] px-4 py-1.5 text-white hover:bg-[#006699]'
              >
                Go
              </button>
              <button
                type='button'
                onClick={resetFilters}
                className='cursor-pointer rounded bg-gray-100 px-4 py-1.5 text-black hover:bg-gray-200'
              >
                Reset
              </button>
            </div>
          </div>

          {hasSearched && (
            <>
              <div className='mb-5 flex flex-wrap items-end justify-between gap-5'>
                <div className='flex flex-wrap items-end gap-1'>
                  <input
                    type='text'
                    placeholder='Search'
                    className='h-fit rounded-sm border border-gray-300 px-2 py-1 outline-0'
                  />
                </div>
                <table className='w-full md:w-[500px]'>
                  <tbody>
                    <tr>
                      <td className='w-1/2 border border-gray-200 px-1 py-1 text-center text-[12px]'>
                        Closing Balance
                      </td>
                      <td className='w-1/2 border border-gray-200 px-1 py-1 text-end text-[12px]'>
                        <StatementBalance value={closingBalance} />
                      </td>
                    </tr>
                    <tr>
                      <td className='w-1/2 border border-gray-200 px-1 py-1 text-center text-[12px]'>
                        Opening Balance
                      </td>
                      <td className='w-1/2 border border-gray-200 px-1 py-1 text-end text-[12px]'>
                        <StatementBalance value={openingBalance} />
                      </td>
                    </tr>
                  </tbody>
                  <tr></tr>
                </table>
                <div>
                  <span>Show</span>
                  <select
                    name='limit'
                    id='limit'
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className='mx-2 rounded-sm border border-gray-300 px-2 py-1 text-gray-500 outline-0'
                  >
                    <option value='25'>25</option>
                    <option value='50'>50</option>
                    <option value='100'>100</option>
                  </select>
                  <span>entries</span>
                </div>
              </div>
              <div className='scrollbar-hide overflow-x-scroll'>
                <table className='w-[1000px] table-auto border-collapse border border-gray-300 md:w-full'>
                  <thead>
                    <tr className='bg-black text-white'>
                      <th className='border-r border-white px-2 py-1 text-left text-[14px]'>
                        Date & Time
                      </th>

                      {accountType !== 'settlement' &&
                        accountType !== 'sports' && (
                          <th className='border-r border-white px-2 py-1 text-left text-[14px]'>
                            Type
                          </th>
                        )}

                      <th className='w-[100px] border-r border-white px-2 py-1 text-right text-[14px] whitespace-nowrap'>
                        {accountType === 'casino' ? 'Net Win' : 'Credit'}
                      </th>

                      <th className='w-[100px] border-r border-white px-2 py-1 text-right text-[14px] whitespace-nowrap'>
                        {accountType === 'casino' ? 'Net Loss' : 'Debit'}
                      </th>

                      <th className='w-[100px] border-r border-white px-2 py-1 text-right text-[14px] whitespace-nowrap'>
                        Closing
                      </th>

                      <th className='w-[100px] border-r border-white px-2 py-1 text-right text-[14px] whitespace-nowrap'>
                        Stake
                      </th>

                      <th className='w-[100px] border-r border-white px-2 py-1 text-right text-[14px] whitespace-nowrap'>
                        Odds
                      </th>

                      <th className='border-r border-white px-2 py-1 text-left text-[14px]'>
                        Description
                      </th>

                      <th className='px-2 py-1 text-left text-[14px]'>
                        From → to
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={tableColSpan}
                          className='py-4 text-center text-[14px] text-gray-500'
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      <>
                        {page === 1 &&
                          hasSearched &&
                          displayRows.length > 0 && (
                            <tr className='border border-gray-300 bg-[#f8f9fa] font-semibold'>
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                {endDate
                                  ? new Date(endDate).toLocaleString('en-US')
                                  : '-'}
                              </td>
                              {accountType !== 'settlement' &&
                                accountType !== 'sports' && (
                                  <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                    <span className='inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[12px] font-medium text-gray-800'>
                                      Closing Balance
                                    </span>
                                  </td>
                                )}
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                -
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                -
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px]'>
                                <StatementBalance value={closingBalance} />
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px]'>
                                -
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px]'>
                                -
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                Closing Balance (C/F)
                              </td>
                              <td className='px-2 py-1.5 text-[14px]' />
                            </tr>
                          )}
                        {displayRows.length > 0 ? (
                          displayRows.map((row, index) => (
                            <tr
                              key={`${row.date}-${row.sourceId || index}`}
                              className={`border border-gray-300 ${
                                row.otype === 'back'
                                  ? 'bg-[#72bbef]'
                                  : row.otype === 'lay'
                                    ? 'bg-[#faa9ba]'
                                    : 'bg-white odd:bg-gray-100'
                              }`}
                            >
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                {row.date
                                  ? new Date(row.date).toLocaleString('en-US')
                                  : '-'}
                              </td>
                              {accountType !== 'settlement' &&
                                accountType !== 'sports' && (
                                  <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                    {row.category ? (
                                      <span
                                        className={`inline-block rounded px-1.5 py-0.5 text-[12px] font-medium whitespace-nowrap ${
                                          CATEGORY_STYLES[row.category] ||
                                          'bg-gray-100 text-gray-700'
                                        }`}
                                      >
                                        {row.category}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                )}
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px] font-semibold text-green-600'>
                                {row.credit > 0
                                  ? Number(row.credit).toFixed(2)
                                  : '-'}
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px] font-semibold text-red-600'>
                                {row.debit > 0
                                  ? Number(row.debit).toFixed(2)
                                  : '-'}
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px]'>
                                {row.closing !== undefined ? (
                                  <StatementBalance value={row.closing} />
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px]'>
                                {row.stake !== undefined &&
                                row.stake !== null &&
                                row.stake > 0
                                  ? Number(row.stake).toFixed(2)
                                  : '-'}
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px]'>
                                {row.odds !== undefined &&
                                row.odds !== null &&
                                row.odds > 0
                                  ? Number(row.odds).toFixed(2)
                                  : '-'}
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px] text-black'>
                                {isClickableGameRow(row) ? (
                                  <button
                                    type='button'
                                    onClick={() => openMarketBetsModal(row)}
                                    className='cursor-pointer text-left text-black underline'
                                  >
                                    {row.description || '-'}
                                  </button>
                                ) : (
                                  row.description || '-'
                                )}
                              </td>
                              <td className='px-2 py-1.5 text-[14px] whitespace-nowrap'>
                                {row.fromto || row.userName || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={tableColSpan}
                              className='py-4 text-center text-[18px] font-bold text-[#c7313f]'
                            >
                              No Data Found.
                            </td>
                          </tr>
                        )}
                        {page === totalPages &&
                          displayRows.length > 0 &&
                          Math.abs(ledgerOpeningBalance) > 0.01 && (
                            <tr className='border border-gray-300 bg-[#f8f9fa] font-semibold'>
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                {startDate
                                  ? new Date(startDate).toLocaleString('en-US')
                                  : '-'}
                              </td>
                              {accountType !== 'settlement' &&
                                accountType !== 'sports' && (
                                  <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                    <span className='inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[12px] font-medium text-gray-800'>
                                      Opening Balance
                                    </span>
                                  </td>
                                )}
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                -
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                -
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px]'>
                                <StatementBalance
                                  value={ledgerOpeningBalance}
                                />
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px]'>
                                -
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-right text-[14px]'>
                                -
                              </td>
                              <td className='border border-gray-300 px-2 py-1.5 text-[14px]'>
                                Opening Balance (B/F)
                              </td>
                              <td className='px-2 py-1.5 text-[14px]' />
                            </tr>
                          )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
                <div>
                  Showing{' '}
                  {displayRows.length > 0
                    ? `${(page - 1) * limit + 1} to ${(page - 1) * limit + displayRows.length}`
                    : '0 - 0'}{' '}
                  of {total} entries
                </div>
                <div className='flex flex-wrap'>
                  <button
                    type='button'
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    className='pgBtn rounded-l-sm px-[13px] py-[6.5px] disabled:opacity-50'
                  >
                    First
                  </button>

                  <button
                    type='button'
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className='pgBtn px-[12px] py-[6px] disabled:opacity-50'
                  >
                    Prev
                  </button>

                  <button className='bg-[#0088cc] px-[13px] py-[6.5px] leading-none text-white'>
                    {page}
                  </button>

                  <button
                    type='button'
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className='pgBtn px-[13px] py-[6.5px] disabled:opacity-50'
                  >
                    Next
                  </button>

                  <button
                    type='button'
                    disabled={page === totalPages}
                    onClick={() => setPage(totalPages)}
                    className='pgBtn rounded-r-sm px-[13px] py-[6.5px] disabled:opacity-50'
                  >
                    Last
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <MarketBetsModal
        open={marketBetsModal.open}
        loading={marketBetsModal.loading}
        rows={marketBetsModal.rows}
        total={marketBetsModal.total}
        onClose={() =>
          setMarketBetsModal({
            open: false,
            loading: false,
            rows: [],
            total: 0,
          })
        }
      />
    </>
  );
};

export default AccountStatement;

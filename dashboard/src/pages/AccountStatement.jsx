import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Navbar from '../components/Navbar';
import ClientNameSearch from '../components/ClientNameSearch';
import api from '../redux/api';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { hasClientSearchAccess } from '../utils/roleUtils';
import MarketBetsModal, {
  fetchMarketBetsForStatementRow,
} from '../components/MarketBetsModal';

const formatNumberDisplay = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const n = Number(val);
  if (!Number.isFinite(n)) return '';
  if (n % 1 === 0) return String(n);
  return n.toFixed(2);
};

const formatStatementBalance = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return { text: '0', className: 'text-black font-semibold' };
  const text = formatNumberDisplay(n);
  if (n === 0) return { text: '0', className: 'font-semibold text-black' };
  if (n > 0) return { text, className: 'font-semibold text-[#0e7926]' };
  return { text, className: 'font-semibold text-[#c7313f]' };
};

const StatementBalance = ({ value, className = '' }) => {
  const { text, className: colorClass } = formatStatementBalance(value);
  return <span className={`${colorClass} ${className}`.trim()}>{text}</span>;
};

/** Third-party / GGR casino providers */
const THIRD_PARTY_CASINOS = [
  { key: 'all', label: 'All' },
  { key: 'livecasino', label: 'Indian Poker / Live Casino' },
  { key: 'indianpoker2', label: 'Indian Poker II' },
  { key: 'pragmatic', label: 'Pragmatic' },
  { key: 'evolution', label: 'Evolution' },
  { key: 'casino2', label: 'Casino II' },
  { key: 'vivo', label: 'Vivo' },
  { key: 'betgames', label: 'Bet Games' },
  { key: 'casino3', label: 'Casino III' },
  { key: 'spribe', label: 'Spribe' },
  { key: 'microgaming', label: 'Microgaming' },
  { key: 'playtech', label: 'Playtech' },
  { key: 'redtiger', label: 'Red Tiger' },
];

/** Traditional casino tables (Casino Report) */
const CASINO_GAMES = [
  { key: 'all', label: 'All' },
  { key: 'teen', label: 'Teenpatti 1-day' },
  { key: 'poker', label: 'Poker 1-Day' },
  { key: '3cardj', label: '3 Cards Judgement' },
  { key: 'aaa', label: 'Amar Akbar Anthony' },
  { key: 'ab20', label: 'Andar Bahar' },
  { key: 'abj', label: 'Andar Bahar 2' },
  { key: 'baccarat', label: 'Baccarat' },
  { key: 'baccarat2', label: 'Baccarat 2' },
  { key: 'btable', label: 'Bollywood Casino' },
  { key: 'card32', label: '32 Cards A' },
  { key: 'card32eu', label: '32 Cards B' },
  { key: 'cmatch20', label: 'Cricket Match 20-20' },
  { key: 'cmeter', label: 'Casino Meter' },
  { key: 'dt20', label: '20-20 Dragon Tiger' },
  { key: 'dt202', label: '20-20 Dragon Tiger 2' },
  { key: 'dt6', label: '1 Day Dragon Tiger' },
  { key: 'dtl20', label: '20-20 D T L' },
  { key: 'lucky7', label: 'Lucky 7 - A' },
  { key: 'lucky7eu', label: 'Lucky 7 - B' },
  { key: 'lucky7eu2', label: 'Lucky 7 - C' },
  { key: 'teen20', label: '20-20 Teenpatti' },
  { key: 'poker20', label: '20-20 Poker' },
  { key: 'teenmuf', label: 'Muflis Teenpatti' },
  { key: 'poison20', label: 'Teenpatti Poison 20-20' },
];

const SPORTS_LIST = [
  { key: 'all', label: 'All' },
  { key: 'soccer', label: 'Football' },
  { key: 'tennis', label: 'Tennis' },
  { key: 'mma', label: 'Mixed Martial Arts' },
  { key: 'cricket', label: 'Cricket' },
  { key: 'golf', label: 'Golf' },
  { key: 'boxing', label: 'Boxing' },
  { key: 'beachvolleyball', label: 'Beach Volleyball' },
  { key: 'tabletennis', label: 'Table Tennis' },
  { key: 'futsal', label: 'Futsal' },
  { key: 'horseracing', label: 'Horse Racing' },
  { key: 'egames', label: 'E Games' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'motogp', label: 'MotoGP' },
  { key: 'chess', label: 'Chess' },
  { key: 'volleyball', label: 'Volleyball' },
];

const SPORTS_GAME_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'matchodds', label: 'Match Odds' },
  { key: 'bookmaker', label: 'Bookmaker' },
  { key: 'fancy', label: 'Fancy' },
  { key: 'fancy1', label: 'Fancy1' },
  { key: 'oddeven', label: 'Odd Even' },
  { key: 'toss', label: 'Toss' },
];

const GAME_NAME_OPTIONS = [{ key: 'all', label: 'All' }];

const DEPOSIT_LINE_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'upper', label: 'Upper' },
  { key: 'down', label: 'Down' },
];

const formatTableDate = (dateVal) => {
  if (!dateVal) return { dateStr: '-', timeStr: '' };
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return { dateStr: '-', timeStr: '' };
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return {
    dateStr: `${day}/${month}/${year}`,
    timeStr: `${h}:${min}:${sec}`,
  };
};

const formatStatementExportDate = (value) => {
  if (!value) return '-';
  const { dateStr, timeStr } = formatTableDate(value);
  return `${dateStr} ${timeStr}`;
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
  lineType,
  canSearchByClient,
  selectedUserName,
  searchQuery,
}) => {
  const query = new URLSearchParams();
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);
  query.append('page', pageNum);
  query.append('limit', limitNum);

  if (
    accountType === 'casino' ||
    accountType === 'sports' ||
    accountType === 'thirdparty'
  ) {
    query.append(
      'gameType',
      accountType === 'thirdparty' ? 'casino' : accountType
    );
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
    accountType === 'casino' ||
    accountType === 'thirdparty'
  ) {
    if (sportsGameType && sportsGameType !== 'all') {
      query.append('sportsGameType', sportsGameType);
    }
    if (sportsList && sportsList !== 'all') {
      query.append('sportsName', sportsList);
    }
  }
  if (accountType === 'thirdparty') {
    query.append('casinoProvider', 'thirdparty');
  }
  if (accountType === 'deposit' && lineType && lineType !== 'all') {
    query.append('lineType', lineType);
  }
  if (canSearchByClient && (selectedUserName || searchQuery.trim())) {
    query.append('userName', selectedUserName || searchQuery.trim());
  }

  query.append('accountType', accountType);
  return query;
};

const buildStatementExcelRows = ({ rows }) => {
  const tableData = [];

  rows.forEach((row) => {
    tableData.push({
      Date: formatStatementExportDate(row.date),
      Credit: row.credit > 0 ? formatNumberDisplay(row.credit) : '',
      Debit: row.debit > 0 ? `-${formatNumberDisplay(row.debit)}` : '',
      Closing: row.closing !== undefined ? formatNumberDisplay(row.closing) : '',
      Description: row.description || '-',
      Fromto: row.fromto || row.userName || '',
    });
  });

  return tableData;
};

const buildStatementPdfHtml = ({ rows }) => {
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const rowParts = [];

  rows.forEach((row) => {
    const creditStr = row.credit > 0 ? `<td class="num" style="color:#0e7926">${formatNumberDisplay(row.credit)}</td>` : '<td class="num"></td>';
    const debitStr = row.debit > 0 ? `<td class="num" style="color:#c7313f">-${formatNumberDisplay(row.debit)}</td>` : '<td class="num"></td>';
    const closingNum = Number(row.closing) || 0;
    const closColor = closingNum === 0 ? '#212529' : closingNum > 0 ? '#0e7926' : '#c7313f';
    const closingStr = row.closing !== undefined ? `<td class="num" style="color:${closColor}">${formatNumberDisplay(row.closing)}</td>` : '<td class="num"></td>';

    rowParts.push(`
      <tr>
        <td>${esc(formatStatementExportDate(row.date))}</td>
        ${creditStr}
        ${debitStr}
        ${closingStr}
        <td><span style="background:#333;color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:bold;">${esc(row.description || '-')}</span></td>
        <td>${esc(row.fromto || row.userName || '')}</td>
      </tr>`);
  });

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
        font-size: 13px;
      }
      td {
        border: 1px solid #e5e7eb;
        padding: 6px 6px;
        color: #212529;
        vertical-align: middle;
        font-size: 13px;
      }
      td.num { text-align: right; white-space: nowrap; font-weight: bold; }
    </style>
    </head>
    <body>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th style="text-align:right">Credit</th>
          <th style="text-align:right">Debit</th>
          <th style="text-align:right">Closing</th>
          <th>Description</th>
          <th>Fromto</th>
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
  const [sportsGameType, setSportsGameType] = useState('all');
  const [sportsList, setSportsList] = useState('all');
  const [casinoList, setCasinoList] = useState('all');
  const [thirdPartyList, setThirdPartyList] = useState('all');
  const [depositLineType, setDepositLineType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  /** Client locked in on last Load — survives typing/clearing the search box. */
  const [loadedClientName, setLoadedClientName] = useState('');
  const loadedClientNameRef = useRef('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const fetchSeqRef = useRef(0);
  const abortRef = useRef(null);

  const getFormatDateOnly = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getFormatDateOnly(d);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return getFormatDateOnly(d);
  });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [ledgerOpeningBalance, setLedgerOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  // Do not auto-fetch on mount — that raced with client search and overwrote results
  const [hasSearched, setHasSearched] = useState(false);
  const { userInfo } = useSelector((state) => state.auth);

  const canSearchByClient = hasClientSearchAccess(userInfo?.role);
  const [marketBetsModal, setMarketBetsModal] = useState({
    open: false,
    loading: false,
    rows: [],
    total: 0,
    statementRow: null,
  });

  // Sports / casino bet rows open Details popup (All + Sports + Casino reports)
  const isClickableGameRow = (row) =>
    Boolean(row?.sourceId) &&
    ['bet', 'commission', 'casino'].includes(row?.type) &&
    !['deposit', 'settlement', 'bonus'].includes(accountType);

  const displayRows = useMemo(() => rows, [rows]);

  const filteredDisplayRows = useMemo(() => {
    if (!tableSearchTerm) return displayRows;
    const lower = tableSearchTerm.toLowerCase();
    return displayRows.filter(
      (row) =>
        (row.description && row.description.toLowerCase().includes(lower)) ||
        (row.fromto && row.fromto.toLowerCase().includes(lower)) ||
        (row.userName && row.userName.toLowerCase().includes(lower)) ||
        String(row.credit || '').includes(lower) ||
        String(row.debit || '').includes(lower) ||
        String(row.closing || '').includes(lower)
    );
  }, [displayRows, tableSearchTerm]);

  const getQueryParams = (pageNum, limitNum, clientName = loadedClientName) => {
    // Map secondary list into sportsList for the shared query builder
    let listValue = sportsList;
    if (accountType === 'casino') listValue = casinoList;
    if (accountType === 'thirdparty') listValue = thirdPartyList;
    // Account Type "All" always loads deposits + all game reports
    if (accountType === 'all') listValue = 'all';

    return buildStatementQuery({
      startDate: startDate ? `${startDate}T00:00:00` : '',
      endDate: endDate ? `${endDate}T23:59:59` : '',
      pageNum,
      limitNum,
      accountType,
      gameType: accountType === 'all' ? 'all' : accountType,
      sportsGameType: accountType === 'sports' ? sportsGameType : '',
      sportsList: listValue,
      lineType: accountType === 'deposit' ? depositLineType : 'all',
      canSearchByClient,
      selectedUserName: clientName,
      searchQuery: clientName,
    });
  };

  const fetchReportPage = async (pageNum, limitNum, clientName, signal) => {
    const res = await api.get(
      `/account-statement/history?${getQueryParams(pageNum, limitNum, clientName).toString()}`,
      { withCredentials: true, signal }
    );
    return res.data;
  };

  const downloadPDF = () => {
    if (!hasSearched || displayRows.length === 0) {
      toast.error('No data to export. Run a search first.');
      return;
    }

    printStatementPdf(
      buildStatementPdfHtml({
        rows: displayRows,
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
        rows: displayRows,
      }),
      `account-statement-${accountType}.xlsx`
    );
  };

  const openMarketBetsModal = async (row) => {
    setMarketBetsModal({
      open: true,
      loading: true,
      rows: [],
      total: 0,
      statementRow: row,
    });
    try {
      const { rows: marketRows, total } =
        await fetchMarketBetsForStatementRow(row);
      setMarketBetsModal({
        open: true,
        loading: false,
        rows: marketRows,
        total,
        statementRow: row,
      });
    } catch (error) {
      setMarketBetsModal({
        open: true,
        loading: false,
        rows: [],
        total: 0,
        statementRow: row,
      });
      toast.error(
        error?.response?.data?.message || 'Failed to load market bets'
      );
    }
  };

  const loadReport = async ({
    pageNum = page,
    limitNum = limit,
    clientName = loadedClientName,
  } = {}) => {
    const seq = ++fetchSeqRef.current;
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const data = await fetchReportPage(
        pageNum,
        limitNum,
        clientName,
        controller.signal
      );

      // Ignore stale responses (slow login-account fetch after a client search)
      if (seq !== fetchSeqRef.current) return;

      setRows(data?.data || []);
      setTotal(data?.pagination?.total || 0);
      setTotalPages(data?.pagination?.pages || 1);
      setLedgerOpeningBalance(
        data?.ledgerOpeningBalance ?? data?.openingBalance ?? 0
      );
    } catch (error) {
      if (
        error?.name === 'CanceledError' ||
        error?.code === 'ERR_CANCELED' ||
        controller.signal.aborted
      ) {
        return;
      }
      if (seq !== fetchSeqRef.current) return;
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setLedgerOpeningBalance(0);
      toast.error(error?.response?.data?.message || 'Failed to load report');
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!hasSearched) return;
    loadReport({
      pageNum: page,
      limitNum: limit,
      clientName: loadedClientNameRef.current,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch on page/limit after Load
  }, [page, limit]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleLoadClick = () => {
    const clientName = (selectedUserName || searchQuery.trim() || '').trim();
    loadedClientNameRef.current = clientName;
    setLoadedClientName(clientName);
    setHasSearched(true);
    if (page === 1) {
      loadReport({ pageNum: 1, limitNum: limit, clientName });
    } else {
      // page change triggers useEffect with loadedClientNameRef already updated
      setPage(1);
    }
  };

  const renderClientSearch = () =>
    canSearchByClient ? (
      <ClientNameSearch
        value={searchQuery}
        selectedUserName={selectedUserName}
        onChange={setSearchQuery}
        onSelect={setSelectedUserName}
      />
    ) : null;

  return (
    <>
      <Navbar />
      <div className='scrollbar-hide pb-10 md:px-[15px] md:pt-[13px]'>
        <div className='min-h-[600px] rounded-lg bg-white px-[15px] py-[15px]'>
          <div className='text-[22px] font-bold text-gray-800 mb-4'>
            Account Statement
          </div>

          <div className='mb-4 flex flex-wrap items-end gap-3'>
            {/* Account Type — always visible */}
            <div className='flex flex-col'>
              <label className='mb-1 text-[13px] font-bold text-gray-700'>
                Account Type
              </label>
              <select
                className='h-[34px] min-w-[180px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
                value={accountType}
                onChange={(e) => {
                  const next = e.target.value;
                  setAccountType(next);
                  setGameType('all');
                  setSportsList('all');
                  setSportsGameType('all');
                  setCasinoList('all');
                  setThirdPartyList('all');
                  setDepositLineType('all');
                }}
              >
                <option value='all'>All</option>
                <option value='deposit'>Deposit/Withdraw Report</option>
                <option value='sports'>Sports Report</option>
                <option value='casino'>Casino Report</option>
                <option value='thirdparty'>Third Party Casino Report</option>
              </select>
            </div>

            {/* All → Game Name */}
            {accountType === 'all' && (
              <div className='flex flex-col'>
                <label className='mb-1 text-[13px] font-bold text-gray-700'>
                  Game Name
                </label>
                <select
                  className='h-[34px] min-w-[140px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                >
                  {GAME_NAME_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Deposit/Withdraw → All / Upper / Down */}
            {accountType === 'deposit' && (
              <div className='flex flex-col'>
                <label className='mb-1 text-[13px] font-bold text-gray-700'>
                  Game Name
                </label>
                <select
                  className='h-[34px] min-w-[140px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
                  value={depositLineType}
                  onChange={(e) => setDepositLineType(e.target.value)}
                >
                  {DEPOSIT_LINE_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sports Report → Sports List + Game Type */}
            {accountType === 'sports' && (
              <>
                <div className='flex flex-col'>
                  <label className='mb-1 text-[13px] font-bold text-gray-700'>
                    Sports List
                  </label>
                  <select
                    className='h-[34px] min-w-[160px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
                    value={sportsList}
                    onChange={(e) => setSportsList(e.target.value)}
                  >
                    {SPORTS_LIST.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='flex flex-col'>
                  <label className='mb-1 text-[13px] font-bold text-gray-700'>
                    Game Type
                  </label>
                  <select
                    className='h-[34px] min-w-[140px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
                    value={sportsGameType}
                    onChange={(e) => setSportsGameType(e.target.value)}
                  >
                    {SPORTS_GAME_TYPES.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Casino Report → Casino List */}
            {accountType === 'casino' && (
              <div className='flex flex-col'>
                <label className='mb-1 text-[13px] font-bold text-gray-700'>
                  Casino List
                </label>
                <select
                  className='h-[34px] min-w-[180px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
                  value={casinoList}
                  onChange={(e) => setCasinoList(e.target.value)}
                >
                  {CASINO_GAMES.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Third Party Casino → provider list */}
            {accountType === 'thirdparty' && (
              <div className='flex flex-col'>
                <label className='mb-1 text-[13px] font-bold text-gray-700'>
                  Casino List
                </label>
                <select
                  className='h-[34px] min-w-[180px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
                  value={thirdPartyList}
                  onChange={(e) => setThirdPartyList(e.target.value)}
                >
                  {THIRD_PARTY_CASINOS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Deposit/Withdraw — no secondary list; client + dates only */}

            {renderClientSearch()}

            <div className='flex flex-col'>
              <label className='mb-1 text-[13px] font-bold text-gray-700'>
                From
              </label>
              <input
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className='h-[34px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
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
                className='h-[34px] rounded border border-gray-300 px-2 py-1 text-[13px] text-gray-700 outline-none'
              />
            </div>
          </div>

          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={handleLoadClick}
                className='cursor-pointer rounded bg-secondary hover:bg-secondary70 px-4 py-1.5 text-[13px] font-semibold text-white'
              >
                Load
              </button>

              <button
                type='button'
                onClick={downloadPDF}
                className='cursor-pointer flex items-center gap-1 rounded bg-[#c9302c] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#ac2925]'
              >
                <svg className='w-4 h-4 fill-current' viewBox='0 0 24 24'>
                  <path d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5c0 .83-.67 1.5-1.5 1.5H7v2H5.5V9H8c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V9H13c.83 0 1.5.67 1.5 1.5v3zm4-3H17v1h1.5V13H17v2h-1.5V9h3v1.5zM7 10.5h1v1H7v-1zm5.5 0H14v3h-1.5v-3z' />
                </svg>
                PDF
              </button>

              <button
                type='button'
                onClick={downloadExcel}
                className='cursor-pointer flex items-center gap-1 rounded bg-[#4cae4c] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#449d44]'
              >
                <svg className='w-4 h-4 fill-current' viewBox='0 0 24 24'>
                  <path d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16h-3l-2.05-3.05L8.9 18H6l3.5-5L6 8h2.9l2.05 3.05L13.1 8H16l-3.5 5 3.5 5z' />
                </svg>
                Excel
              </button>
            </div>

            <div className='flex items-center gap-2'>
              <span className='text-[13px] font-medium text-gray-700'>
                Search:
              </span>
              <input
                type='text'
                placeholder='Search...'
                value={tableSearchTerm}
                onChange={(e) => setTableSearchTerm(e.target.value)}
                className='h-[32px] rounded border border-gray-300 px-2 py-1 text-[13px] outline-none'
              />
            </div>
          </div>

          <div className='scrollbar-hide overflow-x-auto'>
            <table className='w-full border-collapse border border-gray-200 text-left text-[13px]'>
              <thead>
                <tr className='bg-[#222222] text-white'>
                  <th className='border-r border-gray-600 px-3 py-2 font-bold'>
                    Date
                  </th>
                  <th className='border-r border-gray-600 px-3 py-2 font-bold'>
                    Credit
                  </th>
                  <th className='border-r border-gray-600 px-3 py-2 font-bold'>
                    Debit ▲▼
                  </th>
                  <th className='border-r border-gray-600 px-3 py-2 font-bold'>
                    Closing
                  </th>
                  <th className='border-r border-gray-600 px-3 py-2 font-bold'>
                    Description
                  </th>
                  <th className='px-3 py-2 font-bold'>Fromto</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className='py-6 text-center text-[14px] text-gray-500'
                    >
                      Loading...
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* OPENING PTS only when search returned no rows */}
                    {hasSearched && filteredDisplayRows.length === 0 && (
                      <tr className='border-b border-gray-200 bg-white hover:bg-gray-50'>
                        <td className='border-r border-gray-200 px-3 py-2.5 text-[13px]'>
                          {(() => {
                            const { dateStr } = formatTableDate(
                              startDate ? `${startDate}T00:00:00` : new Date()
                            );
                            return (
                              <div className='leading-tight'>
                                <div>{dateStr}</div>
                                <div className='text-[12px] text-gray-700'>
                                  00:00:00
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className='border-r border-gray-200 px-3 py-2.5 text-[13px] font-semibold text-[#0e7926]'>
                          {ledgerOpeningBalance > 0
                            ? formatNumberDisplay(ledgerOpeningBalance)
                            : ''}
                        </td>
                        <td className='border-r border-gray-200 px-3 py-2.5 text-[13px] font-semibold text-[#c7313f]'>
                          {ledgerOpeningBalance < 0
                            ? `-${formatNumberDisplay(Math.abs(ledgerOpeningBalance))}`
                            : ''}
                        </td>
                        <td className='border-r border-gray-200 px-3 py-2.5 text-[13px]'>
                          <StatementBalance value={ledgerOpeningBalance} />
                        </td>
                        <td className='border-r border-gray-200 px-3 py-2.5 text-[13px]'>
                          <span className='inline-block rounded bg-[#333333] px-2.5 py-1 text-[12px] font-bold text-white uppercase tracking-wider'>
                            OPENING PTS
                          </span>
                        </td>
                        <td className='px-3 py-2.5 text-[13px] text-gray-600' />
                      </tr>
                    )}

                    {filteredDisplayRows.length > 0 ? (
                      filteredDisplayRows.map((row, index) => {
                        const { dateStr, timeStr } = formatTableDate(row.date);
                        return (
                          <tr
                            key={`${row.date}-${row.sourceId || index}`}
                            className={`border-b border-gray-200 ${
                              row.otype === 'back'
                                ? 'bg-[#72bbef]'
                                : row.otype === 'lay'
                                  ? 'bg-[#faa9ba]'
                                  : 'bg-white odd:bg-[#f9f9f9]'
                            } hover:opacity-90`}
                          >
                            <td className='border-r border-gray-200 px-3 py-2.5 text-[13px]'>
                              <div className='leading-tight'>
                                <div>{dateStr}</div>
                                <div className='text-[12px] text-gray-700'>
                                  {timeStr}
                                </div>
                              </div>
                            </td>

                            <td className='border-r border-gray-200 px-3 py-2.5 text-[13px] font-semibold text-[#0e7926]'>
                              {row.credit > 0
                                ? formatNumberDisplay(row.credit)
                                : ''}
                            </td>

                            <td className='border-r border-gray-200 px-3 py-2.5 text-[13px] font-semibold text-[#c7313f]'>
                              {row.debit > 0
                                ? `-${formatNumberDisplay(row.debit)}`
                                : ''}
                            </td>

                            <td className='border-r border-gray-200 px-3 py-2.5 text-[13px]'>
                              {row.closing !== undefined ? (
                                <StatementBalance value={row.closing} />
                              ) : (
                                ''
                              )}
                            </td>

                            <td className='border-r border-gray-200 px-3 py-2.5 text-[13px]'>
                              {isClickableGameRow(row) ? (
                                <button
                                  type='button'
                                  onClick={() => openMarketBetsModal(row)}
                                  className='inline-block cursor-pointer rounded bg-[#333333] hover:bg-[#222222] px-2.5 py-1 text-left text-[12px] font-bold text-white uppercase tracking-wider'
                                >
                                  {row.description || '-'}
                                </button>
                              ) : (
                                <span className='inline-block rounded bg-[#333333] px-2.5 py-1 text-[12px] font-bold text-white uppercase tracking-wider'>
                                  {row.description || '-'}
                                </span>
                              )}
                            </td>

                            <td className='px-3 py-2.5 text-[13px] text-gray-800 whitespace-nowrap'>
                              {['all', 'sports', 'casino', 'thirdparty'].includes(
                                accountType
                              ) &&
                              ['bet', 'casino', 'commission', 'opening'].includes(
                                row.type
                              )
                                ? row.fromto || ''
                                : row.fromto || row.userName || ''}
                            </td>
                          </tr>
                        );
                      })
                    ) : !hasSearched ? (
                      <tr>
                        <td
                          colSpan={6}
                          className='py-6 text-center text-[14px] font-bold text-gray-500'
                        >
                          Click Load to fetch statement data.
                        </td>
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
            <div className='text-gray-600 font-medium'>
              Showing{' '}
              {displayRows.length > 0
                ? `${(page - 1) * limit + 1} to ${(page - 1) * limit + displayRows.length}`
                : '0 - 0'}{' '}
              of {total} entries
            </div>
            <div className='flex flex-wrap items-center gap-1'>
              <button
                type='button'
                disabled={page === 1}
                onClick={() => setPage(1)}
                className='rounded border border-gray-300 px-3 py-1 text-gray-700 disabled:opacity-50 hover:bg-gray-100 cursor-pointer'
              >
                First
              </button>

              <button
                type='button'
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className='rounded border border-gray-300 px-3 py-1 text-gray-700 disabled:opacity-50 hover:bg-gray-100 cursor-pointer'
              >
                Prev
              </button>

              <span className='rounded bg-secondary px-3 py-1 font-bold text-white'>
                {page}
              </span>

              <button
                type='button'
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className='rounded border border-gray-300 px-3 py-1 text-gray-700 disabled:opacity-50 hover:bg-gray-100 cursor-pointer'
              >
                Next
              </button>

              <button
                type='button'
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                className='rounded border border-gray-300 px-3 py-1 text-gray-700 disabled:opacity-50 hover:bg-gray-100 cursor-pointer'
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
      <MarketBetsModal
        open={marketBetsModal.open}
        loading={marketBetsModal.loading}
        rows={marketBetsModal.rows}
        total={marketBetsModal.total}
        statementRow={marketBetsModal.statementRow}
        onClose={() =>
          setMarketBetsModal({
            open: false,
            loading: false,
            rows: [],
            total: 0,
            statementRow: null,
          })
        }
      />
    </>
  );
};

export default AccountStatement;

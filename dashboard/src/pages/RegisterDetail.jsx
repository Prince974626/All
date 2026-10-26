import { useMemo, useState } from 'react';
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

const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${min}:${sec}`;
};

const formatPts = (val) => Number(val || 0).toFixed(2);

const ptsClass = (val) => {
  const n = Number(val || 0);
  if (n > 0) return 'text-[#0e7926] font-medium';
  if (n < 0) return 'text-[#c7313f] font-medium';
  return 'text-[#0e7926] font-medium';
};

const RegisterDetail = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [type, setType] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const downloadPDF = () => {
    if (!rows.length) {
      toast.error('No data to export. Load the report first.');
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('User Register Detail', 14, 15);

    const tableData = rows.map((user) => [
      user.userName,
      user.agentName,
      formatDateTime(user.createdDate),
      formatDateTime(user.lastLoginDate),
      formatDateTime(user.firstDepositDate),
      formatDateTime(user.lastDepositDate),
      user.deposit > 0 ? formatPts(user.deposit) : 'No Deposit',
      formatPts(user.sportsBalance ?? user.sportsPL),
      formatPts(user.casinoBalance ?? user.casinoPL),
      formatPts(user.thirdPartyBalance),
      formatPts(user.sportBookBalance),
    ]);

    autoTable(doc, {
      head: [
        [
          'User Name',
          'Agent Name',
          'Created Date',
          'Last Login',
          'First Deposit Date',
          'Last Deposit Date',
          'Deposit',
          'Sports Balance',
          'Casino Balance',
          'Third Party Credit Balance',
          'Sport Book Balance',
        ],
      ],
      body: tableData,
      startY: 20,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [0, 136, 204] },
    });

    doc.save('user-register-detail.pdf');
  };

  const downloadExcel = () => {
    if (!rows.length) {
      toast.error('No data to export. Load the report first.');
      return;
    }
    const tableData = rows.map((user) => ({
      'User Name': user.userName,
      'Agent Name': user.agentName,
      'Created Date': formatDateTime(user.createdDate),
      'Last Login': formatDateTime(user.lastLoginDate),
      'First Deposit Date': formatDateTime(user.firstDepositDate),
      'Last Deposit Date': formatDateTime(user.lastDepositDate),
      Deposit: user.deposit > 0 ? Number(user.deposit) : 'No Deposit',
      'Sports Balance': Number(user.sportsBalance ?? user.sportsPL ?? 0),
      'Casino Balance': Number(user.casinoBalance ?? user.casinoPL ?? 0),
      'Third Party Credit Balance': Number(user.thirdPartyBalance || 0),
      'Sport Book Balance': Number(user.sportBookBalance || 0),
    }));

    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Register Detail');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const fileData = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(fileData, 'user-register-detail.xlsx');
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      const client = (selectedUserName || searchQuery).trim();
      if (client) query.append('searchQuery', client);
      if (type && type !== 'all') query.append('type', type);

      const res = await api.get(`/get/register-detail?${query.toString()}`, {
        withCredentials: true,
      });
      setRows(res.data?.data || []);
      setHasLoaded(true);
      setPage(1);
    } catch (error) {
      setRows([]);
      setHasLoaded(true);
      toast.error(
        error?.response?.data?.message || 'Failed to load register detail'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedUserName('');
    setType('all');
    setTableSearch('');
    setRows([]);
    setHasLoaded(false);
    setPage(1);
  };

  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return rows;
    const q = tableSearch.trim().toLowerCase();
    return rows.filter(
      (row) =>
        String(row.userName || '')
          .toLowerCase()
          .includes(q) ||
        String(row.agentName || '')
          .toLowerCase()
          .includes(q)
    );
  }, [rows, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <>
      <Navbar />
      <div className='px-[15px] py-4 md:px-7.5'>
        <div className='py-2 text-[22px] font-bold text-[#1e1e1e]'>
          User Register Detail
        </div>

        <div className='mt-3 mb-4 flex flex-wrap items-end gap-2'>
          <ClientNameSearch
            value={searchQuery}
            selectedUserName={selectedUserName}
            onChange={setSearchQuery}
            onSelect={setSelectedUserName}
          />
          <div className='flex flex-col'>
            <label className='mb-1 text-[13px] font-bold text-gray-700'>
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className='h-[34px] min-w-[180px] rounded border border-gray-300 px-2 text-[13px] outline-none'
            >
              <option value='all'>All</option>
              <option value='createdDate'>Created Date</option>
              <option value='lastLoginDate'>Last Login Date</option>
            </select>
          </div>

          <button
            type='button'
            onClick={loadReport}
            disabled={loading}
            className='h-[34px] cursor-pointer rounded bg-secondary px-4 text-[13px] font-medium text-white hover:bg-secondary70 disabled:opacity-60'
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

        <div className='mb-2 flex flex-wrap items-center justify-between gap-2 text-[13px]'>
          <div className='flex items-center gap-2'>
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
          <div className='flex items-center gap-2'>
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
          <table className='w-full min-w-[1200px] border-collapse border border-gray-200'>
            <thead>
              <tr className='border-b border-gray-200 bg-[#f8f9fa] text-[13px] font-semibold text-gray-700'>
                <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                  User Name
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                  Agent Name
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                  Created Date
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                  Last Login
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                  First Deposit Date
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-left'>
                  Last Deposit Date
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Deposit
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Sports Balance
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Casino Balance
                </th>
                <th className='border-r border-gray-200 px-3 py-2.5 text-right'>
                  Third Party Credit Balance
                </th>
                <th className='px-3 py-2.5 text-right'>Sport Book Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={11}
                    className='py-8 text-center font-medium text-gray-500'
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageRows.length > 0 ? (
                pageRows.map((row, index) => (
                  <tr
                    key={`${row.userName}-${index}`}
                    className={`border-b border-gray-200 text-[13px] ${
                      index % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfc]'
                    } hover:bg-gray-50`}
                  >
                    <td className='border-r border-gray-200 px-3 py-2 font-semibold text-[#0088cc]'>
                      {row.userName || '-'}
                    </td>
                    <td className='border-r border-gray-200 px-3 py-2 text-gray-700'>
                      {row.agentName || '-'}
                    </td>
                    <td className='border-r border-gray-200 px-3 py-2 text-gray-700'>
                      {formatDateTime(row.createdDate)}
                    </td>
                    <td className='border-r border-gray-200 px-3 py-2 text-gray-700'>
                      {formatDateTime(row.lastLoginDate)}
                    </td>
                    <td className='border-r border-gray-200 px-3 py-2 text-gray-700'>
                      {formatDateTime(row.firstDepositDate)}
                    </td>
                    <td className='border-r border-gray-200 px-3 py-2 text-gray-700'>
                      {formatDateTime(row.lastDepositDate)}
                    </td>
                    <td className='border-r border-gray-200 px-3 py-2 text-right text-gray-700'>
                      {Number(row.deposit || 0) > 0
                        ? formatPts(row.deposit)
                        : 'No Deposit'}
                    </td>
                    <td
                      className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.sportsBalance ?? row.sportsPL)}`}
                    >
                      {formatPts(row.sportsBalance ?? row.sportsPL)}
                    </td>
                    <td
                      className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.casinoBalance ?? row.casinoPL)}`}
                    >
                      {formatPts(row.casinoBalance ?? row.casinoPL)}
                    </td>
                    <td
                      className={`border-r border-gray-200 px-3 py-2 text-right ${ptsClass(row.thirdPartyBalance)}`}
                    >
                      {formatPts(row.thirdPartyBalance)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${ptsClass(row.sportBookBalance)}`}
                    >
                      {formatPts(row.sportBookBalance)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={11}
                    className='py-8 text-center font-medium text-gray-500'
                  >
                    {hasLoaded
                      ? 'No data'
                      : 'Click Load to fetch register details'}
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
              <span className='rounded bg-[#0088cc] px-2.5 py-1 font-semibold text-white'>
                {currentPage}
              </span>
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

export default RegisterDetail;

import { useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { toast } from 'react-toastify';
import { FaFilePdf } from 'react-icons/fa';
import { AiFillFileExcel } from 'react-icons/ai';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const RegisterDetail = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [type, setType] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('User List', 14, 15);

    const tableData = rows.map((user) => [
      user.userName,
      user.agentName,
      user.role,
      user.createdDate || '-',
      user.lastLoginDate || '-',
      user.firstDepositDate || '-',
      user.lastDepositDate || '-',
      user.deposit || 0,
      user.sportsPL || 0,
      user.casinoPL || 0,
    ]);

    autoTable(doc, {
      head: [
        [
          'UserName',
          'AgentName.',
          'Role',
          'CreatedDate',
          'LastLoginDate',
          'FirstDepositDate',
          'LastDepositDate',
          'Deposit',
          'SportsBalance',
          'CasinoBalance',
        ],
      ],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 136, 204] },
    });

    doc.save(`${type}-register.pdf`);
  };

  const downloadExcel = () => {
    const tableData = rows.map((user) => ({
      Username: user.userName,
      AgentName: user.agentName,
      Role: user.role,
      'Created Date': user.createdDate || '-',
      'Last Login Date': user.lastLoginDate || '-',
      'first Deposit Date': user.firstDepositDate || '-',
      'Last Deposit Date': user.lastDepositDate || '-',
      deposit: user.deposit || 0,
      'Sports Balance': user.sportsPL || 0,
      'Casino Balance': user.casinoPL || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(tableData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const fileData = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(fileData, `${type}-register.xlsx`);
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (searchQuery.trim()) query.append('searchQuery', searchQuery.trim());
      if (type && type !== 'all') query.append('type', type);

      const res = await api.get(`/get/register-detail?${query.toString()}`, {
        withCredentials: true,
      });
      setRows(res.data?.data || []);
    } catch (error) {
      setRows([]);
      toast.error(
        error?.response?.data?.message || 'Failed to load register detail'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setType('all');
    setRows([]);
  };

  const formatDate = (value) =>
    value ? new Date(value).toLocaleString() : '-';

  return (
    <>
      <Navbar />
      <div className='px-[15px] md:px-7.5'>
        <div className='py-2 text-[22px]'>User Register Detail</div>

        <div className='mt-3 mb-6 flex items-end gap-1'>
          <div className='grid'>
            <span>Search By Client Name</span>
            <input
              type='type'
              className='mt-1 h-[30px] min-w-[200px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
              placeholder='Select Option'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className='grid'>
            <span className='text-sm'>Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className='mt-1 h-[30px] min-w-[200px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
            >
              <option value='all'>All</option>
              <option value='createdDate'>Created Date</option>
              <option value='lastLoginDate'>Last Login Date</option>
            </select>
          </div>

          <button
            type='button'
            onClick={loadReport}
            className='h-[30px] cursor-pointer rounded bg-[#0088cc] px-3 py-1.5 text-white'
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
          <button
            type='button'
            onClick={resetFilters}
            className='h-[30px] cursor-pointer rounded bg-[#eff2f7] px-3 py-1.5 text-black'
          >
            Reset
          </button>
          <div
            className='flex h-[30px] items-center justify-center rounded-sm bg-green-400 px-2 py-1.5 text-white hover:bg-green-500'
            onClick={downloadExcel}
          >
            <AiFillFileExcel className='size-4' />
          </div>
          <div
            className='flex h-[30px] items-center justify-center rounded-sm bg-red-400 px-2 py-1.5 text-white hover:bg-red-500'
            onClick={downloadPDF}
          >
            <FaFilePdf className='size-4' />
          </div>
        </div>

        <div>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse border border-gray-300'>
              <thead>
                <tr className='bg-gray-50'>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-start px-2 text-[13px]'>
                      User Name
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-start px-2 text-[13px]'>
                      Agent Name
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      Created Date
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      Last Login
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      First Deposit Date
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      Last Deposit Date
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      Deposit
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      Sports PL
                    </div>
                  </th>
                  <th className='border border-gray-200/60 text-left'>
                    <div className='relative flex items-center justify-end px-2 text-[13px]'>
                      Casino PL
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row, index) => (
                    <tr
                      key={`${row.userName}-${index}`}
                      className='odd:bg-gray-50'
                    >
                      <td className='border border-gray-200/60 px-2 py-2 text-[13px]'>
                        {row.userName || '-'}
                      </td>
                      <td className='border border-gray-200/60 px-2 py-2 text-[13px]'>
                        {row.agentName || '-'}
                      </td>
                      <td className='border border-gray-200/60 px-2 py-2 text-right text-[13px]'>
                        {formatDate(row.createdDate)}
                      </td>
                      <td className='border border-gray-200/60 px-2 py-2 text-right text-[13px]'>
                        {formatDate(row.lastLoginDate)}
                      </td>
                      <td className='border border-gray-200/60 px-2 py-2 text-right text-[13px]'>
                        {formatDate(row.firstDepositDate)}
                      </td>
                      <td className='border border-gray-200/60 px-2 py-2 text-right text-[13px]'>
                        {formatDate(row.lastDepositDate)}
                      </td>
                      <td className='border border-gray-200/60 px-2 py-2 text-right text-[13px]'>
                        {Number(row.deposit || 0).toFixed(2)}
                      </td>
                      <td className='border border-gray-200/60 px-2 py-2 text-right text-[13px]'>
                        {Number(row.sportsPL || 0).toFixed(2)}
                      </td>
                      <td className='border border-gray-200/60 px-2 py-2 text-right text-[13px]'>
                        {Number(row.casinoPL || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className='border border-gray-200/60 py-4 text-center text-gray-500'
                    >
                      {loading ? 'Loading...' : 'No data'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterDetail;

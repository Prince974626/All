import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllOnlyUserAndDownline } from '../redux/reducer/authReducer';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';

const GeneralReport = () => {
  const dispatch = useDispatch();
  const { onlyusers, loading } = useSelector((state) => state.auth);

  const [reportType, setReportType] = useState('general');
  const [loaded, setLoaded] = useState(false);

  const handleLoad = () => {
    if (reportType === 'credit') {
      dispatch(
        getAllOnlyUserAndDownline({ page: 1, limit: 500, searchQuery: '' })
      );
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  };

  const totalCreditRef = loaded
    ? onlyusers?.reduce((sum, u) => sum + (u.creditReference || 0), 0)
    : 0;

  return (
    <>
      <Navbar />
      <div className='px-[15px] md:px-7.5'>
        <div className='py-2 text-[22px]'>General Report</div>

        <div className='mt-3 mb-6 flex flex-wrap items-end gap-2'>
          <div className='grid'>
            <span className='text-sm'>Select Type</span>
            <select
              className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setLoaded(false);
              }}
            >
              <option value='general'>General Report</option>
              <option value='credit'>Credit Reference Report</option>
            </select>
          </div>
          <div
            className='ml-1 cursor-pointer rounded bg-[#0088cc] px-3 py-1.5 text-white'
            onClick={handleLoad}
          >
            Load
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full border-collapse border border-gray-300'>
            <thead>
              <tr className='bg-gray-100'>
                <th className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Sr.No.</div>
                </th>
                <th className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>UserName</div>
                </th>
                <th className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Credit Reference</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {reportType === 'credit' &&
                loaded &&
                (loading ? (
                  <tr>
                    <td colSpan={3} className='py-4 text-center'>
                      <Loader />
                    </td>
                  </tr>
                ) : onlyusers?.length > 0 ? (
                  onlyusers.map((user, index) => (
                    <tr
                      key={user._id}
                      className='border-t border-gray-200 odd:bg-[rgba(0,0,0,0.03)]'
                    >
                      <td className='border-r border-gray-100 py-2'>
                        <div className='px-2 text-[13px]'>{index + 1}</div>
                      </td>
                      <td className='border-r border-gray-100 py-2'>
                        <div className='px-2 text-[13px]'>{user.userName}</div>
                      </td>
                      <td className='border-r border-gray-100 py-2'>
                        <div className='px-2 text-[13px]'>
                          {user.creditReference || 0}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className='py-4 text-center text-gray-400'>
                      No users found
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default GeneralReport;

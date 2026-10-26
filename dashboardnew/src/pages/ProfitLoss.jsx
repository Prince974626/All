import Navbar from '../components/Navbar';

const ProfitLoss = () => {
  return (
    <>
      <Navbar />
      <div className='px-[15px] md:px-7.5'>
        <div className='py-2 text-[22px]'>Profit Loss</div>

        <div className='mt-3 mb-6 flex flex-wrap items-end gap-2'>
          <div className='grid'>
            <select className='mt-1 min-w-[280px] rounded-md border border-gray-200 px-2 py-1.5 outline-0'>
              <option>All</option>
              <option>User</option>
            </select>
          </div>
          <div className='ml-1 cursor-pointer rounded bg-[#0088cc] px-3 py-1.5 text-white'>
            Load
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full border-collapse border border-gray-300'>
            <thead>
              <tr>
                <th className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>No.</div>
                </th>
                <th className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>UserName</div>
                </th>
                <th className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Level</div>
                </th>
                <th className='border border-gray-300 py-2 text-right'>
                  <div className='px-2 text-[13px]'>Casino Pts</div>
                </th>
                <th className='border border-gray-300 py-2 text-right'>
                  <div className='px-2 text-[13px]'>Sports Pts</div>
                </th>
                <th className='border border-gray-300 py-2 text-right'>
                  <div className='px-2 text-[13px]'>Profit/Loss</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className='bg-gray-100'>
                <td className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>1</div>
                </td>
                <td className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Rakeshtest</div>
                </td>
                <td className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>user</div>
                </td>
                <td className='border border-gray-300 py-2 text-right'>
                  <div className='px-2 text-[13px]'>200</div>
                </td>
                <td className='border border-gray-300 py-2 text-right'>
                  <div className='px-2 text-[13px]'>-100</div>
                </td>
                <td className='border border-gray-300 py-2 text-right'>
                  <div className='px-2 text-[13px]'>100</div>
                </td>
              </tr>
              <tr>
                <td className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>2</div>
                </td>
                <td className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Rakesh</div>
                </td>
                <td className='border border-gray-300 py-2 text-left'>
                  <div className='px-2 text-[13px]'>Agent</div>
                </td>
                <td className='border border-gray-300 py-2 text-right'>
                  <div className='px-2 text-[13px]'>500</div>
                </td>
                <td className='border border-gray-300 py-2 text-right'>
                  <div className='px-2 text-[13px]'>-1000</div>
                </td>
                <td className='border border-gray-300 py-2 text-right'>
                  <div className='px-2 text-[13px]'>-500</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ProfitLoss;

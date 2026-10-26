import { useState, useMemo } from 'react';
import { FaSortUp, FaSortDown } from 'react-icons/fa';

const VirtualTable = ({ data = [], columns = [] }) => {
  const [sortConfig, setSortConfig] = useState(null);

  // ✅ Sorting (Frontend only)
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const { key, direction } = sortConfig;

    return [...data].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      // handle null / undefined safely
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // ✅ Sorting Click
  const handleSort = (col) => {
    if (!col.accessor) return;

    setSortConfig((prev) => {
      if (!prev || prev.key !== col.accessor) {
        return { key: col.accessor, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: col.accessor, direction: 'desc' };
      }
      return null;
    });
  };

  return (
    <div className='rounded-md'>
      <table className='w-full border-collapse'>
        {/* ✅ Header */}
        <thead className='border-b'>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                onClick={() => handleSort(col)}
                className='cursor-pointer px-2 py-2 text-sm'
              >
                <span
                  className={`flex items-center ${
                    col.align === 'right' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {col.header}

                  {/* Sort Icon */}
                  {sortConfig?.key === col.accessor && (
                    <span className='relative ml-1 block h-full'>
                      {sortConfig.direction === 'asc' ? (
                        <>
                          <FaSortUp className='absolute top-1/2 -translate-y-1/2' />
                          <FaSortDown className='absolute top-1/2 -translate-y-1/2 text-gray-400' />
                        </>
                      ) : (
                        <>
                          <FaSortUp className='absolute top-1/2 -translate-y-1/2 text-gray-400' />
                          <FaSortDown className='absolute top-1/2 -translate-y-1/2' />
                        </>
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {/* ✅ Body */}
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className='py-4 text-center'>
                📭 No Data Found
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => (
              <tr
                key={row._id || rowIndex}
                className='cursor-pointer odd:bg-[rgba(0,0,0,0.05)]'
              >
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`px-2 py-2 text-sm ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VirtualTable;

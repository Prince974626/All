import React, { useEffect, useState } from 'react';
import api from '../redux/api';
import { toast } from 'react-toastify';
import checkIcon from '../assets/checked.svg';

const BetLockModal = ({
  isOpen,
  onClose,
  marketName = 'Market',
  eventName = '',
  gameId = '',
}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [transactionCode, setTransactionCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setTransactionCode('');

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get('/bet-lock-users', {
          params: {
            marketName: marketName || '',
            eventName: eventName || '',
            gameId: gameId || '',
          },
        });

        const fetchedList = Array.isArray(res.data?.data) ? res.data.data : [];
        setUsers(fetchedList);
        setSelectedUserIds(
          fetchedList.filter((u) => u.isLockedForMarket).map((u) => u._id)
        );
      } catch (err) {
        console.error('Error fetching users for Bet Lock:', err);
        toast.error(
          err.response?.data?.message || 'Failed to load downline users'
        );
        setUsers([]);
        setSelectedUserIds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, marketName, eventName, gameId]);

  if (!isOpen) return null;

  // Direct downline only (agents + users) — already filtered by API
  const displayUsers = users;

  const allSelected =
    displayUsers.length > 0 &&
    selectedUserIds.length === displayUsers.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(displayUsers.map((u) => u._id));
    }
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSaveLock = async () => {
    if (!transactionCode || !transactionCode.trim()) {
      toast.error('Please enter Transaction Code / Master Password');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/bet-lock-users', {
        marketName,
        eventName,
        gameId,
        userIds: selectedUserIds,
        transactionCode: transactionCode.trim(),
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Bet lock updated successfully');
        onClose();
      } else {
        toast.error(res.data?.message || 'Failed to update bet lock settings');
      }
    } catch (err) {
      console.error('Bet lock error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to update bet lock settings'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className='fixed inset-0 z-[300] flex items-start justify-center bg-black/60 overflow-y-auto pt-6 pb-6'
      onClick={onClose}
    >
      <div
        className='relative z-[301] mb-6 flex max-h-[calc(100vh-48px)] w-full max-w-[530px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between bg-white py-[14px] pr-[14px] pl-[28px]'>
          <div>
            <h2 className='text-[21px] tracking-tight text-gray-900'>
              Bet Lock
            </h2>
            <p className='mt-0.5 text-xs text-gray-500'>
              {marketName || 'Market'}
              {eventName ? ` · ${eventName}` : ''}
              {gameId ? ` · ${gameId}` : ''}
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='flex h-[35px] w-[35px] cursor-pointer items-center justify-center rounded-full bg-secondary text-[22px] font-semibold text-white text-shadow-[0_1px_0_#fff] transition-colors hover:bg-secondary70'
          >
            ×
          </button>
        </div>

        <div className='min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-[28px] py-[14px]'>
          {loading ? (
            <div className='p-8 text-center text-xs font-semibold text-gray-500'>
              Loading account list...
            </div>
          ) : (
            <>
              <div className='ml-auto max-w-[50%] pl-[15px]'>
                <input
                  type='password'
                  placeholder='Transaction Code'
                  value={transactionCode}
                  onChange={(e) => setTransactionCode(e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2 text-sm text-[#495057] outline-none placeholder:text-[#74788d]'
                />
              </div>

              <table className='w-full border-collapse text-left'>
                <tbody>
                  <tr>
                    <td className='border border-[#eff2f7] px-[0.65624rem] pt-1'>
                      <label className='relative block h-5 w-5 cursor-pointer'>
                        <input
                          type='checkbox'
                          checked={allSelected}
                          onChange={handleToggleAll}
                          className='checkbox'
                          style={{
                            '--check-image': `url(${checkIcon})`,
                          }}
                        />
                      </label>
                    </td>
                    <td className='border border-[#eff2f7] px-[0.65624rem] py-1 text-sm font-bold text-[#1e1e1e]'>
                      All Account
                    </td>
                  </tr>

                  {displayUsers.length > 0 ? (
                    displayUsers.map((user) => (
                      <tr key={user._id}>
                        <td className='border border-[#eff2f7] px-[0.65624rem] pt-1'>
                          <input
                            type='checkbox'
                            checked={selectedUserIds.includes(user._id)}
                            onChange={() => handleToggleUser(user._id)}
                            className='checkbox'
                            style={{
                              '--check-image': `url(${checkIcon})`,
                            }}
                          />
                        </td>
                        <td className='border border-[#eff2f7] px-[0.65624rem] py-1 text-sm text-[#1e1e1e]'>
                          {user.userName || user.name || user._id}
                          {user.role && String(user.role).toLowerCase() !== 'user' ? (
                            <span className='ml-1 text-[11px] text-gray-500'>
                              ({user.role})
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className='p-4 text-center font-semibold text-gray-500'
                      >
                        No active downline users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className='flex shrink-0 justify-end border-t border-gray-200 px-[28px] py-[14px]'>
          <button
            type='button'
            disabled={saving}
            onClick={handleSaveLock}
            className='cursor-pointer rounded bg-secondary px-6 py-2 text-xs font-bold text-white shadow transition-colors hover:bg-secondary70 disabled:opacity-50'
          >
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetLockModal;

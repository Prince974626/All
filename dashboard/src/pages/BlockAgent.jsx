'use client';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../redux/api';
import { toast } from 'react-toastify';
import {
  FaUserCheck,
  FaUserSlash,
  FaArrowLeft,
  FaEye,
  FaLock,
  FaShieldAlt,
  FaSitemap,
  FaTrashAlt,
  FaHistory,
  FaUndo,
} from 'react-icons/fa';

export default function BlockAgent() {
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  // Check if logged-in user is Super Admin
  const isSuperAdmin =
    userInfo?.role === 'supperadmin' || userInfo?.role === 'superadmin';

  // Hierarchy Stack for Navigation
  const [navStack, setNavStack] = useState([
    { id: 'root', label: 'Top Accounts', code: null, role: 'supperadmin' },
  ]);

  // Current view states
  const currentLevel = navStack[navStack.length - 1];

  // Data states
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // User Bets View State
  const [selectedUserForBets, setSelectedUserForBets] = useState(null);
  const [userBets, setUserBets] = useState([]);
  const [betsLoading, setBetsLoading] = useState(false);

  // Deleted Bets Log View State
  const [viewingDeletedBets, setViewingDeletedBets] = useState(false);
  const [deletedBets, setDeletedBets] = useState([]);
  const [deletedBetsLoading, setDeletedBetsLoading] = useState(false);
  const [deletedBetsUserFilter, setDeletedBetsUserFilter] = useState('');

  // Block/Unblock Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [targetAccount, setTargetAccount] = useState(null);
  const [targetStatus, setTargetStatus] = useState('block');
  const [masterPassword, setMasterPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Delete Bet Modal State
  const [deleteBetModalOpen, setDeleteBetModalOpen] = useState(false);
  const [targetBetToDelete, setTargetBetToDelete] = useState(null);
  const [deleteBetPassword, setDeleteBetPassword] = useState('');
  const [deleteBetLoading, setDeleteBetLoading] = useState(false);

  // Restore Bet Modal State
  const [restoreBetModalOpen, setRestoreBetModalOpen] = useState(false);
  const [targetBetToRestore, setTargetBetToRestore] = useState(null);
  const [restoreBetPassword, setRestoreBetPassword] = useState('');
  const [restoreBetLoading, setRestoreBetLoading] = useState(false);

  // Fetch accounts when navStack level changes
  useEffect(() => {
    if (!isSuperAdmin) return;
    if (selectedUserForBets || viewingDeletedBets) return;

    fetchAccountsForLevel(currentLevel);
  }, [navStack, selectedUserForBets, viewingDeletedBets, isSuperAdmin]);

  const fetchAccountsForLevel = async (levelItem) => {
    setLoading(true);
    try {
      if (levelItem.id === 'root') {
        const res = await api.get('/get/all-user?page=1&limit=500&searchQuery=', {
          withCredentials: true,
        });
        setMembers(res.data?.data || []);
      } else {
        const res = await api.post(
          '/sub-admin/getSubAdmin',
          { code: levelItem.code },
          { withCredentials: true }
        );
        setMembers(res.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching downline members:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch downline members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Deleted Bets (for SuperAdmin)
  const fetchAllDeletedBets = async (userFilter = '') => {
    setDeletedBetsLoading(true);
    try {
      const res = await api.get(
        `/get/deleted-bets?userName=${encodeURIComponent(userFilter)}&limit=300`,
        { withCredentials: true }
      );
      setDeletedBets(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching deleted bets:', error);
      toast.error('Failed to load deleted bets log');
      setDeletedBets([]);
    } finally {
      setDeletedBetsLoading(false);
    }
  };

  // Toggle Deleted Bets view
  const handleOpenDeletedBetsTab = () => {
    setSelectedUserForBets(null);
    setViewingDeletedBets(true);
    fetchAllDeletedBets(deletedBetsUserFilter);
  };

  // Drill down into an agent/admin
  const handleDrillDown = (account) => {
    setSelectedUserForBets(null);
    setViewingDeletedBets(false);
    setNavStack((prev) => [
      ...prev,
      {
        id: account._id || account.code,
        label: `${account.userName} (${account.role || 'Member'})`,
        code: account.code,
        role: account.role,
        accountObj: account,
      },
    ]);
  };

  // Navigate back to a specific index in hierarchy
  const handleNavBackTo = (index) => {
    setSelectedUserForBets(null);
    setViewingDeletedBets(false);
    setUserBets([]);
    setNavStack((prev) => prev.slice(0, index + 1));
  };

  // Fetch ALL bets for a user across multiple endpoints
  const handleViewUserBets = async (user) => {
    setSelectedUserForBets(user);
    setViewingDeletedBets(false);
    setBetsLoading(true);
    setUserBets([]);
    try {
      let combinedBets = [];

      try {
        const res1 = await api.get(
          `/get/user/bet-history?id=${user._id}&page=1&limit=500`,
          { withCredentials: true }
        );
        if (res1.data && Array.isArray(res1.data.data) && res1.data.data.length > 0) {
          combinedBets = res1.data.data;
        }
      } catch (err1) {
        console.warn('Source 1 bet fetch note:', err1);
      }

      if (combinedBets.length === 0) {
        try {
          const res2 = await api.get(
            `/get/my-reports/by-events?page=1&limit=500&userName=${encodeURIComponent(user.userName)}`,
            { withCredentials: true }
          );
          const rawReport = res2.data?.report || res2.data?.data;
          if (Array.isArray(rawReport) && rawReport.length > 0) {
            combinedBets = rawReport;
          }
        } catch (err2) {
          console.warn('Source 2 bet fetch note:', err2);
        }
      }

      if (combinedBets.length === 0) {
        try {
          const res3 = await api.get(
            `/get/all-bet-list/?page=1&limit=500&selectedGame=All&selectedVoid=all&selectedType=all`,
            { withCredentials: true }
          );
          const allBets = res3.data?.data || res3.data?.bets || [];
          if (Array.isArray(allBets)) {
            const userSpecific = allBets.filter(
              (b) => b?.userName === user.userName || b?.userId === user._id
            );
            if (userSpecific.length > 0) {
              combinedBets = userSpecific;
            }
          }
        } catch (err3) {
          console.warn('Source 3 bet fetch note:', err3);
        }
      }

      const activeBetsOnly = combinedBets.filter(
        (b) => b && b.isDeleted !== true
      );
      setUserBets(activeBetsOnly);
    } catch (error) {
      console.error('Error fetching user bets:', error);
      toast.error('Could not load user bet history');
      setUserBets([]);
    } finally {
      setBetsLoading(false);
    }
  };

  // Open Block / Unblock Modal
  const openBlockModal = (account, currentStatus) => {
    setTargetAccount(account);
    setTargetStatus(currentStatus === 'block' || currentStatus === 'lock' ? 'active' : 'block');
    setMasterPassword('');
    setModalOpen(true);
  };

  // Execute Block / Unblock Action
  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!masterPassword) {
      toast.error('Please enter your Master Password');
      return;
    }
    setModalLoading(true);
    try {
      const res = await api.put(
        '/user-setting',
        {
          userId: targetAccount._id,
          status: targetStatus,
          masterPassword: masterPassword,
        },
        { withCredentials: true }
      );

      toast.success(res.data?.message || `Status updated to ${targetStatus} successfully`);
      setModalOpen(false);

      fetchAccountsForLevel(currentLevel);
    } catch (error) {
      console.error('Status change error:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setModalLoading(false);
    }
  };

  // Open Delete Bet Modal
  const openDeleteBetModal = (bet) => {
    setTargetBetToDelete(bet);
    setDeleteBetPassword('');
    setDeleteBetModalOpen(true);
  };

  // Execute Delete Bet Action
  const handleConfirmDeleteBet = async (e) => {
    e.preventDefault();
    if (!targetBetToDelete?._id) {
      toast.error('Invalid bet record');
      return;
    }
    if (!deleteBetPassword) {
      toast.error('Please enter your Master Password');
      return;
    }
    setDeleteBetLoading(true);
    try {
      const res = await api.delete(`/delete-bet/${targetBetToDelete._id}`, {
        data: { masterPassword: deleteBetPassword },
        withCredentials: true,
      });

      toast.success(res.data?.message || 'Bet soft deleted successfully');
      setDeleteBetModalOpen(false);

      if (selectedUserForBets) {
        handleViewUserBets(selectedUserForBets);
      }
    } catch (error) {
      console.error('Delete bet error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete bet');
    } finally {
      setDeleteBetLoading(false);
    }
  };

  // Open Restore Bet Modal
  const openRestoreBetModal = (bet) => {
    setTargetBetToRestore(bet);
    setRestoreBetPassword('');
    setRestoreBetModalOpen(true);
  };

  // Execute Restore Bet Action
  const handleConfirmRestoreBet = async (e) => {
    e.preventDefault();
    if (!targetBetToRestore?._id) {
      toast.error('Invalid bet record');
      return;
    }
    if (!restoreBetPassword) {
      toast.error('Please enter your Master Password');
      return;
    }
    setRestoreBetLoading(true);
    try {
      const res = await api.put(
        `/restore-bet/${targetBetToRestore._id}`,
        { masterPassword: restoreBetPassword },
        { withCredentials: true }
      );

      toast.success(res.data?.message || 'Bet restored successfully');
      setRestoreBetModalOpen(false);

      // Refresh deleted bets log
      fetchAllDeletedBets(deletedBetsUserFilter);
    } catch (error) {
      console.error('Restore bet error:', error);
      toast.error(error.response?.data?.message || 'Failed to restore bet');
    } finally {
      setRestoreBetLoading(false);
    }
  };

  // Access check fallback if not superadmin
  if (!isSuperAdmin) {
    return (
      <>
        <Navbar />
        <div className='min-h-screen bg-[#e9edf2] p-6 flex flex-col items-center justify-center'>
          <div className='max-w-md w-full rounded-md border border-red-200 bg-white p-8 text-center shadow-md space-y-4'>
            <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600'>
              <FaShieldAlt size={32} />
            </div>
            <h2 className='text-xl font-bold text-gray-800'>Access Restricted</h2>
            <p className='text-sm text-gray-600'>
              The Block Agent module is exclusively accessible to the <strong>Super Admin</strong>.
            </p>
            <button
              onClick={() => navigate('/home')}
              className='rounded bg-[#2c3e50] px-6 py-2 text-sm font-semibold text-white hover:bg-[#1a252f] transition-colors'
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  // Filter members by search input
  const filteredMembers = members.filter((m) =>
    (m?.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m?.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className='min-h-screen bg-[#e9edf2] p-4 md:p-6'>
        <div className='mx-auto max-w-[1400px] space-y-4'>
          {/* Header Bar */}
          <div className='flex flex-wrap items-center justify-between gap-4 rounded-md border border-gray-300 bg-white p-4 shadow-sm'>
            <div className='flex items-center space-x-3'>
              {(navStack.length > 1 || selectedUserForBets || viewingDeletedBets) && (
                <button
                  onClick={() => {
                    if (viewingDeletedBets) {
                      setViewingDeletedBets(false);
                    } else if (selectedUserForBets) {
                      setSelectedUserForBets(null);
                    } else {
                      handleNavBackTo(navStack.length - 2);
                    }
                  }}
                  className='flex items-center space-x-1.5 rounded bg-[#2c3e50] px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#1a252f] transition-colors'
                >
                  <FaArrowLeft size={12} />
                  <span>Back</span>
                </button>
              )}
              <div>
                <h1 className='text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2'>
                  <FaSitemap className='text-[#2c3e50]' />
                  <span>Block Control & Downline Management</span>
                </h1>
                <p className='text-xs text-gray-500'>
                  Drill down through your complete hierarchy (Admin &rarr; Master &rarr; Agent &rarr; User), block accounts, or view and restore deleted bets.
                </p>
              </div>
            </div>

            {/* Navigation & Action Buttons */}
            <div className='flex flex-wrap items-center gap-2 text-xs font-semibold'>
              <button
                onClick={handleOpenDeletedBetsTab}
                className={`flex items-center space-x-1.5 rounded px-3 py-2 shadow transition-colors ${
                  viewingDeletedBets
                    ? 'bg-red-700 text-white font-bold'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <FaHistory size={13} />
                <span>Deleted Bets Log</span>
              </button>

              {/* Breadcrumbs */}
              {!viewingDeletedBets && (
                <div className='flex flex-wrap items-center gap-1.5 text-xs font-semibold'>
                  {navStack.map((item, idx) => (
                    <div key={item.id + idx} className='flex items-center space-x-1.5'>
                      {idx > 0 && <span className='text-gray-400'>/</span>}
                      <button
                        onClick={() => handleNavBackTo(idx)}
                        className={`rounded px-2.5 py-1 transition-colors ${
                          idx === navStack.length - 1 && !selectedUserForBets
                            ? 'bg-[#2c3e50] text-white font-bold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    </div>
                  ))}
                  {selectedUserForBets && (
                    <div className='flex items-center space-x-1.5'>
                      <span className='text-gray-400'>/</span>
                      <span className='rounded bg-[#2c3e50] px-2.5 py-1 text-white font-bold'>
                        Bets: {selectedUserForBets.userName}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar for Accounts */}
          {!selectedUserForBets && !viewingDeletedBets && (
            <div className='flex items-center justify-between rounded-md border border-gray-300 bg-white p-3 shadow-sm'>
              <input
                type='text'
                placeholder='Search downline accounts by username, name, or code...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full max-w-md rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 focus:border-[#2c3e50] focus:outline-none md:text-sm'
              />
              <span className='text-xs text-gray-500 font-medium'>
                Showing {filteredMembers.length} accounts at this level
              </span>
            </div>
          )}

          {/* Search/Filter Bar for Deleted Bets Tab */}
          {viewingDeletedBets && (
            <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-white p-3 shadow-sm'>
              <div className='flex items-center space-x-2 w-full max-w-md'>
                <input
                  type='text'
                  placeholder='Filter by username (leave empty for ALL deleted bets)...'
                  value={deletedBetsUserFilter}
                  onChange={(e) => setDeletedBetsUserFilter(e.target.value)}
                  className='w-full rounded border border-red-300 px-3 py-1.5 text-xs text-gray-800 focus:border-red-600 focus:outline-none md:text-sm'
                />
                <button
                  onClick={() => fetchAllDeletedBets(deletedBetsUserFilter)}
                  className='rounded bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors'
                >
                  Filter
                </button>
              </div>
              <span className='text-xs text-red-700 font-semibold'>
                Total Deleted Bets Found: {deletedBets.length}
              </span>
            </div>
          )}

          {/* Main Content Area */}
          <div className='overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm'>
            {viewingDeletedBets ? (
              /* VIEW: ALL DELETED BETS LOG WITH RESTORE BUTTON */
              <div>
                <div className='bg-red-800 px-4 py-2.5 text-sm font-bold text-white flex items-center justify-between'>
                  <span className='flex items-center gap-2'>
                    <FaHistory />
                    <span>Deleted Bets Log (Super Admin View)</span>
                  </span>
                  <button
                    onClick={() => setViewingDeletedBets(false)}
                    className='text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-white transition-colors'
                  >
                    Close Log
                  </button>
                </div>

                {deletedBetsLoading ? (
                  <div className='p-12 text-center text-sm font-semibold text-gray-600'>
                    Loading deleted bets log, please wait...
                  </div>
                ) : deletedBets.length === 0 ? (
                  <div className='p-12 text-center text-sm font-medium text-gray-500'>
                    No soft-deleted bets found {deletedBetsUserFilter ? `for user "${deletedBetsUserFilter}"` : 'in the database'}.
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='w-full text-left text-xs md:text-sm'>
                      <thead className='bg-[#eef1f5] text-gray-700 uppercase text-[11px] font-bold border-b border-gray-300'>
                        <tr>
                          <th className='px-4 py-3'>#</th>
                          <th className='px-4 py-3'>User Name</th>
                          <th className='px-4 py-3'>Sport</th>
                          <th className='px-4 py-3'>Event Name</th>
                          <th className='px-4 py-3'>Market</th>
                          <th className='px-4 py-3'>Runner</th>
                          <th className='px-4 py-3 text-center'>Type</th>
                          <th className='px-4 py-3 text-center'>Odds</th>
                          <th className='px-4 py-3 text-right'>Amount</th>
                          <th className='px-4 py-3 text-right'>Original P/L</th>
                          <th className='px-4 py-3 text-center'>Deleted / Date</th>
                          <th className='px-4 py-3 text-center'>Action</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200 bg-red-50/20 font-medium'>
                        {deletedBets.map((bet, idx) => {
                          const isBack = (bet?.otype || bet?.type || 'back').toLowerCase() === 'back';
                          const gameName = bet?.gameName || bet?.sport || bet?.betType || 'Sports';
                          const eventName = bet?.eventName || bet?.event || '-';
                          const marketName = bet?.marketName || bet?.market || '-';
                          const runnerName = bet?.teamName || bet?.runnerName || bet?.runner || '-';
                          const price = bet?.xValue ?? bet?.price ?? bet?.odds ?? 0;
                          const stake = bet?.betAmount ?? bet?.amount ?? bet?.price ?? 0;
                          const resultAmt = Number(bet?.resultAmount ?? bet?.profitLoss ?? bet?.pl ?? 0);
                          const statusLabel =
                            bet?.status === 1
                              ? 'Won'
                              : bet?.status === 2
                              ? 'Lost'
                              : bet?.status === 3
                              ? 'Void'
                              : 'Pending';

                          const formattedDate = bet?.updatedAt
                            ? new Date(bet.updatedAt).toLocaleString('en-IN')
                            : bet?.createdAt
                            ? new Date(bet.createdAt).toLocaleString('en-IN')
                            : '-';

                          return (
                            <tr
                              key={bet?._id || idx}
                              className='hover:bg-red-100/30 transition-colors'
                            >
                              <td className='px-4 py-3 text-gray-500'>{idx + 1}</td>
                              <td className='px-4 py-3 font-bold text-red-800'>
                                {bet?.userName || '-'}
                              </td>
                              <td className='px-4 py-3 font-semibold text-gray-800 capitalize'>
                                {gameName}
                              </td>
                              <td className='px-4 py-3 text-gray-700 uppercase font-semibold'>
                                {eventName}
                              </td>
                              <td className='px-4 py-3 text-gray-600'>{marketName}</td>
                              <td className='px-4 py-3 text-gray-800 uppercase font-bold'>
                                {runnerName}
                              </td>
                              <td className='px-4 py-3 text-center'>
                                <span
                                  className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold text-white uppercase ${
                                    isBack ? 'bg-[#2980b9]' : 'bg-[#c0392b]'
                                  }`}
                                >
                                  {bet?.otype || bet?.type || 'BACK'}
                                </span>
                              </td>
                              <td className='px-4 py-3 text-center font-bold text-gray-800'>
                                {price}
                              </td>
                              <td className='px-4 py-3 text-right font-bold text-gray-800'>
                                ₹{stake}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-bold ${
                                  resultAmt < 0
                                    ? 'text-red-600'
                                    : resultAmt > 0
                                    ? 'text-green-700'
                                    : 'text-gray-700'
                                }`}
                              >
                                ₹{resultAmt} ({statusLabel})
                              </td>
                              <td className='px-4 py-3 text-center text-xs text-gray-500'>
                                {formattedDate}
                              </td>
                              <td className='px-4 py-3 text-center'>
                                <button
                                  onClick={() => openRestoreBetModal(bet)}
                                  className='inline-flex items-center space-x-1 rounded bg-green-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-green-700 transition-colors'
                                  title='Restore Bet'
                                >
                                  <FaUndo size={11} />
                                  <span>Restore</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : selectedUserForBets ? (
              /* VIEW: USER BET HISTORY WITH DELETE BUTTON */
              <div>
                <div className='bg-[#2c3e50] px-4 py-2.5 text-sm font-bold text-white flex items-center justify-between'>
                  <span>All Active Bet History for User: {selectedUserForBets.userName} ({userBets.length} Bets)</span>
                  <button
                    onClick={() => setSelectedUserForBets(null)}
                    className='text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-white transition-colors'
                  >
                    Close Bets
                  </button>
                </div>

                {betsLoading ? (
                  <div className='p-12 text-center text-sm font-semibold text-gray-600'>
                    Loading user bets, please wait...
                  </div>
                ) : userBets.length === 0 ? (
                  <div className='p-12 text-center text-sm font-medium text-gray-500'>
                    No active bet records found for <strong>{selectedUserForBets.userName}</strong>.
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='w-full text-left text-xs md:text-sm'>
                      <thead className='bg-[#eef1f5] text-gray-700 uppercase text-[11px] font-bold border-b border-gray-300'>
                        <tr>
                          <th className='px-4 py-3'>#</th>
                          <th className='px-4 py-3'>Sport</th>
                          <th className='px-4 py-3'>Event Name</th>
                          <th className='px-4 py-3'>Market</th>
                          <th className='px-4 py-3'>Runner</th>
                          <th className='px-4 py-3 text-center'>Type</th>
                          <th className='px-4 py-3 text-center'>Odds/Price</th>
                          <th className='px-4 py-3 text-right'>Amount</th>
                          <th className='px-4 py-3 text-right'>P/L & Status</th>
                          <th className='px-4 py-3 text-center'>Place Date</th>
                          <th className='px-4 py-3 text-center'>Action</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200 bg-white font-medium'>
                        {userBets.map((bet, idx) => {
                          const isBack = (bet?.otype || bet?.type || 'back').toLowerCase() === 'back';
                          const gameName = bet?.gameName || bet?.sport || bet?.betType || 'Sports';
                          const eventName = bet?.eventName || bet?.event || '-';
                          const marketName = bet?.marketName || bet?.market || '-';
                          const runnerName = bet?.teamName || bet?.runnerName || bet?.runner || '-';
                          const price = bet?.xValue ?? bet?.price ?? bet?.odds ?? 0;
                          const stake = bet?.betAmount ?? bet?.amount ?? bet?.price ?? 0;
                          const resultAmt = Number(bet?.resultAmount ?? bet?.profitLoss ?? bet?.pl ?? 0);
                          
                          const statusLabel =
                            bet?.status === 1
                              ? 'Won'
                              : bet?.status === 2
                              ? 'Lost'
                              : bet?.status === 3
                              ? 'Void'
                              : bet?.status === 0
                              ? 'Pending'
                              : 'Settled';

                          const formattedDate = bet?.createdAt
                            ? new Date(bet.createdAt).toLocaleString('en-IN')
                            : bet?.date
                            ? new Date(bet.date).toLocaleString('en-IN')
                            : '-';

                          return (
                            <tr
                              key={bet?._id || idx}
                              className={`transition-colors ${
                                isBack ? 'bg-[#72bbef]/10' : 'bg-[#faa9ba]/10'
                              }`}
                            >
                              <td className='px-4 py-3 text-gray-500'>{idx + 1}</td>
                              <td className='px-4 py-3 font-bold text-gray-800 capitalize'>
                                {gameName}
                              </td>
                              <td className='px-4 py-3 text-gray-700 uppercase font-semibold'>
                                {eventName}
                              </td>
                              <td className='px-4 py-3 text-gray-600'>{marketName}</td>
                              <td className='px-4 py-3 text-gray-800 uppercase font-bold'>
                                {runnerName}
                              </td>
                              <td className='px-4 py-3 text-center'>
                                <span
                                  className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold text-white uppercase ${
                                    isBack ? 'bg-[#2980b9]' : 'bg-[#c0392b]'
                                  }`}
                                >
                                  {bet?.otype || bet?.type || 'BACK'}
                                </span>
                              </td>
                              <td className='px-4 py-3 text-center font-bold text-gray-800'>
                                {price}
                              </td>
                              <td className='px-4 py-3 text-right font-bold text-gray-800'>
                                ₹{stake}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-bold ${
                                  resultAmt < 0
                                    ? 'text-red-600'
                                    : resultAmt > 0
                                    ? 'text-green-700'
                                    : 'text-gray-700'
                                }`}
                              >
                                ₹{resultAmt} ({statusLabel})
                              </td>
                              <td className='px-4 py-3 text-center text-xs text-gray-500'>
                                {formattedDate}
                              </td>
                              <td className='px-4 py-3 text-center'>
                                <button
                                  onClick={() => openDeleteBetModal(bet)}
                                  className='inline-flex items-center space-x-1 rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-red-700 transition-colors'
                                  title='Delete Bet'
                                >
                                  <FaTrashAlt size={11} />
                                  <span>Delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* VIEW: ACCOUNTS LIST TABLE */
              <div className='overflow-x-auto'>
                {loading ? (
                  <div className='p-12 text-center text-sm font-semibold text-gray-600'>
                    Loading downline accounts, please wait...
                  </div>
                ) : (
                  <table className='w-full text-left text-xs md:text-sm'>
                    <thead className='bg-[#2c3e50] text-white uppercase text-[11px] tracking-wider font-semibold'>
                      <tr>
                        <th className='px-4 py-3'>#</th>
                        <th className='px-4 py-3'>Account Name</th>
                        <th className='px-4 py-3'>Full Name</th>
                        <th className='px-4 py-3'>Code</th>
                        <th className='px-4 py-3'>Role</th>
                        <th className='px-4 py-3'>Balance</th>
                        <th className='px-4 py-3'>Exposure</th>
                        <th className='px-4 py-3 text-center'>Status</th>
                        <th className='px-4 py-3 text-center'>Block Action</th>
                        <th className='px-4 py-3 text-center'>Downline / Bets</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200 bg-white font-medium'>
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan='10' className='px-4 py-8 text-center text-gray-500'>
                            No accounts found at this level.
                          </td>
                        </tr>
                      ) : (
                        filteredMembers.map((member, index) => {
                          const isBlocked =
                            member?.status === 'block' || member?.status === 'lock';
                          const isUserRole = member?.role === 'user';

                          return (
                            <tr
                              key={member?._id || index}
                              className='hover:bg-gray-50 transition-colors'
                            >
                              <td className='px-4 py-3 text-gray-500'>{index + 1}</td>
                              <td className='px-4 py-3 font-bold text-gray-800'>
                                {member?.userName || '-'}
                              </td>
                              <td className='px-4 py-3 text-gray-600'>
                                {member?.name || '-'}
                              </td>
                              <td className='px-4 py-3 font-mono text-gray-600'>
                                {member?.code || '-'}
                              </td>
                              <td className='px-4 py-3 uppercase text-xs font-bold text-gray-500'>
                                {member?.role || member?.account || 'Member'}
                              </td>
                              <td className='px-4 py-3 font-semibold text-gray-800'>
                                ₹{member?.balance ?? member?.avbalance ?? 0}
                              </td>
                              <td className='px-4 py-3 font-semibold text-red-600'>
                                ₹{member?.exposure ?? 0}
                              </td>
                              <td className='px-4 py-3 text-center'>
                                {isBlocked ? (
                                  <span className='inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800'>
                                    Blocked
                                  </span>
                                ) : (
                                  <span className='inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800'>
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className='px-4 py-3 text-center'>
                                {isBlocked ? (
                                  <button
                                    onClick={() => openBlockModal(member, member.status)}
                                    className='inline-flex items-center space-x-1 rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-green-700 transition-colors'
                                  >
                                    <FaUserCheck size={11} />
                                    <span>Unblock</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openBlockModal(member, member.status)}
                                    className='inline-flex items-center space-x-1 rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-red-700 transition-colors'
                                  >
                                    <FaUserSlash size={11} />
                                    <span>Block</span>
                                  </button>
                                )}
                              </td>
                              <td className='px-4 py-3 text-center'>
                                {isUserRole ? (
                                  <button
                                    onClick={() => handleViewUserBets(member)}
                                    className='inline-flex items-center space-x-1 rounded bg-[#2c3e50] px-3 py-1 text-xs font-semibold text-white shadow hover:bg-[#1a252f] transition-colors'
                                  >
                                    <FaEye size={11} />
                                    <span>View Bets</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDrillDown(member)}
                                    className='inline-flex items-center space-x-1 rounded bg-[#2c3e50] px-3 py-1 text-xs font-semibold text-white shadow hover:bg-[#1a252f] transition-colors'
                                  >
                                    <FaEye size={11} />
                                    <span>View Downline &rarr;</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BLOCK / UNBLOCK MASTER PASSWORD MODAL */}
      {modalOpen && targetAccount && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-md rounded-md bg-white p-6 shadow-xl border border-gray-200'>
            <div className='flex items-center space-x-2 text-lg font-bold text-gray-800'>
              <FaLock className='text-[#2c3e50]' />
              <span>Confirm Status Change</span>
            </div>
            <p className='mt-2 text-xs md:text-sm text-gray-600'>
              Are you sure you want to{' '}
              <strong className={targetStatus === 'block' ? 'text-red-600' : 'text-green-600'}>
                {targetStatus === 'block' ? 'BLOCK' : 'UNBLOCK'}
              </strong>{' '}
              account <strong>{targetAccount.userName}</strong> ({targetAccount.role || 'Member'})?
            </p>

            <form onSubmit={handleConfirmStatusChange} className='mt-4 space-y-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Enter Master Password:
                </label>
                <input
                  type='password'
                  required
                  placeholder='Master Password'
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2c3e50] focus:outline-none'
                />
              </div>

              <div className='flex justify-end space-x-3 pt-2'>
                <button
                  type='button'
                  onClick={() => setModalOpen(false)}
                  disabled={modalLoading}
                  className='rounded border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={modalLoading}
                  className={`rounded px-5 py-2 text-xs font-semibold text-white shadow transition-colors ${
                    targetStatus === 'block'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {modalLoading ? 'Updating...' : targetStatus === 'block' ? 'Block Account' : 'Unblock Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE BET CONFIRMATION MODAL */}
      {deleteBetModalOpen && targetBetToDelete && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-md rounded-md bg-white p-6 shadow-xl border border-gray-200'>
            <div className='flex items-center space-x-2 text-lg font-bold text-red-600'>
              <FaTrashAlt />
              <span>Confirm Delete Bet</span>
            </div>
            <p className='mt-2 text-xs md:text-sm text-gray-600'>
              Are you sure you want to soft delete bet on{' '}
              <strong>{targetBetToDelete?.eventName || targetBetToDelete?.gameName || 'this match'}</strong> for amount{' '}
              <strong>₹{targetBetToDelete?.betAmount || targetBetToDelete?.price || 0}</strong>?
            </p>

            <form onSubmit={handleConfirmDeleteBet} className='mt-4 space-y-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Enter Master Password:
                </label>
                <input
                  type='password'
                  required
                  placeholder='Master Password'
                  value={deleteBetPassword}
                  onChange={(e) => setDeleteBetPassword(e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-red-600 focus:outline-none'
                />
              </div>

              <div className='flex justify-end space-x-3 pt-2'>
                <button
                  type='button'
                  onClick={() => setDeleteBetModalOpen(false)}
                  disabled={deleteBetLoading}
                  className='rounded border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={deleteBetLoading}
                  className='rounded bg-red-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 transition-colors'
                >
                  {deleteBetLoading ? 'Deleting...' : 'Delete Bet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTORE BET CONFIRMATION MODAL */}
      {restoreBetModalOpen && targetBetToRestore && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-md rounded-md bg-white p-6 shadow-xl border border-gray-200'>
            <div className='flex items-center space-x-2 text-lg font-bold text-green-700'>
              <FaUndo />
              <span>Confirm Restore Bet</span>
            </div>
            <p className='mt-2 text-xs md:text-sm text-gray-600'>
              Are you sure you want to restore the soft-deleted bet for user <strong>{targetBetToRestore?.userName}</strong> on{' '}
              <strong>{targetBetToRestore?.eventName || targetBetToRestore?.gameName || 'this match'}</strong> for amount{' '}
              <strong>₹{targetBetToRestore?.betAmount || targetBetToRestore?.price || 0}</strong>?
            </p>

            <form onSubmit={handleConfirmRestoreBet} className='mt-4 space-y-4'>
              <div>
                <label className='block text-xs font-semibold text-gray-700 mb-1'>
                  Enter Master Password:
                </label>
                <input
                  type='password'
                  required
                  placeholder='Master Password'
                  value={restoreBetPassword}
                  onChange={(e) => setRestoreBetPassword(e.target.value)}
                  className='w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none'
                />
              </div>

              <div className='flex justify-end space-x-3 pt-2'>
                <button
                  type='button'
                  onClick={() => setRestoreBetModalOpen(false)}
                  disabled={restoreBetLoading}
                  className='rounded border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={restoreBetLoading}
                  className='rounded bg-green-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-green-700 transition-colors'
                >
                  {restoreBetLoading ? 'Restoring...' : 'Restore Bet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

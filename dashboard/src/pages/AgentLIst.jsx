'use client';
import {
  CurrencyIcon,
  ArrowSwapIcon,
  MenuClockIcon,
  GearIcon,
  UserIcon,
  BadgeLockIcon,
  TrashBinIcon,
} from '../assets/svgIcon';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBan,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaRegEdit,
  FaUnlock,
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  addAdmin,
  getAdmin,
  deleteSubAdmin,
  getAllUserAndDownline,
  getAllUsersWithCompleteInfo,
  setCurrentPage,
  fetchSubAdminByLevel,
  updateCreditReference,
  getCreditRefHistory,
  withdrawalAndDeposite,
  userSetting,
  updatePartnership,
  changePasswordByDownline,
} from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import { IoMdCheckmark, IoMdClose, IoMdSettings } from 'react-icons/io';
import { TbCoinRupeeFilled } from 'react-icons/tb';
import { MdDelete } from 'react-icons/md';
import Navbar from '../components/Navbar';
import Spinner from '../components/Spinner';
import Loader from '../components/Loader';
import { updateGameLock } from '../redux/reducer/downlineReducer';

export default function AgentLIst() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    userInfo,
    currentPage,
    totalPages,
    totalUsers,
    loading,
    users,
    users1,
    crediteHistory,
  } = useSelector((state) => state.auth);
  const { gamelock } = useSelector((state) => state.downline);

  // console.log("crediteHistory", crediteHistory);
  // console.log("totalCrediteData", totalCrediteData);
  console.log('userData getAllUserAndDownline', users);
  console.log('userData getAllUsersWithCompleteInfo', users1);

  const [entries, setEntries] = useState(10);
  const [creditEntries, setCreditEntries] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [showPassword3, setShowPassword3] = useState(false);
  const [creditPopup, setCreditPopup] = useState(false);
  const [patnerPopup, setPatnerPopup] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [balancePopup, setBalancePopup] = useState(false);
  const [settingPopup, setSettingPopup] = useState(false);
  const [sportsPopup, setSportsPopup] = useState(false);
  const [currentUser, setcurrentUser] = useState(null);
  const [isFetchingAllUsers, setIsFetchingAllUsers] = useState(null);
  const [isFetchCompleteInfo, setIsFetchCompleteInfo] = useState(null);
  const [type, setType] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [gameLockData, setGameLockData] = useState([]);
  const [depositPopup, setDepositPopup] = useState(false);
  const [withdrawPopup, setWithdrawPopup] = useState(false);
  const [passwordPopup, setPasswordPopup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [partnershipFormData, setPartnershipFormData] = useState({
    partnership: '',
    masterPassword: '',
  });
  const [showChipsSummary, setShowChipsSummary] = useState(false);

  useEffect(() => {
    if (isEdit) {
      document.body.classList.add('modalOpen');
    } else {
      document.body.classList.remove('modalOpen');
    }

    // Cleanup function to remove class when component unmounts
    return () => {
      document.body.classList.remove('modalOpen');
    };
  }, [isEdit]);

  // console.log("currentUser", currentUser);
  const roleHierarchy = {
    supperadmin: ['admin', 'white', 'super', 'master', 'agent'],
    admin: ['white', 'super', 'master', 'agent'],
    white: ['super', 'master', 'agent'],
    super: ['master', 'agent'],
    master: ['agent'],
    agent: ['user'],
  };

  const allowedRoles = roleHierarchy[userInfo?.role] || [];

  const [formData, setFormData] = useState({
    name: '',
    userName: '',
    accountType: '',
    commition: '',
    balance: null,
    exposureLimit: null,
    creditReference: null,
    rollingCommission: null,
    partnership: null,
    phone: null,
    password: '',
    confirmPassword: '',
    masterPassword: '',
    remark: '',
    status: 'active',
  });

  // sport popup checkbox
  const handleToggle = async (game, currentLock) => {
    try {
      dispatch(
        updateGameLock({ userId: currentUser?._id, game, lock: !currentLock })
      ).then((res) => {
        if (res.payload.success) {
          console.log('res.payload111', res.payload);
          setGameLockData(res.payload?.gamelock);
          dispatch(
            getAllUserAndDownline({
              page: currentPage,
              limit: entries,
              searchQuery,
            })
          );
          toast.success(res.payload.message);
        } else {
          toast.error(res.payload.message);
        }
      });
    } catch (err) {
      console.error('Failed to update game lock:', err);
    }
  };

  useEffect(() => {
    dispatch(getAdmin());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Password and Confirm Password do not match');
      return;
    }
    if (userInfo) {
      try {
        const result = await dispatch(addAdmin(formData)).unwrap();
        toast.success(result.message);
        dispatch(
          getAllUserAndDownline({
            page: currentPage,
            limit: entries,
            searchQuery,
          })
        );
        dispatch(getAdmin());
        setIsEdit(false);
      } catch (error) {
        // console.log("root error", error);
        toast.error(error);
      }
    } else {
      navigate('/');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      dispatch(setCurrentPage(newPage));
    }
  };

  const handleDelete = async (id) => {
    try {
      const deleteUser = await dispatch(deleteSubAdmin(id)).unwrap();

      toast.success(deleteUser.message);
      dispatch(
        getAllUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
    } catch (error) {
      toast.error(error);
    }
  };

  const handleLoadNextLevel = (user, code) => {
    if (user.role !== 'user') {
      setIsFetchingAllUsers(false);
      dispatch(fetchSubAdminByLevel({ code: code }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const data = await dispatch(
        updateCreditReference({ formData, userId: currentUser._id })
      ).unwrap();
      toast.success(data.message);
      setCreditPopup(false);
      dispatch(
        getAllUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
    } catch (error) {
      toast.error(error);
    }
  };

  const handleWithdwalDeposite = async (e) => {
    e.preventDefault();
    try {
      const data = await dispatch(
        withdrawalAndDeposite({ formData, userId: currentUser._id, type })
      ).unwrap();
      toast.success(data.message);
      dispatch(
        getAllUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
      dispatch(getAdmin());
      setDepositPopup(false);
      setWithdrawPopup(false); // Optional: close the popup on success
    } catch (error) {
      toast.error(error);
    }
  };

  const handleSetting = async (e) => {
    e.preventDefault();
    try {
      const result = await dispatch(
        userSetting({
          userId: currentUser._id,
          status: formData.status,
          masterPassword: formData.masterPassword,
        })
      ).unwrap();
      toast.success(result.message);
      setSettingPopup(false);
      dispatch(
        getAllUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
    } catch (error) {
      toast.error(error);
    }
  };

  const handlePartnershipUpdate = async (e) => {
    e.preventDefault();
    try {
      const result = await dispatch(
        updatePartnership({
          userId: currentUser._id,
          formData: partnershipFormData,
        })
      ).unwrap();
      toast.success(result.message);
      setPatnerPopup(false);
      dispatch(
        getAllUserAndDownline({
          page: currentPage,
          limit: entries,
          searchQuery,
        })
      );
      dispatch(getAdmin());
    } catch (error) {
      toast.error(error);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser?._id) {
      toast.error('Please select a user first.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Password not match.');
      return;
    }

    if (!formData.masterPassword) {
      toast.error('Please enter master password.');
      return;
    }

    try {
      const result = await dispatch(
        changePasswordByDownline({
          id: currentUser._id,
          masterPassword: formData.masterPassword,
          newPassword,
        })
      ).unwrap();

      toast.success(result.message);
      setPasswordPopup(false);
      setNewPassword('');
      setConfirmPassword('');
      setFormData({ ...formData, masterPassword: '' });
    } catch (error) {
      toast.error(error);
    }
  };

  const handleCreditRefHistory = (userId) => {
    setSelectedUserId(userId);
    setIsOpen(true);
  };
  useEffect(() => {
    if (isOpen && selectedUserId) {
      dispatch(
        getCreditRefHistory({
          userId: selectedUserId,
          page: currentPage,
          limit: creditEntries,
        })
      );
    }
  }, [dispatch, currentPage, creditEntries, selectedUserId, isOpen]);

  useEffect(() => {
    setIsFetchingAllUsers(true);
    dispatch(
      getAllUserAndDownline({
        page: currentPage,
        limit: entries,
        searchQuery,
      })
    );
  }, [dispatch, currentPage, entries, searchQuery]);

  const formatNumber = (v) => {
    const num = Math.abs(Number(v));
    if (isNaN(num)) return 0;
    return Number.isInteger(num)
      ? num
      : num.toFixed(v.toString().split('.')[1]?.length === 1 ? 1 : 2);
  };
  const reloadPage = () => {
    window.location.reload();
  };

  const downlineBettingPL = userInfo?.uplineBettingProfitLoss || 0;
  const creditRefPL = userInfo?.creditReferenceProfitLoss || 0;
  const totalUplinePL = downlineBettingPL + creditRefPL;
  const pct = userInfo?.partnership || 0;

  const uplineShare = pct
    ? Math.round(totalUplinePL * (pct / 100) * 100) / 100
    : totalUplinePL;

  const myShare = pct
    ? Math.round(totalUplinePL * ((100 - pct) / 100) * 100) / 100
    : 0;

  return (
    <>
      <Navbar />
      <div className='p-1 px-[15px] md:px-7.5'>
        <div className='my-[13px] flex items-center justify-between'>
          <div className='text-[20px]'>Assign Agent List</div>
          {/* <button
            className='flex items-center gap-1 rounded border border-gray-300 bg-[#0088cc] px-[15px] text-[12px] leading-[30px] font-bold text-white'
            onClick={() => navigate('/agent-download-list/insertagent')}
          >
            Add Account
          </button> */}
        </div>

        <div className='mb-4 flex flex-col justify-between text-[13px] md:flex-row'>
          <div className='mb-2 flex items-center justify-center text-[#333] md:mb-0'>
            <span className='mr-2'>Show</span>
            <select
              className='rounded border border-gray-300 px-2 py-1'
              value={entries}
              onChange={(e) => {
                const next = Number(e.target.value) || 10;
                setEntries(next);
                if (currentPage !== 1) {
                  dispatch(setCurrentPage(1));
                }
              }}
            >
              <option value='10'>10</option>
              <option value='20'>20</option>
              <option value='50'>50</option>
              <option value='100'>100</option>
              <option value='500'>500</option>
            </select>
            <span className='ml-2'>entries</span>
          </div>
          <div className='flex items-center justify-center'>
            <span className='mr-2'>Search</span>
            <input
              type='text'
              className='rounded border border-gray-300 bg-white px-2 py-1'
              placeholder='Search...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Financial metrics summary */}
        {/* <div className='mb-4 flex flex-wrap border-b border-[#7e97a7] bg-white pt-[7px] md:pb-[5px]'>
          <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
            <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
              Total Balance
            </div>
            <div className='text-[15px] font-semibold'>
              INR {formatNumber(userInfo?.totalBalance)}
            </div>
          </div>
          <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
            <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
              Total Exposure
            </div>
            <div className='text-[15px] font-semibold'>
              INR
              <span className='text-red-600'>
                ({formatNumber(userInfo?.exposure)})
              </span>
            </div>
          </div>
          <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
            <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
              Available Balance
            </div>
            <div className='text-[15px] font-semibold'>
              INR {formatNumber(userInfo?.agentAvbalance)}
            </div>
          </div>
          <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
            <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
              Balance
            </div>
            <div className='text-[15px] font-semibold'>
              INR {formatNumber(userInfo?.avbalance || 0)}
            </div>
          </div>
          <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
            <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
              Total Avail. bal.
            </div>
            <div className='text-[15px] font-semibold'>
              INR {formatNumber(userInfo?.totalAvbalance)}
            </div>
          </div>
          <div className='w-full border-b border-gray-300 px-[20px] py-[7px] md:w-[14.96815%] md:border-r md:border-b-0 md:px-[10px] md:py-0'>
            <div className='mb-[5px] text-[12px] font-semibold text-[#9b9b9b]'>
              Upline P/L
            </div>

            {showChipsSummary ? (
              <div className='text-[15px] font-semibold'>
                INR{' '}
                <span
                  className={
                    totalUplinePL <= 0 ? 'text-red-500' : 'text-green-500'
                  }
                >
                  {myShare}
                </span>
              </div>
            ) : (
              <div className='text-[15px] font-semibold'>
                INR{' '}
                <span
                  className={
                    totalUplinePL <= 0 ? 'text-red-500' : 'text-green-500'
                  }
                >
                  {formatNumber(totalUplinePL)}
                </span>
              </div>
            )}
          </div>
        </div> */}

        {/* Main content area with table */}
        <div className='overflow-x-auto text-[13px]'>
          <table className='w-full border-collapse'>
            <thead>
              <tr className='border-b-2 border-black/10 whitespace-nowrap text-black'>
                <th className='px-[10px] py-[9px] text-left'>Username</th>
                <th className='px-[10px] py-[9px] text-left'>Credit Ref.</th>
                <th className='px-[10px] py-[9px] text-left'>Partnership</th>
                <th className='px-[10px] py-[9px] text-left'>Balance</th>
                <th className='px-[10px] py-[9px] text-left'>Exposure</th>
                <th className='px-[10px] py-[9px] text-left'>Avail. Bal.</th>
                <th className='px-[10px] py-[9px] text-left'>Ref. P/L</th>
                <th className='px-[10px] py-[9px] text-left'>Account Type</th>
                <th className='px-[10px] py-[9px] text-left'>
                  {isFetchingAllUsers == true && <span>Actions</span>}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan='9'
                    className='border border-gray-300 p-2 text-center'
                  >
                    Loading...
                  </td>
                </tr>
              ) : users?.length > 0 ? (
                users.map((user) => (
                  <tr key={user._id} className='odd:bg-gray-100'>
                    <td
                      onClick={() => handleLoadNextLevel(user, user.code)}
                      className={`cursor-pointer border border-gray-100 px-[10px] py-[9px] ${user.role === 'user' ? 'text-[#0f1214]' : 'cursor-pointer text-[#2789ce]'} `}
                    >
                      <div className='flex items-center gap-1 uppercase'>
                        <span className='block rounded-[3px] bg-[#444] px-2 py-[1px] text-[14px] text-white'>
                          {user.userName}
                        </span>
                      </div>
                    </td>
                    <td className='border border-gray-100 px-[10px] py-[9px]'>
                      <div className='flex items-center gap-x-2'>
                        {formatNumber(user.creditReference)}
                        {/* <span
                          className='text-blue2'
                          onClick={() => {
                            setCreditPopup(true);
                            setcurrentUser(user);
                          }}
                        >
                          <FaRegEdit />
                        </span>
                        <span
                          className='text-blue2'
                          onClick={() => {
                            handleCreditRefHistory(user._id);
                            setcurrentUser(user);
                          }}
                        >
                          <FaEye />
                        </span> */}
                      </div>
                    </td>
                    <td className='border border-gray-100 px-[10px] py-[9px]'>
                      <div className='flex items-center gap-1'>
                        {formatNumber(user.partnership || 0)}
                        {/* {isFetchingAllUsers == true ? (
                          <span
                            className='text-blue2'
                            onClick={() => {
                              setPatnerPopup(true);
                              setcurrentUser(user);
                              setPartnershipFormData({
                                partnership: '',
                                masterPassword: '',
                              });
                            }}
                          >
                            <FaRegEdit />
                          </span>
                        ) : null} */}
                      </div>
                    </td>
                    <td className='border border-gray-100 px-[10px] py-[9px]'>
                      <div className='flex items-center gap-x-2'>
                        <span>
                          {formatNumber(
                            user.displayBalance ??
                              (user.role === 'user'
                                ? user.balance || 0
                                : (user.baseBalance || 0) +
                                  (user.uplineBettingProfitLoss || 0))
                          )}
                        </span>
                      </div>
                    </td>
                    <td className={`border border-gray-100 px-[10px] py-[9px]`}>
                      ({formatNumber(user.exposure)})
                    </td>

                    <td className='border border-gray-100 px-[10px] py-[9px]'>
                      {formatNumber(
                        user.displayAvailable ??
                          (user.role !== 'user'
                            ? user.avbalance || 0
                            : user.isDirectUser === true
                              ? user.avbalance || 0
                              : user.balance || 0)
                      )}
                    </td>

                    <td className='border border-gray-100 px-[10px] py-[9px]'>
                      {user.displayClientPL !== undefined
                        ? user.displayClientPL
                        : user.role === 'user'
                          ? (user.bettingProfitLoss || 0) +
                            (user.creditReferenceProfitLoss || 0)
                          : (user.uplineBettingProfitLoss || 0) +
                            (user.creditReferenceProfitLoss || 0)}
                    </td>
                    <td className='border border-gray-100 px-[10px] py-[9px] text-[12px]'>
                      <span className='px-[5px] py-[3px] text-[11px] capitalize'>
                        {user.role === 'white' ? 'White_level' : user.role}
                      </span>
                    </td>
                    <td className='border border-gray-100 px-[10px] py-[5px]'>
                      <div className='flex items-center gap-2'>
                        {isFetchingAllUsers == true ? (
                          <>
                            <span
                              className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                              onClick={() => {
                                setDepositPopup(true);
                                setcurrentUser(user);
                              }}
                            >
                              D
                            </span>
                            <span
                              className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                              onClick={() => {
                                setWithdrawPopup(true);
                                setcurrentUser(user);
                              }}
                            >
                              W
                            </span>
                            <span
                              className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                              onClick={() => {
                                setPatnerPopup(true);
                                setcurrentUser(user);
                              }}
                            >
                              L
                            </span>
                            <span
                              className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                              onClick={() => {
                                setCreditPopup(true);
                                setcurrentUser(user);
                              }}
                            >
                              C
                            </span>
                            <span
                              className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                              onClick={() => {
                                setPasswordPopup(true);
                                setcurrentUser(user);
                                setNewPassword('');
                                setConfirmPassword('');
                                setFormData((prev) => ({
                                  ...prev,
                                  masterPassword: '',
                                }));
                              }}
                            >
                              P
                            </span>
                            <span
                              className='flex h-[25px] w-[30px] items-center justify-center rounded-sm bg-gray-700 p-1 leading-none text-white'
                              onClick={() => {
                                setSettingPopup(true);
                                setcurrentUser(user);
                              }}
                            >
                              S
                            </span>
                          </>
                        ) : null}
                      </div>
                    </td>

                    {/* <td className='border border-gray-100 px-[10px] py-[9px]'>
                      <div className='flex items-center'>
                        {isFetchingAllUsers == true ? (
                          <>
                            <span
                              onClick={() => {
                                setBalancePopup(true);
                                setcurrentUser(user);
                              }}
                              className='flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-sm border border-[#bbbbbb] bg-[#f3f3f3] text-[#3c3c3ce3] md:ml-[12px]'
                            >
                              <CurrencyIcon />
                            </span>
                            <span
                              onClick={() => {
                                setSettingPopup(true);
                                setcurrentUser(user);
                              }}
                              className='ml-[12px] flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-sm border border-[#bbbbbb] bg-[#f3f3f3] text-[#3c3c3ce3]'
                            >
                              <GearIcon />
                            </span>
                          </>
                        ) : null}

                        {!isFetchingAllUsers == true ? (
                          <div className='ml-[12px] flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-sm border border-[#bbbbbb] bg-[#f3f3f3] text-[#3c3c3ce3]'>
                            <Link
                              to={`/online-user/${user._id}`}
                              state={{ activeTab: 'PL' }}
                            >
                              <span>
                                <ArrowSwapIcon />
                              </span>
                            </Link>
                          </div>
                        ) : null}
                        {!isFetchingAllUsers == true ? (
                          <div className='ml-[12px] flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-sm border border-[#bbbbbb] bg-[#f3f3f3] text-[#3c3c3ce3]'>
                            <Link
                              to={`/online-user/${user._id}`}
                              state={{ activeTab: 'BH' }}
                            >
                              <span>
                                <MenuClockIcon />
                              </span>
                            </Link>
                          </div>
                        ) : null}
                        <div className='ml-[12px] flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-sm border border-[#bbbbbb] bg-[#f3f3f3] text-[#3c3c3ce3]'>
                          <Link to={`/online-user/${user._id}`} className=''>
                            <span>
                              <UserIcon />
                            </span>
                          </Link>
                        </div>
                        {isFetchingAllUsers == true ? (
                          <span
                            onClick={() => {
                              setSportsPopup(true);
                              setGameLockData(user?.gamelock);
                              setcurrentUser(user);
                            }}
                            className='ml-[12px] flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-sm border border-[#bbbbbb] bg-[#f3f3f3] text-[#3c3c3ce3]'
                          >
                            <BadgeLockIcon />
                          </span>
                        ) : null}
                        {isFetchingAllUsers == true ? (
                          <span
                            className='ml-[12px] flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-sm border border-[#bbbbbb] bg-[#f3f3f3] text-[#3c3c3ce3]'
                            onClick={() => handleDelete(user._id)}
                          >
                            <TrashBinIcon />
                          </span>
                        ) : null}
                      </div>
                    </td> */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan='9'
                    className='border border-gray-300 p-2 text-center'
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className='mt-4 flex flex-col justify-between gap-3 text-[13px] md:flex-row md:items-center'>
          <div>
            {(() => {
              const total = Number(totalUsers) || 0;
              const start = total === 0 ? 0 : (currentPage - 1) * entries + 1;
              const end = Math.min(currentPage * entries, total);
              return `Showing ${start} to ${end} of ${total} entries`;
            })()}
          </div>
          <div className='flex flex-wrap'>
            <button
              className='pgBtn px-[13px] py-[6.5px]'
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              First
            </button>
            <button
              className='pgBtn ml-[2px] px-[13px] py-[6.5px]'
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            {[...Array(Math.max(1, totalPages || 1))].map((_, i) => (
              <button
                key={i}
                className={`ml-[2px] rounded-[2px] border border-gray-400 px-[13px] py-[6.5px] leading-none ${currentPage === i + 1 ? 'bg-gray-200' : 'pgBtn'
                  }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button
              className='pgBtn ml-[2px] px-[13px] py-[6.5px]'
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages <= 1}
            >
              Next
            </button>

            {/* Last Button */}
            <button
              className='pgBtn ml-[2px] px-[13px] py-[6.5px]'
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || totalPages <= 1}
            >
              Last
            </button>
          </div>
        </div>

        {isEdit && (
          <div className='fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#00000074] p-2 md:p-4'>
            <div className='absolute top-0 w-full max-w-[500px]'>
              <div className='my-[28px]'>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className='rounded-lg bg-white shadow-lg'
                >
                  {/* Header */}
                  <div className='bg-blue flex justify-between rounded-t-lg px-[7px] py-[5px] font-bold text-white'>
                    <span> Add Master</span>
                    <button
                      onClick={() => setIsEdit(false)}
                      className='text-[21px] leading-none text-white'
                    >
                      ×
                    </button>
                  </div>

                  {/* Commission List */}
                  <form
                    onSubmit={handleSubmit}
                    className='py-3 font-semibold md:p-4'
                  >
                    <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Username <span className='text-red-500'>*</span>
                      </span>
                      <input
                        type='text'
                        className='mt-1 w-full basis-full rounded-md border border-gray-300 px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:text-[12px]'
                        onChange={(e) =>
                          setFormData({ ...formData, userName: e.target.value })
                        }
                        value={formData.userName}
                        placeholder='Add here'
                      />
                    </div>
                    <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Name <span className='text-red-500'>*</span>
                      </span>
                      <input
                        type='text'
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        value={formData.name}
                        className='mt-1 w-full basis-full rounded-md border border-gray-300 px-1.5 py-2.5 text-xs font-light md:basis-[75%]'
                        placeholder='Add here'
                      />
                    </div>

                    <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Account Type <span className='text-red-500'>*</span>
                      </span>
                      <select
                        name='account'
                        id='account'
                        className='mt-1 w-full basis-full rounded-md border border-gray-300 px-1.5 py-2 text-[12px] font-light text-gray-500 capitalize md:basis-[75%]'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            accountType: e.target.value,
                          })
                        }
                        value={formData.accountType}
                      >
                        <option value=''>Select A/c Type</option>
                        {allowedRoles.map((roleOption) => (
                          <option key={roleOption} value={roleOption}>
                            {roleOption === 'white'
                              ? 'White_level'
                              : roleOption.charAt(0).toUpperCase() +
                              roleOption.slice(1)}{' '}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Commission <span className='text-red-500'>*</span>
                      </span>
                      <input
                        type='text'
                        className='mt-1 w-full basis-full rounded-md border border-gray-300 px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:text-[12px]'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            commition: e.target.value,
                          })
                        }
                        value={formData.commition}
                        placeholder='Add here'
                      />
                    </div> */}
                    <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Opening Balance <span className='text-red-500'>*</span>
                      </span>
                      <input
                        type='number'
                        className='mt-1 w-full basis-full rounded-md border border-gray-300 px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:text-[12px]'
                        onChange={(e) => {
                          const openingValue = e.target.value;
                          if (openingValue.includes('.')) {
                            toast.error('The bank balance must be an integer');
                            return;
                          }
                          setFormData({ ...formData, balance: openingValue });
                        }}
                        value={formData.balance}
                        placeholder='Add here'
                      />
                    </div>

                    <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Credit Reference <span className='text-red-500'>*</span>
                      </span>
                      <input
                        type='number'
                        className='mt-1 w-full basis-full rounded-md border border-gray-300 px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:text-[12px]'
                        onChange={(e) => {
                          const crRefValue = e.target.value;
                          let roundedValue = crRefValue;
                          if (crRefValue.includes('.')) {
                            roundedValue = Math.round(
                              parseFloat(crRefValue)
                            ).toString();
                          }
                          setFormData({
                            ...formData,
                            creditReference: roundedValue,
                          });
                        }}
                        value={formData.creditReference}
                        placeholder='Add here'
                      />
                    </div>
                    {/* <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Rolling Commission{' '}
                        <span className='text-red-500'>*</span>
                      </span>
                      <input
                        type='text'
                        className='mt-1 w-full basis-full rounded-md border border-gray-300 px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:text-[12px]'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            rollingCommission: e.target.value,
                          })
                        }
                        value={formData.rollingCommission}
                        placeholder='Add here'
                      />
                    </div> */}
                    <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Partnership <span className='text-red-500'>*</span>
                      </span>
                      <input
                        type='text'
                        className='mt-1 w-full basis-full rounded-md border border-gray-300 px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:text-[12px]'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            partnership: e.target.value,
                          })
                        }
                        value={formData.partnership}
                        placeholder='Add here'
                      />
                    </div>
                    <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Mobile Number <span className='text-red-500'>*</span>
                      </span>
                      <input
                        type='text'
                        className='mt-1 w-full basis-full rounded-md border border-gray-300 px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:text-[12px]'
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        value={formData.phone}
                        placeholder='Add here'
                      />
                    </div>
                    <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Password<span className='text-red-500'>*</span>
                      </span>
                      <span className='relative w-full basis-full font-light md:basis-[75%]'>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder='Enter your password...'
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          value={formData.password}
                          className='mt-1 w-full rounded border border-gray-300 px-1.5 py-2.5 pr-10 text-xs md:text-sm'
                        />
                        <button
                          type='button'
                          className='absolute inset-y-0 right-3 flex items-center text-gray-500'
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </span>
                    </div>

                    <div className='flex flex-col items-center px-4 py-1 md:flex-row'>
                      <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                        Confirm Password <span className='text-red-500'>*</span>
                      </span>
                      <span className='relative w-full basis-full font-light md:basis-[75%]'>
                        <input
                          type={showPassword2 ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder='Enter your password...'
                          className='mt-1 w-full rounded border border-gray-300 px-1.5 py-2.5 pr-10 text-xs md:text-sm'
                        />
                        <button
                          type='button'
                          className='absolute inset-y-0 right-3 flex items-center text-gray-500'
                          onClick={() => setShowPassword2(!showPassword2)}
                        >
                          {showPassword2 ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </span>
                    </div>
                    <div className='flex flex-col items-center justify-center'>
                      <div className='flex w-full flex-col items-center px-4 py-1 md:flex-row'>
                        <span className='basis-full text-center text-[12px] md:basis-[35%] md:text-left'>
                          Master Password{' '}
                          <span className='text-red-500'>*</span>
                        </span>
                        <span className='relative w-full basis-full font-light md:basis-[75%]'>
                          <input
                            type={showPassword3 ? 'text' : 'password'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                masterPassword: e.target.value,
                              })
                            }
                            value={formData.masterPassword}
                            placeholder='Enter your password...'
                            className='mt-1 w-full rounded border border-gray-300 px-1.5 py-2.5 pr-10 text-xs md:text-sm'
                          />
                          <button
                            type='button'
                            className='absolute inset-y-0 right-3 flex items-center text-gray-500'
                            onClick={() => setShowPassword3(!showPassword3)}
                          >
                            {showPassword3 ? <FaEyeSlash /> : <FaEye />}
                          </button>
                        </span>
                      </div>

                      <button className='bg-blue mt-[16px] w-[140px] rounded-md px-[10px] py-[5px] text-[14px] text-white'>
                        Create
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {/* Credit reference popup */}
        {creditPopup && (
          <div className='fixed inset-0 z-[200] flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Credit</span>
                <button
                  onClick={() => setCreditPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-primary text-xl text-white'
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdate}>
                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Old Credit</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                        value={currentUser.creditReference}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>New Credit</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            creditReference: e.target.value,
                          })
                        }
                        value={formData.creditReference}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Master Password</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='password'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            masterPassword: e.target.value,
                          })
                        }
                        value={formData.masterPassword}
                      />
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-2 px-[15px]'>
                  <button
                    className='cursor-pointer rounded-sm bg-secondary px-3 py-2 text-white'
                    onClick={() => setCreditPopup(false)}
                  >
                    BACK
                  </button>
                  <button className='cursor-pointer rounded-sm bg-primary px-3 py-2 text-white'>
                    submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* partnership */}
        {patnerPopup && (
          <div className='fixed inset-0 z-[200] flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Partnership</span>
                <button
                  onClick={() => setPatnerPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-primary text-xl text-white'
                >
                  ×
                </button>
              </div>

              <form onSubmit={handlePartnershipUpdate}>
                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Old Limit</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                        value={currentUser?.partnership || 0}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>New Limit</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        value={partnershipFormData.partnership}
                        onChange={(e) =>
                          setPartnershipFormData({
                            ...partnershipFormData,
                            partnership: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Master Password</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='password'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                        value={partnershipFormData.masterPassword}
                        onChange={(e) =>
                          setPartnershipFormData({
                            ...partnershipFormData,
                            masterPassword: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-2 px-[15px]'>
                  <button
                    className='cursor-pointer rounded-sm bg-secondary px-3 py-2 text-white'
                    onClick={() => setPatnerPopup(false)}
                  >
                    BACK
                  </button>
                  <button className='cursor-pointer rounded-sm bg-primary px-3 py-2 text-white'>
                    submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* deposit popup */}
        {depositPopup && (
          <div className='fixed inset-0 z-[200] flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Deposit</span>
                <button
                  onClick={() => setDepositPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-primary text-xl text-white'
                >
                  ×
                </button>
              </div>
              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>{userInfo.userName}</div>
                <div className='col-span-2 flex'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={userInfo.avbalance}
                      readOnly
                    />
                  </div>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={userInfo.avbalance - formData.balance}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>
                  {currentUser.userName}
                </div>
                <div className='col-span-2 flex'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={currentUser.avbalance}
                      readOnly
                    />
                  </div>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={
                        currentUser.avbalance + Number(formData.balance || 0)
                      }
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <form onSubmit={handleWithdwalDeposite}>
                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Amount</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({ ...formData, balance: e.target.value })
                        }
                        value={formData.balance}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Remark</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <textarea
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            remark: e.target.value,
                          })
                        }
                        value={formData.remark}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Master Password</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='password'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            masterPassword: e.target.value,
                          })
                        }
                        value={formData.masterPassword}
                      />
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-2 px-[15px]'>
                  <button
                    className='cursor-pointer rounded-sm bg-secondary px-3 py-2 text-white'
                    onClick={() => setDepositPopup(false)}
                  >
                    BACK
                  </button>
                  <button
                      className='cursor-pointer rounded-sm bg-primary px-3 py-2 text-white'
                    onClick={() => setType('deposite')}
                  >
                    submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* withdraw popup */}
        {withdrawPopup && (
          <div className='fixed inset-0 z-[200] flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Withdraw</span>
                {/* <span>Banking - Master Balance : {userInfo.avbalance}</span> */}
                <button
                  onClick={() => setWithdrawPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-primary text-xl text-white'
                >
                  ×
                </button>
              </div>
              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>{userInfo.userName}</div>
                <div className='col-span-2 flex'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={userInfo.avbalance}
                      readOnly
                    />
                  </div>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={userInfo.avbalance + Number(formData.balance || 0)}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>
                  {currentUser.userName}
                </div>
                <div className='col-span-2 flex'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={currentUser.avbalance}
                      readOnly
                    />
                  </div>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full border border-[#666] bg-[#ddd] p-1 px-[10px] py-[6px] text-end outline-0'
                      value={
                        currentUser.avbalance - Number(formData.balance || 0)
                      }
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <form onSubmit={handleWithdwalDeposite}>
                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Amount</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({ ...formData, balance: e.target.value })
                        }
                        value={formData.balance}
                      />
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Remark</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <textarea
                        type='text'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] text-end outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            remark: e.target.value,
                          })
                        }
                        value={formData.remark}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className='mb-[14px] grid grid-cols-3 items-center'>
                  <div className='col-span-1 px-[15px]'>Master Password</div>
                  <div className='col-span-2'>
                    <div className='px-[15px]'>
                      <input
                        type='password'
                        className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            masterPassword: e.target.value,
                          })
                        }
                        value={formData.masterPassword}
                      />
                    </div>
                  </div>
                </div>

                <div className='flex justify-end gap-2 px-[15px]'>
                  <button
                    className='cursor-pointer rounded-sm bg-secondary px-3 py-2 text-white'
                    onClick={() => setWithdrawPopup(false)}
                  >
                    BACK
                  </button>
                  <button
                    className='cursor-pointer rounded-sm bg-primary px-3 py-2 text-white'
                    onClick={() => setType('withdrawal')}
                  >
                    submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/*status change popup */}
        {settingPopup && (
          <div className='fixed inset-0 z-[200] flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Change Status</span>
                <button
                  onClick={() => setSettingPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-primary text-xl text-white'
                >
                  ×
                </button>
              </div>

              <div className='mb-4 flex items-center justify-between gap-2 px-[15px] text-[13px]'>
                <span className='ml-2'>{currentUser.name}</span>
              </div>

              {/* Status Buttons */}
              <div className='mb-4 grid grid-cols-3 gap-3 px-[15px]'>
                {/* Active Button */}
                <button
                  onClick={() => setFormData({ ...formData, status: 'active' })}
                  className={`flex flex-col items-center rounded border p-3 ${formData.status === 'active'
                      ? 'bg-green-500 text-white'
                      : 'border-green-500 text-green-600'
                    }`}
                >
                  <FaCheckCircle size={20} />
                  <span>Active</span>
                </button>

                {/* Suspend Button */}
                <button
                  onClick={() =>
                    setFormData({ ...formData, status: 'suspend' })
                  }
                  className={`flex flex-col items-center rounded border p-3 ${formData.status === 'suspend'
                      ? 'bg-red-500 text-white'
                      : 'border-red-500 text-red-600'
                    }`}
                >
                  <FaBan size={20} />
                  <span>Suspend</span>
                </button>

                {/* Locked Button */}
                <button
                  onClick={() => setFormData({ ...formData, status: 'locked' })}
                  className={`flex flex-col items-center rounded border p-3 ${formData.status === 'locked'
                      ? 'bg-gray-700 text-white'
                      : 'border-gray-400 text-gray-700'
                    }`}
                >
                  <FaLock size={20} />
                  <span>Locked</span>
                </button>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>Master Password</div>
                <div className='col-span-2'>
                  <div className='px-[15px]'>
                    <input
                      type='password'
                      className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          masterPassword: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className='flex justify-end gap-2 px-[15px]'>
                <button
                  className='cursor-pointer rounded-sm bg-secondary px-3 py-2 text-white'
                  onClick={() => setSettingPopup(false)}
                >
                  BACK
                </button>
                <button
                  className='cursor-pointer rounded-sm bg-primary px-3 py-2 text-white'
                  onClick={handleSetting}
                >
                  submit
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* change Password popup */}
        {passwordPopup && (
          <div className='fixed inset-0 z-[200] flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-full max-w-[530px] -translate-x-1/2 overflow-hidden rounded-lg bg-white p-[14px] shadow-lg'
            >
              {/* Header */}
              <div className='flex items-center justify-between px-[15px] pb-5 text-[20px]'>
                <span>Password </span>
                <button
                  onClick={() => setPasswordPopup(false)}
                  className='flex h-[35px] w-[35px] items-center justify-center rounded-full bg-primary text-xl text-white'
                >
                  ×
                </button>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>New Password</div>
                <div className='col-span-2'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>Confirm Password</div>
                <div className='col-span-2'>
                  <div className='px-[15px]'>
                    <input
                      type='text'
                      className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className='mb-[14px] grid grid-cols-3 items-center'>
                <div className='col-span-1 px-[15px]'>Master Password</div>
                <div className='col-span-2'>
                  <div className='px-[15px]'>
                    <input
                      type='password'
                      className='w-full rounded-sm border border-gray-300 p-1 px-[10px] py-[6px] outline-0'
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          masterPassword: e.target.value,
                        })
                      }
                      value={formData.masterPassword}
                    />
                  </div>
                </div>
              </div>

              <div className='flex justify-end gap-2 px-[15px]'>
                <button
                  className='cursor-pointer rounded-sm bg-secondary px-3 py-2 text-white'
                  onClick={() => setPasswordPopup(false)}
                >
                  BACK
                </button>
                <button
                  className='cursor-pointer rounded-sm bg-[#0088cc] px-3 py-2 text-white'
                  onClick={handleChangePassword}
                >
                  submit
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {sportsPopup && (
          <div className='fixed inset-0 z-[200] flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-[96%] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg md:w-[500px]'
            >
              {/* Header */}
              <div className='bg-blue flex items-center justify-between p-3 py-1 text-white'>
                <h2 className='font-semibold'>Sports Settings</h2>
                <button
                  className='text-xl text-white'
                  onClick={() => setSportsPopup(false)}
                >
                  ×
                </button>
              </div>

              {/* Table */}
              <div className='max-h-[400px] overflow-y-auto p-4'>
                <table className='w-full border-collapse border text-left'>
                  <thead>
                    <tr className='bg-gray-200'>
                      <th className='border p-2'>Sr.No.</th>
                      <th className='border p-2'>Sport Name</th>
                      <th className='border p-2'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameLockData.map((item, index) => {
                      // Find matching parent (admin/userInfo) gamelock entry
                      const parentGameLock = userInfo?.gamelock?.find(
                        (g) => g.game === item.game
                      );

                      // Is the parent lock ON (true)? Only then allow change
                      const isParentLocked = parentGameLock?.lock === true;

                      return (
                        <tr className='border' key={item.game}>
                          <td className='border p-2'>{index + 1}</td>
                          <td className='border p-2'>{item.game}</td>
                          <td className='border p-2 text-center'>
                            <input
                              type='checkbox'
                              checked={item.lock}
                              disabled={!isParentLocked} // disable checkbox if admin lock is false
                              onChange={() =>
                                isParentLocked &&
                                handleToggle(item.game, item.lock)
                              }
                            />
                            {!isParentLocked && (
                              <div className='text-xs text-red-500'>
                                Locked by Admin
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}

        {isOpen && (
          <div className='fixed inset-0 z-[200] flex h-full w-full items-center justify-center bg-[#00000074] text-[13px]'>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className='absolute top-[2%] left-1/2 w-[96%] -translate-x-1/2 overflow-hidden rounded-lg bg-white shadow-lg md:w-[500px]'
            >
              {/* Header */}
              <div className='bg-blue flex items-center justify-between p-1 px-3 text-white'>
                <h5 className='text-md font-semibold'>
                  Credit Reference Log - {currentUser.name}
                </h5>
                <button
                  className='text-xl font-bold text-white'
                  onClick={() => setIsOpen(false)}
                >
                  ×
                </button>
              </div>

              {/* Body */}

              <div className='p-4'>
                {loading ? (
                  <div className='flex items-center justify-center py-10'>
                    <div className='h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent'></div>
                  </div>
                ) : (
                  <>
                    <div className='mb-4 flex flex-col justify-between md:flex-row'>
                      <div className='mb-2 flex items-center justify-center md:mb-0'>
                        <span className='mr-2'>Show</span>
                        <select
                          className='rounded border border-gray-300 px-2 py-1'
                          value={creditEntries}
                          onChange={(e) => {
                            setCreditEntries(Number(e.target.value));
                            setCurrentPage(1); // reset to first page on entries change
                          }}
                        >
                          <option value='2'>2</option>
                          <option value='5'>5</option>
                          <option value='10'>10</option>
                        </select>
                        <span className='ml-2'>entries</span>
                      </div>
                      <div className='flex items-center justify-center'>
                        <span className='mr-2'>Search:</span>
                        <input
                          type='text'
                          className='rounded border border-gray-300 px-2 py-1'
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <table className='w-full border-collapse border border-gray-300'>
                      <thead className='bg-gray-200'>
                        <tr>
                          <th className='border border-gray-300 p-2'>
                            From Name
                          </th>
                          <th className='border border-gray-300 p-2'>
                            Username
                          </th>
                          <th className='border border-gray-300 p-2'>
                            Old Credit Reference
                          </th>
                          <th className='border border-gray-300 p-2'>
                            New Credit Reference
                          </th>
                          <th className='border border-gray-300 p-2'>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crediteHistory.length > 0 ? (
                          crediteHistory.map((item, index) => (
                            <tr key={index} className='text-center'>
                              <td className='border border-gray-300 p-2 text-red-500'>
                                ({item.formName})
                              </td>
                              <td className='border border-gray-300 p-2'>
                                {item.userName}
                              </td>
                              <td className='border border-gray-300 p-2 text-red-500'>
                                ({item.oldamount})
                              </td>
                              <td className='border border-gray-300 p-2'>
                                {item.newamount}
                              </td>
                              <td className='border border-gray-300 p-2'>
                                {new Date(item.createdAt).toLocaleString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true,
                                  }
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan='5'
                              className='border border-gray-300 p-2 text-center'
                            >
                              No matching records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
}

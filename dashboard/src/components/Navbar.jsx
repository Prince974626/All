import { useEffect, useRef, useState } from 'react';
import {
  IoMdArrowDropdown,
  IoMdClose,
  IoMdRefresh,
  IoMdMenu,
} from 'react-icons/io';
import { AiOutlineLogout } from 'react-icons/ai';
import { NavLink, useLocation } from 'react-router-dom';
import { MdLogout } from 'react-icons/md';
import { RiArrowDownSFill } from 'react-icons/ri';
// import logo from "../assets/icons/theme-1709828838678-aura555.png";
// import logo from "../../client/src/assets/icons/daimondpan (1).png"
import logo from '../assets/icons/AURA444.png';
import jdlogo from '../assets/Alllogo.png';
import mydreamslogo from '../assets/mydreamlogo.png';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAdmin,
  user_reset,
  userLogout,
  changePasswordBySubAdmin,
} from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SportsSidebar from './SportsSidebar';
import MarketAnalysisModal from './MarketAnalysisModal';
import api from '../redux/api';
import { FaSearchPlus } from 'react-icons/fa';

const Navbar = ({ onLogoClick, onNavClick }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo, errorMessage, successMessage, loading, isPasswordChanged } =
    useSelector((state) => state.auth);

  const [activeItem, setActiveItem] = useState('Home');
  const [showPopup, setShowPopup] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const shouldShowPasswordPopup = isPasswordChanged === false;
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [changeFormData, setChangeFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Client Header Search & Market Analysis Modal States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/search-clients?q=${encodeURIComponent(searchQuery)}`);
        if (res.data?.success) {
          setSearchResults(res.data.data || []);
          setShowSearchDropdown(true);
        }
      } catch (err) {
        console.error('Client search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setShowSearchDropdown(false);
    setShowMarketModal(true);
  };

  useEffect(() => {
    dispatch(getAdmin());
  }, [dispatch]);

  const changeSubmit = async (e) => {
    e.preventDefault();

    try {
      const result = await dispatch(
        changePasswordBySubAdmin({
          oldPassword: changeFormData.oldPassword,
          newPassword: changeFormData.newPassword,
          confirmPassword: changeFormData.confirmPassword,
        })
      ).unwrap();

      const masterPassword = result?.generatedMasterPassword;
      if (masterPassword) {
        navigate('/transaction-password-success', {
          state: { masterPassword },
          replace: true,
        });
      } else {
        toast.success('Password changed successfully.');
      }
    } catch (error) {
      console.log('Password change error:', error);
      toast.error(typeof error === 'string' ? error : error?.message || 'Failed to change password');
    }
  };

  const isSuperAdmin =
    userInfo?.role === 'supperadmin' || userInfo?.role === 'superadmin';

  const navItems = [
    // { name: 'Dashboard', path: '/home' },
    { name: 'List of Clients', path: '/user-download-list' },
    { name: 'Assign Agent', path: '/agent-download-list' },
    // ...(isSuperAdmin ? [{ name: 'Block Agent', path: '/block-agent' }] : []),
    { name: 'Market Analysis', path: '/my-market' },
    {
      name: 'Live Market',
      submenu: [
        { name: 'Roulette', path: '/live-casino?cat=Roulette' },
        { name: 'Teenpatti', path: '/live-casino?cat=Teenpatti' },
        { name: 'Poker', path: '/live-casino?cat=Poker' },
        { name: 'Baccarat', path: '/live-casino?cat=Baccarat' },
        { name: 'Dragon Tiger', path: '/live-casino?cat=Dragon Tiger' },
        { name: '32 Cards', path: '/live-casino?cat=32 Cards' },
        { name: 'Andar Bahar', path: '/live-casino?cat=Andar Bahar' },
        { name: 'Lucky 7', path: '/live-casino?cat=Lucky 7' },
        { name: '3 Card Judgement', path: '/live-casino?cat=3 Card Judgement' },
        { name: 'Worli', path: '/live-casino?cat=Worli' },
        { name: 'Sports', path: '/live-casino?cat=Sports' },
        { name: 'Bollywood', path: '/live-casino?cat=Bollywood' },
        { name: 'Lottery', path: '/live-casino?cat=Lottery' },
        { name: 'Queen', path: '/live-casino?cat=Queen' },
        { name: 'Race', path: '/live-casino?cat=Race' },
      ],
    },
    {
      name: 'Live Virtual Market',
      submenu: [
        { name: '20-20 Teenpatti', path: '/casino-bet/teen20' },
        { name: 'Muflis Teenpatti', path: '/casino-bet/teenmuf' },
        { name: '1 Day Teenpatti', path: '/casino-bet/teen' },
        { name: 'Lucky 7', path: '/casino-bet/lucky7' },
        { name: '1 Day Dragon Tiger', path: '/casino-bet/dt6' },
      ],
    },
    {
      name: 'Reports',
      submenu: [
        // { name: 'Account Statement', path: '/my-account' },
        { name: 'Account Statement', path: '/AccountStatement' },
        { name: 'Current Bets', path: '/betlist' },
        { name: 'General Report', path: '/GeneralReport' },
        { name: 'Profit Loss', path: '/ProfitLoss' },
        // { name: 'Event Profit/Loss', path: '/eventpl' },
        // { name: 'Downline Profit/Loss', path: '/downpl' },
        { name: 'Casino Result Report', path: '/casinoResultReport' },
        { name: 'User Register Detail', path: '/RegisterDetail' },
        { name: 'Total Profit Loss', path: '/TotalProfitLoss' },
        { name: 'User Win Loss', path: '/UserWinLoss' },
      ],
    },

    // { name: 'Multi Login', path: '/user-download-list' },
    // {
    //   name: 'Downline List',
    //   submenu: [
    //     { name: 'User Downline List', path: '/user-download-list' },
    //     {
    //       name: 'Agent Downline List',
    //       path: '/agent-download-list',
    //       reload: true,
    //     },
    //   ],
    // },
    // { name: 'Security', path: '/secureauth' },

    // {
    //   name: 'Banking',
    //   submenu: [
    //     { name: 'User Banking', path: '/banking' },
    //     { name: 'Master Banking', path: '/master-banking' },
    //   ],
    // },
    // { name: 'Password History', path: '/password-history' },
    {
      name: 'Manual Control',
      submenu: [
        { name: 'Match Control', path: '/match-control' },
        { name: 'Block Market', path: '/block-market' },
        ...(isSuperAdmin
          ? [
              { name: 'Manual Settlement', path: '/result-control' },
              { name: 'Delete Bet', path: '/delete-bet' },
            ]
          : []),
      ],
    },
  ];

  const logout = async () => {
    try {
      const data = await dispatch(userLogout()).unwrap();
      localStorage.removeItem('auth');
      toast.success(data.message);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (error) {
      toast.error(error);
    }
  };

  const reload = () => {
    dispatch(getAdmin());
  };

  const toggleMobileSubmenu = (itemName, event) => {
    if (mobileSubmenuOpen === itemName) {
      setMobileSubmenuOpen(null);
    } else {
      // Calculate position relative to viewport
      const rect = event.target.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 200; // Approximate dropdown height

      // Position dropdown above if near bottom of screen
      if (rect.bottom + dropdownHeight > viewportHeight) {
        setDropdownPosition({
          top: rect.top - dropdownHeight,
          left: rect.left,
          position: 'fixed',
        });
      } else {
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          position: 'fixed',
        });
      }
      setMobileSubmenuOpen(itemName);
    }
  };

  const isSubmenuActive = (item) => {
    if (!item.submenu) return false;

    return item.submenu.some((sub) => {
      const currentPath = location.pathname;
      return currentPath === sub.path;
    });
  };

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sportsSidebarOpen, setSportsSidebarOpen] = useState(false);
  const [clickedDropdown, setClickedDropdown] = useState(null);
  const desktopNavRef = useRef(null);
  const logoutPopupRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!desktopNavRef.current?.contains(event.target)) {
        setClickedDropdown(null);
      }
      if (!logoutPopupRef.current?.contains(event.target)) {
        setShowLogoutPopup(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <>
      <div
        className={`sticky top-0 z-40 w-full ${location.pathname == '/' || location.pathname == '/login' ? 'hidden' : 'block'
          }`}
      >
        {/* Mobile Header - Split into two rows */}
        <div className='hidden'>
          {/* Top row - Role and Name */}
          <header className='bg-color flex h-[52px] items-center justify-between border-b border-gray-800 p-2'>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setSportsSidebarOpen(true)}
                className='flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded bg-[#2a2a2a] text-white'
                style={{ boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, .4)' }}
              >
                <IoMdMenu className='text-xl' />
              </button>
              <img src={jdlogo} alt='logo' className='max-h-[40px]' />
            </div>
            <div className='grid justify-items-end'>
              <div className='flex items-center gap-2'>
                <p
                  className='rounded-sm bg-[#292929] px-1.5 text-[10px] text-white uppercase'
                  style={{
                    boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, .4)',
                  }}
                >
                  {userInfo?.role === 'white' ? 'white_label' : userInfo?.role}
                </p>
                <p className='text-sm text-white'>{userInfo?.userName}</p>
              </div>
              <div className='mt-1 flex items-center gap-2'>
                <div className='text-xs font-semibold text-white'>
                  {loading ? (
                    <p>Loading...</p>
                  ) : (
                    <p>
                      IRP (<span className=''>{userInfo?.avbalance || 0}</span>)
                    </p>
                  )}
                </div>
                <button
                  onClick={reload}
                  className='flex h-[25px] w-[25px] cursor-pointer items-center justify-center rounded-[2px] bg-[#2a2a2a] text-[20px] leading-[20px] text-white'
                  style={{
                    boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, .4)',
                  }}
                >
                  <IoMdRefresh className='p-[1px]' />
                </button>
              </div>
            </div>
          </header>
        </div>

        {/* Desktop Header */}
        <header className='bg-color flex h-[52px] items-center justify-between'>
          <div className='flex h-[52px] items-center'>
            <NavLink
              to='/user-download-list'
              className='px-[5px] leading-[52px]'
              onClick={(e) => {
                if (onLogoClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onLogoClick();
                }
              }}
            >
              <img src={jdlogo} alt='logo' className='block max-h-[40px]' />
            </NavLink>
            <button
              onClick={() => setSportsSidebarOpen(true)}
              className='leading-[1.5] py-[0.375rem] px-[14px] text-white text-[16px]'
            >
              <i className="fa fa-fw fa-bars"></i>
            </button>
            <nav ref={desktopNavRef} className='text-black'>
              <ul className='relative mx-auto flex w-full flex-wrap'>
                {navItems.map((item, i) => (
                  <li
                    key={i}
                    className='relative'
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {item.path ? (
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `} block px-2.5 py-2 text-[14px] font-bold whitespace-nowrap text-white transition-colors hover:bg-[#2C3E50]`
                        }
                        onClick={() => {
                          setActiveItem(item.name);
                          setClickedDropdown(null);
                          if (onNavClick) onNavClick();
                        }}
                      >
                        {item.name}
                      </NavLink>
                    ) : (
                      <span
                        className={`flex cursor-pointer gap-[3px] items-center px-2.5 py-2 text-[14px] font-bold whitespace-nowrap text-white hover:bg-[#2C3E50] ${isSubmenuActive(item) ? 'bg-color text-white' : 'text-black'} "`}
                        onClick={() => {
                          setActiveItem(item.name);
                          setClickedDropdown(item.name);
                          setHoveredItem(item.name);
                        }}
                      >
                        {item.name}
                        <i className="fa fa-caret-down text-[13px]"></i>
                      </span>
                    )}

                    {/* Submenu Dropdown */}
                    {item.submenu &&
                      (clickedDropdown === item.name ||
                        hoveredItem === item.name) && (
                        <ul className='bg-color absolute top-full left-0 z-[100] overflow-visible font-semibold whitespace-nowrap text-white shadow-lg'>
                          {item.submenu
                            .filter(
                              (sub) =>
                                !(
                                  userInfo?.role === 'agent' &&
                                  sub.name === 'Agent Downline List'
                                )
                            )
                            .map((sub, index) => (
                              <li
                                key={index}
                                className='min-w-[200px] first:mt-2 hover:bg-[#2C3E50]'
                              >
                                <NavLink
                                  to={sub.path}
                                  className='block px-3 py-2 text-[13px]'
                                  onClick={(e) => {
                                    setActiveItem(item.name);
                                    setClickedDropdown(item.name);
                                    if (sub.reload) {
                                      e.preventDefault();
                                      navigate(sub.path);
                                      window.location.reload();
                                    }
                                  }}
                                >
                                  {sub.name}
                                </NavLink>
                              </li>
                            ))}
                        </ul>
                      )}
                  </li>
                ))}
                {/* <li
                  onClick={logout}
                  className='flex flex-1 cursor-pointer items-center justify-end gap-1 px-3 text-[13px] font-semibold whitespace-nowrap text-black transition-colors'
                >
                  Logout <MdLogout />
                </li> */}
              </ul>
            </nav>
          </div>

          <div className='mr-[30px] flex items-center gap-4'>
            <div ref={logoutPopupRef} className='relative flex items-center'>
              {/* <p
                className='rounded-sm bg-[#292929] px-1.5 text-[10px] text-white uppercase'
                style={{ boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, .4)' }}
              >
                {userInfo?.role === 'white' ? 'white_label' : userInfo?.role}
              </p> */}
              <p
                className='text-sm text-white cursor-pointer'
                onClick={() => setShowLogoutPopup((prev) => !prev)}
              >
                {userInfo?.name}
              </p>
              <i className="fa fa-caret-down text-[13px] text-white ml-[3px]"></i>
              <div className='relative w-[160px] h-[38px] text-[14px] pl-2 rounded-[2px] bg-white ml-[0.65626rem] flex items-center border border-gray-300'>
                <input
                  type="text"
                  className='w-full outline-none placeholder:text-gray-300 text-black text-sm'
                  placeholder='All Client'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim() && searchResults.length > 0) {
                      setShowSearchDropdown(true);
                    }
                  }}
                />
                <span
                  className='cursor-pointer text-[#333] hover:text-blue-600 px-1'
                  onClick={() => {
                    if (searchResults.length > 0) {
                      handleSelectClient(searchResults[0]);
                    }
                  }}
                >
                  <FaSearchPlus size={24} />
                </span>

                {/* Client Search Dropdown */}
                {showSearchDropdown && (
                  <div className='absolute top-full left-0 right-0 max-h-[320px] overflow-y-auto bg-white rounded-b-md border border-gray-200 shadow-2xl z-[100] text-black'>
                    {isSearching ? (
                      <div className='p-3 text-center text-xs text-gray-500 font-semibold'>
                        Searching clients...
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((client) => (
                        <div
                          key={client._id}
                          className='h-[38px] px-3 py-2 hover:bg-[#0088cc] hover:text-white cursor-pointer border-b border-gray-100 last:border-0 flex items-center justify-between transition-colors'
                          onClick={() => handleSelectClient(client)}
                        >
                          <div>
                            {client.userName}
                            {client.role ? (
                              <span className='ml-2 text-[11px] opacity-70'>
                                ({client.role})
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='p-3 text-center text-xs text-gray-500 font-semibold'>
                        No client found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* <div className='text-sm text-[13px] font-semibold text-white'>
                {loading ? (
                  <p>Loading...</p>
                ) : (
                  <p>
                    IRP (<span className=''>{userInfo?.avbalance || 0}</span>)
                  </p>
                )}
              </div> */}
              {showLogoutPopup && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className='absolute top-8 right-0 w-[200px] rounded-md bg-primary py-1.5'
                >
                  <div className='cursor-pointer px-2 py-0.5 text-[13px] font-bold text-white hover:underline'>
                    <NavLink to='/secureauth'>Secure Auth Verification</NavLink>
                  </div>
                  <div className='cursor-pointer px-2 py-0.5 text-[13px] font-bold text-white hover:underline'>
                    <NavLink to='/ChangePassword'>Change Password</NavLink>
                  </div>
                  <div
                    onClick={logout}
                    className='cursor-pointer px-2 py-0.5 text-[13px] font-bold text-white hover:underline'
                  >
                    LogOut
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation (Horizontal Scrollable) */}
        <nav className='bg-color2 relative mb-[15px] hidden overflow-x-auto leading-[30px] whitespace-nowrap text-white'>
          <ul className='flex'>
            {navItems.map((item, i) => (
              <li
                key={i}
                className='relative inline-block'
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {item.path ? (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `block border-r border-gray-500 px-3 text-[13px] font-semibold transition-colors ${isActive ? 'bg-color text-white' : 'text-black'
                      }`
                    }
                    onClick={() => setActiveItem(item.name)}
                  >
                    {item.name}
                  </NavLink>
                ) : (
                  <div className='relative'>
                    <span
                      className='flex cursor-pointer items-center border-r border-gray-500 px-3 text-[13px] font-semibold text-black'
                      onClick={(e) => toggleMobileSubmenu(item.name, e)}
                    >
                      {item.name}
                      <IoMdArrowDropdown className='h-5 w-5' />
                    </span>

                    {/* Mobile Submenu Dropdown - positioned absolutely within viewport */}
                    {mobileSubmenuOpen === item.name && (
                      <ul
                        className='bg-color fixed top-0 left-0 z-20 w-40 border border-gray-700 font-semibold text-white shadow-lg'
                        style={{
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`,
                          position: dropdownPosition.position,
                        }}
                      >
                        {item.submenu
                          .filter(
                            (sub) =>
                              !(
                                userInfo?.role === 'agent' &&
                                sub.name === 'Agent Downline List'
                              )
                          )
                          .map((sub, index) => (
                            <li
                              key={index}
                              className='border-b border-gray-700 last:border-b-0 hover:bg-gray-800'
                            >
                              <NavLink
                                to={sub.path}
                                className='block px-3 text-[13px]'
                                onClick={(e) => {
                                  setActiveItem(item.name);
                                  setMobileSubmenuOpen(null);
                                  if (sub.reload) {
                                    e.preventDefault();
                                    navigate(sub.path);
                                    window.location.reload();
                                  }
                                }}
                              >
                                {sub.name}
                              </NavLink>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
            {/* Logout button in scrollable menu */}
            <li className='inline-block'>
              <button
                onClick={logout}
                className='flex items-center gap-1 border-r border-gray-500 px-3 text-[13px] font-semibold text-black'
              >
                Logout <MdLogout />
              </button>
            </li>
          </ul>
        </nav>

        {/* Popup */}
        {showPopup && (
          <div className='fixed inset-0 z-50 flex items-center justify-center'>
            <div className='bg-opacity-50 absolute inset-0 bg-black'></div>
            <div className='bg-color relative z-10 mx-4 w-full p-4 text-white shadow-lg md:max-w-lg'>
              <div className='flex items-center justify-between'>
                <h2 className='text-center text-lg font-bold'>
                  Non-Gambling Territories.
                </h2>
                <button
                  onClick={() => setShowPopup(false)}
                  className='bg-color rounded-md p-1 text-xl'
                >
                  <IoMdClose />
                </button>
              </div>
              <hr className='my-2 border-white' />
              <p className='text-sm'>
                Connecting to our site from non-gambling countries, it will be
                User's responsibility to ensure that their use of the service is
                lawful.
              </p>
              <h3 className='my-3 text-center font-bold'>
                Underage gambling is prohibited.
              </h3>
              <p className='text-center text-sm'>
                Please confirm if you are 18 years old and above as of today.
              </p>
              <hr className='my-2 border-white' />
              <div className='mt-4 flex justify-center gap-2'>
                <button
                  className='w-[130px] rounded bg-white py-1 text-black hover:bg-gray-300'
                  onClick={() => setShowPopup(false)}
                >
                  Confirm
                </button>
                <button
                  className='w-[130px] rounded border border-white bg-black py-1 text-white'
                  onClick={() => setShowPopup(false)}
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SportsSidebar
        isOpen={sportsSidebarOpen}
        onClose={() => setSportsSidebarOpen(false)}
      />

      {shouldShowPasswordPopup && (
        <div className='fixed z-50 flex h-full w-full items-center justify-center bg-black/30'>
          <div className='fixed top-6 left-1/2 w-90 -translate-x-1/2 rounded-lg bg-white shadow-lg md:w-[500px]'>
            <div className='flex items-center justify-between rounded-t-lg bg-secondary px-4 py-2 text-white'>
              <h2 className='font-semibold'>Change Password</h2>
            </div>
            <form className='space-y-4 p-6' onSubmit={changeSubmit}>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='relative'>
                  <label className='block text-sm font-medium text-gray-700'>
                    Old Password <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type={showOld ? 'text' : 'password'}
                    placeholder='Old Password..'
                    value={changeFormData.oldPassword}
                    onChange={(e) =>
                      setChangeFormData({
                        ...changeFormData,
                        oldPassword: e.target.value,
                      })
                    }
                    className='mt-1 w-full rounded border px-3 py-2 text-black bg-white focus:ring focus:ring-blue-200'
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowOld(!showOld)}
                    className='absolute top-9 right-3 text-gray-500'
                  >
                    {showOld ? '🙈' : '👁️'}
                  </button>
                </div>

                <div className='relative'>
                  <label className='block text-sm font-medium text-gray-700'>
                    New Password <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder='New Password..'
                    value={changeFormData.newPassword}
                    onChange={(e) =>
                      setChangeFormData({
                        ...changeFormData,
                        newPassword: e.target.value,
                      })
                    }
                    className='mt-1 w-full rounded border px-3 py-2 text-black bg-white focus:ring focus:ring-blue-200'
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowNew(!showNew)}
                    className='absolute top-9 right-3 text-gray-500'
                  >
                    {showNew ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className='relative'>
                <label className='block text-sm font-medium text-gray-700'>
                  Confirm Password <span className='text-red-500'>*</span>
                </label>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder='Confirm Password..'
                  value={changeFormData.confirmPassword}
                  onChange={(e) =>
                    setChangeFormData({
                      ...changeFormData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className='mt-1 w-full rounded border px-3 py-2 text-black bg-white focus:ring focus:ring-blue-200'
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowConfirm(!showConfirm)}
                  className='absolute top-9 right-3 text-gray-500'
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>

              <div className='flex justify-end'>
                <button
                  type='submit'
                  className='rounded bg-secondary px-4 py-2 text-white hover:bg-secondary'
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Market Analysis Modal */}
      <MarketAnalysisModal
        isOpen={showMarketModal}
        onClose={() => setShowMarketModal(false)}
        clientUser={selectedClient}
      />
    </>
  );
};

export default Navbar;

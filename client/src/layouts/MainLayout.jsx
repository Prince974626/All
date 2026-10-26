import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { IoClose } from 'react-icons/io5';
import Header from '../components/header/Header';
import Navbar from '../components/header/Navbar';
import MobileNav from '../components/header/MobileNav';
import Sidebar from '../components/sidebar/Sidebar';
import Footer from '../components/footer/Footer';
import api from '../redux/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

const LOGIN_POPUP_KEY = 'showLoginPopup';
const POSTER_SLIDE_MS = 4000;

const posterListFromSettings = (data, arrayKey, singleKey) => {
  const list = Array.isArray(data?.[arrayKey])
    ? data[arrayKey].filter(Boolean)
    : [];
  const urls = (list.length ? list : data?.[singleKey] ? [data[singleKey]] : [])
    .map((url) => resolveMediaUrl(url))
    .filter(Boolean);
  return [...new Set(urls)];
};

function PosterSlideshow({ urls }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [urls]);

  useEffect(() => {
    if (urls.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % urls.length);
    }, POSTER_SLIDE_MS);
    return () => clearInterval(timer);
  }, [urls]);

  if (!urls.length) return null;

  return (
    <img
      src={urls[index % urls.length]}
      alt='Announcement'
      className='block w-full'
    />
  );
}

function MainLayout() {
  const { userInfo, isPasswordChanged, isDemo } = useSelector(
    (state) => state.auth
  );
  const shouldShowPasswordPopup =
    isPasswordChanged === false && !isDemo && !userInfo?.isDemo;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(
    () => sessionStorage.getItem(LOGIN_POPUP_KEY) === '1'
  );
  const [loginPosterEnabled, setLoginPosterEnabled] = useState(true);
  const [loginPosterUrls, setLoginPosterUrls] = useState([]);
  const [loginPosterUrlsMobile, setLoginPosterUrlsMobile] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const loadPosters = async () => {
      try {
        const res = await api.get('/site-settings');
        if (!cancelled && res.data?.success && res.data?.data) {
          const data = res.data.data;
          const desk = posterListFromSettings(
            data,
            'loginPosterUrls',
            'loginPosterUrl'
          );
          const mob = posterListFromSettings(
            data,
            'loginPosterUrlsMobile',
            'loginPosterUrlMobile'
          );
          setLoginPosterEnabled(data.loginPosterEnabled !== false);
          setLoginPosterUrls(desk);
          setLoginPosterUrlsMobile(mob);
          // Re-open if this session still has the login flag and posters exist
          if (
            sessionStorage.getItem(LOGIN_POPUP_KEY) === '1' &&
            data.loginPosterEnabled !== false &&
            (desk.length || mob.length)
          ) {
            setShowPopup(true);
          }
        }
      } catch (err) {
        console.error('Failed to load login posters:', err);
      }
    };
    loadPosters();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const closePopup = () => {
    sessionStorage.removeItem(LOGIN_POPUP_KEY);
    setShowPopup(false);
  };

  const desktopSlides = loginPosterUrls.length
    ? loginPosterUrls
    : loginPosterUrlsMobile;
  const mobileSlides = loginPosterUrlsMobile.length
    ? loginPosterUrlsMobile
    : loginPosterUrls;
  const hasAnyPoster = desktopSlides.length > 0 || mobileSlides.length > 0;
  const showLoginPoster =
    showPopup &&
    !shouldShowPasswordPopup &&
    loginPosterEnabled &&
    hasAnyPoster;

  return (
    <>
      <div className='bg-body min-h-screen'>
        <Header onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <div className='hidden lg:block'>
          <Navbar />
        </div>
        {/* <div className='block md:hidden'>
        <MobileNav />
      </div> */}
        <div className='flex'>
          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

          {/* Main Content Area */}
          <main className='scrollbar-hide w-full flex-1 lg:ml-0'>
            <Outlet />
          </main>
        </div>
        {/* Footer */}
        <div className='site-footer-hidden-when-game'>
          <Footer />
        </div>
      </div>

      {showLoginPoster && (
        <div
          className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3'
          onClick={closePopup}
        >
          <div
            className='fixed left-1/2 flex max-h-[100dvh] w-full max-w-[500px] -translate-x-1/2 flex-col overflow-hidden rounded bg-white shadow-xl lg:top-2 lg:max-w-[800px]'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type='button'
              onClick={closePopup}
              aria-label='Close popup'
              className='absolute top-2 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full text-white hover:bg-black/70'
            >
              <IoClose className='text-lg' />
            </button>

            <div className='shrink-0 bg-primary px-3 py-2 text-[13px] leading-snug font-medium text-white sm:text-[20px]'>
              ⚠️ Beware Of Phishing Websites Before Login. Enable Security Auth
              To Secure Your ID.
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto'>
              <div className='block lg:hidden'>
                <PosterSlideshow urls={mobileSlides} />
              </div>
              <div className='hidden lg:block'>
                <PosterSlideshow urls={desktopSlides} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MainLayout;

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { user_reset } from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';

// Inactivity timeout: 15 minutes
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'user_lastActivityTime';

const InactivityHandler = ({ timeoutMs = INACTIVITY_TIMEOUT }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const timerRef = useRef(null);

  useEffect(() => {
    const handleLogout = () => {
      const token = localStorage.getItem('auth');
      if (token) {
        localStorage.removeItem('auth');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        sessionStorage.removeItem('showLoginPopup');
        dispatch(user_reset());
        toast.info('Logged out due to inactivity. Please log in again.');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    };

    const isLoginPath = (pathname) => pathname === '/login';

    const checkInactivity = () => {
      const token = localStorage.getItem('auth');
      if (!token || isLoginPath(location.pathname)) return false;

      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity, 10);
        if (elapsed >= timeoutMs) {
          handleLogout();
          return true;
        }
      }
      return false;
    };

    const resetTimer = () => {
      const token = localStorage.getItem('auth');
      if (!token || isLoginPath(location.pathname)) return;

      if (checkInactivity()) return;

      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(handleLogout, timeoutMs);
    };

    const token = localStorage.getItem('auth');
    if (!token || isLoginPath(location.pathname)) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (checkInactivity()) return;

    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkInactivity);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkInactivity);
    };
  }, [dispatch, location.pathname, timeoutMs]);

  return null;
};

export default InactivityHandler;

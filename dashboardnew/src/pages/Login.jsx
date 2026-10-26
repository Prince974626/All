import React, { useState } from 'react';
import { FaUser, FaEye, FaEyeSlash, FaArrowRight } from 'react-icons/fa';
import logo from '../assets/icons/AURA444.png';
import jdlogo from '../assets/jdlogo.png';
import mydreamlogo from '../assets/mydreamlogo.png';
import { useDispatch, useSelector } from 'react-redux';
import { getAdmin, loginAdmin } from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { user } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    password: '',
  });
  const [touched, setTouched] = useState({
    userName: false,
    password: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await dispatch(loginAdmin(formData)).unwrap();
      toast.success(data.message);
      dispatch(getAdmin());
      navigate('/user-download-list');
    } catch (error) {
      toast.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePass = (e) => {
    e.preventDefault();
    setShowPassword(!showPassword);
  };

  return (
    <div className='flex h-screen w-screen flex-col bg-gradient-to-b from-[#0088CC] to-[#2C3E50]'>
      <div className='flex flex-1 flex-col items-center justify-center pb-18'>
        <div className='flex w-[400px] max-w-[90%] flex-col items-center justify-center'>
          <img src={mydreamlogo} alt='logo' className='max-h-[70px] object-cover' />
          <div className='mt-4 flex w-full flex-col items-center rounded bg-[#eee] p-8 shadow-[0_0_4px_#fff]'>
            <div className='log-fld mb-[30px] w-full'>
              <h2 className='relative text-center text-[28px] leading-none'>
                Sign In
              </h2>
            </div>
            {/* Username Input */}
            <div className='mb-[25px] w-full overflow-hidden rounded'>
              <input
                type='text'
                placeholder='Username'
                value={formData.userName}
                onChange={(e) =>
                  setFormData({ ...formData, userName: e.target.value })
                }
                onBlur={() => setTouched({ ...touched, userName: true })}
                className='w-full rounded-sm border border-[#ced4da] bg-white px-2 py-1.5 text-[18px] text-black placeholder-gray-500 focus:outline-none md:py-1 md:text-[14px]'
              />
              {(touched.userName || submitAttempted) &&
                formData.userName === '' && (
                  <p className='text-left text-sm text-red-600'>
                    The username field is required
                  </p>
                )}
            </div>

            {/* Password Input */}
            <div className='mb-[25px] w-full overflow-hidden rounded'>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder='Password'
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                onBlur={() => setTouched({ ...touched, password: true })}
                className='w-full rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-[18px] text-black placeholder-gray-500 focus:outline-none md:py-1 md:text-[14px]'
              />
              {(touched.password || submitAttempted) &&
                formData.password === '' && (
                  <p className='text-left text-sm text-red-600'>
                    The password field is required
                  </p>
                )}
            </div>

            {/* Login Button */}
            <button
              onClick={handleSubmit}
              className='flex w-full items-center justify-center gap-2 rounded bg-[#0088CC] py-2 font-semibold text-white transition-colors hover:bg-[#0077b3]'
            >
              {isLoading ? (
                <span className='flex items-center justify-center gap-2'>
                  <svg
                    className='h-5 w-5 animate-spin'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                <>
                  Login
                  <FaArrowRight className='text-white' />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

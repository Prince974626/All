'use client';
import { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addAdmin, getAdmin } from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import api from '../redux/api';

export default function InsertUser() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [showPassword3, setShowPassword3] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    userName: '',
    accountType: 'user',
    city: '',
    phone: '',
    commition: '0',
    balance: 0,
    exposureLimit: 0,
    creditReference: 0,
    rollingCommission: 0,
    partnership: '0',
    password: '',
    masterPassword: '',
    status: 'active',
    confirmPassword: '',
  });

  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    exists: null,
    message: '',
  });

  // Password Validation
  const getPasswordError = (pass) => {
    if (!pass) return '';
    if (pass.length < 8) return 'The password field must be at least 8 characters';
    const missing = [];
    if (!/[A-Z]/.test(pass)) missing.push('1 uppercase letter');
    if (!/[a-z]/.test(pass)) missing.push('1 lowercase letter');
    if (!/\d/.test(pass)) missing.push('1 number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass)) missing.push('1 special character');
    if (missing.length > 0) {
      return `The password must contain at least: ${missing.join(', ')}`;
    }
    return '';
  };

  const passwordError = getPasswordError(formData.password);

  const confirmPasswordError =
    formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword
      ? 'Password and Retype Password do not match'
      : '';

  // Full Name Validation
  const getFullNameError = (val) => {
    if (!val) return '';
    if (val.trim().length < 4) return 'The fullname field must be at least 4 characters';
    return '';
  };
  const fullNameError = getFullNameError(formData.name);

  // City Validation
  const getCityError = (val) => {
    if (!val) return '';
    if (val.trim().length < 3) return 'The city field must be at least 3 characters';
    return '';
  };
  const cityError = getCityError(formData.city);

  // Phone Validation
  const getPhoneError = (val) => {
    if (!val) return '';
    if (!/^\d+$/.test(val.trim())) return 'The mono field must contain numbers only';
    if (val.trim().length < 10) return 'The mono field must be at least 10 characters';
    return '';
  };
  const phoneError = getPhoneError(formData.phone);

  // Real-time username validation & availability check
  useEffect(() => {
    const trimmed = formData.userName.trim();
    if (!trimmed) {
      setUsernameStatus({ checking: false, exists: null, message: '' });
      return;
    }

    if (trimmed.length < 4) {
      setUsernameStatus({
        checking: false,
        exists: true,
        message: 'The clientname field must be at least 4 characters',
      });
      return;
    }

    if (!/[a-zA-Z]/.test(trimmed)) {
      setUsernameStatus({
        checking: false,
        exists: true,
        message: 'The clientname field must contain at least one letter',
      });
      return;
    }

    setUsernameStatus({ checking: true, exists: null, message: 'Checking...' });

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/sub-admin/check-username/${encodeURIComponent(trimmed)}`, {
          withCredentials: true,
        });
        if (res.data?.exists) {
          setUsernameStatus({
            checking: false,
            exists: true,
            message: 'The clientname field already exists',
          });
        } else {
          setUsernameStatus({
            checking: false,
            exists: false,
            message: 'Username available',
          });
        }
      } catch (error) {
        console.error('Username check error:', error);
        setUsernameStatus({ checking: false, exists: null, message: '' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.userName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.userName.trim().length < 4) {
      toast.error('The clientname field must be at least 4 characters');
      return;
    }
    if (!/[a-zA-Z]/.test(formData.userName)) {
      toast.error('The clientname field must contain at least one letter.');
      return;
    }
    if (usernameStatus.exists === true) {
      toast.error(usernameStatus.message || 'Invalid or existing username.');
      return;
    }
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Password and Retype Password do not match');
      return;
    }
    if (fullNameError) {
      toast.error(fullNameError);
      return;
    }
    if (cityError) {
      toast.error(cityError);
      return;
    }
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    if (userInfo) {
      try {
        const result = await dispatch(addAdmin(formData)).unwrap();
        toast.success(result?.message || 'Account created successfully!');
        dispatch(getAdmin());
        navigate('/user-download-list');
      } catch (error) {
        toast.error(
          typeof error === 'string' ? error : error?.message || 'Failed to create account'
        );
      }
    } else {
      navigate('/');
    }
  };

  const labelClass = 'block text-xs font-semibold text-gray-700 mb-1';
  const inputClass =
    'w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-[#2c3e50] focus:outline-none';

  return (
    <>
      <Navbar />
      <div className='min-h-screen bg-[#e9edf2] px-2.5 pt-[15px] pb-[70px]'>
        <div className='mx-auto rounded-lg bg-white p-5 shadow-sm border border-gray-200 border-t-4 border-t-[#0088cc]'>
          <h1 className='text-2xl font-semibold text-gray-800 mb-4'>Add Account</h1>

          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* TOP ROW: Personal Detail & Account Detail */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 items-start'>
              {/* Left Card: Personal Detail */}
              <div className='rounded border border-gray-200 overflow-hidden bg-white'>
                <div className='bg-[#2c3e50] px-3 py-2 text-sm font-bold text-white uppercase tracking-wide'>
                  Personal Detail
                </div>
                <div className='p-4 grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {/* Client Name Field */}
                  <div>
                    <label className={labelClass}>Client Name:</label>
                    <div className='relative'>
                      <input
                        type='text'
                        required
                        placeholder='Client Name'
                        className={`w-full rounded border px-3 py-1.5 pr-8 text-xs text-gray-800 focus:outline-none transition-all ${
                          usernameStatus.exists === true
                            ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                            : usernameStatus.exists === false
                            ? 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-[#2c3e50]'
                        }`}
                        value={formData.userName}
                        onChange={(e) =>
                          setFormData({ ...formData, userName: e.target.value })
                        }
                      />
                      <div className='absolute inset-y-0 right-2.5 flex items-center pointer-events-none'>
                        {usernameStatus.checking ? (
                          <FaSpinner className='animate-spin text-gray-400' size={13} />
                        ) : usernameStatus.exists === true ? (
                          <FaTimes className='text-red-500 font-bold' size={14} />
                        ) : usernameStatus.exists === false ? (
                          <FaCheck className='text-green-500 font-bold' size={13} />
                        ) : null}
                      </div>
                    </div>
                    {usernameStatus.exists === true && usernameStatus.message && (
                      <p className='mt-1 text-xs font-medium text-red-600'>
                        {usernameStatus.message}
                      </p>
                    )}
                  </div>

                  {/* User Password Field */}
                  <div>
                    <label className={labelClass}>User Password:</label>
                    <div className='relative'>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder='User Password'
                        className={`w-full rounded border px-3 py-1.5 pr-14 text-xs text-gray-800 focus:outline-none transition-all ${
                          formData.password.length > 0
                            ? passwordError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-[#2c3e50]'
                        }`}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                      <div className='absolute inset-y-0 right-2.5 flex items-center space-x-1.5'>
                        {formData.password.length > 0 && (
                          <span>
                            {passwordError ? (
                              <FaTimes className='text-red-500 font-bold' size={14} />
                            ) : (
                              <FaCheck className='text-green-500 font-bold' size={13} />
                            )}
                          </span>
                        )}
                        <button
                          type='button'
                          className='text-gray-400 hover:text-gray-600'
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                        </button>
                      </div>
                    </div>
                    {formData.password.length > 0 && passwordError && (
                      <p className='mt-1 text-xs font-medium text-red-600'>
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Retype Password Field */}
                  <div>
                    <label className={labelClass}>Retype Password:</label>
                    <div className='relative'>
                      <input
                        type={showPassword2 ? 'text' : 'password'}
                        required
                        placeholder='Retype Password'
                        className={`w-full rounded border px-3 py-1.5 pr-14 text-xs text-gray-800 focus:outline-none transition-all ${
                          formData.confirmPassword.length > 0
                            ? confirmPasswordError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-[#2c3e50]'
                        }`}
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                      />
                      <div className='absolute inset-y-0 right-2.5 flex items-center space-x-1.5'>
                        {formData.confirmPassword.length > 0 && (
                          <span>
                            {confirmPasswordError ? (
                              <FaTimes className='text-red-500 font-bold' size={14} />
                            ) : (
                              <FaCheck className='text-green-500 font-bold' size={13} />
                            )}
                          </span>
                        )}
                        <button
                          type='button'
                          className='text-gray-400 hover:text-gray-600'
                          onClick={() => setShowPassword2(!showPassword2)}
                        >
                          {showPassword2 ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                        </button>
                      </div>
                    </div>
                    {formData.confirmPassword.length > 0 && confirmPasswordError && (
                      <p className='mt-1 text-xs font-medium text-red-600'>
                        {confirmPasswordError}
                      </p>
                    )}
                  </div>

                  {/* Full Name Field */}
                  <div>
                    <label className={labelClass}>Full Name:</label>
                    <div className='relative'>
                      <input
                        type='text'
                        placeholder='Full Name'
                        className={`w-full rounded border px-3 py-1.5 pr-8 text-xs text-gray-800 focus:outline-none transition-all ${
                          formData.name.length > 0
                            ? fullNameError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-[#2c3e50]'
                        }`}
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                      <div className='absolute inset-y-0 right-2.5 flex items-center pointer-events-none'>
                        {formData.name.length > 0 && (
                          <span>
                            {fullNameError ? (
                              <FaTimes className='text-red-500 font-bold' size={14} />
                            ) : (
                              <FaCheck className='text-green-500 font-bold' size={13} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {formData.name.length > 0 && fullNameError && (
                      <p className='mt-1 text-xs font-medium text-red-600'>
                        {fullNameError}
                      </p>
                    )}
                  </div>

                  {/* City Field */}
                  <div>
                    <label className={labelClass}>City:</label>
                    <div className='relative'>
                      <input
                        type='text'
                        placeholder='City'
                        className={`w-full rounded border px-3 py-1.5 pr-8 text-xs text-gray-800 focus:outline-none transition-all ${
                          formData.city.length > 0
                            ? cityError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-[#2c3e50]'
                        }`}
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                      />
                      <div className='absolute inset-y-0 right-2.5 flex items-center pointer-events-none'>
                        {formData.city.length > 0 && (
                          <span>
                            {cityError ? (
                              <FaTimes className='text-red-500 font-bold' size={14} />
                            ) : (
                              <FaCheck className='text-green-500 font-bold' size={13} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {formData.city.length > 0 && cityError && (
                      <p className='mt-1 text-xs font-medium text-red-600'>
                        {cityError}
                      </p>
                    )}
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className={labelClass}>Phone:</label>
                    <div className='relative'>
                      <input
                        type='text'
                        placeholder='Phone Number'
                        className={`w-full rounded border px-3 py-1.5 pr-8 text-xs text-gray-800 focus:outline-none transition-all ${
                          formData.phone?.length > 0
                            ? phoneError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-[#2c3e50]'
                        }`}
                        value={formData.phone || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                      <div className='absolute inset-y-0 right-2.5 flex items-center pointer-events-none'>
                        {formData.phone?.length > 0 && (
                          <span>
                            {phoneError ? (
                              <FaTimes className='text-red-500 font-bold' size={14} />
                            ) : (
                              <FaCheck className='text-green-500 font-bold' size={13} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    {formData.phone?.length > 0 && phoneError && (
                      <p className='mt-1 text-xs font-medium text-red-600'>
                        {phoneError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Card: Account Detail */}
              <div className='rounded border border-gray-200 overflow-hidden bg-white'>
                <div className='bg-[#2c3e50] px-3 py-2 text-sm font-bold text-white uppercase tracking-wide'>
                  Account Detail
                </div>
                <div className='p-4 grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className={labelClass}>Account Type:</label>
                    <select
                      disabled
                      className={`${inputClass} capitalize bg-gray-100 cursor-not-allowed`}
                      value={formData.accountType}
                    >
                      <option value='user'>User</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Credit Reference:</label>
                    <input
                      type='number'
                      placeholder='Credit Reference'
                      className={inputClass}
                      value={formData.creditReference || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          creditReference: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Exposer Limit:</label>
                    <input
                      type='number'
                      placeholder='Exposure Limit'
                      className={inputClass}
                      value={formData.exposureLimit || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          exposureLimit: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* COMMISSION SETTINGS SECTION */}
            <div className='rounded border border-gray-200 overflow-hidden bg-white'>
              <div className='bg-[#2c3e50] px-3 py-2 text-sm font-bold text-white uppercase tracking-wide'>
                Commission Settings
              </div>
              <div className='divide-y divide-gray-200 text-xs font-medium'>
                <div className='grid grid-cols-12 bg-gray-100 p-2.5 items-center'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 font-bold'>Upline</span>
                  <span className='col-span-8 md:col-span-9 text-gray-800 font-semibold'>0</span>
                </div>
                <div className='grid grid-cols-12 p-2.5 items-center bg-white'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 font-bold'>Downline</span>
                  <div className='col-span-8 md:col-span-9'>
                    <input
                      type='text'
                      placeholder='0'
                      disabled
                      className='w-full max-w-xs rounded border border-gray-300 px-3 py-1 text-xs text-gray-800 bg-gray-100 cursor-not-allowed'
                      value={formData.commition}
                    />
                  </div>
                </div>
                <div className='grid grid-cols-12 bg-gray-100 p-2.5 items-center'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 font-bold'>Our</span>
                  <span className='col-span-8 md:col-span-9 text-gray-800 font-semibold'>-</span>
                </div>
              </div>
            </div>

            {/* PARTNERSHIP SECTION */}
            <div className='rounded border border-gray-200 overflow-hidden bg-white'>
              <div className='bg-[#2c3e50] px-3 py-2 text-sm font-bold text-white uppercase tracking-wide'>
                Partnership
              </div>
              <div className='divide-y divide-gray-200 text-xs font-medium'>
                <div className='grid grid-cols-12 bg-gray-100 p-2.5 items-center'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 font-bold'>Upline</span>
                  <span className='col-span-8 md:col-span-9 text-gray-800 font-semibold'>0</span>
                </div>
                <div className='grid grid-cols-12 p-2.5 items-center bg-white'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 font-bold'>Downline</span>
                  <div className='col-span-8 md:col-span-9'>
                    <input
                      type='text'
                      placeholder='0'
                      disabled
                      className='w-full max-w-xs rounded border border-gray-300 px-3 py-1 text-xs text-gray-800 bg-gray-100 cursor-not-allowed'
                      value={formData.partnership}
                    />
                  </div>
                </div>
                <div className='grid grid-cols-12 bg-gray-100 p-2.5 items-center'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 font-bold'>Our</span>
                  <span className='col-span-8 md:col-span-9 text-gray-800 font-semibold'>-</span>
                </div>
              </div>
            </div>

            {/* BOTTOM BAR: Master Password & Create Button */}
            <div className='flex flex-wrap items-center justify-end gap-4 pt-2'>
              <div className='flex items-center space-x-2'>
                <label className='text-xs font-bold text-gray-700 whitespace-nowrap'>
                  Master Password:
                </label>
                <div className='relative w-60'>
                  <input
                    type={showPassword3 ? 'text' : 'password'}
                    required
                    placeholder='Enter your password...'
                    className={`${inputClass} pr-8`}
                    value={formData.masterPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, masterPassword: e.target.value })
                    }
                  />
                  <button
                    type='button'
                    className='absolute inset-y-0 right-2.5 flex items-center text-gray-400 hover:text-gray-600'
                    onClick={() => setShowPassword3(!showPassword3)}
                  >
                    {showPassword3 ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                  </button>
                </div>
              </div>

              <button
                type='submit'
                className='rounded bg-[#0088cc] px-6 py-2 text-xs font-bold text-white shadow hover:bg-[#0077b3] transition-colors'
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

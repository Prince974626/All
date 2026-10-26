'use client';
import { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addAdmin, getAdmin } from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import api from '../redux/api';

export default function InsertAgent() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userInfo } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [showPassword3, setShowPassword3] = useState(false);

  const roleHierarchy = {
    supperadmin: ['admin', 'white', 'super', 'master', 'agent', 'user'],
    admin: ['white', 'super', 'master', 'agent', 'user'],
    white: ['super', 'master', 'agent', 'user'],
    super: ['master', 'agent', 'user'],
    master: ['agent', 'user'],
    agent: ['user'],
  };

  const allowedRoles = roleHierarchy[userInfo?.role] || [];

  const [formData, setFormData] = useState({
    name: '',
    userName: '',
    accountType: '',
    city: '',
    phone: '',
    commition: '0',
    balance: 0,
    exposureLimit: 0,
    creditReference: 0,
    rollingCommission: 0,
    partnership: '0',
    password: '',
    confirmPassword: '',
    masterPassword: '',
    remark: '',
    status: 'active',
  });

  const [usernameStatus, setUsernameStatus] = useState({
    checking: false,
    exists: null,
    message: '',
  });

  const isUserAccount = formData.accountType === 'user';

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
        if (formData.accountType === 'user') {
          navigate('/user-download-list');
        } else {
          navigate('/agent-download-list');
        }
      } catch (error) {
        toast.error(
          typeof error === 'string' ? error : error?.message || 'Failed to create account'
        );
      }
    } else {
      navigate('/');
    }
  };

  const labelClass = 'block text-sm text-[#1e1e1e] mb-[7px] leading-[1.2]';
  const inputClass =
    'w-full rounded border border-gray-300 bg-white leading-[1.5] px-[0.75rem] py-[0.41122rem] text-sm text-[#495057] placeholder:text-[#74788d] outline-none  focus:outline-none';

  return (
    <>
      <Navbar />
      <div className='min-h-screen bg-white px-[15px] pt-[10px] pb-[70px]'>
        <div className='rounded-sm bg-[#f9f9f9] p-[15px] shadow-[0px_0px_5px_rgba(0,0,0,0.5)]'>
            <h1 className='text-[28px] text-[#1e1e1e] mb-5 leading-[1.2]'>Add Account</h1>

          <form onSubmit={handleSubmit}>
            {/* TOP ROW: Personal Detail & Account Detail */}
            <div className='grid grid-cols-1 lg:grid-cols-2 items-start -mx-[15px]'>
              {/* Left Card: Personal Detail */}
              <div className='overflow-hidden px-[15px]'>
                <h4 className='bg-secondary px-[15px] py-[5px] text-[18px] font-bold text-white leading-[1.2] mb-[21px]'>
                  Personal Detail
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 -mx-[15px]'>
                  {/* Client Name Field */}
                  <div className='px-[15px] mb-[14px]'>
                    <label className={labelClass}>Client Name:</label>
                    <div className='relative'>
                      <input
                        type='text'
                        required
                        placeholder='Client Name'
                        className={`${inputClass} ${
                          usernameStatus.exists === true
                            ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                            : usernameStatus.exists === false
                            ? 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-secondary'
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
                  <div className='px-[15px] mb-[14px]'>
                    <label className={labelClass}>User Password:</label>
                    <div className='relative'>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder='User Password'
                        className={`${inputClass} ${
                          formData.password.length > 0
                            ? passwordError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-secondary'
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
                  <div className='px-[15px] mb-[14px]'>
                    <label className={labelClass}>Retype Password:</label>
                    <div className='relative'>
                      <input
                        type={showPassword2 ? 'text' : 'password'}
                        required
                        placeholder='Retype Password'
                        className={`${inputClass} ${
                          formData.confirmPassword.length > 0
                            ? confirmPasswordError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-secondary'
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
                  <div className='px-[15px] mb-[14px]'>
                    <label className={labelClass}>Full Name:</label>
                    <div className='relative'>
                      <input
                        type='text'
                        placeholder='Full Name'
                        className={`${inputClass} ${
                          formData.name.length > 0
                            ? fullNameError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-secondary'
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
                  <div className='px-[15px] mb-[14px]'>
                    <label className={labelClass}>City:</label>
                    <div className='relative'>
                      <input
                        type='text'
                        placeholder='City'
                        className={`${inputClass} ${
                          formData.city.length > 0
                            ? cityError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-secondary'
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
                  <div className='px-[15px] mb-[14px]'>
                    <label className={labelClass}>Phone:</label>
                    <div className='relative'>
                      <input
                        type='text'
                        placeholder='Phone Number'
                        className={`${inputClass} ${
                          formData.phone?.length > 0
                            ? phoneError
                              ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-400'
                              : 'border-green-400 ring-1 ring-green-400 focus:border-green-500 focus:ring-green-400'
                            : 'border-gray-300 focus:border-secondary'
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
              <div className='overflow-hidden px-[15px]'>
                <div className='bg-secondary px-[15px] py-[5px] text-[18px] font-bold text-white leading-[1.2] mb-[21px]'>
                  Account Detail
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 -mx-[15px]'>
                  <div className='px-[15px] mb-[14px]'>
                    <label className={labelClass}>Account Type:</label>
                    <select
                      required
                      className={`${inputClass} capitalize`}
                      value={formData.accountType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          accountType: e.target.value,
                        })
                      }
                    >
                      <option value=''>Select Account Type</option>
                      {allowedRoles.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>
                          {roleOption === 'white'
                            ? 'White_level'
                            : roleOption.charAt(0).toUpperCase() +
                              roleOption.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className='px-[15px] mb-[14px]'>
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

                  {isUserAccount && (
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
                  )}
                </div>
              </div>
            </div>

            {/* COMMISSION SETTINGS SECTION */}
            <div className='overflow-hidden mt-[21px]'>
              <div className='bg-secondary px-[15px] py-[5px] text-[18px] font-bold text-white leading-[1.2] mb-[21px]'>
                Commission Settings
              </div>
              <div className='border border-gray-200 text-sm mb-[14px]'>
                <div className='grid grid-cols-12 bg-[rgba(0,0,0,0.05)] items-center border-b border-gray-200'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 border-r border-[#dee2e6] p-[0.65623rem]'>Upline</span>
                  <span className='col-span-8 md:col-span-9 text-gray-800 p-[0.65623rem] leading-[1.2]'>0</span>
                </div>
                <div className='grid grid-cols-12 items-center'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 border-r border-[#dee2e6] p-[0.65623rem] h-full'>Downline</span>
                  <div className='col-span-8 md:col-span-9 text-gray-800 p-[0.65623rem]'>
                    <input
                      type='text'
                      placeholder='0'
                      disabled={isUserAccount}
                      className='p-1 text-sm text-gray-800 focus:outline-none disabled:bg-gray-100 bg-white w-full leading-[1.2]'
                      value={formData.commition}
                      onChange={(e) =>
                        setFormData({ ...formData, commition: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className='grid grid-cols-12 bg-[rgba(0,0,0,0.05)] items-center border-b border-gray-200'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 border-r border-[#dee2e6] p-[0.65623rem]'>Our</span>
                  <span className='col-span-8 md:col-span-9 text-gray-800'>-</span>
                </div>
              </div>
            </div>

            {/* PARTNERSHIP SECTION */}
            <div className='overflow-hidden'>
              <div className='bg-secondary px-[15px] py-[5px] text-[18px] font-bold text-white leading-[1.2] mb-[21px]'>
                Partnership
              </div>
              <div className='border border-gray-200 text-sm mb-[14px]'>
                <div className='grid grid-cols-12 bg-[rgba(0,0,0,0.05)] items-center border-b border-gray-200'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 border-r border-[#dee2e6] p-[0.65623rem]'>
                    Upline
                  </span>
                  <span className='col-span-8 md:col-span-9 text-gray-800 p-[0.65623rem] leading-[1.2]'>
                    {Number(
                      userInfo?.headerStats?.partnershipKeepPercent ??
                        userInfo?.partnership ??
                        0
                    )}
                  </span>
                </div>
                <div className='grid grid-cols-12 items-center'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 border-r border-[#dee2e6] p-[0.65623rem] h-full'>
                    Downline
                  </span>
                  <div className='col-span-8 md:col-span-9 text-gray-800 p-[0.65623rem]'>
                    <input
                      type='text'
                      placeholder='0'
                      disabled={isUserAccount}
                      className='p-1 text-sm text-gray-800 focus:outline-none disabled:bg-gray-100 bg-white w-full leading-[1.2] mb-[14px]'
                      value={formData.partnership}
                      onChange={(e) =>
                        setFormData({ ...formData, partnership: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className='grid grid-cols-12 bg-[rgba(0,0,0,0.05)] items-center border-b border-gray-200'>
                  <span className='col-span-4 md:col-span-3 text-gray-700 border-r border-[#dee2e6] p-[0.65623rem]'>
                    Our
                  </span>
                  <span className='col-span-8 md:col-span-9 text-gray-800 p-[0.65623rem]'>
                    {Math.max(
                      0,
                      Number(
                        userInfo?.headerStats?.partnershipKeepPercent ??
                          userInfo?.partnership ??
                          0
                      ) - Number(formData.partnership || 0)
                    )}
                  </span>
                </div>
              </div>
              {/* <p className='mb-[14px] px-[15px] text-[12px] text-gray-500'>
                Downline keep % cannot exceed your keep. Upline + Downline keep
                through the agent line adds up toward 100%.
              </p> */}
            </div>

            {/* BOTTOM BAR: Master Password & Create Button */}
            <div className='mt-[21px] md:w-1/4 ml-auto px-[15px]'>
                <label className='text-sm  text-gray-700 block mb-[7px] whitespace-nowrap'>
                  Transaction Password:
                </label>
                <div className='relative w-full mb-[14px]'>
                  <input
                    type={showPassword3 ? 'text' : 'password'}
                    required
                    placeholder='Transaction Password'
                    className={`${inputClass} w-full`}
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

                <button
                  type='submit'
                  className='ml-auto flex rounded-sm bg-secondary px-[0.65624rem] py-[0.32810rem] text-sm text-white shadow hover:bg-secondary transition-colors'
                >
                  Create Account
                </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

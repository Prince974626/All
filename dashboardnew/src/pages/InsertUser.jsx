'use client';
import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addAdmin, getAdmin } from '../redux/reducer/authReducer';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';

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
    commition: '',
    balance: null,
    exposureLimit: null,
    creditReference: null,
    rollingCommission: null,
    partnership: null,
    phone: null,
    password: '',
    masterPassword: '',
    status: 'active',
    confirmPassword: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/[a-zA-Z]/.test(formData.userName)) {
      toast.error('Username must contain at least one letter.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Password and Confirm Password do not match');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      toast.error(
        'Password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one special character.'
      );
      return;
    }
    if (userInfo) {
      try {
        const result = await dispatch(addAdmin(formData)).unwrap();
        toast.success(result.message);
        dispatch(getAdmin());
        navigate('/user-download-list');
      } catch (error) {
        toast.error(error);
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <Navbar />
      <div className='p-1 px-[15px] md:px-5'>
        <div className='my-[13px]'>
          <div className='mx-auto'>
            <div className='add-account rounded-lg bg-white'>
              <div className='pb-2'>
                <span className='text-[26px]'>Add Account</span>
              </div>

              <form
                onSubmit={handleSubmit}
                className='py-3 font-semibold md:px-1'
              >
                <div className='flex gap-x-10'>
                  <div className='flex-1/2'>
                    <div className='bg-[#2c3e50] px-2 py-1 text-[16px] text-white'>
                      Personal Details
                    </div>
                    <div className='my-3 grid grid-cols-2 gap-x-5 gap-y-2'>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Client Name:
                        </span>
                        <input
                          type='text'
                          className='col-span-2 mt-1 w-full basis-full rounded-md rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm'
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              userName: e.target.value,
                            })
                          }
                          value={formData.userName}
                          placeholder='Add here'
                        />
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Full Name:
                        </span>
                        <input
                          type='text'
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          value={formData.name}
                          className='col-span-2 mt-1 w-full basis-full rounded-md rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm'
                          placeholder='Add here'
                        />
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Phone:
                        </span>
                        <input
                          type='text'
                          className='col-span-2 mt-1 w-full basis-full rounded-md rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm'
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          value={formData.phone}
                          placeholder='Add here'
                        />
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Password
                        </span>
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
                          className='col-span-2 mt-1 w-full basis-full rounded-md rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm'
                        />
                        <p className='mt-1 text-[11px] font-normal text-gray-500 leading-tight'>
                          Password must be 8+ chars with at least one uppercase letter, lowercase letter, number, and special character.
                        </p>
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Retype Password:
                        </span>
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
                          className='col-span-2 mt-1 w-full basis-full rounded-md rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm'
                        />
                      </div>
                    </div>
                  </div>
                  <div className='flex-1/2'>
                    <div className='bg-[#2c3e50] px-2 py-1 text-[16px] text-white'>
                      Account Details
                    </div>
                    <div className='my-3 grid grid-cols-2 gap-x-5 gap-y-2'>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Opening Balance:
                        </span>
                        <input
                          type='number'
                          className='col-span-2 mt-1 w-full basis-full rounded-md rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm'
                          onChange={(e) => {
                            const openingValue = e.target.value;
                            if (openingValue.includes('.')) {
                              toast.error(
                                'The bank balance must be an integer'
                              );
                              return;
                            }
                            setFormData({ ...formData, balance: openingValue });
                          }}
                          value={formData.balance}
                          placeholder='Add here'
                        />
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Exposure Limit:
                        </span>
                        <input
                          type='number'
                          className='col-span-2 mt-1 w-full basis-full rounded-md rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm'
                          onChange={(e) => {
                            const exposureValue = e.target.value;
                            if (exposureValue.includes('.')) {
                              return;
                            }
                            setFormData({
                              ...formData,
                              exposureLimit: exposureValue,
                            });
                          }}
                          value={formData.exposureLimit}
                          placeholder='Add here'
                        />
                      </div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Credit Reference:
                        </span>
                        <input
                          type='number'
                          className='col-span-2 mt-1 w-full basis-full rounded-md rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm'
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
                    </div>
                  </div>
                </div>

                <div className='flex gap-x-10'>
                  <div className='flex-1/2'></div>
                  <div className='flex-1/2'>
                    <div className='my-3 grid grid-cols-2 gap-x-5 gap-y-2'>
                      <div></div>
                      <div>
                        <span className='text-[14px] font-light text-[#1e1e1e]'>
                          Master Password:
                        </span>
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
                          className='col-span-2 mt-1 w-full basis-full rounded-md rounded-sm border border-gray-300 bg-white px-1.5 py-2.5 text-xs font-light md:basis-[75%] md:py-1.5 md:text-sm'
                        />
                        <div className='flex justify-end'>
                          <button className='mt-3 ml-auto w-[140px] rounded-md bg-[#0088cc] px-[10px] py-[5px] text-[14px] text-white'>
                            Create
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import Navbar from '../components/Navbar';
import { toast } from 'react-toastify';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { changePasswordBySubAdmin } from '../redux/reducer/authReducer';

const ChangePassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async () => {
    if (!formData.oldPassword) {
      toast.error('Please enter your current password.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Password not match.');
      return;
    }

    try {
      const result = await dispatch(
        changePasswordBySubAdmin({
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        })
      );

      if (result.type.endsWith('/fulfilled')) {
        toast.success(
          result.payload?.message || 'Password changed successfully'
        );
        const generatedPassword = result?.payload?.generatedMasterPassword;
        if (generatedPassword) {
          navigate('/transaction-password-success', {
            state: { masterPassword: generatedPassword },
          });
        }
        setFormData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else if (result.type.endsWith('/rejected')) {
        toast.error(result.payload || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    }
  };

  return (
    <>
      <Navbar />
      <div className='mx-[15px] my-[10px] bg-[#f9f9f9] p-2.5'>
        <div className='pb-3 text-[22px]'>Change Password</div>
        <div className='w-full max-w-md px-[15px] text-[14px]'>
          <div className='mb-[14px]'>
            <div className='mb-[7px]'>Current Password</div>
            <input
              type='password'
              autoComplete='current-password'
              className='h-[36px] w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-[6px]'
              value={formData.oldPassword}
              onChange={(e) =>
                setFormData({ ...formData, oldPassword: e.target.value })
              }
            />
          </div>
          {}
          <div className='mb-[14px]'>
            <div className='mb-[7px]'>New Password</div>
            <input
              type='password'
              autoComplete='new-password'
              className='h-[36px] w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-[6px]'
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
            />
          </div>
          <div className='mb-[14px]'>
            <div className='mb-[7px]'>Confirm New Password</div>
            <input
              type='password'
              autoComplete='new-password'
              className='h-[36px] w-full rounded-sm border border-[#ced4da] bg-white px-2.5 py-[6px]'
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
            />
          </div>
          <button
            type='button'
            className='ml-1 w-fit cursor-pointer rounded bg-[#0088cc] px-3 py-1.5 text-white'
            onClick={handleChangePassword}
          >
            Change Password
          </button>
        </div>
      </div>
    </>
  );
};

export default ChangePassword;

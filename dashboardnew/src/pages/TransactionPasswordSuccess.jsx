import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TransactionPasswordSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const generatedMasterPassword = location.state?.masterPassword;

  useEffect(() => {
    if (!generatedMasterPassword) {
      navigate('/user-download-list', { replace: true });
    }
  }, [generatedMasterPassword, navigate]);

  if (!generatedMasterPassword) return null;

  return (
    <div className='flex min-h-screen items-center justify-center bg-white px-3 py-6'>
      <div className='w-full max-w-[1200px] text-center'>
        <p className='text-[24px] leading-tight font-semibold text-green-700'>
          Success! Your password has been updated successfully.
        </p>
        <p className='mt-1 text-[24px] leading-tight font-semibold'>
          Your transaction password is{' '}
          <span className='text-[#58A9E6]'>{generatedMasterPassword}</span>.
        </p>
        <p className='mt-3 text-[20px] leading-tight'>
          Please remember this transaction password, from now all transaction of
          the website can be done only with this password and keep one thing in
          mind, do not share this password with anyone.
        </p>
        <p className='mt-3 text-[20px] leading-tight'>
          Thank you, Team jdbookbet.com
        </p>

        <div className='my-6 border-t border-gray-300' />

        <p className='text-[20px] leading-tight font-semibold text-green-700'>
          Success! आपका पासवर्ड बदल जा चुका है।
        </p>
        <p className='mt-1 text-[24px] leading-tight font-semibold'>
          आपका लेनदेन पासवर्ड{' '}
          <span className='text-[#58A9E6]'>{generatedMasterPassword}</span> है।
        </p>
        <p className='mt-3 text-[20px] leading-tight'>
          कृपया इस लेन-देन के पासवर्ड को याद रखें, अब से वेबसाइट के सभी
          हस्तांतरण केवल इस पासवर्ड से किए जा सकते हैं और एक बात का ध्यान रखे,
          इस पासवर्ड को किसी के साथ शेयर ना करें।
        </p>
        <p className='mt-3 text-[20px] leading-tight'>
          धन्यवाद, टीम jdbookbet.com
        </p>

        <div className='mt-6 flex justify-center'>
          <button
            type='button'
            onClick={() => navigate('/', { replace: true })}
            className='rounded bg-gray-800 px-10 py-2 text-white hover:bg-gray-900'
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionPasswordSuccess;

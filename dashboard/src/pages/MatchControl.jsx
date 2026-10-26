import { IoIosArrowDown } from 'react-icons/io';
import Navbar from '../components/Navbar';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../redux/api';
import { toast } from 'react-toastify';
import { resolveMediaUrl } from '../utils/mediaUrl';

const MatchList = ({
  matches,
  loading,
  error,
  sport,
  deactivatedMatches,
  togglingMatchId,
  onToggleMatch,
}) => {
  if (loading) {
    return (
      <div className='py-4 text-center text-sm text-gray-500'>
        Loading matches...
      </div>
    );
  }

  if (error) {
    return <div className='py-4 text-center text-sm text-red-500'>{error}</div>;
  }

  if (!matches.length) {
    return (
      <div className='py-4 text-center text-sm text-gray-500'>
        No matches found
      </div>
    );
  }

  // Group by title (Tournament)
  const grouped = matches.reduce((acc, m) => {
    const t = m.title || m.cname || 'Other';
    if (!acc[t]) acc[t] = [];
    acc[t].push(m);
    return acc;
  }, {});

  return (
    <div className='mt-2 flex flex-col gap-2'>
      {Object.entries(grouped).map(([tournamentName, tourMatches]) => {
        const isTournamentActive = !deactivatedMatches.has(
          String(tournamentName)
        );
        const isTournamentToggling = togglingMatchId === tournamentName;

        return (
          <div
            key={tournamentName}
            className='mb-2 overflow-hidden rounded-lg border border-gray-200'
          >
            <div className='flex items-center justify-between border-b border-gray-200 bg-gray-100 px-3 py-2'>
              <span className='font-bold text-gray-700'>{tournamentName}</span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMatch(tournamentName, tournamentName, sport, true);
                }}
                className={`relative flex h-[19px] min-w-[34px] cursor-pointer items-center rounded-full transition-colors ${isTournamentActive ? 'bg-green-500' : 'bg-gray-300'} ${isTournamentToggling ? 'pointer-events-none opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full bg-white transition-all ${isTournamentActive ? 'right-[2px]' : 'left-[2px]'}`}
                />
              </div>
            </div>

            {isTournamentActive && (
              <div className='bg-white px-2 pb-1'>
                {tourMatches.map((match) => {
                  const isActive = !deactivatedMatches.has(String(match.id));
                  const isToggling = togglingMatchId === match.id;

                  return (
                    <div
                      key={match.id}
                      className='flex items-center justify-between border-b border-gray-100 px-2 py-2 last:border-0 hover:bg-gray-50'
                    >
                      <span className='ml-2 text-sm font-medium text-gray-600'>
                        {match.match}
                        {(match.inplay || match.iplay) && (
                          <span className='ml-2 text-xs font-bold text-green-600'>
                            (In-Play)
                          </span>
                        )}
                      </span>

                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleMatch(match.id, match.match, sport, false);
                        }}
                        className={`relative flex h-[19px] min-w-[34px] cursor-pointer items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'} ${isToggling ? 'pointer-events-none opacity-50' : ''}`}
                      >
                        <span
                          className={`absolute top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full bg-white transition-all ${isActive ? 'right-[2px]' : 'left-[2px]'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const MatchControl = () => {
  const [activeTab, setActiveTab] = useState(null);
  const [cricketMatches, setCricketMatches] = useState([]);
  const [tennisMatches, setTennisMatches] = useState([]);
  const [soccerMatches, setSoccerMatches] = useState([]);
  const [horseRacingMatches, setHorseRacingMatches] = useState([]);

  const [deactivatedMatches, setDeactivatedMatches] = useState(new Set());
  const [togglingMatchId, setTogglingMatchId] = useState(null);
  const { userInfo } = useSelector((state) => state.auth);
  const isSuperAdmin =
    userInfo?.role === 'supperadmin' || userInfo?.role === 'superadmin';

  const [marqueeText, setMarqueeText] = useState('');
  const [loginPosterUrls, setLoginPosterUrls] = useState([]);
  const [loginPosterUrlsMobile, setLoginPosterUrlsMobile] = useState([]);
  const [desktopUrlDraft, setDesktopUrlDraft] = useState('');
  const [mobileUrlDraft, setMobileUrlDraft] = useState('');
  const [loginPosterEnabled, setLoginPosterEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPoster, setSavingPoster] = useState(false);

  const applyPosterSettings = (data) => {
    if (!data) return;
    const desktop = Array.isArray(data.loginPosterUrls)
      ? data.loginPosterUrls.filter(Boolean)
      : data.loginPosterUrl
        ? [data.loginPosterUrl]
        : [];
    const mobile = Array.isArray(data.loginPosterUrlsMobile)
      ? data.loginPosterUrlsMobile.filter(Boolean)
      : data.loginPosterUrlMobile
        ? [data.loginPosterUrlMobile]
        : [];
    setLoginPosterUrls(desktop);
    setLoginPosterUrlsMobile(mobile);
    if (data.loginPosterEnabled !== undefined) {
      setLoginPosterEnabled(data.loginPosterEnabled !== false);
    }
  };

  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const res = await api.get('/site-settings');
        if (res.data.success && res.data.data) {
          setMarqueeText(res.data.data.marqueeText || '');
          applyPosterSettings(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching site settings', err);
      }
    };
    fetchSiteSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await api.put('/update/site-settings', { marqueeText });
      if (res.data.success) {
        toast.success('Site settings updated successfully');
      } else {
        toast.error(res.data.message || 'Failed to update settings');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSavePoster = async () => {
    const desktop = [
      ...loginPosterUrls,
      ...(desktopUrlDraft.trim() ? [desktopUrlDraft.trim()] : []),
    ];
    const mobile = [
      ...loginPosterUrlsMobile,
      ...(mobileUrlDraft.trim() ? [mobileUrlDraft.trim()] : []),
    ];
    if (desktop.length === 0 && mobile.length === 0) {
      toast.error('Please upload or paste at least one poster image first');
      return;
    }
    setSavingPoster(true);
    try {
      const res = await api.put('/update/site-settings', {
        loginPosterUrls: desktop,
        loginPosterUrlsMobile: mobile,
        loginPosterEnabled,
      });
      if (res.data.success) {
        applyPosterSettings(res.data.data);
        setDesktopUrlDraft('');
        setMobileUrlDraft('');
        const saved = res.data.data || {};
        const savedCount =
          (saved.loginPosterUrls?.length || 0) +
          (saved.loginPosterUrlsMobile?.length || 0);
        if (savedCount === 0) {
          toast.error(
            'Save returned empty posters. Use a smaller image (under 2MB) and try again.'
          );
        } else {
          toast.success('Login posters updated successfully');
        }
      } else {
        toast.error(res.data.message || 'Failed to update posters');
      }
    } catch (err) {
      const status = err.response?.status;
      const msg =
        status === 413
          ? 'Image too large for server. Use a smaller image (under 2MB).'
          : err.response?.data?.message || 'Failed to update posters';
      toast.error(msg);
    } finally {
      setSavingPoster(false);
    }
  };

  const uploadPosterFiles = async (fileList, type) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;

    const tooLarge = files.find((file) => file.size > 5 * 1024 * 1024);
    if (tooLarge) {
      toast.error('Image is too large! Please upload a file smaller than 5MB.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('poster', file));
    formData.append('type', type);

    setSavingPoster(true);
    try {
      const res = await api.post(
        `/upload/login-poster?type=${encodeURIComponent(type)}`,
        formData
      );
      if (res.data.success) {
        applyPosterSettings(res.data.data);
        toast.success(
          files.length > 1
            ? `${files.length} ${type === 'mobile' ? 'mobile' : 'desktop'} posters uploaded`
            : `${type === 'mobile' ? 'Mobile' : 'Desktop'} poster uploaded and saved`
        );
      } else {
        toast.error(res.data.message || 'Failed to upload poster');
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to upload poster to server'
      );
    } finally {
      setSavingPoster(false);
    }
  };

  const handlePosterFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    uploadPosterFiles(files, 'desktop');
  };

  const handlePosterMobileFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    uploadPosterFiles(files, 'mobile');
  };

  const handleDeletePoster = async (type, url) => {
    setSavingPoster(true);
    try {
      const res = await api.delete('/site-settings/login-poster', {
        data: { type, url },
      });
      if (res.data.success) {
        applyPosterSettings(res.data.data);
        toast.success('Poster removed');
      } else {
        toast.error(res.data.message || 'Failed to delete poster');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        if (type === 'mobile') {
          setLoginPosterUrlsMobile((prev) => prev.filter((item) => item !== url));
        } else {
          setLoginPosterUrls((prev) => prev.filter((item) => item !== url));
        }
      } else {
        toast.error(err.response?.data?.message || 'Failed to delete poster');
      }
    } finally {
      setSavingPoster(false);
    }
  };

  const [loading, setLoading] = useState({
    cricket: false,
    tennis: false,
    soccer: false,
    'horse-racing': false,
  });

  const [errors, setErrors] = useState({
    cricket: null,
    tennis: null,
    soccer: null,
    'horse-racing': null,
  });

  useEffect(() => {
    const fetchDeactivatedMatches = async () => {
      try {
        const res = await api.get('/match-settings/deactivated', {
          params: { page: 1, limit: 10000 },
        });

        if (res.data.success) {
          const ids = new Set(
            res.data.data.matches.map((m) => String(m.matchId))
          );
          setDeactivatedMatches(ids);
        } else {
          console.warn(' Fetch response success is false:', res.data);
        }
      } catch (err) {
        console.error('Error fetching deactivated matches', err);
      }
    };

    fetchDeactivatedMatches();
  }, []);

  const fetchMatches = async (url, key, setter) => {
    setLoading((p) => ({ ...p, [key]: true }));
    setErrors((p) => ({ ...p, [key]: null }));

    try {
      const res = await api.get(url);
      if (res.data.success) {
        setter(res.data.data || res.data.matches || []);
      } else {
        setErrors((p) => ({ ...p, [key]: 'Failed to fetch matches' }));
      }
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [key]: err.response?.data?.message || 'Failed to fetch matches',
      }));
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  useEffect(() => {
    // includeDeactivated so blocked matches stay visible for re-enable
    fetchMatches(
      '/cricket/matches?includeDeactivated=1',
      'cricket',
      setCricketMatches
    );
    fetchMatches('/tennis?includeDeactivated=1', 'tennis', setTennisMatches);
    fetchMatches('/soccer?includeDeactivated=1', 'soccer', setSoccerMatches);
    // Horse racing returns venues with races, flatten for MatchList
    const fetchHorseRacing = async () => {
      setLoading((p) => ({ ...p, 'horse-racing': true }));
      setErrors((p) => ({ ...p, 'horse-racing': null }));
      try {
        const res = await api.get('/horse-racing?includeDeactivated=1');
        if (res.data.success) {
          const venues = res.data.data || [];
          const flat = [];
          venues.forEach((venue) => {
            (venue.races || []).forEach((race, i) => {
              flat.push({
                id: race.gmid,
                match: `${venue.ename} - R${i + 1}`,
                title: venue.ename,
                iplay: race.iplay,
              });
            });
          });
          setHorseRacingMatches(flat);
        }
      } catch (err) {
        setErrors((p) => ({
          ...p,
          'horse-racing': err.response?.data?.message || 'Failed to fetch',
        }));
      } finally {
        setLoading((p) => ({ ...p, 'horse-racing': false }));
      }
    };
    fetchHorseRacing();
  }, []);

  const handleToggleMatch = async (
    matchId,
    matchName,
    sport,
    isTournament = false
  ) => {
    if (togglingMatchId === matchId) return;
    setTogglingMatchId(matchId);

    try {
      const res = await api.patch(`/match-settings/${matchId}/toggle-active`, {
        sport,
        matchName,
        isTournament,
      });

      if (res.data.success) {
        setDeactivatedMatches((prev) => {
          const updated = new Set(prev);
          const id = String(matchId);
          res.data.data.isActive ? updated.delete(id) : updated.add(id);
          return updated;
        });

        toast.success(res.data.message);
      } else {
        toast.error(res.data.message || 'Toggle failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Toggle failed');
    } finally {
      setTogglingMatchId(null);
    }
  };

  const toggleTab = (tab) => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  return (
    <>
      <Navbar />

      <div className='mx-auto w-full md:max-w-250'>
        <div className='rounded-sm border border-gray-200 bg-white px-5 py-3'>
          {/* Site Announcement / Ticker — Super Admin only */}
          {isSuperAdmin && (
            <div className='mb-6 p-4 border border-gray-200 rounded bg-gray-50'>
              <h2 className='text-lg font-bold text-gray-700 mb-2'>
                Update Site Notice / Announcement
              </h2>
              <div className='flex flex-col gap-2 md:flex-row md:items-center'>
                <textarea
                  value={marqueeText}
                  onChange={(e) => setMarqueeText(e.target.value)}
                  placeholder='Enter site scrolling marquee note here...'
                  className='flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 h-[60px] md:h-[40px] text-sm'
                />
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-sm transition-colors disabled:opacity-50 flex-shrink-0'
                >
                  {savingSettings ? 'Saving...' : 'Update Note'}
                </button>
              </div>
            </div>
          )}

          {/* Super Admin Login Poster Management */}
          {isSuperAdmin && (
            <div className='mb-6 p-4 border border-blue-200 rounded bg-blue-50/50'>
              <h2 className='text-lg font-bold text-gray-800 mb-1 flex items-center justify-between'>
                <span>Login Poster / Promo Banner (Super Admin Only)</span>
                <label className='flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700'>
                  <input
                    type='checkbox'
                    checked={loginPosterEnabled}
                    onChange={(e) => setLoginPosterEnabled(e.target.checked)}
                    className='h-4 w-4 rounded accent-blue-600'
                  />
                  Enable Poster Popup
                </label>
              </h2>
              <p className='text-xs text-gray-500 mb-3'>
                Upload one or more images. Users see them one after another.
                Delete any image from the list. File upload saves immediately.
              </p>

              <div className='space-y-4'>
                {/* Desktop Version */}
                <div className='p-3 border border-gray-200 rounded bg-white/50'>
                  <h3 className='text-xs font-bold text-gray-700 uppercase mb-2 border-b pb-1'>
                    Desktop Version Poster
                  </h3>
                  <div className='space-y-3'>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>
                        Upload Image File
                      </label>
                      <p className='mb-1 text-[11px] text-blue-700'>
                        Suggested size: <strong>1627 × 915</strong> px (16:9
                        landscape). Max 5MB. PNG/JPG.
                      </p>
                      <input
                        type='file'
                        accept='image/*'
                        multiple
                        onChange={handlePosterFileUpload}
                        className='block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer'
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>
                        Or Image URL
                      </label>
                      <input
                        type='text'
                        value={desktopUrlDraft}
                        onChange={(e) => setDesktopUrlDraft(e.target.value)}
                        placeholder='https://example.com/poster.png or /uploads/posters/...'
                        className='w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500'
                      />
                    </div>
                    {loginPosterUrls.length > 0 && (
                      <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2'>
                        {loginPosterUrls.map((url, index) => (
                          <div
                            key={`${url}-${index}`}
                            className='rounded border border-gray-200 bg-white p-2 text-center'
                          >
                            <div className='mb-1 flex items-center justify-between'>
                              <p className='text-xs font-bold text-gray-600'>
                                Desktop {index + 1}
                              </p>
                              <button
                                type='button'
                                onClick={() => handleDeletePoster('desktop', url)}
                                disabled={savingPoster}
                                className='rounded bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50'
                              >
                                Delete
                              </button>
                            </div>
                            <img
                              src={resolveMediaUrl(url)}
                              alt={`Desktop poster ${index + 1}`}
                              className='mx-auto max-h-[160px] rounded object-contain'
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Version */}
                <div className='p-3 border border-gray-200 rounded bg-white/50'>
                  <h3 className='text-xs font-bold text-gray-700 uppercase mb-2 border-b pb-1'>
                    Mobile Version Poster
                  </h3>
                  <div className='space-y-3'>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>
                        Upload Image File
                      </label>
                      <p className='mb-1 text-[11px] text-blue-700'>
                        Suggested size: <strong>515 × 915</strong> px (9:16
                        portrait). Max 5MB. PNG/JPG.
                      </p>
                      <input
                        type='file'
                        accept='image/*'
                        multiple
                        onChange={handlePosterMobileFileUpload}
                        className='block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer'
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-semibold text-gray-600 mb-1'>
                        Or Image URL
                      </label>
                      <input
                        type='text'
                        value={mobileUrlDraft}
                        onChange={(e) => setMobileUrlDraft(e.target.value)}
                        placeholder='https://example.com/poster-mobile.png or /uploads/posters/...'
                        className='w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500'
                      />
                    </div>
                    {loginPosterUrlsMobile.length > 0 && (
                      <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2'>
                        {loginPosterUrlsMobile.map((url, index) => (
                          <div
                            key={`${url}-${index}`}
                            className='rounded border border-gray-200 bg-white p-2 text-center'
                          >
                            <div className='mb-1 flex items-center justify-between'>
                              <p className='text-xs font-bold text-gray-600'>
                                Mobile {index + 1}
                              </p>
                              <button
                                type='button'
                                onClick={() => handleDeletePoster('mobile', url)}
                                disabled={savingPoster}
                                className='rounded bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50'
                              >
                                Delete
                              </button>
                            </div>
                            <img
                              src={resolveMediaUrl(url)}
                              alt={`Mobile poster ${index + 1}`}
                              className='mx-auto max-h-[160px] rounded object-contain'
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className='pt-1'>
                  <button
                    onClick={handleSavePoster}
                    disabled={savingPoster}
                    className='px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-sm transition-colors disabled:opacity-50'
                  >
                    {savingPoster ? 'Saving Posters...' : 'Save Login Posters'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            onClick={() => toggleTab('cricket')}
            className='section-header bg-dark mb-2 flex items-center justify-between px-2 py-1 font-bold text-white'
          >
            Cricket
            <IoIosArrowDown
              className={activeTab === 'cricket' ? 'rotate-180' : ''}
            />
          </div>

          {activeTab === 'cricket' && (
            <MatchList
              matches={cricketMatches}
              loading={loading.cricket}
              error={errors.cricket}
              sport='cricket'
              deactivatedMatches={deactivatedMatches}
              togglingMatchId={togglingMatchId}
              onToggleMatch={handleToggleMatch}
            />
          )}

          <div
            onClick={() => toggleTab('tennis')}
            className='section-header bg-dark mb-2 flex items-center justify-between px-2 py-1 font-bold text-white'
          >
            Tennis
            <IoIosArrowDown
              className={activeTab === 'tennis' ? 'rotate-180' : ''}
            />
          </div>

          {activeTab === 'tennis' && (
            <MatchList
              matches={tennisMatches}
              loading={loading.tennis}
              error={errors.tennis}
              sport='tennis'
              deactivatedMatches={deactivatedMatches}
              togglingMatchId={togglingMatchId}
              onToggleMatch={handleToggleMatch}
            />
          )}

          <div
            onClick={() => toggleTab('soccer')}
            className='section-header bg-dark flex items-center justify-between px-2 py-1 font-bold text-white'
          >
            Soccer
            <IoIosArrowDown
              className={activeTab === 'soccer' ? 'rotate-180' : ''}
            />
          </div>

          {activeTab === 'soccer' && (
            <MatchList
              matches={soccerMatches}
              loading={loading.soccer}
              error={errors.soccer}
              sport='soccer'
              deactivatedMatches={deactivatedMatches}
              togglingMatchId={togglingMatchId}
              onToggleMatch={handleToggleMatch}
            />
          )}

          {/* <div
            onClick={() => toggleTab('horse-racing')}
            className='section-header bg-dark mt-2 mb-2 flex items-center justify-between px-2 py-1 font-bold text-white'
          >
            Horse Racing
            <IoIosArrowDown
              className={activeTab === 'horse-racing' ? 'rotate-180' : ''}
            />
          </div> */}

          {activeTab === 'horse-racing' && (
            <MatchList
              matches={horseRacingMatches}
              loading={loading['horse-racing']}
              error={errors['horse-racing']}
              sport='horse-racing'
              deactivatedMatches={deactivatedMatches}
              togglingMatchId={togglingMatchId}
              onToggleMatch={handleToggleMatch}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default MatchControl;

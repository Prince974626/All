import { useState, useEffect } from 'react';
import { FaRegPlusSquare, FaRegMinusSquare } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCricketData } from '../redux/reducer/cricketSlice';
import { fetchSoccerData } from '../redux/reducer/soccerSlice';
import { fetchTennisData } from '../redux/reducer/tennisSlice';

function SportsSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { matches: cricketMatches } = useSelector((state) => state.cricket);
  const { matches: tennisMatches } = useSelector((state) => state.tennis);
  const { matches: soccerMatches } = useSelector((state) => state.soccer);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCricketData());
      dispatch(fetchTennisData());
      dispatch(fetchSoccerData());
    }
  }, [dispatch, isOpen]);

  const [expandedItems, setExpandedItems] = useState(new Set(['allSports']));

  const toggleItem = (itemId) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isExpanded = (itemId) => expandedItems.has(itemId);

  const groupMatchesByTitle = (matches) => {
    if (!matches || matches.length === 0) return {};
    return matches.reduce((acc, match) => {
      const title = match.title || 'Other';
      if (!acc[title]) {
        acc[title] = [];
      }
      acc[title].push(match);
      return acc;
    }, {});
  };

  const groupedCricket = groupMatchesByTitle(cricketMatches);
  const groupedTennis = groupMatchesByTitle(tennisMatches);
  const groupedSoccer = groupMatchesByTitle(soccerMatches);

  const allSportsList = [
    'Virtual sports',
    'Motor Sports',
    'Baseball',
    'Rugby Union',
    'Darts',
    'American Football',
    'Soccer',
    'Esports',
    'Boat Racing',
    'Wrestling',
    'Table Tennis',
    'Badminton',
    'Esoccer',
    'Basketball',
    'Volleyball',
    'Snooker',
    'Ice Hockey',
    'E Games',
    'Futsal',
    'Handball',
    'Kabaddi',
    'Golf',
    'Rugby League',
    'Boxing',
    'Beach Volleyball',
    'Mixed Martial Arts',
    'MotoGP',
    'Chess',
    'Cycling',
    'Motorbikes',
    'Athletics',
    'Basketball 3X3',
    'Sumo',
  ];

  const createTitleKey = (sportKey, title) => {
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sportKey}-${safeTitle}`;
  };

  const ToggleIcon = ({ expanded }) =>
    expanded ? (
      <FaRegMinusSquare className='inline flex-shrink-0 text-xs' />
    ) : (
      <FaRegPlusSquare className='inline flex-shrink-0 text-xs' />
    );

  const TreeNode = ({ children }) => (
    <div className='sports-tree-node'>
      {children}
      {/* {isLast && <span className='sports-tree-vline' />} */}
    </div>
  );

  const renderSportSection = (
    sportName,
    groupedData,
    sportKey,
    routePrefix,
    isLast
  ) => {
    // console.log('renderSportSection:', { sportName, groupedData, sportKey });
    const titles = Object.keys(groupedData);
    const hasData = titles.length > 0;

    return (
      <>
        <button
          onClick={() => toggleItem(sportKey)}
          className='flex w-full cursor-pointer items-center gap-1.5 py-1.5 text-[#333] hover:text-[#0088cc]'
        >
          {sportName} <ToggleIcon expanded={isExpanded(sportKey)} />
        </button>
        {isExpanded(sportKey) && hasData && (
          <div className='sports-tree'>
            {titles.map((title, idx) => {
              const titleKey = createTitleKey(sportKey, title);
              const matches = groupedData[title];
              const isTitleLast = idx === titles.length - 1;

              return (
                <TreeNode key={titleKey} isLast={isTitleLast}>
                  <button
                    onClick={() => toggleItem(titleKey)}
                    className='flex w-full cursor-pointer items-center gap-1.5 py-[5px] text-[#333] hover:text-[#0088cc]'
                  >
                    <span className='text-left'>{title}</span>{' '}
                    <ToggleIcon expanded={isExpanded(titleKey)} />
                  </button>
                  {isExpanded(titleKey) && matches && matches.length > 0 && (
                    <div className='sports-tree'>
                      {matches.map((match, mIdx) => (
                        <TreeNode
                          key={match.id}
                          isLast={mIdx === matches.length - 1}
                        >
                          <a
                            href='#'
                            className='block py-1 text-[#333] transition-colors hover:text-[#0088cc]'
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(
                                `${routePrefix}/${match.title}/${match.game}/${match.id}`
                              );
                              onClose();
                            }}
                          >
                            {match.game}
                          </a>
                        </TreeNode>
                      ))}
                    </div>
                  )}
                </TreeNode>
              );
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* {isOpen && (
        <div className='fixed inset-0 z-40 bg-black/50' onClick={onClose} />
      )} */}

      <aside
        className={`fixed top-[52px] left-0 z-50 h-[calc(100vh-52px)] w-[300px] transform bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } overflow-y-auto`}
      >
        <div className='flex items-center justify-between px-3 py-[5px] leading-none'>
          <span className='text-[28px]'>Sports</span>
          <IoMdClose
            className='cursor-pointer text-2xl hover:opacity-80'
            onClick={onClose}
          />
        </div>

        <div className='pl-4 text-[12px]'>
          {/* Politics */}
          <>
            <button
              onClick={() => toggleItem('politics')}
              className='flex w-full cursor-pointer items-center gap-1.5 py-[5px] text-[#333] hover:text-[#0088cc]'
            >
              Politics <ToggleIcon expanded={isExpanded('politics')} />
            </button>
            {isExpanded('politics') && (
              <div className='sports-tree'>
                {/* Will be populated from API */}
              </div>
            )}
          </>

          {/* Cricket */}
          {renderSportSection(
            'Cricket',
            groupedCricket,
            'cricket',
            '/cricket-bet',
            false
          )}

          {/* Football */}
          {renderSportSection(
            'Football',
            groupedSoccer,
            'football',
            '/soccerbet',
            false
          )}

          {/* Tennis */}
          {renderSportSection(
            'Tennis',
            groupedTennis,
            'tennis',
            '/tennis-bet',
            false
          )}

          {/* Other sports */}
          {allSportsList.map((sportName, idx) => {
            const sportKey = `sport-${sportName.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const isLast = idx === allSportsList.length - 1;
            return (
              <>
                <button
                  onClick={() => toggleItem(sportKey)}
                  className='flex w-full cursor-pointer items-center gap-1.5 py-1.5 text-[#333] hover:text-[#0088cc]'
                >
                  {sportName} <ToggleIcon expanded={isExpanded(sportKey)} />
                </button>
                {isExpanded(sportKey) && (
                  <div className='sports-tree'>{/* Sub-items from API */}</div>
                )}
              </>
            );
          })}
        </div>
      </aside>
    </>
  );
}

export default SportsSidebar;

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import './App.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Userlist from './pages/Userlist';
import MyAccount from './pages/MyAccount';
import Security from './pages/Security';
import EventPL from './pages/EventPL';
import DownPL from './pages/DownPL';
import BetList from './pages/BetList';
import UserWinLoss from './pages/UserWinLoss';
import TotalProfitLoss from './pages/TotalProfitLoss';
import CasinoResultReport from './pages/CasinoResultReport';
import RegisterDetail from './pages/RegisterDetail';
import AccountStatement from './pages/AccountStatement';
import ProfitLoss from './pages/ProfitLoss';
import GeneralReport from './pages/GeneralReport';
import MyMarket from './pages/MyMarket';
import Banking from './pages/Banking';
import Commision from './pages/Commision';
import PasswordHistory from './pages/PasswordHistory';
import RestoreUser from './pages/RestoreUser';
import MatchControl from './pages/MatchControl';
import ResultControl from './pages/resultControl';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AgentLIst from './pages/AgentLIst';
import PrivateRoute from './components/PrivateRoute';
import MasterBanking from './pages/MasterBanking';
import UserProfile from './pages/UserProfile';
import EventPLteams from './pages/EventPLteams';
import EventPLmaster from './pages/EventPLmaster';
import EventPLuser from './pages/EventPLuser';
import UserBetHistory from './pages/UserBetHistory';
import DownPLteam from './pages/DownPLteam';
import UserProfitLossByEvent from './pages/UserProfitLossByEvent';
import UserPLByMarket from './pages/UserPLByMarket';
import Cricketbet from './pages/Cricketbet';
import Tennisbet from './pages/Tennisbet';
import Soccerbet from './pages/Soccerbet';
import CasinoBet from './pages/CasinoBet';
import HorseRacingbet from './pages/HorseRacingbet';
import InsertUser from './pages/InsertUser';
import InsertAgent from './pages/InsertAgent';
import LiveCasino from './pages/LiveCasino';
import TransactionPasswordSuccess from './pages/TransactionPasswordSuccess';
import ChangePassword from './pages/ChangePassword';

function App() {
  return (
    <>
      <Router>
        <div className='flex h-screen flex-col'>
          <div className='relative'>
            <div className='w-full'>
              <Routes>
                <Route path='/' element={<Login />} />
                <Route path='/' element={<PrivateRoute />}>
                  <Route path='/home' element={<Home />} />
                  <Route path='/user-download-list' element={<Userlist />} />
                  <Route
                    path='/user-download-list/insertuser'
                    element={<InsertUser />}
                  />
                  <Route path='/agent-download-list' element={<AgentLIst />} />
                  <Route
                    path='/agent-download-list/insertagent'
                    element={<InsertAgent />}
                  />
                  <Route path='/my-account' element={<MyAccount />} />
                  <Route path='/secureauth' element={<Security />} />
                  <Route path='/eventpl' element={<EventPL />} />
                  <Route
                    path='/eventplteams/:gameName'
                    element={<EventPLteams />}
                  />
                  <Route
                    path='/userplyevent/:gameName/:id'
                    element={<UserProfitLossByEvent />}
                  />
                  <Route
                    path='/eventplmaster/:eventName'
                    element={<EventPLmaster />}
                  />
                  <Route
                    path='/userplbymarket/:eventName/:id'
                    element={<UserPLByMarket />}
                  />
                  <Route
                    path='/eventpluser/:marketName'
                    element={<EventPLuser />}
                  />
                  <Route
                    path='/userbethistory/:userName'
                    element={<UserBetHistory />}
                  />
                  <Route path='/downpl' element={<DownPL />} />
                  <Route path='/downplteam/:id' element={<DownPLteam />} />
                  <Route path='/betlist' element={<BetList />} />
                  <Route path='/UserWinLoss' element={<UserWinLoss />} />
                  <Route path='/ChangePassword' element={<ChangePassword />} />
                  <Route
                    path='/TotalProfitLoss'
                    element={<TotalProfitLoss />}
                  />
                  <Route path='/ProfitLoss' element={<ProfitLoss />} />
                  <Route
                    path='/AccountStatement'
                    element={<AccountStatement />}
                  />
                  <Route path='/RegisterDetail' element={<RegisterDetail />} />
                  <Route
                    path='/CasinoResultReport'
                    element={<CasinoResultReport />}
                  />
                  <Route path='/GeneralReport' element={<GeneralReport />} />
                  <Route path='/my-market' element={<MyMarket />} />
                  <Route path='/banking' element={<Banking />} />
                  <Route path='/master-banking' element={<MasterBanking />} />
                  <Route path='/commission' element={<Commision />} />
                  <Route path='/online-user/:id' element={<UserProfile />} />
                  <Route
                    path='/password-history'
                    element={<PasswordHistory />}
                  />
                  <Route path='/restore-user' element={<RestoreUser />} />
                  <Route path='/match-control' element={<MatchControl />} />
                  <Route path='/result-control' element={<ResultControl />} />
                  <Route
                    path='/cricket-bet/:gameTitle/:gameName/:gameid'
                    element={<Cricketbet />}
                  />
                  <Route
                    path='/tennis-bet/:gameTitle/:gameName/:gameid'
                    element={<Tennisbet />}
                  />
                  <Route
                    path='/soccerbet/:gameTitle/:gameName/:gameid'
                    element={<Soccerbet />}
                  />
                  <Route path='/live-casino' element={<LiveCasino />} />
                  <Route
                    path='/transaction-password-success'
                    element={<TransactionPasswordSuccess />}
                  />
                  <Route path='/casino-bet/:gameid' element={<CasinoBet />} />
                  <Route
                    path='/horse-racing-bet/:gameid'
                    element={<HorseRacingbet />}
                  />
                </Route>
              </Routes>
            </div>
          </div>
        </div>
        <ToastContainer
          position='top-right'
          autoClose={800}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick={true}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme='colored'
        />
      </Router>
    </>
  );
}

export default App;

//Singleton Pattern to create a single instance of the Websocket
import { host } from '../redux/api';
import {
  getUser,
  updateAvbalance,
  updateExposure,
} from '../redux/reducer/authReducer';
import {
  applyOpenBetsUpdate,
  updateCashoutValues,
} from '../redux/reducer/betReducer';
import { fetchCricketData } from '../redux/reducer/cricketSlice';
import { fetchSoccerData } from '../redux/reducer/soccerSlice';
import { fetchTennisData } from '../redux/reducer/tennisSlice';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.currentUserId = null;
    this.dispatch = null;
  }

  refreshMatchLists(dispatch) {
    const d = dispatch || this.dispatch;
    if (!d) return;
    d(fetchCricketData());
    d(fetchTennisData());
    d(fetchSoccerData());
  }

  connect(dispatch, userId = null) {
    const nextUserId = userId ? String(userId) : localStorage.getItem('userId');
    this.currentUserId = nextUserId;
    if (dispatch) this.dispatch = dispatch;

    if (this.socket) {
      if (nextUserId && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({ type: 'register', userId: nextUserId })
        );
      }
      return;
    }

    this.socket = new WebSocket(host);

    this.socket.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('WebSocket connected, userId:', this.currentUserId);

      // Register userId so backend can send targeted updates (balance, exposure, open bets, cashout)
      if (this.currentUserId && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({ type: 'register', userId: this.currentUserId })
        );
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const isCurrentUser =
          !data.userId || String(data.userId) === String(this.currentUserId);

        if (data.type === 'balance_update' && isCurrentUser) {
          dispatch(updateAvbalance(data.newBalance));
        }

        if (data.type === 'user_refresh_needed' && isCurrentUser) {
          dispatch(getUser());
        }

        if (data.type === 'exposure_update' && isCurrentUser) {
          dispatch(updateExposure(data.newExposure));
        }

        if (data.type === 'open_bets_update' && isCurrentUser) {
          const refresh = this.dispatch || dispatch;
          if (refresh) refresh(applyOpenBetsUpdate(data));
        }

        if (data.type === 'cashout_update') {
          if (data.userId === this.currentUserId) {
            dispatch(updateCashoutValues(data.bets));
          }
        }

        // Match Control block/unblock — refresh sport lists immediately
        if (data.type === 'match_visibility_update') {
          this.refreshMatchLists(dispatch);
        }
      } catch (error) {
        console.error(' WebSocket Error:', error);
      }
    };

    this.socket.onclose = () => {
      this.isConnected = false;
      this.socket = null;
      this.tryReconnect(dispatch);
    };

    this.socket.onerror = (error) => {
      console.error(
        '%c WebSocket Error',
        'background: #f44336; color: white; padding: 2px;',
        error
      );
    };
  }

  // Subscribe to a game with userId
  subscribe(gameid, apitype = 'cricket', roundId = null) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe',
        gameid: gameid,
        apitype: apitype,
        roundId: roundId,
        userId: this.currentUserId,
      };
      this.socket.send(JSON.stringify(message));
      console.log('Subscribed to:', gameid, 'with userId:', this.currentUserId);
    } else {
      console.warn('WebSocket not ready, cannot subscribe');
    }
  }

  // Update current userId (useful when user logs in)
  setUserId(userId) {
    this.currentUserId = userId;
    // Re-register with backend if already connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN && userId) {
      this.socket.send(JSON.stringify({ type: 'register', userId }));
    }
  }

  tryReconnect(dispatch) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(` Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(dispatch, this.currentUserId), 3000);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Create a single instance
export const wsService = new WebSocketService();

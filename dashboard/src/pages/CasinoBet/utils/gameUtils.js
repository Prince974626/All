import { TWO_PLAYER_GAMES } from '../constants';

/**
 * Check if game should show only two players
 */
export const shouldShowOnlyTwoPlayers = (gameId) => {
  return TWO_PLAYER_GAMES.includes(gameId);
};

/**
 * Get chart data for baccarat statistics
 */
export const getBaccaratChartData = (resultData) => {
  const g = resultData?.g;
  return [
    { name: 'player', y: parseFloat(g?.p || 0), color: '#428bca' },
    { name: 'banker', y: parseFloat(g?.b || 0), color: '#d9534f' },
    { name: 'Tie', y: parseFloat(g?.t || 0), color: '#5cb85c' },
  ];
};

/**
 * Get Highcharts configuration for baccarat pie chart
 */
export const getBaccaratChartOptions = (chartData) => ({
  chart: {
    type: 'pie',
    options3d: { enabled: true, alpha: 35, depth: 50 },
    backgroundColor: 'transparent',
    animation: false,
    height: '300',
  },
  title: {
    text: null,
  },
  credits: {
    enabled: false,
  },
  plotOptions: {
    pie: {
      depth: 45,
      startAngle: -85,
      endAngle: 450,
      center: ['50%', '50%'],
      dataLabels: {
        enabled: true,
        distance: -40,
        formatter: function () {
          return this.y > 0 ? this.y : null;
        },
        style: {
          color: '#fff',
          fontWeight: 'bold',
          textOutline: 'none',
          fontSize: '14px',
        },
      },
    },
  },
  tooltip: { enabled: true },
  series: [
    {
      type: 'pie',
      animation: false,
      data: chartData,
    },
  ],
});

const CASINO_TV_BASE_URL =
  import.meta.env.VITE_CASINO_TV_BASE_URL || 'https://81habibi.com/api/v1';
const CASINO_TV_KEY =
  import.meta.env.VITE_CASINO_TV_KEY ||
  import.meta.env.VITE_LIVE_STREAM_KEY_NEW ||
  '';
const CASINO_API_CHANGE=import.meta.env.VITE_CASINO_API_CHANGE || false;
/**
 * Get video stream URL for a game
 */
export const getVideoStreamUrl = (gameid) => {
  if (!gameid) return '';
  if(CASINO_API_CHANGE){
    return `${CASINO_TV_BASE_URL}/casino-stream?id=${gameid}`;
  }
  return `${CASINO_TV_BASE_URL}/casino-tv?gmid=${gameid}&key=${CASINO_TV_KEY}`;
};


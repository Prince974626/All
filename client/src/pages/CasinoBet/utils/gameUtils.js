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
    { name: 'Player', y: parseFloat(g?.p || 0), color: '#2f7ed8' },
    { name: 'Banker', y: parseFloat(g?.b || 0), color: '#c0392b' },
    { name: 'Tie', y: parseFloat(g?.t || 0), color: '#4ba82e' },
  ];
};

/**
 * Get Highcharts configuration for baccarat pie chart
 */
export const getBaccaratChartOptions = (chartData) => ({
  chart: {
    options3d: {
      enabled: true,
      alpha: 45,
      beta: 0,
    },
    type: 'pie',
    animation: false,
    height: 200,
    spacing: [10, 10, 10, 10],
  },
  title: {
    text: 'Statistics',
    align: 'center',
    style: {
      color: '#000',
      fontSize: '20px',
      fontWeight: 'normal',
    },
  },
  credits: {
    enabled: false,
  },
  legend: {
    enabled: true,
    layout: 'vertical',
    align: 'right',
    verticalAlign: 'top',
    x: 0,
    y: 20,
    itemStyle: {
      color: '#333333',
      fontWeight: '500',
      fontSize: '10px',
    },
    symbolRadius: 5,
    symbolHeight: 8,
    symbolWidth: 8,
  },
  plotOptions: {
    pie: {
      depth: 20,
      startAngle: 10,
      endAngle: 500,
      center: ['40px', '65%'],
      size: '110px',
      showInLegend: true,
      dataLabels: {
        enabled: true,
        distance: -30,
        format: '{point.percentage:.0f}%',
        filter: {
          property: 'percentage',
          operator: '>',
          value: 0,
        },
        style: {
          color: '#ffffff',
          fontWeight: '400',
          textOutline: 'none',
          fontSize: '13px',
        },
      },
    },
  },
  tooltip: {
    pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>',
  },
  series: [
    {
      name: 'Share',
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
const CASINO_API_CHANGE = import.meta.env.VITE_CASINO_API_CHANGE || false;

/**
 * Casino video stream URL — same as dashboard.
 * Uses VITE_CASINO_TV_BASE_URL + VITE_CASINO_API_CHANGE / VITE_CASINO_TV_KEY.
 */
export const getVideoStreamUrl = (gameid) => {
  if (!gameid) return '';
  if (CASINO_API_CHANGE) {
    return `${CASINO_TV_BASE_URL}/casino-stream?id=${gameid}`;
  }
  return `${CASINO_TV_BASE_URL}/casino-tv?gmid=${gameid}&key=${CASINO_TV_KEY}`;
};

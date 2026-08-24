import type { Position, Asset, ClosedTrade } from '../types';

export const samplePositions: Position[] = [
  { id: 1, symbol: 'BTC/USD', price: '67,234.50', amount: '0.25', entry: '65,100.00', account: 'Binance', unrealizedPnl: 375.00 },
  { id: 2, symbol: 'ETH/USD', price: '3,521.80', amount: '2.0', entry: '3,620.00', account: 'Bybit', unrealizedPnl: -120.00 },
  { id: 3, symbol: 'SOL/USD', price: '145.20', amount: '15', entry: '138.50', account: 'OKX', unrealizedPnl: 100.50 },
];

export const sampleAssets: Asset[] = [
  { asset: 'BTC', amount: 0.85, avgEntry: 64200, currentPrice: 67234.50, value: 57149.33, pnl: 2579.33 },
  { asset: 'ETH', amount: 12.5, avgEntry: 3450, currentPrice: 3521.80, value: 44022.50, pnl: 897.50 },
  { asset: 'SOL', amount: 50, avgEntry: 132, currentPrice: 145.20, value: 7260, pnl: 660 },
];

export const sampleClosedTrades: ClosedTrade[] = [
  // Spread across last 30 days for realistic chart data
  { id: 1, symbol: 'SOL/USD', dir: 'Long', size: '10', holdTime: '2h 15m', date: '2026-06-25', entry: 140, exit: 160, realisedPnl: 200, rMultiple: 2.5 },
  { id: 2, symbol: 'AVAX/USD', dir: 'Short', size: '50', holdTime: '1h 30m', date: '2026-06-25', entry: 38, exit: 37, realisedPnl: -50, rMultiple: -0.8 },
  { id: 3, symbol: 'BTC/USD', dir: 'Long', size: '0.1', holdTime: '4h 20m', date: '2026-06-27', entry: 66000, exit: 69500, realisedPnl: 350, rMultiple: 3.0 },
  { id: 4, symbol: 'ETH/USD', dir: 'Short', size: '1.5', holdTime: '6h 00m', date: '2026-06-28', entry: 3550, exit: 3430, realisedPnl: 180, rMultiple: 2.0 },
  { id: 5, symbol: 'DOGE/USD', dir: 'Long', size: '5000', holdTime: '45m', date: '2026-06-28', entry: 0.128, exit: 0.122, realisedPnl: -30, rMultiple: -0.5 },
  { id: 6, symbol: 'LINK/USD', dir: 'Long', size: '100', holdTime: '3h 10m', date: '2026-06-30', entry: 14.5, exit: 15.8, realisedPnl: 130, rMultiple: 1.8 },
  { id: 7, symbol: 'BTC/USD', dir: 'Short', size: '0.05', holdTime: '2h 00m', date: '2026-07-02', entry: 67800, exit: 67100, realisedPnl: 35, rMultiple: 0.6 },
  { id: 8, symbol: 'ETH/USD', dir: 'Long', size: '3', holdTime: '1h 45m', date: '2026-07-03', entry: 3400, exit: 3380, realisedPnl: -60, rMultiple: -1.2 },
  { id: 9, symbol: 'SOL/USD', dir: 'Short', size: '20', holdTime: '5h 30m', date: '2026-07-05', entry: 148, exit: 142, realisedPnl: 120, rMultiple: 1.5 },
  { id: 10, symbol: 'AVAX/USD', dir: 'Long', size: '80', holdTime: '2h 40m', date: '2026-07-07', entry: 36.5, exit: 38.2, realisedPnl: 136, rMultiple: 2.2 },
  { id: 11, symbol: 'DOGE/USD', dir: 'Short', size: '10000', holdTime: '1h 20m', date: '2026-07-09', entry: 0.135, exit: 0.128, realisedPnl: 70, rMultiple: 1.1 },
  { id: 12, symbol: 'LINK/USD', dir: 'Short', size: '50', holdTime: '3h 45m', date: '2026-07-12', entry: 15.2, exit: 16.1, realisedPnl: -45, rMultiple: -0.7 },
  { id: 13, symbol: 'BTC/USD', dir: 'Long', size: '0.2', holdTime: '7h 15m', date: '2026-07-14', entry: 65200, exit: 67100, realisedPnl: 380, rMultiple: 2.8 },
  { id: 14, symbol: 'ETH/USD', dir: 'Long', size: '2.5', holdTime: '4h 00m', date: '2026-07-16', entry: 3490, exit: 3580, realisedPnl: 225, rMultiple: 2.4 },
  { id: 15, symbol: 'SOL/USD', dir: 'Long', size: '12', holdTime: '3h 20m', date: '2026-07-18', entry: 144, exit: 141, realisedPnl: -36, rMultiple: -0.6 },
  { id: 16, symbol: 'AVAX/USD', dir: 'Short', size: '60', holdTime: '5h 00m', date: '2026-07-20', entry: 39.5, exit: 37.8, realisedPnl: 102, rMultiple: 1.6 },
];

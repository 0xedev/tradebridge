/**
 * Core type definitions for TradeBridge
 */

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderStatus = 'PENDING' | 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';
export type SignalDirection = 'BUY' | 'SELL' | 'HOLD';
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
export type AssetClass = 'CRYPTO' | 'FOREX' | 'STOCKS' | 'COMMODITIES' | 'PREDICTION_MARKETS';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  symbol: string;
  exchange: string;
  timeframe: Timeframe;
  candles: Candle[];
  timestamp: number;
}

export interface Signal {
  direction: SignalDirection;
  conviction: number; // 0-1
  stopLoss?: number;
  takeProfit?: number;
  metadata?: Record<string, any>;
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  status: OrderStatus;
  filled: number;
  remaining: number;
  timestamp: number;
  executedPrice?: number;
}

export interface Position {
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  timestamp: number;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  equity: number;
  marginUsed: number;
  marginAvailable: number;
  positions: Position[];
  openOrders: Order[];
}

export interface StrategyConfig {
  name: string;
  enabled: boolean;
  symbols: string[];
  timeframes: Timeframe[];
  weight: number; // For conviction scoring
  parameters: Record<string, any>;
}

export interface RiskConfig {
  maxDailyLossPercent: number;
  maxDrawdownPercent: number;
  positionSizePercent: number;
  maxPositionSize: number;
  maxConsecutiveLosses: number;
  stopLossType: 'FIXED' | 'ATR' | 'TRAILING';
  stopLossValue: number;
}

export interface TradingConfig {
  paperTrading: boolean;
  initialCapital: number;
  enabledStrategies: string[];
  symbols: string[];
  timeframes: Timeframe[];
  risk: RiskConfig;
}

/**
 * Exchange Interface
 * Abstraction layer for all exchange/broker integrations
 */

import { Order, Position, Account, Candle, Timeframe } from '../types/index.js';

export interface ExchangeInterface {
  /**
   * Get exchange name
   */
  getName(): string;

  /**
   * Initialize connection to exchange
   */
  connect(): Promise<void>;

  /**
   * Disconnect from exchange
   */
  disconnect(): Promise<void>;

  /**
   * Fetch historical candles
   */
  fetchCandles(
    symbol: string,
    timeframe: Timeframe,
    since?: number,
    limit?: number
  ): Promise<Candle[]>;

  /**
   * Subscribe to real-time market data
   */
  subscribeToMarketData(symbol: string, timeframe: Timeframe): Promise<void>;

  /**
   * Place a new order
   */
  placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    quantity: number,
    price?: number
  ): Promise<Order>;

  /**
   * Cancel an existing order
   */
  cancelOrder(orderId: string, symbol: string): Promise<void>;

  /**
   * Get account information
   */
  getAccount(): Promise<Account>;

  /**
   * Get all open positions
   */
  getPositions(): Promise<Position[]>;

  /**
   * Get all open orders
   */
  getOpenOrders(symbol?: string): Promise<Order[]>;
}

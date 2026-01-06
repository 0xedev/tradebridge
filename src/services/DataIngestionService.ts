/**
 * Data Ingestion Service
 * Handles fetching and streaming market data from exchanges
 */

import ccxt, { Exchange } from 'ccxt';
import pino from 'pino';
import { Candle, Timeframe } from '../types/index.js';
import EventEmitter from 'events';

export class DataIngestionService extends EventEmitter {
  private logger: pino.Logger;
  private exchange: Exchange;
  private subscriptions: Map<string, NodeJS.Timeout>;

  constructor(exchangeName: string = 'binance', testnet: boolean = true) {
    super();
    this.logger = pino({ name: 'data-ingestion' });
    this.subscriptions = new Map();

    // Initialize exchange
    const ExchangeClass = ccxt[exchangeName as keyof typeof ccxt] as typeof ccxt.Exchange;
    this.exchange = new ExchangeClass({
      enableRateLimit: true,
      options: {
        defaultType: 'spot',
      },
    });

    if (testnet) {
      this.exchange.setSandboxMode(true);
    }

    this.logger.info(`Initialized ${exchangeName} exchange (testnet: ${testnet})`);
  }

  /**
   * Fetch historical candles from exchange
   */
  async fetchCandles(
    symbol: string,
    timeframe: Timeframe,
    since?: number,
    limit: number = 100
  ): Promise<Candle[]> {
    try {
      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, since, limit);

      return ohlcv.map((candle) => ({
        timestamp: candle[0] as number,
        open: candle[1] as number,
        high: candle[2] as number,
        low: candle[3] as number,
        close: candle[4] as number,
        volume: candle[5] as number,
      }));
    } catch (error) {
      this.logger.error(`Error fetching candles for ${symbol}: ${error}`);
      throw error;
    }
  }

  /**
   * Subscribe to real-time market data updates
   * Polls exchange at regular intervals (for demo purposes)
   */
  subscribeToMarketData(
    symbol: string,
    timeframe: Timeframe,
    callback: (candles: Candle[]) => void
  ): void {
    const key = `${symbol}-${timeframe}`;

    if (this.subscriptions.has(key)) {
      this.logger.warn(`Already subscribed to ${key}`);
      return;
    }

    // Convert timeframe to milliseconds for polling interval
    const intervalMap: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
      '1w': 604800000,
    };

    const interval = intervalMap[timeframe] || 60000;

    // Poll exchange at interval
    const timer = setInterval(async () => {
      try {
        const candles = await this.fetchCandles(symbol, timeframe, undefined, 100);
        callback(candles);
        this.emit('candles', { symbol, timeframe, candles });
      } catch (error) {
        this.logger.error(`Error in subscription ${key}: ${error}`);
      }
    }, interval);

    this.subscriptions.set(key, timer);
    this.logger.info(`Subscribed to ${key} with ${interval}ms interval`);

    // Fetch initial data immediately
    this.fetchCandles(symbol, timeframe, undefined, 100)
      .then((candles) => {
        callback(candles);
        this.emit('candles', { symbol, timeframe, candles });
      })
      .catch((error) => {
        this.logger.error(`Error fetching initial data for ${key}: ${error}`);
      });
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribe(symbol: string, timeframe: Timeframe): void {
    const key = `${symbol}-${timeframe}`;
    const timer = this.subscriptions.get(key);

    if (timer) {
      clearInterval(timer);
      this.subscriptions.delete(key);
      this.logger.info(`Unsubscribed from ${key}`);
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((timer) => clearInterval(timer));
    this.subscriptions.clear();
    this.logger.info('Cleaned up all subscriptions');
  }
}

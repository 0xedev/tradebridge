# TradeBridge Development Guide

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose (for local databases)
- Exchange API keys (optional for testing)

### Setup

1. **Clone and install dependencies:**

```bash
git clone https://github.com/yourusername/tradebridge.git
cd tradebridge
npm install
```

2. **Set up environment variables:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start local services:**

```bash
docker-compose up -d
```

This will start:
- Redis (port 6379)
- PostgreSQL (port 5432)
- MongoDB (port 27017)
- InfluxDB (port 8086)

4. **Run in development mode:**

```bash
npm run dev
```

The platform will start and begin analyzing market data with the configured strategies.

## Project Structure

```
tradebridge/
├── src/
│   ├── core/              # Core abstractions (Strategy, Exchange interfaces)
│   ├── types/             # TypeScript type definitions
│   ├── config/            # Configuration management
│   ├── services/          # Core services
│   │   ├── DataIngestionService.ts
│   │   ├── StrategyEngine.ts
│   │   └── RiskManagementService.ts
│   ├── strategies/        # Trading strategies
│   │   └── examples/      # Example strategies
│   │       ├── MACrossoverStrategy.ts
│   │       └── RSIOversoldStrategy.ts
│   ├── utils/             # Utility functions
│   └── index.ts           # Application entry point
├── DOCs/                  # Trading literature and research
├── docker-compose.yml     # Local development stack
├── package.json
├── tsconfig.json
└── README.md
```

## Available Scripts

- `npm run dev` - Run in development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check without building

## Current Implementation Status

### ✅ Phase 1 MVP - Completed

- [x] Project structure and TypeScript setup
- [x] Core type definitions and interfaces
- [x] Base Strategy class
- [x] Data Ingestion Service (CCXT integration)
- [x] Strategy Engine with conviction scoring
- [x] Risk Management Service
- [x] Example strategies (MA Crossover, RSI)
- [x] Paper trading mode
- [x] Docker Compose for local development

### 🚧 Phase 1 MVP - In Progress

- [ ] Add more technical indicators
- [ ] REST API with Fastify
- [ ] Web dashboard (Next.js)
- [ ] Backtesting engine
- [ ] Database persistence

### 📋 Phase 2 - Planned

- [ ] XGBoost integration
- [ ] CNN pattern recognition
- [ ] Sentiment analysis (FinBERT)
- [ ] Multi-exchange support
- [ ] Advanced backtesting

## Creating a Custom Strategy

Create a new file in `src/strategies/examples/`:

```typescript
import { Strategy } from '../../core/Strategy.js';
import { MarketData, Signal } from '../../types/index.js';

export class MyCustomStrategy extends Strategy {
  async analyze(data: MarketData): Promise<Signal> {
    const closes = data.candles.map(c => c.close);
    
    // Your analysis logic here
    
    return {
      direction: 'BUY' | 'SELL' | 'HOLD',
      conviction: 0.75, // 0-1
      metadata: { /* analysis details */ }
    };
  }
}
```

Register it in `src/services/StrategyEngine.ts`:

```typescript
if (enabledStrategies.includes('my-custom-strategy')) {
  const config: StrategyConfig = {
    name: 'my-custom-strategy',
    enabled: true,
    symbols: ['BTC/USDT'],
    timeframes: ['1h'],
    weight: 1.0,
    parameters: { /* your params */ }
  };
  strategies.push(new MyCustomStrategy(config));
}
```

## Configuration

Edit `src/config/index.ts` or use environment variables:

```typescript
export const tradingConfig: TradingConfig = {
  paperTrading: true,
  initialCapital: 10000,
  enabledStrategies: ['ma-crossover', 'rsi-oversold'],
  symbols: ['BTC/USDT', 'ETH/USDT'],
  timeframes: ['1h', '4h'],
  risk: {
    maxDailyLossPercent: 5,
    maxDrawdownPercent: 20,
    positionSizePercent: 2,
    // ...
  }
};
```

## Testing with Real Exchanges

1. Get API keys from your exchange (use testnet/sandbox)
2. Add to `.env`:
```
BINANCE_API_KEY=your_key
BINANCE_SECRET=your_secret
BINANCE_TESTNET=true
```

3. The platform will use testnet by default for safe testing

## Logging

The platform uses Pino for structured logging. Logs include:
- Strategy signals and analysis
- Risk management decisions
- Market data updates
- Errors and warnings

## Next Steps

1. ✅ Basic platform is now operational
2. Add REST API for monitoring and control
3. Build web dashboard for visualization
4. Implement database persistence
5. Add more sophisticated strategies
6. Integrate ML models

## Contributing

See main README.md for contribution guidelines.

## Support

- GitHub Issues: Report bugs
- Documentation: See DOCs/ folder
- Examples: Check src/strategies/examples/

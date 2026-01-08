#!/usr/bin/env node
/**
 * RAG Knowledge Demo
 * Demonstrates full PDF extraction, vector embeddings, and LLM reasoning
 */

import { AdvancedRAGKnowledgeService } from '../services/AdvancedRAGKnowledgeService.js';
import { RAGEnhancedStrategy } from '../strategies/ml/RAGEnhancedStrategy.js';
import { DemoDataGenerator } from '../utils/DemoDataGenerator.js';
import { StrategyConfig, MarketData } from '../types/index.js';
import pino from 'pino';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = pino({
  name: 'rag-demo',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

async function demonstrateRAG() {
  logger.info('=== TradeBridge Advanced RAG System Demo ===\n');

  // Check for required API keys
  if (!process.env.OPENAI_API_KEY) {
    logger.error('⚠️  OPENAI_API_KEY not set in environment variables');
    logger.info('\nTo use the RAG system, you need:');
    logger.info('1. OpenAI API key for embeddings and LLM reasoning');
    logger.info('2. Add to .env file: OPENAI_API_KEY=your_key_here');
    logger.info('\nRunning in fallback mode with limited features...\n');
  } else {
    logger.info('✅ OpenAI API key detected');
  }

  // Initialize RAG service
  logger.info('\n=== Initializing RAG Knowledge System ===');
  logger.info('This will:');
  logger.info('1. Extract text from trading PDFs');
  logger.info('2. Generate vector embeddings');
  logger.info('3. Store in ChromaDB vector database');
  logger.info('(Processing first 5 PDFs for demo - would process all 60+ in production)\n');

  const ragService = new AdvancedRAGKnowledgeService('./DOCs');
  
  try {
    await ragService.initialize();
    
    const status = ragService.getStatus();
    logger.info('\n=== RAG System Status ===');
    logger.info(`Initialized: ${status.initialized ? '✅' : '❌'}`);
    logger.info(`OpenAI Available: ${status.openaiAvailable ? '✅' : '❌'}`);
    logger.info(`ChromaDB Available: ${status.chromaAvailable ? '✅' : '❌'}`);

    if (!status.openaiAvailable) {
      logger.info('\n⚠️  Running in fallback mode without full RAG features');
      return;
    }

    // Demonstrate semantic search
    logger.info('\n\n=== Semantic Knowledge Retrieval Demo ===');
    logger.info('Query: "What to do when market is consolidating with low volatility?"');
    
    const results = await ragService.retrieveRelevantKnowledge(
      'market consolidation low volatility breakout strategy',
      3
    );

    logger.info(`\nRetrieved ${results.length} relevant chunks:\n`);
    results.forEach((result, i) => {
      logger.info(`${i + 1}. Source: ${result.source}`);
      logger.info(`   Relevance: ${(result.relevanceScore * 100).toFixed(1)}%`);
      logger.info(`   Content: ${result.text.slice(0, 200)}...`);
      logger.info('');
    });

    // Demonstrate RAG-enhanced trading analysis
    logger.info('\n=== RAG-Enhanced Trading Analysis Demo ===\n');

    // Generate sample market data
    const generator = new DemoDataGenerator(50000, 0.015, 0.0003);
    const candles = generator.generateCandles(100, '1h');

    const marketData: MarketData = {
      symbol: 'BTC/USDT',
      exchange: 'demo',
      timeframe: '1h',
      candles,
      timestamp: Date.now(),
    };

    // Create RAG-enhanced strategy
    const strategyConfig: StrategyConfig = {
      name: 'rag-enhanced',
      enabled: true,
      symbols: ['BTC/USDT'],
      timeframes: ['1h'],
      weight: 1.0,
      parameters: {
        threshold: 0.5,
        docsPath: './DOCs',
      },
    };

    logger.info('Initializing RAG-Enhanced Strategy...');
    const strategy = new RAGEnhancedStrategy(strategyConfig);
    await strategy.initialize();

    logger.info('\nAnalyzing market with full RAG pipeline...\n');
    const signal = await strategy.analyze(marketData);

    logger.info('=== RAG Analysis Results ===');
    logger.info(`Direction: ${signal.direction}`);
    logger.info(`Conviction: ${(signal.conviction * 100).toFixed(1)}%`);
    
    if (signal.metadata?.llmReasoning) {
      logger.info(`\n📊 LLM Reasoning:`);
      logger.info(signal.metadata.llmReasoning.slice(0, 300) + '...');
    }

    if (signal.metadata?.llmInsights && signal.metadata.llmInsights.length > 0) {
      logger.info(`\n💡 Trading Insights:`);
      signal.metadata.llmInsights.forEach((insight: string, i: number) => {
        logger.info(`   ${i + 1}. ${insight}`);
      });
    }

    if (signal.metadata?.llmRisks && signal.metadata.llmRisks.length > 0) {
      logger.info(`\n⚠️  Risk Factors:`);
      signal.metadata.llmRisks.forEach((risk: string, i: number) => {
        logger.info(`   ${i + 1}. ${risk}`);
      });
    }

    if (signal.metadata?.llmActions && signal.metadata.llmActions.length > 0) {
      logger.info(`\n🎯 Recommended Actions:`);
      signal.metadata.llmActions.forEach((action: string, i: number) => {
        logger.info(`   ${i + 1}. ${action}`);
      });
    }

    if (signal.metadata?.retrievedSources) {
      logger.info(`\n📚 Knowledge Sources Used:`);
      signal.metadata.retrievedSources.forEach((source: string, i: number) => {
        const relevance = signal.metadata?.knowledgeRelevance?.[i];
        logger.info(`   - ${source} (${(relevance * 100).toFixed(0)}% relevant)`);
      });
    }

    if (signal.metadata?.llmConfidence) {
      logger.info(`\n🎓 LLM Confidence: ${(signal.metadata.llmConfidence * 100).toFixed(1)}%`);
    }

    await strategy.cleanup();

  } catch (error) {
    logger.error(`Error in RAG demo: ${error}`);
  }

  logger.info('\n\n=== RAG System Capabilities ===');
  logger.info(`
1. **Full PDF Text Extraction**
   - Automatically extracts text from all trading PDFs
   - Handles 60+ documents covering patterns, strategies, risk, psychology
   - Chunks documents into semantic units (~500 words)

2. **Vector Embeddings**
   - Uses OpenAI's text-embedding-3-small model
   - Creates 1536-dimensional embeddings for each chunk
   - Enables semantic search (meaning-based, not just keywords)

3. **Vector Database Storage**
   - ChromaDB for efficient similarity search
   - Scales to thousands of document chunks
   - Sub-second retrieval times

4. **Semantic Knowledge Retrieval**
   - Query: "What to do in consolidation?"
   - Retrieves: Bollinger Band Squeeze, breakout strategies, etc.
   - Not limited to exact keyword matches

5. **LLM-Powered Analysis**
   - GPT-4 Turbo analyzes retrieved knowledge + market data
   - Generates human-readable reasoning
   - Provides actionable insights, risks, and recommendations
   - Adjusts confidence based on knowledge alignment

6. **Enhanced Trading Decisions**
   - Combines technical signals with literature-backed insights
   - More explainable and trustworthy decisions
   - Reduces false positives by cross-referencing with expert knowledge

**Example Workflow:**

Market Shows: Low volatility + consolidation
    ↓
RAG Retrieves: "Bollinger Band Squeeze - precedes large move"
    ↓
LLM Analyzes: "The current consolidation with narrowing Bollinger Bands
              aligns with the documented squeeze pattern. Historical
              literature suggests this precedes significant breakouts..."
    ↓
Enhanced Signal: BUY conviction boosted 50% → 68% with detailed reasoning

**Production Enhancements:**
- Process all 60+ PDFs (currently 5 for demo)
- Fine-tune embeddings on financial text
- Add real-time news/social sentiment
- Multi-modal analysis (charts + text)
- Continuous learning from outcomes
  `);

  logger.info('\n=== Demo Complete ===');
}

// Run the demo
demonstrateRAG().catch((error) => {
  logger.error(`Demo failed: ${error}`);
  process.exit(1);
});

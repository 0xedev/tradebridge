# Advanced RAG System - Full PDF Extraction with Vector Embeddings and LLM Reasoning

## Overview

TradeBridge now features a complete RAG (Retrieval-Augmented Generation) system that extracts knowledge from trading PDFs, creates vector embeddings, and uses LLM reasoning for deep trading insights.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RAG Pipeline                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PDF Extraction                                          │
│     ├─ Read 60+ trading PDFs from DOCs folder               │
│     ├─ Extract text with pdf-parse                          │
│     └─ Chunk into ~500 word semantic units                  │
│                                                              │
│  2. Embedding Generation                                    │
│     ├─ OpenAI text-embedding-3-small                        │
│     ├─ 1536-dimensional vectors                             │
│     └─ Batch processing to manage rate limits               │
│                                                              │
│  3. Vector Storage                                          │
│     ├─ ChromaDB vector database                             │
│     ├─ Efficient similarity search                          │
│     └─ Metadata tracking (source, page, chunk)              │
│                                                              │
│  4. Semantic Retrieval                                      │
│     ├─ Convert queries to embeddings                        │
│     ├─ Cosine similarity search                             │
│     └─ Top-K relevant documents                             │
│                                                              │
│  5. LLM Reasoning                                           │
│     ├─ GPT-4 Turbo analysis                                 │
│     ├─ Context: market data + retrieved knowledge           │
│     └─ Generate insights, risks, recommendations            │
│                                                              │
│  6. Enhanced Decision                                       │
│     ├─ Combine technical signals with LLM insights          │
│     ├─ Adjust conviction based on knowledge alignment       │
│     └─ Provide explainable reasoning                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

New dependencies added:
- `pdf-parse` - PDF text extraction
- `openai` - Embeddings and LLM API
- `chromadb` - Vector database client

### 2. Configure API Keys

Add to `.env` file:

```bash
# Required for RAG features
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional (for alternative models)
ANTHROPIC_API_KEY=your-anthropic-key-here
```

Get your OpenAI API key from: https://platform.openai.com/api-keys

### 3. Start ChromaDB (Optional)

For local development:

```bash
docker run -p 8000:8000 chromadb/chroma
```

Or use embedded mode (default in code).

## Usage

### Run RAG Demo

```bash
npm run rag-demo
```

This demonstrates:
1. PDF text extraction from 5 sample documents
2. Embedding generation and vector storage
3. Semantic search examples
4. LLM-powered trading analysis
5. Full RAG pipeline on live market data

### Example Output

```
=== Initializing RAG Knowledge System ===
Processing 123system.pdf... 15 chunks
Processing Bollinger_Bandit_Trading_Strategy.pdf... 23 chunks
Processing Elliott_Wave_Patterns.pdf... 31 chunks
Extracted 147 chunks from 5 PDFs

=== Semantic Knowledge Retrieval ===
Query: "market consolidation low volatility"

1. Source: Bollinger_Bandit_Trading_Strategy.pdf (94% relevant)
   Content: When Bollinger Bands narrow significantly, volatility 
   is contracting. This squeeze pattern typically precedes a large
   price move. Traders should prepare for a breakout...

2. Source: Dynamic_Breakout_II_Strategy.pdf (87% relevant)
   Content: Range-bound markets with decreasing volatility create
   optimal conditions for breakout strategies. Monitor volume for
   confirmation of directional move...

=== RAG Analysis Results ===
Direction: BUY
Conviction: 68.5%

📊 LLM Reasoning:
The current market exhibits classic consolidation characteristics
with narrowing Bollinger Bands, indicating a volatility squeeze.
This pattern aligns with documented trading literature (Bollinger
Bandit Strategy) which demonstrates that such conditions typically
precede significant price movements. The technical indicators show
bullish alignment with RSI at 45 (neutral-bullish) and MACD
crossing above signal line...

💡 Trading Insights:
1. Bollinger Band squeeze pattern indicates imminent breakout
2. Volume should increase significantly at breakout point
3. Consider entering on confirmed breakout above upper band
4. Historical success rate for this pattern: 65-70%

⚠️  Risk Factors:
1. False breakouts common in low-volume conditions
2. External news events could trigger unexpected moves
3. Wait for volume confirmation before scaling position

🎯 Recommended Actions:
1. Place limit order 2% above current price for breakout entry
2. Set stop-loss at recent consolidation low (-3%)
3. Start with 50% intended position size
4. Scale in additional 50% on volume confirmation
```

## Components

### 1. AdvancedRAGKnowledgeService

**File:** `src/services/AdvancedRAGKnowledgeService.ts`

Main service handling the RAG pipeline:

```typescript
const ragService = new AdvancedRAGKnowledgeService('./DOCs');
await ragService.initialize();

// Semantic search
const results = await ragService.retrieveRelevantKnowledge(
  'breakout strategy consolidation',
  5
);

// LLM analysis
const analysis = await ragService.analyzeTradingDecision(
  marketData,
  technicalSignal,
  results
);
```

**Key Methods:**
- `initialize()` - Extract PDFs, generate embeddings, store in vector DB
- `retrieveRelevantKnowledge(query, topK)` - Semantic search
- `analyzeTradingDecision(data, signal, knowledge)` - LLM reasoning

### 2. RAGEnhancedStrategy

**File:** `src/strategies/ml/RAGEnhancedStrategy.ts`

Trading strategy using full RAG pipeline:

```typescript
const strategy = new RAGEnhancedStrategy({
  name: 'rag-enhanced',
  enabled: true,
  symbols: ['BTC/USDT'],
  timeframes: ['1h'],
  weight: 1.0,
  parameters: {
    threshold: 0.5,
    docsPath: './DOCs'
  }
});

await strategy.initialize();
const signal = await strategy.analyze(marketData);
```

**Features:**
- Technical analysis baseline
- Semantic knowledge retrieval
- LLM-powered reasoning
- Enhanced conviction scoring
- Explainable decisions

### 3. RAG Demo CLI

**File:** `src/cli/rag-demo.ts`

Interactive demonstration of RAG capabilities.

## How It Works

### Step 1: PDF Extraction

```typescript
// Extract text from PDF
const buffer = await fs.readFile('trading_strategy.pdf');
const data = await pdf(buffer);
const text = data.text;

// Chunk into semantic units
const chunks = chunkText(text, 500); // 500 words per chunk
```

### Step 2: Generate Embeddings

```typescript
// Create embeddings with OpenAI
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunks,
});

const embeddings = response.data.map(d => d.embedding);
// Each embedding is 1536 dimensions
```

### Step 3: Store in Vector DB

```typescript
// Store in ChromaDB
await collection.add({
  ids: chunkIds,
  documents: chunks,
  embeddings: embeddings,
  metadatas: metadata,
});
```

### Step 4: Semantic Search

```typescript
// Convert query to embedding
const queryEmbedding = await generateEmbeddings([query]);

// Search by similarity
const results = await collection.query({
  queryEmbeddings: queryEmbedding,
  nResults: 5,
});
```

### Step 5: LLM Analysis

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [
    {
      role: 'system',
      content: 'You are an expert trading analyst...'
    },
    {
      role: 'user',
      content: buildContext(marketData, signal, retrievedKnowledge)
    }
  ],
  temperature: 0.3,
});

// Parse structured response
const analysis = parseAnalysis(completion.choices[0].message.content);
```

### Step 6: Enhanced Decision

```typescript
// Adjust conviction based on LLM confidence
const llmAdjustment = (llmConfidence - technicalConviction) * 0.3;
const enhancedConviction = technicalConviction + llmAdjustment;

// Include full reasoning in signal metadata
return {
  direction: finalDirection,
  conviction: enhancedConviction,
  metadata: {
    ...technicalMetadata,
    llmReasoning,
    llmInsights,
    llmRisks,
    llmActions,
    retrievedSources,
  }
};
```

## Benefits

### 1. Deeper Understanding
- AI learns from 60+ authoritative trading documents
- Not just pattern matching - conceptual understanding
- Cross-references market conditions with literature

### 2. Explainable Decisions
- Every decision backed by retrieved knowledge
- Clear reasoning: "This matches Bollinger Squeeze pattern from..."
- Builds trust through transparency

### 3. Reduced False Positives
- LLM can warn about risky signals
- "While technically bullish, the literature suggests caution in..."
- Knowledge-informed skepticism

### 4. Adaptive Learning
- Can process new PDFs without code changes
- Updates knowledge base automatically
- Learns from latest trading research

### 5. Human-like Reasoning
- Considers context beyond technical indicators
- Incorporates risk management principles
- Mimics expert trader thought process

## Performance Considerations

### Initialization
- First-time setup: 5-10 minutes for 60+ PDFs
- Embedding generation: Rate-limited by OpenAI API
- Vector DB storage: Fast (< 1 second)

### Query Time
- Semantic search: < 100ms
- LLM analysis: 2-5 seconds (GPT-4 Turbo)
- Total latency: ~3-6 seconds per analysis

### Costs (Approximate)
- Embeddings: ~$0.0001 per 1K tokens
- GPT-4 Turbo: ~$0.01 per 1K input tokens, ~$0.03 per 1K output
- Per analysis: ~$0.02-0.05
- Daily (100 analyses): ~$2-5

### Optimization Tips
1. Cache embeddings - don't regenerate for same queries
2. Batch API calls when possible
3. Use GPT-3.5-turbo for lower-priority analyses
4. Implement response streaming for real-time feedback
5. Pre-compute common query embeddings

## Scaling to Production

### 1. Infrastructure
```yaml
# docker-compose.yml additions
services:
  chromadb:
    image: chromadb/chroma
    ports:
      - "8000:8000"
    volumes:
      - ./chroma-data:/chroma/chroma
    
  redis:
    image: redis:alpine
    # Cache embeddings and LLM responses
```

### 2. Caching Strategy
```typescript
// Cache query embeddings
const cacheKey = `embedding:${hash(query)}`;
let embedding = await redis.get(cacheKey);
if (!embedding) {
  embedding = await generateEmbedding(query);
  await redis.set(cacheKey, embedding, 'EX', 86400); // 24h
}

// Cache LLM responses
const contextHash = hash(marketData + signal);
const cachedAnalysis = await redis.get(`analysis:${contextHash}`);
if (cachedAnalysis) return cachedAnalysis;
```

### 3. Rate Limiting
```typescript
// Implement token bucket for OpenAI API
const limiter = new RateLimiter({
  tokensPerInterval: 10000,
  interval: 'minute'
});

await limiter.removeTokens(1);
const response = await openai.chat.completions.create(...);
```

### 4. Monitoring
```typescript
// Track metrics
metrics.recordLatency('rag.search', searchTime);
metrics.recordLatency('rag.llm', llmTime);
metrics.recordCost('openai.embeddings', embeddingCost);
metrics.recordCost('openai.completions', completionCost);
```

## Future Enhancements

### Phase 1: Enhanced Extraction ✅
- [x] Full PDF text extraction
- [x] Vector embeddings
- [x] Semantic search
- [x] LLM reasoning

### Phase 2: Advanced Features
- [ ] Multi-modal analysis (charts + text)
- [ ] Fine-tuned embeddings on financial text
- [ ] Custom LLM fine-tuned on trading
- [ ] Real-time news integration
- [ ] Social sentiment analysis

### Phase 3: Continuous Learning
- [ ] Feedback loop from trade outcomes
- [ ] Automatic knowledge base updates
- [ ] Pattern discovery in successful trades
- [ ] Hypothesis generation and testing

### Phase 4: Multi-Agent System
- [ ] Specialized agents (risk, entry, exit)
- [ ] Agent collaboration and consensus
- [ ] Meta-learning across agents
- [ ] Automated strategy generation

## Troubleshooting

### "OPENAI_API_KEY not set"
Add your OpenAI API key to `.env` file.

### "ChromaDB not available"
Install and start ChromaDB server, or use embedded mode (default).

### "Rate limit exceeded"
Implement request batching and caching. Consider upgrading OpenAI tier.

### "PDF extraction failed"
Some PDFs may be image-based or encrypted. Use OCR for scanned documents.

## Related Files

- `src/services/AdvancedRAGKnowledgeService.ts` - Main RAG service
- `src/strategies/ml/RAGEnhancedStrategy.ts` - Strategy using RAG
- `src/cli/rag-demo.ts` - Interactive demo
- `KNOWLEDGE_INTEGRATION.md` - Basic knowledge integration docs
- `DOCs/` - 60+ trading PDF files

## Support

For issues or questions:
1. Check logs for detailed error messages
2. Verify API keys are correctly set
3. Ensure ChromaDB is running if using server mode
4. Review OpenAI API usage and limits

## License

MIT - See LICENSE file for details

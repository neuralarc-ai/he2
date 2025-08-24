# Knowledge Base System

## Overview

The Knowledge Base system provides a comprehensive solution for managing both global and thread-specific knowledge that can be used to enhance AI responses. It implements a RAG (Retrieval-Augmented Generation) approach to intelligently provide relevant information to AI models.

## Features

### Global Knowledge Base
- **Account-wide knowledge**: Information accessible across all threads and agents
- **Persistent storage**: Knowledge persists between sessions
- **Usage context control**: Configure when knowledge is automatically included

### Thread Knowledge Base
- **Thread-specific knowledge**: Information relevant to specific conversation threads
- **Contextual relevance**: Knowledge is only used when relevant to the thread topic
- **Isolated storage**: Thread knowledge doesn't interfere with other conversations

### Agent Knowledge Base
- **Agent-specific knowledge**: Specialized information for individual AI agents
- **Role-based context**: Knowledge tailored to agent capabilities and purpose
- **Dynamic injection**: Knowledge is injected into agent prompts when relevant

## Architecture

### Database Schema

The system uses several key tables:

- `global_knowledge_base`: Stores account-wide knowledge entries
- `thread_knowledge_base`: Stores thread-specific knowledge entries
- `document_processing_queue`: Manages document upload and processing
- `document_chunks`: Stores chunked content with vector embeddings
- `kb_query_logs`: Tracks query relevance and usage patterns

### Vector Search

- **Embeddings**: Uses Sentence Transformers (all-MiniLM-L6-v2) for generating 384-dimensional embeddings
- **Similarity search**: Implements cosine similarity for finding relevant content
- **Chunking**: Documents are automatically split into overlapping chunks for better retrieval

### RAG Implementation

1. **Query Analysis**: When a user submits a query, the system generates an embedding
2. **Relevance Check**: Determines if the query is relevant to available knowledge
3. **Content Retrieval**: If relevant, retrieves the most similar knowledge chunks
4. **Context Injection**: Relevant knowledge is injected into the AI prompt
5. **Response Generation**: AI generates informed responses using the knowledge context

## Usage

### Creating Knowledge Entries

Knowledge can be created in three ways:

1. **Manual Entry**: Direct text input through the UI
2. **Document Upload**: Upload PDFs, CSVs, DOC files, etc.
3. **API Integration**: Programmatic creation via REST API

### Usage Contexts

- **Always**: Knowledge is included in every AI response
- **Contextual**: Knowledge is included only when relevant to the query
- **On Request**: Knowledge is included only when explicitly requested

### File Processing

Supported file formats:
- **Text**: TXT, MD, JSON, YAML
- **Documents**: PDF, DOC, DOCX
- **Spreadsheets**: CSV, XLSX
- **Code**: Various programming language files

## API Endpoints

### Global Knowledge Base
- `GET /knowledge-base/global` - Retrieve global knowledge entries
- `POST /knowledge-base/global` - Create global knowledge entry
- `PUT /knowledge-base/{entry_id}` - Update knowledge entry
- `DELETE /knowledge-base/{entry_id}` - Delete knowledge entry

### Thread Knowledge Base
- `GET /knowledge-base/threads/{thread_id}` - Retrieve thread knowledge
- `POST /knowledge-base/threads/{thread_id}` - Create thread knowledge entry

### Query Interface
- `POST /knowledge-base/query` - Query knowledge base for relevance

## Configuration

### Environment Variables

```bash
# Vector model configuration
VECTOR_MODEL_NAME=all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Similarity thresholds
RELEVANCE_THRESHOLD=0.6
SIMILARITY_THRESHOLD=0.7

# Chunking settings
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

### Performance Tuning

- **Chunk size**: Adjust based on document characteristics and token limits
- **Similarity thresholds**: Balance between relevance and recall
- **Max results**: Control the number of chunks returned per query

## Security

### Row Level Security (RLS)
- All knowledge base tables have RLS enabled
- Users can only access knowledge from their accounts
- Thread knowledge is restricted to thread participants

### Access Control
- Global knowledge: Account members only
- Thread knowledge: Thread participants only
- Agent knowledge: Agent owners only

## Monitoring

### Query Logging
- Tracks all knowledge base queries
- Records relevance scores and usage patterns
- Monitors response times and success rates

### Performance Metrics
- Embedding generation time
- Vector search performance
- Document processing throughput

## Best Practices

### Content Organization
- Use descriptive names for knowledge entries
- Provide clear descriptions for better categorization
- Group related information in single entries

### Usage Context Selection
- Use "Always" sparingly to avoid prompt bloat
- "Contextual" is ideal for most use cases
- "On Request" for specialized or rarely-used information

### Document Quality
- Ensure uploaded documents are well-formatted
- Remove unnecessary formatting and artifacts
- Consider document length and complexity

## Troubleshooting

### Common Issues

1. **Low relevance scores**: Check document quality and chunking settings
2. **Slow processing**: Verify vector model initialization and database performance
3. **Memory issues**: Monitor embedding generation and storage usage

### Performance Optimization

1. **Batch processing**: Process multiple documents together
2. **Caching**: Cache frequently accessed embeddings
3. **Indexing**: Ensure proper database indexes for vector operations

## Future Enhancements

### Planned Features
- **Multi-language support**: Support for non-English content
- **Advanced chunking**: Semantic chunking based on content structure
- **Hybrid search**: Combine vector and keyword-based search
- **Knowledge graphs**: Build relationships between knowledge entries
- **Automated updates**: Periodic knowledge refresh and validation

### Integration Opportunities
- **External APIs**: Connect to external knowledge sources
- **Real-time sync**: Live updates from connected systems
- **Advanced analytics**: Deep insights into knowledge usage patterns

# Knowledge Base System

This module implements a comprehensive knowledge base system with support for Global, Thread-specific, and Agent-specific knowledge bases. The system allows users to store, manage, and retrieve contextual information that can be used to enhance AI agent responses.

## Features

### 🏢 Global Knowledge Base
- **Account-wide knowledge**: Information accessible across all threads and agents within an account
- **Company policies, standards, and guidelines**: Store organizational knowledge that applies universally
- **Cross-project consistency**: Ensure all agents and threads have access to the same foundational information

### 🧵 Thread Knowledge Base
- **Thread-specific context**: Information relevant to specific conversation threads
- **Project-specific details**: Store requirements, architecture, and context for individual projects
- **Temporary knowledge**: Information that's only relevant during a specific conversation or project

### 🤖 Agent Knowledge Base
- **Agent-specific expertise**: Specialized knowledge for individual AI agents
- **Role-based information**: Store agent capabilities, preferences, and domain expertise
- **Personalized responses**: Enable agents to provide more relevant and accurate information

### 📄 Document Processing
- **File upload support**: Upload PDFs, documents, and text files
- **Automatic text extraction**: Extract content from various file formats
- **Processing queue**: Asynchronous document processing with status tracking

### 🔍 Smart Context Retrieval
- **Token-aware context**: Intelligent token allocation across knowledge base types
- **Combined context**: Merge global, thread, and agent knowledge seamlessly
- **Usage context control**: Control when and how knowledge is used (always, on_request, contextual)

## Architecture

### Database Schema

```sql
-- Global knowledge base (account-wide)
global_knowledge_base
├── id (UUID, Primary Key)
├── account_id (UUID, Foreign Key)
├── name (VARCHAR)
├── description (TEXT)
├── content (TEXT)
├── content_tokens (INTEGER)
├── usage_context (ENUM: always, on_request, contextual)
├── is_active (BOOLEAN)
├── source_type (VARCHAR)
├── source_metadata (JSONB)
└── timestamps (created_at, updated_at, last_accessed_at)

-- Thread knowledge base (thread-specific)
thread_knowledge_base
├── id (UUID, Primary Key)
├── thread_id (UUID, Foreign Key)
├── account_id (UUID, Foreign Key)
├── name (VARCHAR)
├── description (TEXT)
├── content (TEXT)
├── content_tokens (INTEGER)
├── usage_context (ENUM: always, on_request, contextual)
├── is_active (BOOLEAN)
├── source_type (VARCHAR)
├── source_metadata (JSONB)
└── timestamps (created_at, updated_at, last_accessed_at)

-- Document processing queue
document_processing_queue
├── id (UUID, Primary Key)
├── account_id (UUID, Foreign Key)
├── thread_id (UUID, Foreign Key, Optional)
├── agent_id (UUID, Foreign Key, Optional)
├── kb_type (ENUM: global, thread, agent)
├── original_filename (VARCHAR)
├── file_path (TEXT)
├── file_size (BIGINT)
├── mime_type (VARCHAR)
├── document_type (VARCHAR)
├── status (ENUM: pending, processing, completed, failed)
├── extracted_text (TEXT)
└── timestamps (created_at, updated_at)
```

### API Endpoints

#### Global Knowledge Base
- `GET /knowledge-base/global` - Retrieve all global knowledge base entries
- `POST /knowledge-base/global` - Create a new global knowledge base entry
- `PUT /knowledge-base/global/{entry_id}` - Update a global knowledge base entry
- `DELETE /knowledge-base/global/{entry_id}` - Delete a global knowledge base entry

#### Thread Knowledge Base
- `GET /knowledge-base/threads/{thread_id}` - Retrieve thread knowledge base entries
- `POST /knowledge-base/threads/{thread_id}` - Create a new thread knowledge base entry
- `PUT /knowledge-base/threads/{thread_id}/{entry_id}` - Update a thread knowledge base entry
- `DELETE /knowledge-base/threads/{thread_id}/{entry_id}` - Delete a thread knowledge base entry

#### Context Retrieval
- `GET /knowledge-base/context/global` - Get global knowledge base context for prompts
- `GET /knowledge-base/context/threads/{thread_id}` - Get thread knowledge base context for prompts
- `GET /knowledge-base/context/combined/{thread_id}` - Get combined context (global + thread + agent)

#### Document Management
- `POST /knowledge-base/upload` - Upload documents to the knowledge base
- `POST /knowledge-base/query` - Query the knowledge base for relevant information

## Usage Examples

### Creating a Global Knowledge Base Entry

```python
from knowledge_base.services import KnowledgeBaseService

service = KnowledgeBaseService()

# Create company policy entry
entry_data = {
    "name": "Code Review Standards",
    "description": "Mandatory code review requirements for all projects",
    "content": "All code changes must be reviewed by at least one senior developer. Code reviews should focus on security, performance, and maintainability.",
    "usage_context": "always"
}

created_entry = await service.create_global_knowledge_base_entry(user_id, entry_data)
```

### Creating a Thread Knowledge Base Entry

```python
# Create project-specific entry
entry_data = {
    "name": "API Documentation",
    "description": "API endpoints and authentication for this project",
    "content": "Base URL: https://api.example.com/v1. Authentication: Bearer token required. Rate limit: 1000 requests per hour.",
    "usage_context": "contextual"
}

created_entry = await service.create_thread_knowledge_base_entry(user_id, thread_id, entry_data)
```

### Retrieving Combined Context

```python
# Get combined context for agent prompts
combined_context = await service.get_combined_knowledge_base_context(
    user_id=user_id,
    thread_id=thread_id,
    agent_id=agent_id,
    max_tokens=4000
)

if combined_context:
    # Use context in agent prompt
    agent_prompt = f"""
    {combined_context}
    
    User question: {user_question}
    Please answer based on the knowledge base context above.
    """
```

### Document Upload

```python
# Upload a document to thread knowledge base
file_data = {
    "filename": "requirements.pdf",
    "size": 2048000,  # 2MB
    "content_type": "application/pdf",
    "extracted_text": "Project requires Python 3.11+, FastAPI, PostgreSQL..."
}

upload_result = await service.upload_document(
    user_id=user_id,
    file_data=file_data,
    kb_type="thread",
    thread_id=thread_id
)
```

## Configuration

### Environment Variables

```bash
# Enable/disable knowledge base feature
KNOWLEDGE_BASE_ENABLED=true

# Database connection (handled by Supabase service)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Feature Flags

The knowledge base system respects feature flags:

```python
from flags.flags import is_enabled

if not await is_enabled("knowledge_base"):
    raise HTTPException(status_code=403, detail="Feature not available")
```

## Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access knowledge base entries for accounts they have roles on
- Thread access is verified before allowing thread-specific operations

### Authentication
- JWT-based authentication required for all endpoints
- Fallback authentication support for large headers
- User account verification for all operations

### Access Control
- Global knowledge base: Account-level access control
- Thread knowledge base: Thread ownership verification
- Agent knowledge base: Agent ownership verification

## Performance Considerations

### Token Management
- Automatic token calculation on content changes
- Configurable token limits for context retrieval
- Smart token allocation across knowledge base types

### Database Optimization
- Proper indexing on frequently queried fields
- Efficient RLS policies
- Connection pooling via Supabase client

### Caching Strategy
- Redis integration ready for future implementation
- Context caching for frequently accessed knowledge
- Query result caching for repeated searches

## Monitoring and Analytics

### Usage Tracking
- Knowledge base usage logs
- Query performance metrics
- Document processing statistics

### Health Checks
- Database connectivity monitoring
- Table existence verification
- Function availability checks

## Future Enhancements

### Semantic Search
- Embedding-based similarity search
- Vector database integration
- Relevance scoring algorithms

### Advanced Processing
- OCR for image-based documents
- Multi-language support
- Automatic categorization and tagging

### Integration Features
- Webhook notifications for processing completion
- Real-time updates via Supabase subscriptions
- API rate limiting and quotas

## Troubleshooting

### Common Issues

1. **Table not found errors**: Ensure database migration has been run
2. **Authentication failures**: Check JWT token validity and user permissions
3. **Access denied errors**: Verify user has proper account roles and thread access

### Debug Mode

Enable debug logging:

```python
import logging
logging.getLogger('knowledge_base').setLevel(logging.DEBUG)
```

### Database Verification

Check if tables exist:

```sql
-- Check global knowledge base table
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'global_knowledge_base'
);

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%knowledge%';
```

## Contributing

When contributing to the knowledge base system:

1. Follow the established code patterns and error handling
2. Add comprehensive tests for new functionality
3. Update documentation for API changes
4. Ensure proper security validation
5. Follow the project's logging and monitoring standards

## License

This module is part of the Suna AI Worker project and follows the same licensing terms.






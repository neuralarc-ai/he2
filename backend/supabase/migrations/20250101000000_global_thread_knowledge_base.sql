BEGIN;

-- Create global knowledge base table
CREATE TABLE IF NOT EXISTS global_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    content TEXT NOT NULL,
    content_tokens INTEGER, -- Token count for content management
    
    usage_context VARCHAR(100) DEFAULT 'always', -- 'always', 'on_request', 'contextual'
    
    is_active BOOLEAN DEFAULT TRUE,
    
    source_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'file_upload', 'api'
    source_metadata JSONB, -- Additional metadata about the source
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,

    CONSTRAINT global_kb_valid_usage_context CHECK (
        usage_context IN ('always', 'on_request', 'contextual')
    ),
    CONSTRAINT global_kb_content_not_empty CHECK (
        content IS NOT NULL AND LENGTH(TRIM(content)) > 0
    )
);

-- Create thread knowledge base table
CREATE TABLE IF NOT EXISTS thread_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    content TEXT NOT NULL,
    content_tokens INTEGER, -- Token count for content management
    
    usage_context VARCHAR(100) DEFAULT 'always', -- 'always', 'on_request', 'contextual'
    
    is_active BOOLEAN DEFAULT TRUE,
    
    source_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'file_upload', 'api'
    source_metadata JSONB, -- Additional metadata about the source
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,

    CONSTRAINT thread_kb_valid_usage_context CHECK (
        usage_context IN ('always', 'on_request', 'contextual')
    ),
    CONSTRAINT thread_kb_content_not_empty CHECK (
        content IS NOT NULL AND LENGTH(TRIM(content)) > 0
    )
);

-- Create document processing queue table for file uploads
CREATE TABLE IF NOT EXISTS document_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES threads(thread_id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(agent_id) ON DELETE CASCADE,
    
    kb_type VARCHAR(50) NOT NULL, -- 'global', 'thread', 'agent'
    
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    extracted_text TEXT, -- Extracted text content
    
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT doc_queue_valid_kb_type CHECK (
        kb_type IN ('global', 'thread', 'agent')
    ),
    CONSTRAINT doc_queue_valid_status CHECK (
        status IN ('pending', 'processing', 'completed', 'failed')
    )
);

-- Create knowledge base query logs table
CREATE TABLE IF NOT EXISTS kb_query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES threads(thread_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    
    user_query TEXT NOT NULL,
    query_embedding VECTOR(1536), -- For semantic search (if using embeddings)
    
    relevant_chunks_found INTEGER DEFAULT 0,
    chunks_retrieved JSONB, -- Store retrieved chunks
    
    relevance_score DECIMAL(3,2), -- 0.00 to 1.00
    was_kb_used BOOLEAN DEFAULT FALSE,
    response_time_ms INTEGER, -- Response time in milliseconds
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_kb_account_id ON global_knowledge_base(account_id);
CREATE INDEX IF NOT EXISTS idx_global_kb_is_active ON global_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_global_kb_usage_context ON global_knowledge_base(usage_context);
CREATE INDEX IF NOT EXISTS idx_global_kb_created_at ON global_knowledge_base(created_at);

CREATE INDEX IF NOT EXISTS idx_thread_kb_thread_id ON thread_knowledge_base(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_kb_account_id ON thread_knowledge_base(account_id);
CREATE INDEX IF NOT EXISTS idx_thread_kb_is_active ON thread_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_thread_kb_usage_context ON thread_knowledge_base(usage_context);
CREATE INDEX IF NOT EXISTS idx_thread_kb_created_at ON thread_knowledge_base(created_at);

CREATE INDEX IF NOT EXISTS idx_doc_queue_account_id ON document_processing_queue(account_id);
CREATE INDEX IF NOT EXISTS idx_doc_queue_status ON document_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_doc_queue_kb_type ON document_processing_queue(kb_type);
CREATE INDEX IF NOT EXISTS idx_doc_queue_created_at ON document_processing_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_kb_query_logs_thread_id ON kb_query_logs(thread_id);
CREATE INDEX IF NOT EXISTS idx_kb_query_logs_account_id ON kb_query_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_kb_query_logs_created_at ON kb_query_logs(created_at);

-- Enable RLS
ALTER TABLE global_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_query_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for global knowledge base
CREATE POLICY global_kb_user_access ON global_knowledge_base
    FOR ALL
    USING (
        basejump.has_role_on_account(account_id) = true
    );

-- Create RLS policies for thread knowledge base
CREATE POLICY thread_kb_user_access ON thread_knowledge_base
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM threads t
            WHERE t.thread_id = thread_knowledge_base.thread_id
            AND basejump.has_role_on_account(t.account_id) = true
        )
    );

-- Create RLS policies for document processing queue
CREATE POLICY doc_queue_user_access ON document_processing_queue
    FOR ALL
    USING (
        basejump.has_role_on_account(account_id) = true
    );

-- Create RLS policies for knowledge base query logs
CREATE POLICY kb_query_logs_user_access ON kb_query_logs
    FOR ALL
    USING (
        basejump.has_role_on_account(account_id) = true
    );

-- Create functions for global knowledge base
CREATE OR REPLACE FUNCTION get_global_knowledge_base(
    p_account_id UUID,
    p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    description TEXT,
    content TEXT,
    usage_context VARCHAR(100),
    is_active BOOLEAN,
    content_tokens INTEGER,
    source_type VARCHAR(50),
    source_metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gkb.id,
        gkb.name,
        gkb.description,
        gkb.content,
        gkb.usage_context,
        gkb.is_active,
        gkb.content_tokens,
        gkb.source_type,
        gkb.source_metadata,
        gkb.created_at,
        gkb.updated_at
    FROM global_knowledge_base gkb
    WHERE gkb.account_id = p_account_id
    AND (p_include_inactive OR gkb.is_active = TRUE)
    ORDER BY gkb.created_at DESC;
END;
$$;

-- Create function for global knowledge base context
CREATE OR REPLACE FUNCTION get_global_knowledge_base_context(
    p_account_id UUID,
    p_max_tokens INTEGER DEFAULT 4000
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    context_text TEXT := '';
    entry_record RECORD;
    current_tokens INTEGER := 0;
    estimated_tokens INTEGER;
BEGIN
    FOR entry_record IN
        SELECT 
            id,
            name,
            description,
            content,
            content_tokens
        FROM global_knowledge_base
        WHERE account_id = p_account_id
        AND is_active = TRUE
        AND usage_context IN ('always', 'contextual')
        ORDER BY created_at DESC
    LOOP
        estimated_tokens := COALESCE(entry_record.content_tokens, LENGTH(entry_record.content) / 4);
        
        IF current_tokens + estimated_tokens > p_max_tokens THEN
            EXIT;
        END IF;
        
        context_text := context_text || E'\n\n## Global Knowledge: ' || entry_record.name || E'\n';
        
        IF entry_record.description IS NOT NULL AND entry_record.description != '' THEN
            context_text := context_text || entry_record.description || E'\n\n';
        END IF;
        
        context_text := context_text || entry_record.content;
        
        current_tokens := current_tokens + estimated_tokens;
    END LOOP;
    
    RETURN CASE 
        WHEN context_text = '' THEN NULL
        ELSE E'# GLOBAL KNOWLEDGE BASE\n\nThe following information is from your global knowledge base and should be used as reference:' || context_text
    END;
END;
$$;

-- Create function for thread knowledge base context
CREATE OR REPLACE FUNCTION get_thread_knowledge_base_context(
    p_thread_id UUID,
    p_max_tokens INTEGER DEFAULT 4000
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    context_text TEXT := '';
    entry_record RECORD;
    current_tokens INTEGER := 0;
    estimated_tokens INTEGER;
BEGIN
    FOR entry_record IN
        SELECT 
            id,
            name,
            description,
            content,
            content_tokens
        FROM thread_knowledge_base
        WHERE thread_id = p_thread_id
        AND is_active = TRUE
        AND usage_context IN ('always', 'contextual')
        ORDER BY created_at DESC
    LOOP
        estimated_tokens := COALESCE(entry_record.content_tokens, LENGTH(entry_record.content) / 4);
        
        IF current_tokens + estimated_tokens > p_max_tokens THEN
            EXIT;
        END IF;
        
        context_text := context_text || E'\n\n## Thread Knowledge: ' || entry_record.name || E'\n';
        
        IF entry_record.description IS NOT NULL AND entry_record.description != '' THEN
            context_text := context_text || entry_record.description || E'\n\n';
        END IF;
        
        context_text := context_text || entry_record.content;
        
        current_tokens := current_tokens + estimated_tokens;
    END LOOP;
    
    RETURN CASE 
        WHEN context_text = '' THEN NULL
        ELSE E'# THREAD KNOWLEDGE BASE\n\nThe following information is specific to this thread:' || context_text
    END;
END;
$$;

-- Create function for combined knowledge base context (global + thread + agent)
CREATE OR REPLACE FUNCTION get_combined_knowledge_base_context(
    p_thread_id UUID,
    p_account_id UUID,
    p_agent_id UUID DEFAULT NULL,
    p_max_tokens INTEGER DEFAULT 4000
)
RETURNS TEXT
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    context_text TEXT := '';
    global_context TEXT := '';
    thread_context TEXT := '';
    agent_context TEXT := '';
    total_tokens INTEGER := 0;
    remaining_tokens INTEGER := p_max_tokens;
BEGIN
    -- Get global knowledge base context (25% of tokens)
    global_context := get_global_knowledge_base_context(p_account_id, remaining_tokens / 4);
    IF global_context IS NOT NULL THEN
        total_tokens := total_tokens + (LENGTH(global_context) / 4);
        remaining_tokens := p_max_tokens - total_tokens;
    END IF;
    
    -- Get thread knowledge base context (25% of tokens)
    thread_context := get_thread_knowledge_base_context(p_thread_id, remaining_tokens / 2);
    IF thread_context IS NOT NULL THEN
        total_tokens := total_tokens + (LENGTH(thread_context) / 4);
        remaining_tokens := p_max_tokens - total_tokens;
    END IF;
    
    -- Get agent knowledge base context (remaining tokens)
    IF p_agent_id IS NOT NULL THEN
        agent_context := get_agent_knowledge_base_context(p_agent_id, remaining_tokens);
        IF agent_context IS NOT NULL THEN
            total_tokens := total_tokens + (LENGTH(agent_context) / 4);
        END IF;
    END IF;
    
    -- Combine contexts
    IF global_context IS NOT NULL THEN
        context_text := global_context;
    END IF;
    
    IF thread_context IS NOT NULL THEN
        IF context_text != '' THEN
            context_text := context_text || E'\n\n' || thread_context;
        ELSE
            context_text := thread_context;
        END IF;
    END IF;
    
    IF agent_context IS NOT NULL THEN
        IF context_text != '' THEN
            context_text := context_text || E'\n\n' || agent_context;
        ELSE
            context_text := agent_context;
        END IF;
    END IF;
    
    RETURN context_text;
END;
$$;

-- Create triggers for automatic token calculation and timestamp updates
CREATE OR REPLACE FUNCTION update_global_kb_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.content != OLD.content THEN
        NEW.content_tokens = LENGTH(NEW.content) / 4;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_thread_kb_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.content != OLD.content THEN
        NEW.content_tokens = LENGTH(NEW.content) / 4;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_global_kb_updated_at
    BEFORE UPDATE ON global_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_global_kb_timestamp();

CREATE TRIGGER trigger_thread_kb_updated_at
    BEFORE UPDATE ON thread_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_kb_timestamp();

-- Create triggers for automatic token calculation on insert
CREATE OR REPLACE FUNCTION calculate_global_kb_tokens()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_tokens = LENGTH(NEW.content) / 4;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_thread_kb_tokens()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content_tokens = LENGTH(NEW.content) / 4;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_global_kb_calculate_tokens
    BEFORE INSERT ON global_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION calculate_global_kb_tokens();

CREATE TRIGGER trigger_thread_kb_calculate_tokens
    BEFORE INSERT ON thread_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION calculate_thread_kb_tokens();

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE global_knowledge_base TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE thread_knowledge_base TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE document_processing_queue TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE kb_query_logs TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION get_global_knowledge_base TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_global_knowledge_base_context TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_thread_knowledge_base_context TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_combined_knowledge_base_context TO authenticated, service_role;

-- Add comments
COMMENT ON TABLE global_knowledge_base IS 'Stores global knowledge base entries accessible across all threads and agents in an account';
COMMENT ON TABLE thread_knowledge_base IS 'Stores thread-specific knowledge base entries';
COMMENT ON TABLE document_processing_queue IS 'Queue for processing uploaded documents into knowledge base entries';
COMMENT ON TABLE kb_query_logs IS 'Logs knowledge base queries and usage for analytics';

COMMENT ON FUNCTION get_global_knowledge_base IS 'Retrieves all global knowledge base entries for an account';
COMMENT ON FUNCTION get_global_knowledge_base_context IS 'Generates global knowledge base context text for prompts';
COMMENT ON FUNCTION get_thread_knowledge_base_context IS 'Generates thread-specific knowledge base context text for prompts';
COMMENT ON FUNCTION get_combined_knowledge_base_context IS 'Generates combined knowledge base context from global, thread, and agent sources';

COMMIT;






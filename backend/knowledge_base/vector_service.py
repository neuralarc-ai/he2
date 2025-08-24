import asyncio
import logging
from typing import List, Dict, Optional, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
from services.supabase import DBConnection
from utils.logger import logger

class VectorService:
    """Service for handling vector operations in the knowledge base"""
    
    def __init__(self):
        self.model = None
        self.db = DBConnection()
        self.embedding_dimension = 384  # Default for sentence-transformers
        
    async def initialize_model(self):
        """Initialize the sentence transformer model"""
        try:
            # Use a lightweight, free model for embeddings
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Vector model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize vector model: {e}")
            raise
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for a text string"""
        if not self.model:
            await self.initialize_model()
        
        try:
            # Clean and normalize text
            cleaned_text = self._preprocess_text(text)
            
            # Generate embedding
            embedding = self.model.encode(cleaned_text)
            
            # Convert to list of floats
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    async def generate_chunk_embeddings(self, chunks: List[str]) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple text chunks"""
        if not self.model:
            await self.initialize_model()
        
        try:
            # Preprocess all chunks
            cleaned_chunks = [self._preprocess_text(chunk) for chunk in chunks]
            
            # Generate embeddings in batch
            embeddings = self.model.encode(cleaned_chunks)
            
            # Convert to list of lists
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            logger.error(f"Failed to generate chunk embeddings: {e}")
            return [None] * len(chunks)
    
    async def chunk_document(self, content: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split document content into overlapping chunks"""
        if len(content) <= chunk_size:
            return [content]
        
        chunks = []
        start = 0
        
        while start < len(content):
            end = start + chunk_size
            
            # If this isn't the last chunk, try to break at a sentence boundary
            if end < len(content):
                # Look for sentence endings within the last 100 characters
                search_start = max(start, end - 100)
                for i in range(end - 1, search_start, -1):
                    if content[i] in '.!?':
                        end = i + 1
                        break
            
            chunk = content[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            if start >= len(content):
                break
        
        return chunks
    
    async def process_document_for_kb(
        self, 
        content: str, 
        document_id: str,
        kb_type: str,
        account_id: str,
        thread_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Process a document and store it in the knowledge base with vector embeddings"""
        try:
            client = await self.db.client
            
            # Chunk the document
            chunks = await self.chunk_document(content)
            logger.info(f"Document {document_id} split into {len(chunks)} chunks")
            
            # Generate embeddings for chunks
            embeddings = await self.generate_chunk_embeddings(chunks)
            
            # Store chunks with embeddings
            chunk_records = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                if embedding is not None:
                    chunk_record = {
                        'document_id': document_id,
                        'kb_entry_id': None,  # Will be set when creating KB entry
                        'kb_type': kb_type,
                        'chunk_index': i,
                        'chunk_text': chunk,
                        'chunk_tokens': len(chunk.split()),  # Rough token count
                        'embedding': embedding,
                        'metadata': metadata or {}
                    }
                    chunk_records.append(chunk_record)
            
            # Insert chunks into database
            if chunk_records:
                result = await client.table('document_chunks').insert(chunk_records).execute()
                logger.info(f"Inserted {len(chunk_records)} chunks for document {document_id}")
            
            return {
                'success': True,
                'chunks_created': len(chunk_records),
                'total_chunks': len(chunks),
                'document_id': document_id
            }
            
        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'document_id': document_id
            }
    
    async def search_knowledge_base(
        self,
        query: str,
        kb_type: str = "global",
        thread_id: Optional[str] = None,
        account_id: Optional[str] = None,
        similarity_threshold: float = 0.7,
        max_results: int = 5
    ) -> List[Dict]:
        """Search the knowledge base for relevant information"""
        try:
            # Generate embedding for the query
            query_embedding = await self.generate_embedding(query)
            if not query_embedding:
                return []
            
            client = await self.db.client
            
            # Build the query based on kb_type
            query_builder = client.table('document_chunks').select('*')
            
            if kb_type == "global":
                query_builder = query_builder.eq('kb_type', 'global')
            elif kb_type == "thread":
                query_builder = query_builder.eq('kb_type', 'thread')
                if thread_id:
                    query_builder = query_builder.eq('thread_id', thread_id)
            elif kb_type == "agent":
                query_builder = query_builder.eq('kb_type', 'agent')
            
            if account_id:
                # Join with document_processing_queue to filter by account
                query_builder = query_builder.eq('document_processing_queue.account_id', account_id)
            
            # Execute vector similarity search
            # Note: This is a simplified approach. In production, you'd use pgvector's similarity functions
            result = await query_builder.execute()
            
            if not result.data:
                return []
            
            # Calculate similarity scores and filter by threshold
            relevant_chunks = []
            for chunk in result.data:
                if chunk.get('embedding'):
                    similarity = self._calculate_cosine_similarity(query_embedding, chunk['embedding'])
                    if similarity >= similarity_threshold:
                        chunk['similarity_score'] = similarity
                        relevant_chunks.append(chunk)
            
            # Sort by similarity score and limit results
            relevant_chunks.sort(key=lambda x: x['similarity_score'], reverse=True)
            return relevant_chunks[:max_results]
            
        except Exception as e:
            logger.error(f"Failed to search knowledge base: {e}")
            return []
    
    async def is_query_relevant(
        self,
        query: str,
        kb_type: str = "global",
        thread_id: Optional[str] = None,
        account_id: Optional[str] = None,
        relevance_threshold: float = 0.6
    ) -> Tuple[bool, float]:
        """Check if a query is relevant to the knowledge base"""
        try:
            # Search for relevant chunks
            relevant_chunks = await self.search_knowledge_base(
                query, kb_type, thread_id, account_id, relevance_threshold, max_results=1
            )
            
            if not relevant_chunks:
                return False, 0.0
            
            # Return the highest similarity score
            max_similarity = max(chunk['similarity_score'] for chunk in relevant_chunks)
            return max_similarity >= relevance_threshold, max_similarity
            
        except Exception as e:
            logger.error(f"Failed to check query relevance: {e}")
            return False, 0.0
    
    def _preprocess_text(self, text: str) -> str:
        """Clean and normalize text for embedding generation"""
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Truncate if too long (sentence-transformers have input limits)
        max_length = 512
        if len(text) > max_length:
            text = text[:max_length]
        
        return text
    
    def _calculate_cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            vec1_array = np.array(vec1)
            vec2_array = np.array(vec2)
            
            # Normalize vectors
            norm1 = np.linalg.norm(vec1_array)
            norm2 = np.linalg.norm(vec2_array)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            # Calculate cosine similarity
            similarity = np.dot(vec1_array, vec2_array) / (norm1 * norm2)
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Failed to calculate cosine similarity: {e}")
            return 0.0
    
    async def cleanup_old_embeddings(self, days_old: int = 30):
        """Clean up old embeddings to save storage"""
        try:
            client = await self.db.client
            
            # Delete chunks older than specified days
            result = await client.rpc('cleanup_old_document_chunks', {
                'p_days_old': days_old
            }).execute()
            
            logger.info(f"Cleaned up old embeddings: {result.data} chunks removed")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old embeddings: {e}")
    
    async def get_knowledge_base_stats(
        self,
        account_id: str,
        kb_type: Optional[str] = None
    ) -> Dict:
        """Get statistics about the knowledge base"""
        try:
            client = await self.db.client
            
            stats = {
                'total_chunks': 0,
                'total_tokens': 0,
                'kb_types': {},
                'recent_activity': 0
            }
            
            # Get total chunks and tokens
            chunks_query = client.table('document_chunks').select('chunk_tokens, kb_type')
            if kb_type:
                chunks_query = chunks_query.eq('kb_type', kb_type)
            
            chunks_result = await chunks_query.execute()
            
            if chunks_result.data:
                stats['total_chunks'] = len(chunks_result.data)
                stats['total_tokens'] = sum(chunk.get('chunk_tokens', 0) for chunk in chunks_result.data)
                
                # Count by kb_type
                for chunk in chunks_result.data:
                    kb_type = chunk.get('kb_type', 'unknown')
                    if kb_type not in stats['kb_types']:
                        stats['kb_types'][kb_type] = 0
                    stats['kb_types'][kb_type] += 1
            
            # Get recent query activity
            logs_query = client.table('kb_query_logs').select('created_at').eq('account_id', account_id)
            logs_result = await logs_query.execute()
            
            if logs_result.data:
                stats['recent_activity'] = len(logs_result.data)
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get knowledge base stats: {e}")
            return {}

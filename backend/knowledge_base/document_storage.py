"""
Document Storage Service

This module handles storing processed documents in the knowledge base system,
including chunking, indexing, and retrieval for LLM consumption.
"""

import asyncio
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from uuid import uuid4

from services.supabase import DBConnection
from utils.logger import logger
from knowledge_base.document_processor import process_document_async

class DocumentStorageService:
    """
    Service for storing and managing processed documents in the knowledge base
    """
    
    def __init__(self):
        self.db = DBConnection()
    
    async def store_document(
        self,
        account_id: str,
        file_content: bytes,
        mime_type: str,
        filename: str,
        kb_type: str,
        thread_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        chunk_size: int = 1000,
        overlap: int = 200,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process and store a document in the knowledge base
        
        Args:
            account_id: User's account ID
            file_content: Raw file bytes
            mime_type: MIME type of the file
            filename: Original filename
            kb_type: Knowledge base type (global, thread, agent)
            thread_id: Thread ID if storing in thread knowledge base
            agent_id: Agent ID if storing in agent knowledge base
            chunk_size: Maximum size of each text chunk
            overlap: Overlap between chunks
            metadata: Additional metadata
            
        Returns:
            Dictionary containing storage results
        """
        try:
            logger.info(f"Starting document storage process for {filename}")
            
            # Step 1: Process the document
            processing_result = await process_document_async(
                file_content, mime_type, filename, chunk_size, overlap
            )
            
            if not processing_result.get("success"):
                error_msg = processing_result.get("error", "Unknown processing error")
                logger.error(f"Document processing failed for {filename}: {error_msg}")
                return {
                    "success": False,
                    "error": f"Document processing failed: {error_msg}",
                    "job_id": None,
                    "filename": filename
                }
            
            # Step 2: Store in document processing queue
            queue_entry = await self._create_processing_queue_entry(
                account_id, thread_id, agent_id, kb_type, filename,
                file_content, mime_type, processing_result
            )
            
            if not queue_entry:
                return {
                    "success": False,
                    "error": "Failed to create processing queue entry",
                    "job_id": None,
                    "filename": filename
                }
            
            # Step 3: Store document chunks in knowledge base
            storage_result = await self._store_document_chunks(
                account_id, thread_id, agent_id, kb_type, filename,
                processing_result, queue_entry["id"]
            )
            
            if not storage_result.get("success"):
                # Update queue entry with error
                await self._update_processing_status(
                    queue_entry["id"], "failed", storage_result.get("error")
                )
                return storage_result
            
            # Step 4: Update processing queue status
            await self._update_processing_status(
                queue_entry["id"], "completed", 
                f"Successfully stored {storage_result['chunks_stored']} chunks"
            )
            
            logger.info(f"Document {filename} successfully stored with {storage_result['chunks_stored']} chunks")
            
            return {
                "success": True,
                "job_id": queue_entry["id"],
                "filename": filename,
                "chunks_stored": storage_result["chunks_stored"],
                "total_chunks": processing_result["total_chunks"],
                "processing_info": processing_result["processing_info"],
                "metadata": processing_result["metadata"]
            }
            
        except Exception as e:
            logger.error(f"Error storing document {filename}: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "job_id": None,
                "filename": filename
            }
    
    async def _create_processing_queue_entry(
        self,
        account_id: str,
        thread_id: Optional[str],
        agent_id: Optional[str],
        kb_type: str,
        filename: str,
        file_content: bytes,
        mime_type: str,
        processing_result: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Create an entry in the document processing queue"""
        try:
            client = await self.db.client
            
            # Prepare processing data
            processing_data = {
                'account_id': account_id,
                'thread_id': thread_id,
                'agent_id': agent_id,
                'kb_type': kb_type,
                'original_filename': filename,
                'file_path': f"uploads/{filename}",
                'file_size': len(file_content),
                'mime_type': mime_type,
                'document_type': mime_type.split('/')[-1],
                'status': 'processing',
                'extracted_text': processing_result.get("raw_text", ""),
                'processing_started_at': datetime.utcnow().isoformat(),
                'source_metadata': {
                    'chunk_size': processing_result.get("processing_info", {}).get("chunk_size"),
                    'overlap': processing_result.get("processing_info", {}).get("overlap"),
                    'total_chunks': processing_result.get("total_chunks"),
                    'total_tokens': processing_result.get("total_tokens"),
                    'original_size': processing_result.get("processing_info", {}).get("original_size"),
                    'cleaned_size': processing_result.get("processing_info", {}).get("cleaned_size")
                }
            }
            
            result = await client.table('document_processing_queue').insert(processing_data).execute()
            
            if not result.data:
                logger.error("Failed to create processing queue entry")
                return None
            
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Error creating processing queue entry: {e}")
            return None
    
    async def _store_document_chunks(
        self,
        account_id: str,
        thread_id: Optional[str],
        agent_id: Optional[str],
        kb_type: str,
        filename: str,
        processing_result: Dict[str, Any],
        queue_id: str
    ) -> Dict[str, Any]:
        """Store document chunks in the appropriate knowledge base"""
        try:
            client = await self.db.client
            chunks = processing_result.get("chunks", [])
            
            if not chunks:
                return {
                    "success": False,
                    "error": "No chunks to store",
                    "chunks_stored": 0
                }
            
            stored_chunks = []
            
            # Store each chunk based on knowledge base type
            for i, chunk in enumerate(chunks):
                chunk_data = {
                    'account_id': account_id,
                    'name': f"{filename} - Chunk {i+1}",
                    'description': f"Document chunk {i+1} of {len(chunks)} from {filename}",
                    'content': chunk["text"],
                    'usage_context': 'contextual',
                    'is_active': True,
                    'source_type': 'file_upload',
                    'source_metadata': {
                        'original_filename': filename,
                        'chunk_index': i,
                        'total_chunks': len(chunks),
                        'chunk_size': chunk["size"],
                        'word_count': chunk["word_count"],
                        'start_word': chunk["start_word"],
                        'end_word': chunk["end_word"],
                        'queue_id': queue_id,
                        'processing_timestamp': datetime.utcnow().isoformat()
                    }
                }
                
                # Add type-specific fields
                if kb_type == "global":
                    chunk_data['account_id'] = account_id
                    table_name = 'global_knowledge_base'
                elif kb_type == "thread":
                    chunk_data['thread_id'] = thread_id
                    chunk_data['account_id'] = account_id
                    table_name = 'thread_knowledge_base'
                elif kb_type == "agent":
                    chunk_data['agent_id'] = agent_id
                    chunk_data['account_id'] = account_id
                    # Note: Agent knowledge base uses existing table structure
                    table_name = 'agent_knowledge_base_entries'
                    chunk_data['agent_id'] = agent_id
                else:
                    logger.error(f"Invalid knowledge base type: {kb_type}")
                    continue
                
                try:
                    result = await client.table(table_name).insert(chunk_data).execute()
                    if result.data:
                        stored_chunks.append({
                            "chunk_id": result.data[0]["id"],
                            "chunk_index": i,
                            "size": chunk["size"]
                        })
                except Exception as e:
                    logger.error(f"Error storing chunk {i} in {table_name}: {e}")
                    continue
            
            logger.info(f"Successfully stored {len(stored_chunks)} chunks for {filename}")
            
            return {
                "success": True,
                "chunks_stored": len(stored_chunks),
                "total_chunks": len(chunks),
                "stored_chunks": stored_chunks
            }
            
        except Exception as e:
            logger.error(f"Error storing document chunks: {e}")
            return {
                "success": False,
                "error": str(e),
                "chunks_stored": 0
            }
    
    async def _update_processing_status(
        self, 
        queue_id: str, 
        status: str, 
        message: Optional[str] = None
    ):
        """Update the processing status in the queue"""
        try:
            client = await self.db.client
            
            update_data = {
                'status': status,
                'processing_completed_at': datetime.utcnow().isoformat()
            }
            
            if message:
                update_data['error_message'] = message
            
            await client.table('document_processing_queue').update(update_data).eq('id', queue_id).execute()
            
        except Exception as e:
            logger.error(f"Error updating processing status: {e}")
    
    async def get_document_chunks(
        self,
        account_id: str,
        kb_type: str,
        thread_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        query: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Retrieve document chunks for querying or context retrieval
        
        Args:
            account_id: User's account ID
            kb_type: Knowledge base type
            thread_id: Thread ID for thread-specific chunks
            agent_id: Agent ID for agent-specific chunks
            query: Optional search query
            limit: Maximum number of chunks to return
            
        Returns:
            List of document chunks
        """
        try:
            client = await self.db.client
            
            # Build query based on knowledge base type
            if kb_type == "global":
                table_name = 'global_knowledge_base'
                query_builder = client.table(table_name).select('*').eq('account_id', account_id)
            elif kb_type == "thread":
                table_name = 'thread_knowledge_base'
                query_builder = client.table(table_name).select('*').eq('account_id', account_id).eq('thread_id', thread_id)
            elif kb_type == "agent":
                table_name = 'agent_knowledge_base_entries'
                query_builder = client.table(table_name).select('*').eq('account_id', account_id).eq('agent_id', agent_id)
            else:
                logger.error(f"Invalid knowledge base type: {kb_type}")
                return []
            
            # Filter for file uploads and active entries
            query_builder = query_builder.eq('source_type', 'file_upload').eq('is_active', True)
            
            # Add text search if query provided
            if query:
                # Simple text search - in production, you might want to use full-text search
                query_builder = query_builder.textSearch('content', query)
            
            # Execute query
            result = await query_builder.order('created_at', desc=True).limit(limit).execute()
            
            if not result.data:
                return []
            
            # Process and format chunks
            chunks = []
            for chunk_data in result.data:
                chunk = {
                    "chunk_id": chunk_data["id"],
                    "content": chunk_data["content"],
                    "filename": chunk_data.get("source_metadata", {}).get("original_filename", "Unknown"),
                    "chunk_index": chunk_data.get("source_metadata", {}).get("chunk_index", 0),
                    "total_chunks": chunk_data.get("source_metadata", {}).get("total_chunks", 1),
                    "size": chunk_data.get("source_metadata", {}).get("chunk_size", 0),
                    "created_at": chunk_data["created_at"],
                    "metadata": chunk_data.get("source_metadata", {})
                }
                chunks.append(chunk)
            
            return chunks
            
        except Exception as e:
            logger.error(f"Error retrieving document chunks: {e}")
            return []
    
    async def search_documents(
        self,
        account_id: str,
        query: str,
        kb_type: str = "all",
        thread_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Search through stored documents for relevant content
        
        Args:
            account_id: User's account ID
            query: Search query
            kb_type: Knowledge base type to search (or "all")
            thread_id: Thread ID for thread-specific search
            agent_id: Agent ID for agent-specific search
            limit: Maximum number of results
            
        Returns:
            Search results with relevant chunks
        """
        try:
            all_chunks = []
            
            # Search in specified knowledge base types
            if kb_type == "all" or kb_type == "global":
                global_chunks = await self.get_document_chunks(
                    account_id, "global", limit=limit
                )
                all_chunks.extend(global_chunks)
            
            if kb_type == "all" or kb_type == "thread":
                if thread_id:
                    thread_chunks = await self.get_document_chunks(
                        account_id, "thread", thread_id=thread_id, limit=limit
                    )
                    all_chunks.extend(thread_chunks)
            
            if kb_type == "all" or kb_type == "agent":
                if agent_id:
                    agent_chunks = await self.get_document_chunks(
                        account_id, "agent", agent_id=agent_id, limit=limit
                    )
                    all_chunks.extend(agent_chunks)
            
            # Simple relevance scoring based on query terms
            scored_chunks = []
            query_terms = query.lower().split()
            
            for chunk in all_chunks:
                content_lower = chunk["content"].lower()
                score = 0
                
                # Calculate relevance score
                for term in query_terms:
                    if term in content_lower:
                        score += 1
                        # Bonus for exact matches
                        if term == query.lower():
                            score += 2
                
                if score > 0:
                    chunk["relevance_score"] = score
                    scored_chunks.append(chunk)
            
            # Sort by relevance score
            scored_chunks.sort(key=lambda x: x["relevance_score"], reverse=True)
            
            # Limit results
            top_chunks = scored_chunks[:limit]
            
            return {
                "success": True,
                "query": query,
                "total_chunks_found": len(scored_chunks),
                "top_results": top_chunks,
                "search_metadata": {
                    "kb_types_searched": [kb_type] if kb_type != "all" else ["global", "thread", "agent"],
                    "thread_id": thread_id,
                    "agent_id": agent_id,
                    "limit": limit
                }
            }
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return {
                "success": False,
                "error": str(e),
                "query": query,
                "total_chunks_found": 0,
                "top_results": []
            }
    
    async def get_processing_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get the processing status of a document upload job"""
        try:
            client = await self.db.client
            
            result = await client.table('document_processing_queue').select('*').eq('id', job_id).execute()
            
            if not result.data:
                return None
            
            job_data = result.data[0]
            
            return {
                "job_id": job_data["id"],
                "status": job_data["status"],
                "filename": job_data["original_filename"],
                "kb_type": job_data["kb_type"],
                "file_size": job_data["file_size"],
                "mime_type": job_data["mime_type"],
                "created_at": job_data["created_at"],
                "processing_started_at": job_data.get("processing_started_at"),
                "processing_completed_at": job_data.get("processing_completed_at"),
                "error_message": job_data.get("error_message"),
                "source_metadata": job_data.get("source_metadata", {})
            }
            
        except Exception as e:
            logger.error(f"Error getting processing status: {e}")
            return None
    
    async def delete_document_chunks(
        self,
        account_id: str,
        filename: str,
        kb_type: str,
        thread_id: Optional[str] = None,
        agent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Delete all chunks for a specific document
        
        Args:
            account_id: User's account ID
            filename: Original filename
            kb_type: Knowledge base type
            thread_id: Thread ID for thread-specific chunks
            agent_id: Agent ID for agent-specific chunks
            
        Returns:
            Deletion result
        """
        try:
            client = await self.db.client
            
            # Determine table name
            if kb_type == "global":
                table_name = 'global_knowledge_base'
                query_builder = client.table(table_name).select('id').eq('account_id', account_id)
            elif kb_type == "thread":
                table_name = 'thread_knowledge_base'
                query_builder = client.table(table_name).select('id').eq('account_id', account_id).eq('thread_id', thread_id)
            elif kb_type == "agent":
                table_name = 'agent_knowledge_base_entries'
                query_builder = client.table(table_name).select('id').eq('account_id', account_id).eq('agent_id', agent_id)
            else:
                return {
                    "success": False,
                    "error": f"Invalid knowledge base type: {kb_type}"
                }
            
            # Find chunks for this filename
            query_builder = query_builder.eq('source_type', 'file_upload')
            result = await query_builder.execute()
            
            if not result.data:
                return {
                    "success": True,
                    "chunks_deleted": 0,
                    "message": "No chunks found for this filename"
                }
            
            # Delete chunks
            chunk_ids = [chunk["id"] for chunk in result.data 
                        if chunk.get("source_metadata", {}).get("original_filename") == filename]
            
            if chunk_ids:
                await client.table(table_name).delete().in_('id', chunk_ids).execute()
            
            return {
                "success": True,
                "chunks_deleted": len(chunk_ids),
                "filename": filename,
                "message": f"Successfully deleted {len(chunk_ids)} chunks"
            }
            
        except Exception as e:
            logger.error(f"Error deleting document chunks: {e}")
            return {
                "success": False,
                "error": str(e)
            }






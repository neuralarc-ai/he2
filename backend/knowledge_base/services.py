from typing import List, Optional, Dict, Any
from services.supabase import DBConnection
from utils.logger import logger
from utils.auth_utils import get_current_user_id_from_jwt
from pydantic import BaseModel

class KnowledgeBaseService:
    def __init__(self):
        self.db = DBConnection()
    
    async def get_user_account_id(self, user_id: str, client) -> str:
        """Get user's account ID from JWT or fallback"""
        try:
            user_result = await client.auth.get_user()
            if user_result.user:
                account_id = user_result.user.user_metadata.get('account_id')
                if account_id:
                    return account_id
        except Exception as e:
            logger.warning(f"JWT authentication failed: {e}")
        
        # Fallback: get default account for user
        try:
            account_result = await client.rpc('get_user_default_account', {
                'p_user_id': user_id
            }).execute()
            account_id = account_result.data if account_result.data else None
            if account_id:
                return account_id
        except Exception as e:
            logger.error(f"Error getting default account: {e}")
        
        raise ValueError("No account found for user")
    
    async def verify_thread_access(self, thread_id: str, user_account_id: str, client) -> str:
        """Verify user has access to thread and return thread account ID"""
        thread_result = await client.table('threads').select('account_id').eq('thread_id', thread_id).execute()
        if not thread_result.data:
            raise ValueError("Thread not found")
        
        thread_account_id = thread_result.data[0]['account_id']
        if user_account_id != thread_account_id:
            raise ValueError("Access denied to thread")
        
        return thread_account_id
    
    async def verify_agent_access(self, agent_id: str, user_account_id: str, client) -> str:
        """Verify user has access to agent and return agent account ID"""
        agent_result = await client.table('agents').select('account_id').eq('agent_id', agent_id).execute()
        if not agent_result.data:
            raise ValueError("Agent not found")
        
        agent_account_id = agent_result.data[0]['account_id']
        if user_account_id != agent_account_id:
            raise ValueError("Access denied to agent")
        
        return agent_account_id
    
    async def get_global_knowledge_base(self, user_id: str, include_inactive: bool = False) -> Dict[str, Any]:
        """Get global knowledge base entries for a user's account"""
        client = await self.db.client
        account_id = await self.get_user_account_id(user_id, client)
        
        try:
            result = await client.table('global_knowledge_base').select('*').eq('account_id', account_id).eq('is_active', True).execute()
        except Exception as e:
            logger.error(f"Error accessing global_knowledge_base table: {e}")
            # Return empty result if table doesn't exist yet
            return {
                "entries": [],
                "total_count": 0,
                "total_tokens": 0
            }
        
        entries = []
        total_tokens = 0
        
        for entry_data in result.data or []:
            entry = {
                "entry_id": entry_data['id'],
                "name": entry_data['name'],
                "description": entry_data['description'],
                "content": entry_data['content'],
                "usage_context": entry_data['usage_context'],
                "is_active": entry_data['is_active'],
                "content_tokens": entry_data.get('content_tokens'),
                "created_at": entry_data['created_at'],
                "updated_at": entry_data.get('updated_at', entry_data['created_at']),
                "source_type": 'manual',
                "source_metadata": entry_data.get('source_metadata'),
                "file_size": None,
                "file_mime_type": None
            }
            entries.append(entry)
            total_tokens += entry_data.get('content_tokens', 0) or 0
        
        return {
            "entries": entries,
            "total_count": len(entries),
            "total_tokens": total_tokens
        }
    
    async def create_global_knowledge_base_entry(self, user_id: str, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new global knowledge base entry"""
        client = await self.db.client
        account_id = await self.get_user_account_id(user_id, client)
        
        insert_data = {
            'account_id': account_id,
            'name': entry_data['name'],
            'description': entry_data.get('description'),
            'content': entry_data['content'],
            'usage_context': entry_data.get('usage_context', 'always')
        }
        
        try:
            result = await client.table('global_knowledge_base').insert(insert_data).execute()
        except Exception as e:
            logger.error(f"Error inserting into global_knowledge_base table: {e}")
            raise ValueError("Knowledge base table not available. Please ensure the database migration has been run.")
        
        if not result.data:
            raise ValueError("Failed to create global knowledge base entry")
        
        created_entry = result.data[0]
        
        return {
            "entry_id": created_entry['id'],
            "name": created_entry['name'],
            "description": created_entry['description'],
            "content": created_entry['content'],
            "usage_context": created_entry['usage_context'],
            "is_active": created_entry['is_active'],
            "content_tokens": created_entry.get('content_tokens'),
            "created_at": created_entry['created_at'],
            "updated_at": created_entry['updated_at']
        }
    
    async def update_global_knowledge_base_entry(self, user_id: str, entry_id: str, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a global knowledge base entry"""
        client = await self.db.client
        account_id = await self.get_user_account_id(user_id, client)
        
        # Verify entry exists and user has access
        entry_result = await client.table('global_knowledge_base').select('*').eq('id', entry_id).eq('account_id', account_id).execute()
        if not entry_result.data:
            raise ValueError("Global knowledge base entry not found")
        
        # Prepare update data
        update_data = {}
        for field in ['name', 'description', 'content', 'usage_context', 'is_active']:
            if field in entry_data and entry_data[field] is not None:
                update_data[field] = entry_data[field]
        
        # Update the entry
        result = await client.table('global_knowledge_base').update(update_data).eq('id', entry_id).execute()
        
        if not result.data:
            raise ValueError("Failed to update global knowledge base entry")
        
        updated_entry = result.data[0]
        
        return {
            "entry_id": updated_entry['id'],
            "name": updated_entry['name'],
            "description": updated_entry['description'],
            "content": updated_entry['content'],
            "usage_context": updated_entry['usage_context'],
            "is_active": updated_entry['is_active'],
            "content_tokens": updated_entry.get('content_tokens'),
            "created_at": updated_entry['created_at'],
            "updated_at": updated_entry['updated_at']
        }
    
    async def delete_global_knowledge_base_entry(self, user_id: str, entry_id: str) -> None:
        """Delete a global knowledge base entry"""
        client = await self.db.client
        account_id = await self.get_user_account_id(user_id, client)
        
        # Verify entry exists and user has access
        entry_result = await client.table('global_knowledge_base').select('*').eq('id', entry_id).eq('account_id', account_id).execute()
        if not entry_result.data:
            raise ValueError("Global knowledge base entry not found")
        
        # Delete the entry
        await client.table('global_knowledge_base').delete().eq('id', entry_id).execute()
    
    async def get_thread_knowledge_base(self, user_id: str, thread_id: str, include_inactive: bool = False) -> Dict[str, Any]:
        """Get thread knowledge base entries"""
        client = await self.db.client
        user_account_id = await self.get_user_account_id(user_id, client)
        thread_account_id = await self.verify_thread_access(thread_id, user_account_id, client)
        
        result = await client.table('thread_knowledge_base').select('*').eq('thread_id', thread_id).eq('is_active', True).execute()
        
        entries = []
        total_tokens = 0
        
        for entry_data in result.data or []:
            entry = {
                "entry_id": entry_data['id'],
                "name": entry_data['name'],
                "description": entry_data['description'],
                "content": entry_data['content'],
                "usage_context": entry_data['usage_context'],
                "is_active": entry_data['is_active'],
                "content_tokens": entry_data.get('content_tokens'),
                "created_at": entry_data['created_at'],
                "updated_at": entry_data.get('updated_at', entry_data['created_at']),
                "source_type": 'manual',
                "source_metadata": entry_data.get('source_metadata'),
                "file_size": None,
                "file_mime_type": None
            }
            entries.append(entry)
            total_tokens += entry_data.get('content_tokens', 0) or 0
        
        return {
            "entries": entries,
            "total_count": len(entries),
            "total_tokens": total_tokens
        }
    
    async def create_thread_knowledge_base_entry(self, user_id: str, thread_id: str, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new thread knowledge base entry"""
        client = await self.db.client
        user_account_id = await self.get_user_account_id(user_id, client)
        thread_account_id = await self.verify_thread_access(thread_id, user_account_id, client)
        
        insert_data = {
            'thread_id': thread_id,
            'account_id': thread_account_id,
            'name': entry_data['name'],
            'description': entry_data.get('description'),
            'content': entry_data['content'],
            'usage_context': entry_data.get('usage_context', 'always')
        }
        
        result = await client.table('thread_knowledge_base').insert(insert_data).execute()
        
        if not result.data:
            raise ValueError("Failed to create thread knowledge base entry")
        
        created_entry = result.data[0]
        
        return {
            "entry_id": created_entry['id'],
            "name": created_entry['name'],
            "description": created_entry['description'],
            "content": created_entry['content'],
            "usage_context": created_entry['usage_context'],
            "is_active": created_entry['is_active'],
            "content_tokens": created_entry.get('content_tokens'),
            "created_at": created_entry['created_at'],
            "updated_at": created_entry['updated_at']
        }
    
    async def update_thread_knowledge_base_entry(self, user_id: str, thread_id: str, entry_id: str, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a thread knowledge base entry"""
        client = await self.db.client
        user_account_id = await self.get_user_account_id(user_id, client)
        thread_account_id = await self.verify_thread_access(thread_id, user_account_id, client)
        
        # Verify entry exists and belongs to this thread
        entry_result = await client.table('thread_knowledge_base').select('*').eq('id', entry_id).eq('thread_id', thread_id).execute()
        if not entry_result.data:
            raise ValueError("Thread knowledge base entry not found")
        
        # Prepare update data
        update_data = {}
        for field in ['name', 'description', 'content', 'usage_context', 'is_active']:
            if field in entry_data and entry_data[field] is not None:
                update_data[field] = entry_data[field]
        
        # Update the entry
        result = await client.table('thread_knowledge_base').update(update_data).eq('id', entry_id).execute()
        
        if not result.data:
            raise ValueError("Failed to update thread knowledge base entry")
        
        updated_entry = result.data[0]
        
        return {
            "entry_id": updated_entry['id'],
            "name": updated_entry['name'],
            "description": updated_entry['description'],
            "content": updated_entry['content'],
            "usage_context": updated_entry['usage_context'],
            "is_active": updated_entry['is_active'],
            "content_tokens": updated_entry.get('content_tokens'),
            "created_at": updated_entry['created_at'],
            "updated_at": updated_entry['updated_at']
        }
    
    async def delete_thread_knowledge_base_entry(self, user_id: str, thread_id: str, entry_id: str) -> None:
        """Delete a thread knowledge base entry"""
        client = await self.db.client
        user_account_id = await self.get_user_account_id(user_id, client)
        thread_account_id = await self.verify_thread_access(thread_id, user_account_id, client)
        
        # Verify entry exists and belongs to this thread
        entry_result = await client.table('thread_knowledge_base').select('*').eq('id', entry_id).eq('thread_id', thread_id).execute()
        if not entry_result.data:
            raise ValueError("Thread knowledge base entry not found")
        
        # Delete the entry
        await client.table('thread_knowledge_base').delete().eq('id', entry_id).execute()
    
    async def get_global_knowledge_base_context(self, user_id: str, max_tokens: int = 4000) -> Optional[str]:
        """Get global knowledge base context for prompts"""
        client = await self.db.client
        account_id = await self.get_user_account_id(user_id, client)
        
        result = await client.rpc('get_global_knowledge_base_context', {
            'p_account_id': account_id,
            'p_max_tokens': max_tokens
        }).execute()
        
        return result.data if result.data else None
    
    async def get_thread_knowledge_base_context(self, user_id: str, thread_id: str, max_tokens: int = 4000) -> Optional[str]:
        """Get thread knowledge base context for prompts"""
        client = await self.db.client
        user_account_id = await self.get_user_account_id(user_id, client)
        await self.verify_thread_access(thread_id, user_account_id, client)
        
        result = await client.rpc('get_thread_knowledge_base_context', {
            'p_thread_id': thread_id,
            'p_max_tokens': max_tokens
        }).execute()
        
        return result.data if result.data else None
    
    async def get_combined_knowledge_base_context(self, user_id: str, thread_id: str, agent_id: Optional[str] = None, max_tokens: int = 4000) -> Optional[str]:
        """Get combined knowledge base context (global + thread + agent) for prompts"""
        client = await self.db.client
        user_account_id = await self.get_user_account_id(user_id, client)
        await self.verify_thread_access(thread_id, user_account_id, client)
        
        # Verify agent access if provided
        if agent_id:
            await self.verify_agent_access(agent_id, user_account_id, client)
        
        result = await client.rpc('get_combined_knowledge_base_context', {
            'p_thread_id': thread_id,
            'p_account_id': user_account_id,
            'p_agent_id': agent_id,
            'p_max_tokens': max_tokens
        }).execute()
        
        return result.data if result.data else None
    
    async def upload_document(self, user_id: str, file_data: Dict[str, Any], kb_type: str, thread_id: Optional[str] = None, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """Upload a document to the knowledge base"""
        client = await self.db.client
        account_id = await self.get_user_account_id(user_id, client)
        
        # Verify thread access if provided
        if thread_id:
            await self.verify_thread_access(thread_id, account_id, client)
        
        # Verify agent access if provided
        if agent_id:
            await self.verify_agent_access(agent_id, account_id, client)
        
        # Create document processing queue entry
        processing_data = {
            'account_id': account_id,
            'thread_id': thread_id,
            'agent_id': agent_id,
            'kb_type': kb_type,
            'original_filename': file_data['filename'],
            'file_path': f"uploads/{file_data['filename']}",
            'file_size': file_data['size'],
            'mime_type': file_data['content_type'],
            'document_type': file_data['content_type'].split('/')[-1],
            'status': 'pending',
            'extracted_text': file_data.get('extracted_text')
        }
        
        try:
            # Insert into document processing queue
            result = await client.table('document_processing_queue').insert(processing_data).execute()
            
            if not result.data:
                raise ValueError("Failed to create processing job")
            
            job_id = result.data[0]['id']
            
            logger.info(f"Document upload queued successfully: {job_id}")
            
            return {
                "message": "Document uploaded successfully",
                "job_id": job_id,
                "status": "pending",
                "filename": file_data['filename']
            }
            
        except Exception as e:
            logger.error(f"Error inserting into document_processing_queue: {e}")
            raise ValueError("Knowledge base table not available. Please ensure the database migration has been run.")
    
    async def query_knowledge_base(self, user_id: str, query: str, kb_type: str, thread_id: Optional[str] = None, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """Query the knowledge base for relevant information"""
        client = await self.db.client
        account_id = await self.get_user_account_id(user_id, client)
        
        # Verify thread access if provided
        if thread_id:
            await self.verify_thread_access(thread_id, account_id, client)
        
        # Verify agent access if provided
        if agent_id:
            await self.verify_agent_access(agent_id, account_id, client)
        
        # For now, return a simple response (embedding-based search can be implemented later)
        return {
            "relevant": True,
            "chunks_found": 0,
            "chunks": [],
            "suggested_response": "Knowledge base query functionality is available. Embedding-based search will be implemented in a future update."
        }






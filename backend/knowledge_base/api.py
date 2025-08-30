import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks, Query
from pydantic import BaseModel, Field, HttpUrl
from utils.auth_utils import get_current_user_id_from_jwt, verify_agent_access
from services.supabase import DBConnection
from knowledge_base.file_processor import FileProcessor
from utils.logger import logger
from flags.flags import is_enabled

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"])

class KnowledgeBaseEntry(BaseModel):
    entry_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    content: str = Field(..., min_length=1)
    usage_context: str = Field(default="always", pattern="^(always|on_request|contextual)$")
    is_active: bool = True
    kb_type: str = Field(default="agent", pattern="^(agent|global|thread)$")
    thread_id: Optional[str] = None

class KnowledgeBaseEntryResponse(BaseModel):
    entry_id: str
    name: str
    description: Optional[str]
    content: str
    usage_context: str
    is_active: bool
    content_tokens: Optional[int]
    created_at: str
    updated_at: str
    source_type: Optional[str] = None
    source_metadata: Optional[dict] = None
    file_size: Optional[int] = None
    file_mime_type: Optional[str] = None

class KnowledgeBaseListResponse(BaseModel):
    entries: List[KnowledgeBaseEntryResponse]
    total_count: int
    total_tokens: int

class CreateKnowledgeBaseEntryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    content: str = Field(..., min_length=1)
    usage_context: str = Field(default="always", pattern="^(always|on_request|contextual)$")

class UpdateKnowledgeBaseEntryRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    content: Optional[str] = Field(None, min_length=1)
    usage_context: Optional[str] = Field(None, pattern="^(always|on_request|contextual)$")
    is_active: Optional[bool] = None

class ProcessingJobResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    source_info: dict
    result_info: dict
    entries_created: int
    total_files: int
    created_at: str
    completed_at: Optional[str]
    error_message: Optional[str]

db = DBConnection()


@router.get("/agents/{agent_id}", response_model=KnowledgeBaseListResponse)
async def get_agent_knowledge_base(
    agent_id: str,
    include_inactive: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt),
    # Fallback for large headers
    auth_token: str = None
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get all knowledge base entries for an agent"""
    try:
        client = await db.client

        # Verify agent access
        await verify_agent_access(client, agent_id, user_id)

        result = await client.rpc('get_agent_knowledge_base', {
            'p_agent_id': agent_id,
            'p_include_inactive': include_inactive
        }).execute()
        
        entries = []
        total_tokens = 0
        
        for entry_data in result.data or []:
            entry = KnowledgeBaseEntryResponse(
                entry_id=entry_data['entry_id'],
                name=entry_data['name'],
                description=entry_data['description'],
                content=entry_data['content'],
                usage_context=entry_data['usage_context'],
                is_active=entry_data['is_active'],
                content_tokens=entry_data.get('content_tokens'),
                created_at=entry_data['created_at'],
                updated_at=entry_data.get('updated_at', entry_data['created_at']),
                source_type=entry_data.get('source_type'),
                source_metadata=entry_data.get('source_metadata'),
                file_size=entry_data.get('file_size'),
                file_mime_type=entry_data.get('file_mime_type')
            )
            entries.append(entry)
            total_tokens += entry_data.get('content_tokens', 0) or 0
        
        return KnowledgeBaseListResponse(
            entries=entries,
            total_count=len(entries),
            total_tokens=total_tokens
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting knowledge base for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve agent knowledge base")

@router.post("/agents/{agent_id}", response_model=KnowledgeBaseEntryResponse)
async def create_agent_knowledge_base_entry(
    agent_id: str,
    entry_data: CreateKnowledgeBaseEntryRequest,
    user_id: str = Depends(get_current_user_id_from_jwt),
    # Fallback for large headers
    auth_token: str = None
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Create a new knowledge base entry for an agent"""
    try:
        client = await db.client
        
        # Verify agent access and get agent data
        agent_data = await verify_agent_access(client, agent_id, user_id)
        account_id = agent_data['account_id']
        
        insert_data = {
            'agent_id': agent_id,
            'account_id': account_id,
            'name': entry_data.name,
            'description': entry_data.description,
            'content': entry_data.content,
            'usage_context': entry_data.usage_context
        }
        
        result = await client.table('agent_knowledge_base_entries').insert(insert_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create agent knowledge base entry")
        
        created_entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=created_entry['entry_id'],
            name=created_entry['name'],
            description=created_entry['description'],
            content=created_entry['content'],
            usage_context=created_entry['usage_context'],
            is_active=created_entry['is_active'],
            content_tokens=created_entry.get('content_tokens'),
            created_at=created_entry['created_at'],
            updated_at=created_entry['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating knowledge base entry for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create agent knowledge base entry")

@router.post("/agents/{agent_id}/upload-file")
async def upload_file_to_agent_kb(
    agent_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Upload and process a file for agent knowledge base"""
    try:
        client = await db.client
        
        # Verify agent access and get agent data
        agent_data = await verify_agent_access(client, agent_id, user_id)
        account_id = agent_data['account_id']
        
        file_content = await file.read()
        job_id = await client.rpc('create_agent_kb_processing_job', {
            'p_agent_id': agent_id,
            'p_account_id': account_id,
            'p_job_type': 'file_upload',
            'p_source_info': {
                'filename': file.filename,
                'mime_type': file.content_type,
                'file_size': len(file_content)
            }
        }).execute()
        
        if not job_id.data:
            raise HTTPException(status_code=500, detail="Failed to create processing job")
        
        job_id = job_id.data
        background_tasks.add_task(
            process_file_background,
            job_id,
            agent_id,
            account_id,
            file_content,
            file.filename,
            file.content_type or 'application/octet-stream'
        )
        
        return {
            "job_id": job_id,
            "message": "File upload started. Processing in background.",
            "filename": file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file to agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload file")


@router.put("/{entry_id}", response_model=KnowledgeBaseEntryResponse)
async def update_knowledge_base_entry(
    entry_id: str,
    entry_data: UpdateKnowledgeBaseEntryRequest,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Update an agent knowledge base entry"""
    try:
        client = await db.client
        
        # Get the entry and verify it exists in agent_knowledge_base_entries table
        entry_result = await client.table('agent_knowledge_base_entries').select('*').eq('entry_id', entry_id).execute()
            
        if not entry_result.data:
            raise HTTPException(status_code=404, detail="Knowledge base entry not found")
        
        entry = entry_result.data[0]
        agent_id = entry['agent_id']
        
        # Verify agent access
        await verify_agent_access(client, agent_id, user_id)
        
        update_data = {}
        if entry_data.name is not None:
            update_data['name'] = entry_data.name
        if entry_data.description is not None:
            update_data['description'] = entry_data.description
        if entry_data.content is not None:
            update_data['content'] = entry_data.content
        if entry_data.usage_context is not None:
            update_data['usage_context'] = entry_data.usage_context
        if entry_data.is_active is not None:
            update_data['is_active'] = entry_data.is_active
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = await client.table('agent_knowledge_base_entries').update(update_data).eq('entry_id', entry_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update knowledge base entry")
        
        updated_entry = result.data[0]
        
        logger.debug(f"Updated agent knowledge base entry {entry_id} for agent {agent_id}")
        
        return KnowledgeBaseEntryResponse(
            entry_id=updated_entry['entry_id'],
            name=updated_entry['name'],
            description=updated_entry['description'],
            content=updated_entry['content'],
            usage_context=updated_entry['usage_context'],
            is_active=updated_entry['is_active'],
            content_tokens=updated_entry.get('content_tokens'),
            created_at=updated_entry['created_at'],
            updated_at=updated_entry['updated_at'],
            source_type=updated_entry.get('source_type'),
            source_metadata=updated_entry.get('source_metadata'),
            file_size=updated_entry.get('file_size'),
            file_mime_type=updated_entry.get('file_mime_type')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating knowledge base entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update knowledge base entry")

@router.delete("/{entry_id}")
async def delete_knowledge_base_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )

    """Delete an agent knowledge base entry"""
    try:
        client = await db.client
        
        # Get the entry and verify it exists in agent_knowledge_base_entries table
        entry_result = await client.table('agent_knowledge_base_entries').select('entry_id, agent_id').eq('entry_id', entry_id).execute()
            
        if not entry_result.data:
            raise HTTPException(status_code=404, detail="Knowledge base entry not found")
        
        entry = entry_result.data[0]
        agent_id = entry['agent_id']
        
        # Verify agent access
        await verify_agent_access(client, agent_id, user_id)
        
        result = await client.table('agent_knowledge_base_entries').delete().eq('entry_id', entry_id).execute()
        
        logger.debug(f"Deleted agent knowledge base entry {entry_id} for agent {agent_id}")
        
        return {"message": "Knowledge base entry deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting knowledge base entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete knowledge base entry")


@router.get("/{entry_id}", response_model=KnowledgeBaseEntryResponse)
async def get_knowledge_base_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    """Get a specific agent knowledge base entry"""
    try:
        client = await db.client
        
        # Get the entry from agent_knowledge_base_entries table only
        result = await client.table('agent_knowledge_base_entries').select('*').eq('entry_id', entry_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Knowledge base entry not found")
        
        entry = result.data[0]
        agent_id = entry['agent_id']
        
        # Verify agent access
        await verify_agent_access(client, agent_id, user_id)
        
        logger.debug(f"Retrieved agent knowledge base entry {entry_id} for agent {agent_id}")
        
        return KnowledgeBaseEntryResponse(
            entry_id=entry['entry_id'],
            name=entry['name'],
            description=entry['description'],
            content=entry['content'],
            usage_context=entry['usage_context'],
            is_active=entry['is_active'],
            content_tokens=entry.get('content_tokens'),
            created_at=entry['created_at'],
            updated_at=entry['updated_at'],
            source_type=entry.get('source_type'),
            source_metadata=entry.get('source_metadata'),
            file_size=entry.get('file_size'),
            file_mime_type=entry.get('file_mime_type')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting knowledge base entry {entry_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve knowledge base entry")


@router.get("/agents/{agent_id}/processing-jobs", response_model=List[ProcessingJobResponse])
async def get_agent_processing_jobs(
    agent_id: str,
    limit: int = 10,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get processing jobs for an agent"""
    try:
        client = await db.client

        # Verify agent access
        await verify_agent_access(client, agent_id, user_id)
        
        result = await client.rpc('get_agent_kb_processing_jobs', {
            'p_agent_id': agent_id,
            'p_limit': limit
        }).execute()
        
        jobs = []
        for job_data in result.data or []:
            job = ProcessingJobResponse(
                job_id=job_data['job_id'],
                job_type=job_data['job_type'],
                status=job_data['status'],
                source_info=job_data['source_info'],
                result_info=job_data['result_info'],
                entries_created=job_data['entries_created'],
                total_files=job_data['total_files'],
                created_at=job_data['created_at'],
                completed_at=job_data.get('completed_at'),
                error_message=job_data.get('error_message')
            )
            jobs.append(job)
        
        return jobs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting processing jobs for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get processing jobs")

async def process_file_background(
    job_id: str,
    agent_id: str,
    account_id: str,
    file_content: bytes,
    filename: str,
    mime_type: str
):
    """Background task to process uploaded files"""
    
    processor = FileProcessor()
    client = await processor.db.client
    try:
        await client.rpc('update_agent_kb_job_status', {
            'p_job_id': job_id,
            'p_status': 'processing'
        }).execute()
        
        result = await processor.process_file_upload(
            agent_id, account_id, file_content, filename, mime_type
        )
        
        if result['success']:
            await client.rpc('update_agent_kb_job_status', {
                'p_job_id': job_id,
                'p_status': 'completed',
                'p_result_info': result,
                'p_entries_created': 1,
                'p_total_files': 1
            }).execute()
        else:
            await client.rpc('update_agent_kb_job_status', {
                'p_job_id': job_id,
                'p_status': 'failed',
                'p_error_message': result.get('error', 'Unknown error')
            }).execute()
            
    except Exception as e:
        logger.error(f"Error in background file processing for job {job_id}: {str(e)}")
        try:
            await client.rpc('update_agent_kb_job_status', {
                'p_job_id': job_id,
                'p_status': 'failed',
                'p_error_message': str(e)
            }).execute()
        except:
            pass


@router.get("/agents/{agent_id}/context")
async def get_agent_knowledge_base_context(
    agent_id: str,
    max_tokens: int = 4000,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    """Get knowledge base context for agent prompts"""
    try:
        client = await db.client
        
        # Verify agent access
        await verify_agent_access(client, agent_id, user_id)
        
        result = await client.rpc('get_agent_knowledge_base_context', {
            'p_agent_id': agent_id,
            'p_max_tokens': max_tokens
        }).execute()
        
        context = result.data if result.data else None
        
        return {
            "context": context,
            "max_tokens": max_tokens,
            "agent_id": agent_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting knowledge base context for agent {agent_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve agent knowledge base context")


# Global Knowledge Base Endpoints
@router.get("/global", response_model=KnowledgeBaseListResponse)
async def get_global_knowledge_base(
    include_inactive: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt),
    # Fallback for large headers
    auth_token: str = None
):
    """Get all global knowledge base entries"""
    logger.info(f"Getting global knowledge base for user: {user_id}")
    
    if not await is_enabled("knowledge_base"):
        logger.warning("Knowledge base feature is disabled")
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    try:
        client = await db.client
        logger.info("Database client connected successfully")
        
        # Get user's account ID - try JWT first, then fallback to auth_token
        user_result = None
        if user_id:
            try:
                user_result = await client.auth.get_user()
                logger.info(f"User result from JWT: {user_result}")
            except Exception as jwt_error:
                logger.warning(f"JWT authentication failed: {jwt_error}")
                user_result = None
        
        # Fallback: try to get user from auth_token if JWT failed
        if not user_result and auth_token:
            try:
                logger.info("Attempting fallback authentication with auth_token")
                # Set the auth token manually
                client.auth.set_session(auth_token, None)
                user_result = await client.auth.get_user()
                logger.info(f"User result from auth_token: {user_result}")
            except Exception as token_error:
                logger.error(f"Fallback authentication failed: {token_error}")
        
        if not user_result or not user_result.user:
            logger.error("User not authenticated via any method")
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Get account ID from user metadata or default account
        account_id = user_result.user.user_metadata.get('account_id')
        logger.info(f"Account ID from metadata: {account_id}")
        
        if not account_id:
            logger.info("No account ID in metadata, trying to get default account")
            # Get default account for user
            try:
                account_result = await client.rpc('get_user_default_account', {
                    'p_user_id': user_id
                }).execute()
                account_id = account_result.data if account_result.data else None
                logger.info(f"Default account result: {account_result.data}")
            except Exception as rpc_error:
                logger.error(f"Error getting default account: {rpc_error}")
                account_id = None
        
        logger.info(f"Account ID: {account_id}")
        
        # Query global knowledge base
        try:
            logger.info("Querying global_knowledge_base table")
            
            # Try to get entries using the RPC function first (which bypasses RLS)
            try:
                logger.info("Trying RPC function get_global_knowledge_base")
                if account_id:
                    rpc_result = await client.rpc('get_global_knowledge_base', {
                        'p_account_id': account_id,
                        'p_include_inactive': include_inactive
                    }).execute()
                    logger.info(f"RPC result: {rpc_result.data if rpc_result.data else 'No data'}")
                    
                    if rpc_result.data:
                        entries = []
                        total_tokens = 0
                        
                        for entry_data in rpc_result.data:
                            entry = KnowledgeBaseEntryResponse(
                                entry_id=entry_data['id'],
                                name=entry_data['name'],
                                description=entry_data['description'],
                                content=entry_data['content'],
                                usage_context=entry_data['usage_context'],
                                is_active=entry_data['is_active'],
                                content_tokens=entry_data.get('content_tokens'),
                                created_at=entry_data['created_at'],
                                updated_at=entry_data.get('updated_at', entry_data['created_at']),
                                source_type=entry_data.get('source_type', 'manual'),
                                source_metadata=entry_data.get('source_metadata'),
                                file_size=None,
                                file_mime_type=None
                            )
                            entries.append(entry)
                            total_tokens += entry_data.get('content_tokens', 0) or 0
                        
                        response = KnowledgeBaseListResponse(
                            entries=entries,
                            total_count=len(entries),
                            total_tokens=total_tokens
                        )
                        
                        logger.info(f"Returning response from RPC: {response}")
                        return response
                else:
                    logger.warning("No account_id available for RPC call")
            except Exception as rpc_error:
                logger.warning(f"RPC function failed: {rpc_error}, trying direct table access")
            
            # Fallback to direct table access
            # If no account_id is found, try to get all entries for the user
            if not account_id:
                logger.warning("No account found for user, trying to get all entries")
                query = client.table('global_knowledge_base').select('*')
            else:
                query = client.table('global_knowledge_base').select('*').eq('account_id', account_id)
            
            # Only filter by is_active if include_inactive is False
            if not include_inactive:
                query = query.eq('is_active', True)
            
            result = await query.execute()
            logger.info(f"Direct table query result: {result.data if result.data else 'No data'}")
            
            if result.error:
                logger.error(f"Table query error: {result.error}")
                # Return empty result if there's an error
                return KnowledgeBaseListResponse(
                    entries=[],
                    total_count=0,
                    total_tokens=0
                )
                
        except Exception as table_error:
            logger.error(f"Error accessing global_knowledge_base table: {table_error}")
            # Return empty result if table doesn't exist yet
            return KnowledgeBaseListResponse(
                entries=[],
                total_count=0,
                total_tokens=0
            )
        
        entries = []
        total_tokens = 0
        
        for entry_data in result.data or []:
            entry = KnowledgeBaseEntryResponse(
                entry_id=entry_data['id'],
                name=entry_data['name'],
                description=entry_data['description'],
                content=entry_data['content'],
                usage_context=entry_data['usage_context'],
                is_active=entry_data['is_active'],
                content_tokens=entry_data.get('content_tokens'),
                created_at=entry_data['created_at'],
                updated_at=entry_data.get('updated_at', entry_data['created_at']),
                source_type='manual',
                source_metadata=entry_data.get('source_metadata'),
                file_size=None,
                file_mime_type=None
            )
            entries.append(entry)
            total_tokens += entry_data.get('content_tokens', 0) or 0
        
        response = KnowledgeBaseListResponse(
            entries=entries,
            total_count=len(entries),
            total_tokens=total_tokens
        )
        
        logger.info(f"Returning response: {response}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting global knowledge base: {str(e)}", exc_info=True)
        # Return empty result instead of failing
        logger.warning("Returning empty knowledge base due to error")
        return KnowledgeBaseListResponse(
            entries=[],
            total_count=0,
            total_tokens=0
        )


@router.post("/global", response_model=KnowledgeBaseEntryResponse)
async def create_global_knowledge_base_entry(
    entry_data: CreateKnowledgeBaseEntryRequest,
    user_id: str = Depends(get_current_user_id_from_jwt),
    # Fallback for large headers
    auth_token: str = None
):
    """Create a new global knowledge base entry"""
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    try:
        client = await db.client
        
        # Get user's account ID - try JWT first, then fallback to auth_token
        user_result = None
        if user_id:
            try:
                user_result = await client.auth.get_user()
                logger.info(f"User result from JWT for global POST: {user_result}")
            except Exception as jwt_error:
                logger.warning(f"JWT authentication failed for global POST: {jwt_error}")
                user_result = None
        
        # Fallback: try to get user from auth_token if JWT failed
        if not user_result and auth_token:
            try:
                logger.info("Attempting fallback authentication with auth_token for global POST")
                # Set the auth token manually
                client.auth.set_session(auth_token, None)
                user_result = await client.auth.get_user()
                logger.info(f"User result from auth_token for global POST: {user_result}")
            except Exception as token_error:
                logger.error(f"Fallback authentication failed for global POST: {token_error}")
        
        if not user_result or not user_result.user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        account_id = user_result.user.user_metadata.get('account_id')
        if not account_id:
            # Get default account for user
            try:
                account_result = await client.rpc('get_user_default_account', {
                    'p_user_id': user_id
                }).execute()
                account_id = account_result.data if account_result.data else None
            except Exception as rpc_error:
                logger.error(f"Error getting default account for global POST: {rpc_error}")
                account_id = None
        
        if not account_id:
            raise HTTPException(status_code=400, detail="No account found for user")
        
        insert_data = {
            'account_id': account_id,
            'name': entry_data.name,
            'description': entry_data.description,
            'content': entry_data.content,
            'usage_context': entry_data.usage_context
        }
        
        try:
            result = await client.table('global_knowledge_base').insert(insert_data).execute()
        except Exception as table_error:
            logger.error(f"Error inserting into global_knowledge_base table: {table_error}")
            raise HTTPException(status_code=500, detail="Knowledge base table not available. Please ensure the database migration has been run.")
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create global knowledge base entry")
        
        created_entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=created_entry['id'],
            name=created_entry['name'],
            description=created_entry['description'],
            content=created_entry['content'],
            usage_context=created_entry['usage_context'],
            is_active=created_entry['is_active'],
            content_tokens=created_entry.get('content_tokens'),
            created_at=created_entry['created_at'],
            updated_at=created_entry['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating global knowledge base entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create global knowledge base entry")


# Thread Knowledge Base Endpoints
@router.get("/threads/{thread_id}", response_model=KnowledgeBaseListResponse)
async def get_thread_knowledge_base(
    thread_id: str,
    include_inactive: bool = False,
    user_id: str = Depends(get_current_user_id_from_jwt),
    # Fallback for large headers
    auth_token: str = None
):
    """Get all knowledge base entries for a specific thread"""
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    try:
        client = await db.client
        
        # Verify thread access
        thread_result = await client.table('threads').select('account_id').eq('thread_id', thread_id).execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        thread_account_id = thread_result.data[0]['account_id']
        
        # Verify user has access to this thread - try JWT first, then fallback to auth_token
        user_result = None
        if user_id:
            try:
                user_result = await client.auth.get_user()
                logger.info(f"User result from JWT for thread: {user_result}")
            except Exception as jwt_error:
                logger.warning(f"JWT authentication failed for thread: {jwt_error}")
                user_result = None
        
        # Fallback: try to get user from auth_token if JWT failed
        if not user_result and auth_token:
            try:
                logger.info("Attempting fallback authentication with auth_token for thread")
                # Set the auth token manually
                client.auth.set_session(auth_token, None)
                user_result = await client.auth.get_user()
                logger.info(f"User result from auth_token for thread: {user_result}")
            except Exception as token_error:
                logger.error(f"Fallback authentication failed for thread: {token_error}")
        
        if not user_result or not user_result.user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        user_account_id = user_result.user.user_metadata.get('account_id')
        if not user_account_id:
            # Get default account for user
            try:
                account_result = await client.rpc('get_user_default_account', {
                    'p_user_id': user_id
                }).execute()
                user_account_id = account_result.data if account_result.data else None
            except Exception as rpc_error:
                logger.error(f"Error getting default account for thread: {rpc_error}")
                user_account_id = None
        
        if user_account_id != thread_account_id:
            raise HTTPException(status_code=403, detail="Access denied to thread")
        
        # Query thread knowledge base
        result = await client.table('thread_knowledge_base').select('*').eq('thread_id', thread_id).eq('is_active', True).execute()
        
        entries = []
        total_tokens = 0
        
        for entry_data in result.data or []:
            entry = KnowledgeBaseEntryResponse(
                entry_id=entry_data['id'],
                name=entry_data['name'],
                description=entry_data['description'],
                content=entry_data['content'],
                usage_context=entry_data['usage_context'],
                is_active=entry_data['is_active'],
                content_tokens=entry_data.get('content_tokens'),
                created_at=entry_data['created_at'],
                updated_at=entry_data.get('updated_at', entry_data['created_at']),
                source_type='manual',
                source_metadata=entry_data.get('source_metadata'),
                file_size=None,
                file_mime_type=None
            )
            entries.append(entry)
            total_tokens += entry_data.get('content_tokens', 0) or 0
        
        return KnowledgeBaseListResponse(
            entries=entries,
            total_count=len(entries),
            total_tokens=total_tokens
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thread knowledge base: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve thread knowledge base")


@router.post("/threads/{thread_id}", response_model=KnowledgeBaseEntryResponse)
async def create_thread_knowledge_base_entry(
    thread_id: str,
    entry_data: CreateKnowledgeBaseEntryRequest,
    user_id: str = Depends(get_current_user_id_from_jwt),
    # Fallback for large headers
    auth_token: str = None
):
    """Create a new knowledge base entry for a specific thread"""
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    try:
        client = await db.client
        
        # Verify thread access
        thread_result = await client.table('threads').select('account_id').eq('thread_id', thread_id).execute()
        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        thread_account_id = thread_result.data[0]['account_id']
        
        # Verify user has access to this thread - try JWT first, then fallback to auth_token
        user_result = None
        if user_id:
            try:
                user_result = await client.auth.get_user()
                logger.info(f"User result from JWT for thread POST: {user_result}")
            except Exception as jwt_error:
                logger.warning(f"JWT authentication failed for thread POST: {jwt_error}")
                user_result = None
        
        # Fallback: try to get user from auth_token if JWT failed
        if not user_result and auth_token:
            try:
                logger.info("Attempting fallback authentication with auth_token for thread POST")
                # Set the auth token manually
                client.auth.set_session(auth_token, None)
                user_result = await client.auth.get_user()
                logger.info(f"User result from auth_token for thread POST: {user_result}")
            except Exception as token_error:
                logger.error(f"Fallback authentication failed for thread POST: {token_error}")
        
        if not user_result or not user_result.user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        user_account_id = user_result.user.user_metadata.get('account_id')
        if not user_account_id:
            # Get default account for user
            try:
                account_result = await client.rpc('get_user_default_account', {
                    'p_user_id': user_id
                }).execute()
                user_account_id = account_result.data if account_result.data else None
            except Exception as rpc_error:
                logger.error(f"Error getting default account for thread POST: {rpc_error}")
                user_account_id = None
        
        if user_account_id != thread_account_id:
            raise HTTPException(status_code=403, detail="Access denied to thread")
        
        insert_data = {
            'thread_id': thread_id,
            'account_id': thread_account_id,
            'name': entry_data.name,
            'description': entry_data.description,
            'content': entry_data.content,
            'usage_context': entry_data.usage_context
        }
        
        result = await client.table('thread_knowledge_base').insert(insert_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create thread knowledge base entry")
        
        created_entry = result.data[0]
        
        return KnowledgeBaseEntryResponse(
            entry_id=created_entry['id'],
            name=created_entry['name'],
            description=created_entry['description'],
            content=created_entry['content'],
            usage_context=created_entry['usage_context'],
            is_active=created_entry['is_active'],
            content_tokens=created_entry.get('content_tokens'),
            created_at=created_entry['created_at'],
            updated_at=created_entry['updated_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating thread knowledge base entry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create thread knowledge base entry")


# Knowledge Base Query Endpoint
@router.post("/query")
async def query_knowledge_base(
    query: str = Form(...),
    kb_type: str = Form("global"),  # global, thread, or agent
    thread_id: Optional[str] = Form(None),
    agent_id: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Query the knowledge base for relevant information"""
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    try:
        client = await db.client
        
        # Get user's account ID
        user_result = await client.auth.get_user()
        if not user_result.user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        account_id = user_result.user.user_metadata.get('account_id')
        if not account_id:
            # Get default account for user
            account_result = await client.rpc('get_user_default_account', {
                'p_user_id': user_id
            }).execute()
            account_id = account_result.data if account_result.data else None
        
        if not account_id:
            raise HTTPException(status_code=400, detail="No account found for user")
        
        # Check if query is relevant to knowledge base
        relevance_result = await client.rpc('is_query_relevant_to_kb', {
            'query_embedding': None,  # TODO: Generate embedding for query
            'p_kb_type': kb_type,
            'p_thread_id': thread_id,
            'p_account_id': account_id,
            'relevance_threshold': 0.6
        }).execute()
        
        is_relevant = relevance_result.data if relevance_result.data else False
        
        if not is_relevant:
            return {
                "relevant": False,
                "message": "Query not relevant to knowledge base",
                "suggested_response": "This query doesn't appear to be related to your knowledge base. I'll answer based on my general knowledge."
            }
        
        # Get relevant chunks
        chunks_result = await client.rpc('get_relevant_kb_chunks', {
            'query_embedding': None,  # TODO: Generate embedding for query
            'p_kb_type': kb_type,
            'p_thread_id': thread_id,
            'p_account_id': account_id,
            'similarity_threshold': 0.7,
            'max_chunks': 5
        }).execute()
        
        chunks = chunks_result.data if chunks_result.data else []
        
        # Log the query
        await client.table('kb_query_logs').insert({
            'thread_id': thread_id,
            'account_id': account_id,
            'user_query': query,
            'query_embedding': None,  # TODO: Generate embedding
            'relevant_chunks_found': len(chunks),
            'chunks_retrieved': chunks,
            'relevance_score': 0.8,  # TODO: Calculate actual score
            'was_kb_used': True,
            'response_time_ms': 150  # TODO: Calculate actual time
        }).execute()
        
        return {
            "relevant": True,
            "chunks_found": len(chunks),
            "chunks": chunks,
            "suggested_response": f"I found {len(chunks)} relevant pieces of information in your knowledge base that can help answer your question."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying knowledge base: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to query knowledge base")


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    kb_type: str = Form(...),
    thread_id: Optional[str] = Form(None),
    agent_id: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id_from_jwt),
    # Fallback for large headers
    auth_token: str = Form(None)
):
    """Upload a document to the knowledge base"""
    logger.info(f"Upload request received: kb_type={kb_type}, thread_id={thread_id}, agent_id={agent_id}, auth_token_present={auth_token is not None}")
    
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    # Validate file type
    allowed_types = [
        'application/pdf',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'application/json'
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file.content_type} is not supported. Allowed types: PDF, CSV, DOC, TXT, MD, JSON"
        )
    
    # Validate file size (50MB limit)
    max_size = 50 * 1024 * 1024  # 50MB
    if file.size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File size {file.size / 1024 / 1024:.1f}MB exceeds the maximum limit of 50MB"
        )
    
    try:
        client = await db.client
        
        # Get user's account ID - try JWT first, then fallback to auth_token
        user_result = None
        if user_id:
            try:
                user_result = await client.auth.get_user()
                logger.info(f"User result from JWT for upload: {user_result}")
            except Exception as jwt_error:
                logger.warning(f"JWT authentication failed for upload: {jwt_error}")
                user_result = None
        
        # Fallback: try to get user from auth_token if JWT failed
        if not user_result and auth_token:
            try:
                logger.info("Attempting fallback authentication with auth_token for upload")
                # Set the auth token manually
                client.auth.set_session(auth_token, None)
                user_result = await client.auth.get_user()
                logger.info(f"User result from auth_token for upload: {user_result}")
            except Exception as token_error:
                logger.error(f"Fallback authentication failed for upload: {token_error}")
        
        if not user_result or not user_result.user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        account_id = user_result.user.user_metadata.get('account_id')
        if not account_id:
            # Get default account for user
            try:
                account_result = await client.rpc('get_user_default_account', {
                    'p_user_id': user_id
                }).execute()
                account_id = account_result.data if account_result.data else None
            except Exception as rpc_error:
                logger.error(f"Error getting default account for upload: {rpc_error}")
                account_id = None
        
        if not account_id:
            raise HTTPException(status_code=400, detail="No account found for user")
        
        # Read file content
        file_content = await file.read()
        
        # Safely extract text content for text-based files only
        extracted_text = None
        try:
            if file.content_type.startswith('text/'):
                extracted_text = file_content.decode('utf-8', errors='ignore')
        except Exception as decode_error:
            logger.warning(f"Could not decode text content from {file.filename}: {decode_error}")
            extracted_text = None
        
        # Create document processing queue entry
        processing_data = {
            'account_id': account_id,
            'thread_id': thread_id,
            'agent_id': agent_id,
            'kb_type': kb_type,
            'original_filename': file.filename,
            'file_path': f"uploads/{file.filename}",  # This would be the actual file path
            'file_size': file.size,
            'mime_type': file.content_type,
            'document_type': file.content_type.split('/')[-1],
            'status': 'pending',
            'extracted_text': extracted_text
        }
        
        try:
            # Insert into document processing queue
            result = await client.table('document_processing_queue').insert(processing_data).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to create processing job")
            
            job_id = result.data[0]['id']
            
            logger.info(f"Document upload queued successfully: {job_id}")
            logger.info(f"File details: {file.filename}, size: {file.size}, type: {file.content_type}")
            
            return {
                "message": "Document uploaded successfully",
                "job_id": job_id,
                "status": "pending",
                "filename": file.filename
            }
            
        except Exception as table_error:
            logger.error(f"Error inserting into document_processing_queue: {table_error}")
            raise HTTPException(
                status_code=500, 
                detail="Knowledge base table not available. Please ensure the database migration has been run."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload document")


# Document Management Endpoints
@router.get("/documents/status/{job_id}")
async def get_document_processing_status(
    job_id: str,
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Get the processing status of a document upload job"""
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    try:
        from knowledge_base.document_storage import DocumentStorageService
        
        storage_service = DocumentStorageService()
        status = await storage_service.get_processing_status(job_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document processing status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get processing status")


@router.delete("/documents/{filename}")
async def delete_document(
    filename: str,
    kb_type: str = Form(...),
    thread_id: Optional[str] = Form(None),
    agent_id: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Delete a document and all its chunks from the knowledge base"""
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    try:
        client = await db.client
        
        # Get user's account ID
        user_result = await client.auth.get_user()
        if not user_result.user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        account_id = user_result.user.user_metadata.get('account_id')
        if not account_id:
            # Get default account for user
            account_result = await client.rpc('get_user_default_account', {
                'p_user_id': user_id
            }).execute()
            account_id = account_result.data if account_result.data else None
        
        if not account_id:
            raise HTTPException(status_code=400, detail="No account found for user")
        
        # Use the document storage service to delete
        from knowledge_base.document_storage import DocumentStorageService
        
        storage_service = DocumentStorageService()
        
        delete_result = await storage_service.delete_document_chunks(
            account_id=account_id,
            filename=filename,
            kb_type=kb_type,
            thread_id=thread_id,
            agent_id=agent_id
        )
        
        if not delete_result.get("success"):
            error_msg = delete_result.get("error", "Unknown error during deletion")
            raise HTTPException(
                status_code=500,
                detail=f"Deletion failed: {error_msg}"
            )
        
        return {
            "message": "Document deleted successfully",
            "filename": filename,
            "chunks_deleted": delete_result["chunks_deleted"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.get("/documents/chunks")
async def get_document_chunks(
    kb_type: str = Query(...),
    thread_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    limit: int = Query(10),
    user_id: str = Depends(get_current_user_id_from_jwt)
):
    """Get document chunks for a specific knowledge base type"""
    if not await is_enabled("knowledge_base"):
        raise HTTPException(
            status_code=403, 
            detail="This feature is not available at the moment."
        )
    
    try:
        client = await db.client
        
        # Get user's account ID
        user_result = await client.auth.get_user()
        if not user_result.user:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        account_id = user_result.user.user_metadata.get('account_id')
        if not account_id:
            # Get default account for user
            account_result = await client.rpc('get_user_default_account', {
                'p_user_id': user_id
            }).execute()
            account_id = account_result.data if account_result.data else None
        
        if not account_id:
            raise HTTPException(status_code=400, detail="No account found for user")
        
        # Use the document storage service to get chunks
        from knowledge_base.document_storage import DocumentStorageService
        
        storage_service = DocumentStorageService()
        
        chunks = await storage_service.get_document_chunks(
            account_id=account_id,
            kb_type=kb_type,
            thread_id=thread_id,
            agent_id=agent_id,
            query=query,
            limit=limit
        )
        
        return {
            "chunks": chunks,
            "total_count": len(chunks),
            "kb_type": kb_type,
            "thread_id": thread_id,
            "agent_id": agent_id,
            "query": query
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document chunks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get document chunks")


@router.get("/documents/supported-formats")
async def get_supported_document_formats():
    """Get list of supported document formats for upload"""
    try:
        from knowledge_base.document_processor import DocumentProcessor
        
        processor = DocumentProcessor()
        formats = processor.get_supported_formats()
        
        # Format the response for better readability
        format_info = []
        for mime_type in formats:
            if mime_type == 'application/pdf':
                format_info.append({"mime_type": mime_type, "extension": "PDF", "description": "Portable Document Format"})
            elif mime_type == 'text/csv':
                format_info.append({"mime_type": mime_type, "extension": "CSV", "description": "Comma-Separated Values"})
            elif mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                format_info.append({"mime_type": mime_type, "extension": "DOCX", "description": "Microsoft Word Document"})
            elif mime_type == 'text/plain':
                format_info.append({"mime_type": mime_type, "extension": "TXT", "description": "Plain Text File"})
            elif mime_type == 'text/markdown':
                format_info.append({"mime_type": mime_type, "extension": "MD", "description": "Markdown Document"})
            elif mime_type == 'application/json':
                format_info.append({"mime_type": mime_type, "extension": "JSON", "description": "JavaScript Object Notation"})
            elif mime_type == 'text/html':
                format_info.append({"mime_type": mime_type, "extension": "HTML", "description": "HyperText Markup Language"})
            elif mime_type == 'application/vnd.ms-excel':
                format_info.append({"mime_type": mime_type, "extension": "XLS", "description": "Microsoft Excel Spreadsheet"})
            elif mime_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                format_info.append({"mime_type": mime_type, "extension": "XLSX", "description": "Microsoft Excel Spreadsheet (OpenXML)"})
            else:
                format_info.append({"mime_type": mime_type, "extension": "Unknown", "description": "Unknown format"})
        
        return {
            "supported_formats": format_info,
            "total_formats": len(formats),
            "note": "All formats support automatic text extraction and chunking for LLM consumption"
        }
        
    except Exception as e:
        logger.error(f"Error getting supported formats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get supported formats")


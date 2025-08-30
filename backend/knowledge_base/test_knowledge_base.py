"""
Test file for Knowledge Base functionality
This file demonstrates how to use the Global and Thread Knowledge Base features
"""

import asyncio
import json
from typing import Dict, Any
from knowledge_base.services import KnowledgeBaseService

# Example usage functions
async def test_global_knowledge_base():
    """Test global knowledge base operations"""
    print("=== Testing Global Knowledge Base ===")
    
    service = KnowledgeBaseService()
    user_id = "test_user_123"  # In real usage, this comes from JWT
    
    try:
        # Create a global knowledge base entry
        entry_data = {
            "name": "Company Policies",
            "description": "General company policies and guidelines",
            "content": "All employees must follow company policies. Work hours are 9 AM to 5 PM. Dress code is business casual.",
            "usage_context": "always"
        }
        
        print("Creating global knowledge base entry...")
        created_entry = await service.create_global_knowledge_base_entry(user_id, entry_data)
        print(f"Created entry: {created_entry['name']} (ID: {created_entry['entry_id']})")
        
        # Get all global knowledge base entries
        print("\nFetching global knowledge base entries...")
        kb_entries = await service.get_global_knowledge_base(user_id)
        print(f"Found {kb_entries['total_count']} entries with {kb_entries['total_tokens']} total tokens")
        
        for entry in kb_entries['entries']:
            print(f"- {entry['name']}: {entry['content'][:50]}...")
        
        # Update the entry
        print("\nUpdating global knowledge base entry...")
        update_data = {
            "description": "Updated company policies and guidelines for all employees",
            "usage_context": "contextual"
        }
        
        updated_entry = await service.update_global_knowledge_base_entry(
            user_id, 
            created_entry['entry_id'], 
            update_data
        )
        print(f"Updated entry: {updated_entry['description']}")
        
        # Get context for prompts
        print("\nGetting global knowledge base context...")
        context = await service.get_global_knowledge_base_context(user_id, max_tokens=2000)
        if context:
            print(f"Context available: {len(context)} characters")
            print(f"Context preview: {context[:200]}...")
        else:
            print("No context available")
        
        # Clean up - delete the entry
        print("\nCleaning up - deleting global knowledge base entry...")
        await service.delete_global_knowledge_base_entry(user_id, created_entry['entry_id'])
        print("Entry deleted successfully")
        
    except Exception as e:
        print(f"Error in global knowledge base test: {e}")


async def test_thread_knowledge_base():
    """Test thread knowledge base operations"""
    print("\n=== Testing Thread Knowledge Base ===")
    
    service = KnowledgeBaseService()
    user_id = "test_user_123"
    thread_id = "test_thread_456"  # In real usage, this would be a valid thread ID
    
    try:
        # Create a thread knowledge base entry
        entry_data = {
            "name": "Project Requirements",
            "description": "Specific requirements for this project thread",
            "content": "This project requires Python 3.11+, FastAPI, and PostgreSQL. The deadline is next month.",
            "usage_context": "always"
        }
        
        print("Creating thread knowledge base entry...")
        created_entry = await service.create_thread_knowledge_base_entry(user_id, thread_id, entry_data)
        print(f"Created entry: {created_entry['name']} (ID: {created_entry['entry_id']})")
        
        # Get all thread knowledge base entries
        print("\nFetching thread knowledge base entries...")
        kb_entries = await service.get_thread_knowledge_base(user_id, thread_id)
        print(f"Found {kb_entries['total_count']} entries with {kb_entries['total_tokens']} total tokens")
        
        for entry in kb_entries['entries']:
            print(f"- {entry['name']}: {entry['content'][:50]}...")
        
        # Update the entry
        print("\nUpdating thread knowledge base entry...")
        update_data = {
            "content": "This project requires Python 3.11+, FastAPI, PostgreSQL, and Redis. The deadline is next month. Team size: 5 developers.",
            "usage_context": "contextual"
        }
        
        updated_entry = await service.update_thread_knowledge_base_entry(
            user_id, 
            thread_id,
            created_entry['entry_id'], 
            update_data
        )
        print(f"Updated entry: {updated_entry['content'][:50]}...")
        
        # Get context for prompts
        print("\nGetting thread knowledge base context...")
        context = await service.get_thread_knowledge_base_context(user_id, thread_id, max_tokens=2000)
        if context:
            print(f"Context available: {len(context)} characters")
            print(f"Context preview: {context[:200]}...")
        else:
            print("No context available")
        
        # Clean up - delete the entry
        print("\nCleaning up - deleting thread knowledge base entry...")
        await service.delete_thread_knowledge_base_entry(user_id, thread_id, created_entry['entry_id'])
        print("Entry deleted successfully")
        
    except Exception as e:
        print(f"Error in thread knowledge base test: {e}")


async def test_combined_knowledge_base():
    """Test combined knowledge base context (global + thread + agent)"""
    print("\n=== Testing Combined Knowledge Base Context ===")
    
    service = KnowledgeBaseService()
    user_id = "test_user_123"
    thread_id = "test_thread_456"
    agent_id = "test_agent_789"  # In real usage, this would be a valid agent ID
    
    try:
        # Create global knowledge base entry
        global_entry_data = {
            "name": "Company Standards",
            "description": "General company coding standards",
            "content": "All code must follow PEP 8 standards. Use type hints. Write unit tests for all functions.",
            "usage_context": "always"
        }
        
        print("Creating global knowledge base entry...")
        global_entry = await service.create_global_knowledge_base_entry(user_id, global_entry_data)
        print(f"Created global entry: {global_entry['name']}")
        
        # Create thread knowledge base entry
        thread_entry_data = {
            "name": "Project Architecture",
            "description": "Specific architecture for this project",
            "content": "This project uses microservices architecture with FastAPI, Redis for caching, and PostgreSQL for data.",
            "usage_context": "always"
        }
        
        print("Creating thread knowledge base entry...")
        thread_entry = await service.create_thread_knowledge_base_entry(user_id, thread_id, thread_entry_data)
        print(f"Created thread entry: {thread_entry['name']}")
        
        # Get combined context
        print("\nGetting combined knowledge base context...")
        combined_context = await service.get_combined_knowledge_base_context(
            user_id, 
            thread_id, 
            agent_id, 
            max_tokens=4000
        )
        
        if combined_context:
            print(f"Combined context available: {len(combined_context)} characters")
            print(f"Context preview: {combined_context[:300]}...")
        else:
            print("No combined context available")
        
        # Clean up
        print("\nCleaning up...")
        await service.delete_global_knowledge_base_entry(user_id, global_entry['entry_id'])
        await service.delete_thread_knowledge_base_entry(user_id, thread_id, thread_entry['entry_id'])
        print("All entries deleted successfully")
        
    except Exception as e:
        print(f"Error in combined knowledge base test: {e}")


async def test_document_upload():
    """Test document upload functionality"""
    print("\n=== Testing Document Upload ===")
    
    service = KnowledgeBaseService()
    user_id = "test_user_123"
    thread_id = "test_thread_456"
    
    try:
        # Simulate file data
        file_data = {
            "filename": "project_requirements.pdf",
            "size": 1024000,  # 1MB
            "content_type": "application/pdf",
            "extracted_text": "This document contains detailed project requirements including technical specifications, timeline, and deliverables."
        }
        
        print("Uploading document to thread knowledge base...")
        upload_result = await service.upload_document(
            user_id=user_id,
            file_data=file_data,
            kb_type="thread",
            thread_id=thread_id
        )
        
        print(f"Upload successful: {upload_result['message']}")
        print(f"Job ID: {upload_result['job_id']}")
        print(f"Status: {upload_result['status']}")
        
    except Exception as e:
        print(f"Error in document upload test: {e}")


async def test_knowledge_base_query():
    """Test knowledge base query functionality"""
    print("\n=== Testing Knowledge Base Query ===")
    
    service = KnowledgeBaseService()
    user_id = "test_user_123"
    thread_id = "test_thread_456"
    
    try:
        query = "What are the project requirements and coding standards?"
        
        print(f"Querying knowledge base: '{query}'")
        query_result = await service.query_knowledge_base(
            user_id=user_id,
            query=query,
            kb_type="thread",
            thread_id=thread_id
        )
        
        print(f"Query result: {query_result}")
        
    except Exception as e:
        print(f"Error in knowledge base query test: {e}")


async def main():
    """Run all knowledge base tests"""
    print("Knowledge Base Functionality Test Suite")
    print("=" * 50)
    
    # Note: These tests require a running database and proper authentication
    # They are for demonstration purposes and will likely fail in a test environment
    
    try:
        # Test individual knowledge base types
        await test_global_knowledge_base()
        await test_thread_knowledge_base()
        
        # Test combined functionality
        await test_combined_knowledge_base()
        
        # Test additional features
        await test_document_upload()
        await test_knowledge_base_query()
        
        print("\n" + "=" * 50)
        print("All tests completed!")
        
    except Exception as e:
        print(f"\nTest suite failed: {e}")
        print("Note: These tests require a running database and proper authentication setup")


if __name__ == "__main__":
    # Run the test suite
    asyncio.run(main())






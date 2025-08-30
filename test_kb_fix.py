#!/usr/bin/env python3
"""
Test script to create a knowledge base entry and test file viewing
"""

import asyncio
import os
import sys
from supabase import create_client, Client

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

async def test_knowledge_base():
    """Test creating a knowledge base entry and viewing it"""
    
    # Get Supabase credentials from environment
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: Missing Supabase credentials")
        print("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        return
    
    # Create Supabase client
    supabase: Client = create_client(supabase_url, supabase_key)
    
    try:
        # Create a test knowledge base entry
        test_content = """
This is a test knowledge base entry.

It contains multiple lines of content to test the file viewing functionality.

Features to test:
- Content display
- File size calculation
- Content type detection
- Copy to clipboard
- Download functionality

This should be displayed properly in the file viewer modal.
"""
        
        print("Creating test knowledge base entry...")
        
        # Insert test entry
        result = supabase.table('global_knowledge_base').insert({
            'name': 'test_sample_data.txt',
            'description': 'Test entry for debugging file viewing',
            'content': test_content,
            'usage_context': 'always',
            'is_active': True,
            'account_id': '00000000-0000-0000-0000-000000000000',  # Dummy account ID
            'source_type': 'manual'
        }).execute()
        
        if result.data:
            entry = result.data[0]
            print(f"✅ Test entry created successfully!")
            print(f"   ID: {entry['id']}")
            print(f"   Name: {entry['name']}")
            print(f"   Content length: {len(entry['content'])} characters")
            
            # Test retrieving the entry
            print("\nTesting entry retrieval...")
            retrieve_result = supabase.table('global_knowledge_base').select('*').eq('id', entry['id']).execute()
            
            if retrieve_result.data:
                retrieved_entry = retrieve_result.data[0]
                print(f"✅ Entry retrieved successfully!")
                print(f"   Content: {retrieved_entry['content'][:100]}...")
                
                # Test the file content API endpoint
                print("\nTesting file content API...")
                # This would be tested via the frontend API
                print("   File content API should work with this entry ID")
                print(f"   Entry ID to test: {entry['id']}")
                
            else:
                print("❌ Failed to retrieve entry")
                
        else:
            print("❌ Failed to create test entry")
            if result.error:
                print(f"   Error: {result.error}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_knowledge_base())





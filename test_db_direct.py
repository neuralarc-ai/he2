#!/usr/bin/env python3
"""
Simple script to test database access directly
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

async def test_database():
    """Test database access"""
    
    try:
        print("🔍 Testing Database Access...")
        print("=" * 50)
        
        # Import the database connection
        from services.supabase import DBConnection
        
        # Create database connection
        db = DBConnection()
        await db.initialize()
        
        client = await db.client
        
        print("\n1. Testing global_knowledge_base table:")
        try:
            result = await client.table('global_knowledge_base').select('*').limit(5).execute()
            print(f"   ✅ Success")
            print(f"   📊 Records found: {len(result.data) if result.data else 0}")
            if result.data:
                print(f"   📋 Sample records:")
                for i, entry in enumerate(result.data[:3]):
                    print(f"      Entry {i+1}:")
                    print(f"        id: {entry.get('id')}")
                    print(f"        name: {entry.get('name')}")
                    print(f"        content_length: {len(entry.get('content', ''))}")
                    print(f"        account_id: {entry.get('account_id')}")
                    print(f"        created_at: {entry.get('created_at')}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print("\n2. Testing knowledge_base_entries table (should not exist):")
        try:
            result = await client.table('knowledge_base_entries').select('*').limit(1).execute()
            print(f"   ⚠️  Table still exists")
        except Exception as e:
            print(f"   ✅ Table does not exist (correctly dropped): {e}")
        
        print("\n3. Testing agent_knowledge_base_entries table:")
        try:
            result = await client.table('agent_knowledge_base_entries').select('*').limit(3).execute()
            print(f"   ✅ Success")
            print(f"   📊 Records found: {len(result.data) if result.data else 0}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print("\n4. Testing thread_knowledge_base table:")
        try:
            result = await client.table('thread_knowledge_base').select('*').limit(3).execute()
            print(f"   ✅ Success")
            print(f"   📊 Records found: {len(result.data) if result.data else 0}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        # Test RPC function
        print("\n5. Testing get_global_knowledge_base RPC function:")
        try:
            result = await client.rpc('get_global_knowledge_base', {
                'p_account_id': '00000000-0000-0000-0000-000000000000',
                'p_include_inactive': True
            }).execute()
            print(f"   ✅ RPC function exists")
            print(f"   📊 Records returned: {len(result.data) if result.data else 0}")
        except Exception as e:
            print(f"   ❌ RPC function error: {e}")
        
        await db.disconnect()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_database())

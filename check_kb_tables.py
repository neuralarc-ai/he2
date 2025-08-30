#!/usr/bin/env python3
"""
Script to check the current state of knowledge base tables in Supabase
"""

import asyncio
import os
import sys
from supabase import create_client, Client

async def check_knowledge_base_tables():
    """Check the current state of knowledge base tables"""
    
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
        print("🔍 Checking Knowledge Base Tables...")
        print("=" * 50)
        
        # Check global_knowledge_base table
        print("\n1. Checking global_knowledge_base table:")
        try:
            result = supabase.table('global_knowledge_base').select('*').limit(3).execute()
            print(f"   ✅ Table exists")
            print(f"   📊 Records found: {len(result.data) if result.data else 0}")
            if result.data:
                print(f"   📋 Sample record structure:")
                sample = result.data[0]
                for key, value in sample.items():
                    print(f"      {key}: {type(value).__name__} = {str(value)[:50]}...")
        except Exception as e:
            print(f"   ❌ Error accessing table: {e}")
        
        # Check if knowledge_base_entries table exists (should be dropped)
        print("\n2. Checking knowledge_base_entries table:")
        try:
            result = supabase.table('knowledge_base_entries').select('*').limit(1).execute()
            print(f"   ⚠️  Table still exists (should be dropped)")
        except Exception as e:
            print(f"   ✅ Table does not exist (correctly dropped): {e}")
        
        # Check agent_knowledge_base_entries table
        print("\n3. Checking agent_knowledge_base_entries table:")
        try:
            result = supabase.table('agent_knowledge_base_entries').select('*').limit(3).execute()
            print(f"   ✅ Table exists")
            print(f"   📊 Records found: {len(result.data) if result.data else 0}")
        except Exception as e:
            print(f"   ❌ Error accessing table: {e}")
        
        # Check thread_knowledge_base table
        print("\n4. Checking thread_knowledge_base table:")
        try:
            result = supabase.table('thread_knowledge_base').select('*').limit(3).execute()
            print(f"   ✅ Table exists")
            print(f"   📊 Records found: {len(result.data) if result.data else 0}")
        except Exception as e:
            print(f"   ❌ Error accessing table: {e}")
        
        print("\n" + "=" * 50)
        print("📋 Summary:")
        print("   - global_knowledge_base: Main table for global KB entries")
        print("   - knowledge_base_entries: Should be dropped (old table)")
        print("   - agent_knowledge_base_entries: For agent-specific KB")
        print("   - thread_knowledge_base: For thread-specific KB")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_knowledge_base_tables())

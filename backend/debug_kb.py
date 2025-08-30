#!/usr/bin/env python3
"""
Simple script to debug knowledge base tables using existing backend environment
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from services.supabase import create_client

async def debug_knowledge_base():
    """Debug knowledge base tables"""
    
    try:
        print("🔍 Debugging Knowledge Base Tables...")
        print("=" * 50)
        
        # Create Supabase client using existing backend service
        client = create_client()
        
        # Check global_knowledge_base table
        print("\n1. Checking global_knowledge_base table:")
        try:
            result = await client.table('global_knowledge_base').select('*').limit(3).execute()
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
            result = await client.table('knowledge_base_entries').select('*').limit(1).execute()
            print(f"   ⚠️  Table still exists (should be dropped)")
        except Exception as e:
            print(f"   ✅ Table does not exist (correctly dropped): {e}")
        
        # Check agent_knowledge_base_entries table
        print("\n3. Checking agent_knowledge_base_entries table:")
        try:
            result = await client.table('agent_knowledge_base_entries').select('*').limit(3).execute()
            print(f"   ✅ Table exists")
            print(f"   📊 Records found: {len(result.data) if result.data else 0}")
        except Exception as e:
            print(f"   ❌ Error accessing table: {e}")
        
        # Check thread_knowledge_base table
        print("\n4. Checking thread_knowledge_base table:")
        try:
            result = await client.table('thread_knowledge_base').select('*').limit(3).execute()
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
    asyncio.run(debug_knowledge_base())

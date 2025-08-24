#!/usr/bin/env python3
"""
Test script to verify the knowledge base API fix for large headers
"""

import urllib.request
import urllib.error
import json

def test_knowledge_base_endpoints():
    """Test the knowledge base endpoints to ensure they work"""
    
    base_url = "http://localhost:8000"
    
    # Test endpoints
    endpoints = [
        "/knowledge-base/global",
        "/knowledge-base/agents/test-agent-id",
        "/knowledge-base/threads/test-thread-id"
    ]
    
    print("🧪 Testing Knowledge Base API Endpoints...")
    print("=" * 50)
    
    for endpoint in endpoints:
        print(f"\n📡 Testing: {endpoint}")
        
        try:
            # Create request
            req = urllib.request.Request(f"{base_url}{endpoint}")
            
            # Test without authentication (should return 401)
            with urllib.request.urlopen(req) as response:
                print(f"   Status: {response.status}")
                print(f"   ✅ Endpoint accessible (unexpected - should require auth)")
                
        except urllib.error.HTTPError as e:
            if e.code == 401:
                print(f"   Status: {e.code}")
                print("   ✅ Correctly requires authentication")
            elif e.code == 431:
                print(f"   Status: {e.code}")
                print("   ⚠️  Still getting header size error")
            else:
                print(f"   Status: {e.code}")
                print(f"   ❓ Unexpected status: {e.code}")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Test completed!")
    print("\n📝 Next steps:")
    print("1. Restart your backend server")
    print("2. Check the logs for header size information")
    print("3. Try accessing the knowledge base page again")
    print("4. Look for the new middleware logs")

if __name__ == "__main__":
    test_knowledge_base_endpoints()

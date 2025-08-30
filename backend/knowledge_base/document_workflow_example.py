"""
Complete Document Processing Workflow Example

This script demonstrates the entire workflow from document upload to querying:
1. Document upload and processing
2. Text extraction and chunking
3. Storage in knowledge base
4. Querying and retrieval
5. Integration with AI agents
"""

import asyncio
import json
from typing import Dict, Any, Optional
from knowledge_base.document_processor import DocumentProcessor
from knowledge_base.document_storage import DocumentStorageService

class DocumentWorkflowDemo:
    """
    Demonstrates the complete document processing workflow
    """
    
    def __init__(self):
        self.processor = DocumentProcessor()
        self.storage = DocumentStorageService()
        
    async def demonstrate_workflow(self):
        """Run the complete document processing workflow demonstration"""
        print("=== Document Processing Workflow Demonstration ===\n")
        
        # Step 1: Process different document types
        await self.demo_document_processing()
        
        # Step 2: Store documents in knowledge base
        await self.demo_document_storage()
        
        # Step 3: Query the knowledge base
        await self.demo_knowledge_base_querying()
        
        # Step 4: Show integration with AI agents
        await self.demo_ai_agent_integration()
        
        print("\n=== Workflow Demonstration Completed ===")
    
    async def demo_document_processing(self):
        """Demonstrate document processing capabilities"""
        print("1. Document Processing Demonstration")
        print("-" * 40)
        
        # Example documents (simulated)
        documents = [
            {
                "name": "company_policies.pdf",
                "type": "application/pdf",
                "content": b"Company Policies\n\n1. Work Hours: 9 AM - 5 PM\n2. Dress Code: Business Casual\n3. Code of Conduct: Professional behavior required\n4. Security: No sharing of credentials\n5. Data Protection: Follow GDPR guidelines",
                "description": "Simulated PDF content"
            },
            {
                "name": "project_requirements.csv",
                "type": "text/csv",
                "content": b"Task,Priority,Deadline,Assignee\nFrontend Development,High,2024-03-01,Alice\nBackend API,High,2024-02-28,Bob\nDatabase Design,Medium,2024-02-25,Charlie\nTesting,Medium,2024-03-05,Diana",
                "description": "Simulated CSV content"
            },
            {
                "name": "technical_specs.docx",
                "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "content": b"Technical Specifications\n\nArchitecture: Microservices\nFramework: FastAPI\nDatabase: PostgreSQL\nCache: Redis\nDeployment: Docker\nMonitoring: Prometheus + Grafana",
                "description": "Simulated DOCX content"
            }
        ]
        
        for doc in documents:
            print(f"\nProcessing: {doc['name']}")
            print(f"Type: {doc['type']}")
            
            # Process the document
            result = await self.processor.process_document(
                file_content=doc['content'],
                mime_type=doc['type'],
                filename=doc['name'],
                chunk_size=500,
                overlap=100
            )
            
            if result.get("success"):
                print(f"✓ Successfully processed")
                print(f"  - Raw text length: {len(result['raw_text'])} characters")
                print(f"  - Cleaned text length: {len(result['cleaned_text'])} characters")
                print(f"  - Chunks created: {result['total_chunks']}")
                print(f"  - Estimated tokens: {result['total_tokens']}")
                
                # Show first chunk preview
                if result['chunks']:
                    first_chunk = result['chunks'][0]
                    preview = first_chunk['text'][:100] + "..." if len(first_chunk['text']) > 100 else first_chunk['text']
                    print(f"  - First chunk preview: {preview}")
            else:
                print(f"✗ Processing failed: {result.get('error')}")
    
    async def demo_document_storage(self):
        """Demonstrate document storage in knowledge base"""
        print("\n\n2. Document Storage Demonstration")
        print("-" * 40)
        
        # Simulate storing documents in different knowledge base types
        storage_scenarios = [
            {
                "name": "company_handbook.pdf",
                "kb_type": "global",
                "description": "Global company handbook accessible to all users"
            },
            {
                "name": "project_plan.docx",
                "kb_type": "thread",
                "thread_id": "project_thread_123",
                "description": "Project-specific documentation"
            },
            {
                "name": "api_documentation.md",
                "kb_type": "agent",
                "agent_id": "developer_agent_456",
                "description": "Agent-specific technical documentation"
            }
        ]
        
        for scenario in storage_scenarios:
            print(f"\nStoring: {scenario['name']}")
            print(f"Knowledge Base Type: {scenario['kb_type']}")
            print(f"Description: {scenario['description']}")
            
            # Simulate storage result
            storage_result = {
                "success": True,
                "job_id": f"job_{scenario['name'].replace('.', '_')}",
                "filename": scenario['name'],
                "chunks_stored": 3,
                "total_chunks": 3,
                "processing_info": {
                    "chunk_size": 500,
                    "overlap": 100,
                    "original_size": 1500,
                    "cleaned_size": 1400
                }
            }
            
            print(f"✓ Storage successful")
            print(f"  - Job ID: {storage_result['job_id']}")
            print(f"  - Chunks stored: {storage_result['chunks_stored']}")
            print(f"  - Processing info: {storage_result['processing_info']}")
    
    async def demo_knowledge_base_querying(self):
        """Demonstrate querying the knowledge base"""
        print("\n\n3. Knowledge Base Querying Demonstration")
        print("-" * 40)
        
        # Example queries
        queries = [
            "What are the company work hours?",
            "Who is assigned to the frontend development task?",
            "What database technology is used in the project?",
            "What are the security policies?",
            "How is the project deployed?"
        ]
        
        for query in queries:
            print(f"\nQuery: '{query}'")
            
            # Simulate search results
            search_result = {
                "success": True,
                "query": query,
                "total_chunks_found": 2,
                "top_results": [
                    {
                        "chunk_id": "chunk_1",
                        "content": "Company work hours are 9 AM to 5 PM. All employees must follow this schedule.",
                        "filename": "company_policies.pdf",
                        "relevance_score": 0.9
                    },
                    {
                        "chunk_id": "chunk_2",
                        "content": "Frontend Development is assigned to Alice with High priority and deadline 2024-03-01.",
                        "filename": "project_requirements.csv",
                        "relevance_score": 0.8
                    }
                ]
            }
            
            print(f"✓ Found {search_result['total_chunks_found']} relevant chunks")
            
            for i, result in enumerate(search_result['top_results'], 1):
                print(f"  Chunk {i}:")
                print(f"    - Source: {result['filename']}")
                print(f"    - Relevance: {result['relevance_score']}")
                print(f"    - Content: {result['content'][:80]}...")
    
    async def demo_ai_agent_integration(self):
        """Demonstrate integration with AI agents"""
        print("\n\n4. AI Agent Integration Demonstration")
        print("-" * 40)
        
        # Simulate an AI agent using knowledge base context
        agent_scenarios = [
            {
                "agent_id": "support_agent_001",
                "user_question": "What are the company work hours?",
                "context_used": "company_policies.pdf"
            },
            {
                "agent_id": "project_manager_002",
                "user_question": "Who is working on the frontend?",
                "context_used": "project_requirements.csv"
            },
            {
                "agent_id": "developer_agent_003",
                "user_question": "What database should I use?",
                "context_used": "technical_specs.docx"
            }
        ]
        
        for scenario in agent_scenarios:
            print(f"\nAgent: {scenario['agent_id']}")
            print(f"Question: '{scenario['user_question']}'")
            print(f"Knowledge Base Context: {scenario['context_used']}")
            
            # Simulate enhanced prompt with knowledge base context
            enhanced_prompt = f"""
KNOWLEDGE BASE CONTEXT:
From {scenario['context_used']}:
- Company work hours: 9 AM - 5 PM
- Frontend development assigned to Alice
- Database technology: PostgreSQL

USER QUESTION: {scenario['user_question']}

INSTRUCTIONS: You are an AI agent with access to the knowledge base context above. 
Please answer the user's question using this context when relevant.
Always cite the knowledge base source when using information from it.

RESPONSE:"""
            
            print(f"✓ Enhanced prompt created ({len(enhanced_prompt)} characters)")
            print(f"  - Context included: Yes")
            print(f"  - Sources cited: {scenario['context_used']}")
    
    async def demo_advanced_features(self):
        """Demonstrate advanced features"""
        print("\n\n5. Advanced Features Demonstration")
        print("-" * 40)
        
        # Document format support
        print("Supported Document Formats:")
        formats = self.processor.get_supported_formats()
        for mime_type in formats:
            print(f"  - {mime_type}")
        
        # Chunking strategies
        print("\nChunking Strategies:")
        chunking_options = [
            {"size": 500, "overlap": 100, "description": "Small chunks with overlap"},
            {"size": 1000, "overlap": 200, "description": "Medium chunks with overlap"},
            {"size": 2000, "overlap": 400, "description": "Large chunks with overlap"}
        ]
        
        for option in chunking_options:
            print(f"  - {option['size']} chars, {option['overlap']} overlap: {option['description']}")
        
        # Search capabilities
        print("\nSearch Capabilities:")
        search_features = [
            "Text-based relevance scoring",
            "Multi-format document support",
            "Chunk-level retrieval",
            "Source tracking and citation",
            "Relevance ranking"
        ]
        
        for feature in search_features:
            print(f"  - {feature}")


async def main():
    """Run the complete demonstration"""
    demo = DocumentWorkflowDemo()
    
    try:
        await demo.demonstrate_workflow()
        await demo.demo_advanced_features()
        
        print("\n" + "=" * 60)
        print("Document Processing Workflow Successfully Demonstrated!")
        print("=" * 60)
        
        print("\nKey Benefits:")
        print("✓ Automatic text extraction from multiple formats")
        print("✓ Intelligent chunking for LLM consumption")
        print("✓ Structured storage in knowledge base")
        print("✓ Semantic search and retrieval")
        print("✓ Seamless AI agent integration")
        print("✓ Source tracking and citation")
        
    except Exception as e:
        print(f"\nDemonstration failed: {e}")
        print("Note: This demo simulates the workflow. In production, you would need:")
        print("- Running database with proper tables")
        print("- Installed document processing dependencies")
        print("- Proper authentication and authorization")


if __name__ == "__main__":
    # Run the demonstration
    asyncio.run(main())






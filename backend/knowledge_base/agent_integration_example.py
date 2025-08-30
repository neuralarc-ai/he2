"""
Example: Integrating Knowledge Base with AI Agents

This script demonstrates how to use the knowledge base system to enhance AI agent responses
by providing relevant context from global, thread, and agent knowledge bases.
"""

import asyncio
from typing import Dict, Any, Optional
from knowledge_base.services import KnowledgeBaseService

class KnowledgeBaseEnhancedAgent:
    """
    Example AI Agent that uses knowledge base context to provide better responses
    """
    
    def __init__(self, agent_id: str, user_id: str):
        self.agent_id = agent_id
        self.user_id = user_id
        self.kb_service = KnowledgeBaseService()
        self.max_context_tokens = 4000
    
    async def get_enhanced_prompt(self, thread_id: str, user_question: str) -> str:
        """
        Get an enhanced prompt that includes relevant knowledge base context
        """
        try:
            # Get combined knowledge base context
            context = await self.kb_service.get_combined_knowledge_base_context(
                user_id=self.user_id,
                thread_id=thread_id,
                agent_id=self.agent_id,
                max_tokens=self.max_context_tokens
            )
            
            if context:
                enhanced_prompt = f"""
{context}

USER QUESTION: {user_question}

INSTRUCTIONS: You are an AI agent with access to the knowledge base context above. 
Please answer the user's question using this context when relevant. 
If the context doesn't contain relevant information, answer based on your general knowledge.
Always cite the knowledge base source when using information from it.

RESPONSE:"""
            else:
                enhanced_prompt = f"""
USER QUESTION: {user_question}

INSTRUCTIONS: Answer the user's question based on your general knowledge.

RESPONSE:"""
            
            return enhanced_prompt.strip()
            
        except Exception as e:
            print(f"Error getting enhanced prompt: {e}")
            # Fallback to basic prompt
            return f"USER QUESTION: {user_question}\n\nRESPONSE:"
    
    async def process_user_question(self, thread_id: str, user_question: str) -> Dict[str, Any]:
        """
        Process a user question with knowledge base context
        """
        try:
            # Get enhanced prompt with knowledge base context
            enhanced_prompt = await self.get_enhanced_prompt(thread_id, user_question)
            
            # In a real implementation, this would be sent to an LLM
            # For this example, we'll simulate the response
            response = await self.simulate_llm_response(enhanced_prompt, user_question)
            
            # Log the interaction for analytics
            await self.log_interaction(thread_id, user_question, enhanced_prompt, response)
            
            return {
                "response": response,
                "context_used": "knowledge_base" if "KNOWLEDGE BASE" in enhanced_prompt else "general",
                "prompt_length": len(enhanced_prompt),
                "thread_id": thread_id,
                "agent_id": self.agent_id
            }
            
        except Exception as e:
            print(f"Error processing user question: {e}")
            return {
                "response": "I apologize, but I encountered an error processing your question. Please try again.",
                "error": str(e),
                "context_used": "none"
            }
    
    async def simulate_llm_response(self, prompt: str, user_question: str) -> str:
        """
        Simulate an LLM response (replace with actual LLM integration)
        """
        # This is a placeholder - in reality, you'd call your LLM service here
        if "KNOWLEDGE BASE" in prompt:
            return f"Based on the knowledge base context, here's what I can tell you about '{user_question}': [This would be the actual LLM response using the context]"
        else:
            return f"Here's my general knowledge response to '{user_question}': [This would be the actual LLM response without specific context]"
    
    async def log_interaction(self, thread_id: str, user_question: str, prompt: str, response: str):
        """
        Log the interaction for analytics and monitoring
        """
        try:
            # In a real implementation, you might log to a database or monitoring service
            print(f"Interaction logged:")
            print(f"  Thread: {thread_id}")
            print(f"  Question: {user_question[:100]}...")
            print(f"  Prompt length: {len(prompt)}")
            print(f"  Response length: {len(response)}")
            print(f"  Context used: {'Yes' if 'KNOWLEDGE BASE' in prompt else 'No'}")
        except Exception as e:
            print(f"Error logging interaction: {e}")


async def example_usage():
    """
    Example of how to use the KnowledgeBaseEnhancedAgent
    """
    print("=== Knowledge Base Agent Integration Example ===\n")
    
    # Initialize the enhanced agent
    agent = KnowledgeBaseEnhancedAgent(
        agent_id="example_agent_123",
        user_id="example_user_456"
    )
    
    # Example thread ID
    thread_id = "example_thread_789"
    
    # Example user questions
    questions = [
        "What are our company's coding standards?",
        "What is the current project deadline?",
        "How do I authenticate with the API?",
        "What's the weather like today?"
    ]
    
    print("Processing example questions with knowledge base context:\n")
    
    for i, question in enumerate(questions, 1):
        print(f"Question {i}: {question}")
        print("-" * 50)
        
        # Process the question
        result = await agent.process_user_question(thread_id, question)
        
        print(f"Response: {result['response']}")
        print(f"Context used: {result['context_used']}")
        print(f"Prompt length: {result['prompt_length']} characters")
        print()
    
    print("Example completed!")


async def demonstrate_knowledge_base_management():
    """
    Demonstrate knowledge base management operations
    """
    print("=== Knowledge Base Management Demo ===\n")
    
    kb_service = KnowledgeBaseService()
    user_id = "demo_user_123"
    thread_id = "demo_thread_456"
    
    try:
        # Create a global knowledge base entry
        print("1. Creating global knowledge base entry...")
        global_entry = await kb_service.create_global_knowledge_base_entry(
            user_id,
            {
                "name": "Company Mission",
                "description": "Our company's mission and values",
                "content": "We are committed to building innovative AI solutions that empower businesses and individuals to achieve their goals through intelligent automation and insights.",
                "usage_context": "always"
            }
        )
        print(f"   Created: {global_entry['name']} (ID: {global_entry['entry_id']})")
        
        # Create a thread knowledge base entry
        print("\n2. Creating thread knowledge base entry...")
        thread_entry = await kb_service.create_thread_knowledge_base_entry(
            user_id,
            thread_id,
            {
                "name": "Project Goals",
                "description": "Specific goals for this project thread",
                "content": "This project aims to implement a customer support chatbot using our knowledge base system. Target completion: Q2 2024.",
                "usage_context": "always"
            }
        )
        print(f"   Created: {thread_entry['name']} (ID: {thread_entry['entry_id']})")
        
        # Get combined context
        print("\n3. Retrieving combined knowledge base context...")
        context = await kb_service.get_combined_knowledge_base_context(
            user_id, thread_id, "demo_agent_789", max_tokens=2000
        )
        
        if context:
            print(f"   Context available: {len(context)} characters")
            print(f"   Preview: {context[:200]}...")
        else:
            print("   No context available")
        
        # Clean up
        print("\n4. Cleaning up demo data...")
        await kb_service.delete_global_knowledge_base_entry(user_id, global_entry['entry_id'])
        await kb_service.delete_thread_knowledge_base_entry(user_id, thread_id, thread_entry['entry_id'])
        print("   Demo data cleaned up successfully")
        
    except Exception as e:
        print(f"Error in demo: {e}")
        print("Note: This demo requires a running database and proper authentication")


async def main():
    """
    Run the complete demonstration
    """
    print("Knowledge Base Agent Integration Demonstration")
    print("=" * 60)
    
    try:
        # Run the agent integration example
        await example_usage()
        
        print("\n" + "=" * 60 + "\n")
        
        # Run the knowledge base management demo
        await demonstrate_knowledge_base_management()
        
        print("\n" + "=" * 60)
        print("Demonstration completed successfully!")
        
    except Exception as e:
        print(f"\nDemonstration failed: {e}")
        print("Note: This demo requires a running database and proper authentication setup")


if __name__ == "__main__":
    # Run the demonstration
    asyncio.run(main())






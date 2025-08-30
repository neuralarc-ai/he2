import json
from typing import Union, Dict, Any

from agentpress.tool import Tool, ToolResult, openapi_schema, usage_example
from agent.tools.data_providers.LinkedinProvider import LinkedinProvider
from agent.tools.data_providers.YahooFinanceProvider import YahooFinanceProvider
from agent.tools.data_providers.AmazonProvider import AmazonProvider
from agent.tools.data_providers.ZillowProvider import ZillowProvider
from agent.tools.data_providers.TwitterProvider import TwitterProvider

class DataProvidersTool(Tool):
    """Tool for making requests to various data providers."""

    def __init__(self):
        super().__init__()
        
        # Initialize empty providers to maintain interface
        self.register_data_providers = {
            "linkedin": None,
            "yahoo_finance": None,
            "amazon": None,
            "zillow": None,
            "twitter": None
        }

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_data_provider_endpoints",
            "description": "Get available endpoints for a specific data provider",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_name": {
                        "type": "string",
                        "description": "The name of the data provider (e.g., 'linkedin', 'twitter', 'zillow', 'amazon', 'yahoo_finance')"
                    }
                },
                "required": ["service_name"]
            }
        }
    })
    @usage_example('''
<!-- 
The get-data-provider-endpoints tool returns available endpoints for a specific data provider.
Use this tool when you need to discover what endpoints are available.
-->

<!-- Example to get LinkedIn API endpoints -->
<function_calls>
<invoke name="get_data_provider_endpoints">
<parameter name="service_name">linkedin</parameter>
</invoke>
</function_calls>
        ''')
    async def get_data_provider_endpoints(
        self,
        service_name: str
    ) -> ToolResult:
        """Data providers are currently disabled."""
        return self.fail_response("Data providers are currently disabled. They can be re-enabled in the future by updating the DataProvidersTool class.")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "execute_data_provider_call",
            "description": "Execute a call to a specific data provider endpoint",
            "parameters": {
                "type": "object",
                "properties": {
                    "service_name": {
                        "type": "string",
                        "description": "The name of the API service (e.g., 'linkedin')"
                    },
                    "route": {
                        "type": "string",
                        "description": "The key of the endpoint to call"
                    },
                    "payload": {
                        "type": "object",
                        "description": "The payload to send with the API call"
                    }
                },
                "required": ["service_name", "route"]
            }
        }
    })
    @usage_example('''
        <!-- 
        The execute-data-provider-call tool makes a request to a specific data provider endpoint.
        Use this tool when you need to call an data provider endpoint with specific parameters.
        The route must be a valid endpoint key obtained from get-data-provider-endpoints tool!!
        -->
        
        <!-- Example to call linkedIn service with the specific route person -->
        <function_calls>
        <invoke name="execute_data_provider_call">
        <parameter name="service_name">linkedin</parameter>
        <parameter name="route">person</parameter>
        <parameter name="payload">{"link": "https://www.linkedin.com/in/johndoe/"}</parameter>
        </invoke>
        </function_calls>
        ''')
    async def execute_data_provider_call(
        self,
        service_name: str,
        route: str,
        payload: Union[Dict[str, Any], str, None] = None
    ) -> ToolResult:
        """Data providers are currently disabled."""
        return self.fail_response("Data providers are currently disabled. They can be re-enabled in the future by updating the DataProvidersTool class.")

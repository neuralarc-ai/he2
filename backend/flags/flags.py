import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services import redis

logger = logging.getLogger(__name__)

class FeatureFlagManager:
    def __init__(self):
        """Initialize with existing Redis service"""
        self.flag_prefix = "feature_flag:"
        self.flag_list_key = "feature_flags:list"
    
    async def set_flag(self, key: str, enabled: bool, description: str = "") -> bool:
        """Set a feature flag to enabled or disabled"""
        try:
            flag_key = f"{self.flag_prefix}{key}"
            flag_data = {
                'enabled': str(enabled).lower(),
                'description': description,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Use the existing Redis service
            redis_client = await redis.get_client()
            await redis_client.hset(flag_key, mapping=flag_data)
            await redis_client.sadd(self.flag_list_key, key)
            
            logger.debug(f"Set feature flag {key} to {enabled}")
            return True
        except Exception as e:
            logger.error(f"Failed to set feature flag {key}: {e}")
            return False
    
    async def is_enabled(self, key: str) -> bool:
        """Check if a feature flag is enabled"""
        try:
            # First check environment variable
            env_key = f"ENABLE_{key.upper()}"
            env_value = os.getenv(env_key)
            
            if env_value is not None:
                # Environment variable takes precedence
                enabled = env_value.lower() in ('true', '1', 'yes', 'on')
                logger.debug(f"Feature flag {key} set via environment variable {env_key}={env_value} -> {enabled}")
                return enabled
            
            # Fall back to Redis if no environment variable
            flag_key = f"{self.flag_prefix}{key}"
            redis_client = await redis.get_client()
            enabled = await redis_client.hget(flag_key, 'enabled')
            return enabled == 'true' if enabled else False
        except Exception as e:
            logger.error(f"Failed to check feature flag {key}: {e}")
            # Return False by default if Redis is unavailable
            return False
    
    async def get_flag(self, key: str) -> Optional[Dict[str, str]]:
        """Get feature flag details"""
        try:
            # Check if environment variable is set
            env_key = f"ENABLE_{key.upper()}"
            env_value = os.getenv(env_key)
            
            if env_value is not None:
                # Return environment-based flag info
                return {
                    'enabled': str(env_value.lower() in ('true', '1', 'yes', 'on')).lower(),
                    'description': f'Set via environment variable {env_key}',
                    'updated_at': datetime.utcnow().isoformat(),
                    'source': 'environment'
                }
            
            # Fall back to Redis
            flag_key = f"{self.flag_prefix}{key}"
            redis_client = await redis.get_client()
            flag_data = await redis_client.hgetall(flag_key)
            if flag_data:
                flag_data['source'] = 'redis'
            return flag_data if flag_data else None
        except Exception as e:
            logger.error(f"Failed to get feature flag {key}: {e}")
            return None
    
    async def delete_flag(self, key: str) -> bool:
        """Delete a feature flag"""
        try:
            # Check if environment variable is set
            env_key = f"ENABLE_{key.upper()}"
            if os.getenv(env_key) is not None:
                logger.warning(f"Cannot delete flag {key} - it's controlled by environment variable {env_key}")
                return False
            
            # Only delete from Redis if not environment-controlled
            flag_key = f"{self.flag_prefix}{key}"
            redis_client = await redis.get_client()
            deleted = await redis_client.delete(flag_key)
            if deleted:
                await redis_client.srem(self.flag_list_key, key)
                logger.debug(f"Deleted feature flag: {key}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete feature flag {key}: {e}")
            return False
    
    async def list_flags(self) -> Dict[str, bool]:
        """List all feature flags with their status"""
        try:
            # Get environment-based flags
            env_flags = {}
            for key in self._get_environment_flag_keys():
                flag_name = key.replace('ENABLE_', '').lower()
                env_flags[flag_name] = self._is_env_flag_enabled(key)
            
            # Get Redis-based flags
            redis_client = await redis.get_client()
            flag_keys = await redis_client.smembers(self.flag_list_key)
            redis_flags = {}
            
            for key in flag_keys:
                # Only include Redis flags that don't have environment variables
                env_key = f"ENABLE_{key.upper()}"
                if os.getenv(env_key) is None:
                    redis_flags[key] = await self.is_enabled(key)
            
            # Merge flags (environment takes precedence)
            all_flags = {**redis_flags, **env_flags}
            return all_flags
        except Exception as e:
            logger.error(f"Failed to list feature flags: {e}")
            # Return environment flags even if Redis fails
            return {key.replace('ENABLE_', '').lower(): self._is_env_flag_enabled(key) 
                   for key in self._get_environment_flag_keys()}
    
    async def get_all_flags_details(self) -> Dict[str, Dict[str, str]]:
        """Get all feature flags with detailed information"""
        try:
            all_flags = {}
            
            # Get environment-based flags
            for key in self._get_environment_flag_keys():
                flag_name = key.replace('ENABLE_', '').lower()
                all_flags[flag_name] = {
                    'enabled': str(self._is_env_flag_enabled(key)).lower(),
                    'description': f'Set via environment variable {key}',
                    'updated_at': datetime.utcnow().isoformat(),
                    'source': 'environment'
                }
            
            # Get Redis-based flags
            redis_client = await redis.get_client()
            flag_keys = await redis_client.smembers(self.flag_list_key)
            
            for key in flag_keys:
                # Only include Redis flags that don't have environment variables
                env_key = f"ENABLE_{key.upper()}"
                if os.getenv(env_key) is None:
                    flag_data = await self.get_flag(key)
                    if flag_data:
                        all_flags[key] = flag_data
            
            return all_flags
        except Exception as e:
            logger.error(f"Failed to get all flags details: {e}")
            # Return environment flags even if Redis fails
            return {key.replace('ENABLE_', '').lower(): {
                'enabled': str(self._is_env_flag_enabled(key)).lower(),
                'description': f'Set via environment variable {key}',
                'updated_at': datetime.utcnow().isoformat(),
                'source': 'environment'
            } for key in self._get_environment_flag_keys()}
    
    def _get_environment_flag_keys(self) -> List[str]:
        """Get all environment variable keys that control feature flags"""
        return [key for key in os.environ.keys() if key.startswith('ENABLE_')]
    
    def _is_env_flag_enabled(self, env_key: str) -> bool:
        """Check if an environment variable flag is enabled"""
        value = os.getenv(env_key, 'false')
        return value.lower() in ('true', '1', 'yes', 'on')


_flag_manager: Optional[FeatureFlagManager] = None


def get_flag_manager() -> FeatureFlagManager:
    """Get the global feature flag manager instance"""
    global _flag_manager
    if _flag_manager is None:
        _flag_manager = FeatureFlagManager()
    return _flag_manager


# Async convenience functions
async def set_flag(key: str, enabled: bool, description: str = "") -> bool:
    return await get_flag_manager().set_flag(key, enabled, description)


async def is_enabled(key: str) -> bool:
    return await get_flag_manager().is_enabled(key)


async def enable_flag(key: str, description: str = "") -> bool:
    return await set_flag(key, True, description)


async def disable_flag(key: str, description: str = "") -> bool:
    return await set_flag(key, False, description)


async def delete_flag(key: str) -> bool:
    return await get_flag_manager().delete_flag(key)


async def list_flags() -> Dict[str, bool]:
    return await get_flag_manager().list_flags()


async def get_flag_details(key: str) -> Optional[Dict[str, str]]:
    return await get_flag_manager().get_flag(key)


# Feature Flags - These are now controlled by environment variables
# Set ENABLE_CUSTOM_AGENTS=true to enable custom agents
# Set ENABLE_MCP_MODULE=true to enable MCP module
# Set ENABLE_TEMPLATES_API=true to enable templates API
# Set ENABLE_TRIGGERS_API=true to enable triggers API
# Set ENABLE_WORKFLOWS_API=true to enable workflows API
# Set ENABLE_KNOWLEDGE_BASE=true to enable knowledge base
# Set ENABLE_PIPEDREAM=true to enable Pipedream integration
# Set ENABLE_CREDENTIALS_API=true to enable credentials API
# Set ENABLE_SUNA_DEFAULT_AGENT=true to enable Suna default agent




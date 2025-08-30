from typing import Dict, Any, Optional
from utils.logger import logger
from services.supabase import DBConnection
from datetime import datetime, timezone


class HeliumDefaultAgentService:
    """Simplified Helium agent management service."""
    
    def __init__(self, db: DBConnection = None):
        self._db = db or DBConnection()
        logger.debug("🔄 HeliumDefaultAgentService initialized (simplified)")
    
    async def get_helium_default_config(self) -> Dict[str, Any]:
        """Get the current Helium configuration."""
        from agent.helium_config import HELIUM_CONFIG
        return HELIUM_CONFIG.copy()
    
    async def install_for_all_users(self) -> Dict[str, Any]:
        """Install Helium agent for all users who don't have one."""
        logger.debug("🚀 Installing Helium agents for users who don't have them")
        
        try:
            client = await self._db.client
            
            # Get all personal accounts
            accounts_result = await client.schema('basejump').table('accounts').select('id').eq('personal_account', True).execute()
            all_account_ids = {row['id'] for row in accounts_result.data} if accounts_result.data else set()
            
            # Get existing Helium agents
            existing_result = await client.table('agents').select('account_id').eq('metadata->>is_helium_default', 'true').execute()
            existing_account_ids = {row['account_id'] for row in existing_result.data} if existing_result.data else set()
            
            # Find accounts without Helium
            missing_accounts = all_account_ids - existing_account_ids
            
            if not missing_accounts:
                return {
                    "installed_count": 0,
                    "failed_count": 0,
                    "details": ["All users already have Helium agents"]
                }
            
            logger.debug(f"📦 Installing Helium for {len(missing_accounts)} users")
            
            success_count = 0
            failed_count = 0
            errors = []
            
            for account_id in missing_accounts:
                try:
                    await self._create_helium_agent_for_user(account_id)
                    success_count += 1
                    logger.debug(f"✅ Installed Helium for user {account_id}")
                except Exception as e:
                    failed_count += 1
                    error_msg = f"Failed to install for user {account_id}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            return {
                "installed_count": success_count,
                "failed_count": failed_count,
                "details": errors if errors else [f"Successfully installed for {success_count} users"]
            }
            
        except Exception as e:
            error_msg = f"Installation operation failed: {str(e)}"
            logger.error(error_msg)
            return {
                "installed_count": 0,
                "failed_count": 0,
                "details": [error_msg]
            }
    
    async def install_helium_agent_for_user(self, account_id: str, replace_existing: bool = False) -> Optional[str]:
        """Install Helium agent for a specific user."""
        logger.debug(f"🔄 Installing Helium agent for user: {account_id}")
        
        try:
            client = await self._db.client
            
            # Check for existing Helium agent
            existing_result = await client.table('agents').select('agent_id').eq('account_id', account_id).eq('metadata->>is_helium_default', 'true').execute()
            
            if existing_result.data:
                existing_agent_id = existing_result.data[0]['agent_id']
                
                if replace_existing:
                    # Delete existing agent
                    await self._delete_agent(existing_agent_id)
                    logger.debug(f"Deleted existing Helium agent for replacement")
                else:
                    logger.debug(f"User {account_id} already has Helium agent: {existing_agent_id}")
                    return existing_agent_id

            # Create new agent
            agent_id = await self._create_helium_agent_for_user(account_id)
            logger.debug(f"Successfully installed Helium agent {agent_id} for user {account_id}")
            return agent_id
                
        except Exception as e:
            logger.error(f"Error in install_helium_agent_for_user: {e}")
            return None
    
    async def get_helium_agent_stats(self) -> Dict[str, Any]:
        """Get statistics about Helium agents."""
        try:
            client = await self._db.client
            
            # Get total count
            total_result = await client.table('agents').select('agent_id', count='exact').eq('metadata->>is_helium_default', 'true').execute()
            total_count = total_result.count or 0
            
            # Get creation dates for last 30 days
            from datetime import timedelta
            thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
            recent_result = await client.table('agents').select('created_at').eq('metadata->>is_helium_default', 'true').gte('created_at', thirty_days_ago).execute()
            recent_count = len(recent_result.data) if recent_result.data else 0
            
            return {
                "total_agents": total_count,
                "recent_installs": recent_count,
                "note": "Helium agents always use current central configuration"
            }
            
        except Exception as e:
            logger.error(f"Failed to get agent stats: {e}")
            return {"error": str(e)}
    
    async def _create_helium_agent_for_user(self, account_id: str) -> str:
        """Create a Helium agent for a user."""
        from agent.helium_config import HELIUM_CONFIG
        
        client = await self._db.client
        
        # Create agent record
        agent_data = {
            "account_id": account_id,
            "name": HELIUM_CONFIG["name"],
            "description": HELIUM_CONFIG["description"],
            "is_default": True,
            "avatar": HELIUM_CONFIG["avatar"],
            "avatar_color": HELIUM_CONFIG["avatar_color"],
            "metadata": {
                "is_helium_default": True,
                "centrally_managed": True,
                "installation_date": datetime.now(timezone.utc).isoformat()
            },
            "version_count": 1
        }
        
        result = await client.table('agents').insert(agent_data).execute()
        
        if not result.data:
            raise Exception("Failed to create agent record")
        
        agent_id = result.data[0]['agent_id']
        
        # Create initial version
        await self._create_initial_version(agent_id, account_id)
        
        return agent_id
    
    async def _create_initial_version(self, agent_id: str, account_id: str) -> None:
        """Create initial version for Helium agent."""
        try:
            from agent.versioning.version_service import get_version_service
            from agent.helium_config import HELIUM_CONFIG
            
            version_service = await get_version_service()
            await version_service.create_version(
                agent_id=agent_id,
                user_id=account_id,
                system_prompt=HELIUM_CONFIG["system_prompt"],
                configured_mcps=HELIUM_CONFIG["configured_mcps"],
                custom_mcps=HELIUM_CONFIG["custom_mcps"],
                agentpress_tools=HELIUM_CONFIG["agentpress_tools"],
                model=HELIUM_CONFIG["model"],
                version_name="v1",
                change_description="Initial Helium agent installation"
            )
            
            logger.debug(f"Created initial version for Helium agent {agent_id}")
            
        except Exception as e:
            logger.error(f"Failed to create initial version for Helium agent {agent_id}: {e}")
            raise
    
    async def _delete_agent(self, agent_id: str) -> bool:
        """Delete an agent and clean up related data."""
        try:
            client = await self._db.client
            
            # Clean up triggers first
            try:
                from triggers.trigger_service import get_trigger_service
                trigger_service = get_trigger_service(self._db)
                
                triggers_result = await client.table('agent_triggers').select('trigger_id').eq('agent_id', agent_id).execute()
                
                if triggers_result.data:
                    for trigger_record in triggers_result.data:
                        try:
                            await trigger_service.delete_trigger(trigger_record['trigger_id'])
                        except Exception as e:
                            logger.warning(f"Failed to clean up trigger: {str(e)}")
            except Exception as e:
                logger.warning(f"Failed to clean up triggers for agent {agent_id}: {str(e)}")
            
            # Delete agent
            result = await client.table('agents').delete().eq('agent_id', agent_id).execute()
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Failed to delete agent {agent_id}: {e}")
            raise

    # Legacy methods for backward compatibility
    async def sync_all_helium_agents(self) -> Dict[str, Any]:
        """Legacy method - no longer needed as config is always current."""
        logger.warning("sync_all_helium_agents is deprecated - Helium config is always current")
        return {
            "updated_count": 0,
            "failed_count": 0,
            "details": ["Sync not needed - Helium agents always use current config"]
        }
    
    async def update_all_helium_agents(self, target_version: Optional[str] = None) -> Dict[str, Any]:
        """Legacy method - no longer needed as config is always current."""
        logger.warning("update_all_helium_agents is deprecated - Helium config is always current")
        return await self.sync_all_helium_agents()
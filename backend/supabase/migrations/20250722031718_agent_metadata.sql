BEGIN;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_agents_metadata ON agents USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_agents_helium_default 
ON agents((metadata->>'is_helium_default')) 
WHERE metadata->>'is_helium_default' = 'true';

CREATE INDEX IF NOT EXISTS idx_agents_centrally_managed 
ON agents((metadata->>'centrally_managed')) 
WHERE metadata->>'centrally_managed' = 'true';

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_helium_default_unique 
ON agents(account_id) 
WHERE metadata->>'is_helium_default' = 'true';

COMMENT ON COLUMN agents.metadata IS 'Stores additional agent metadata including:
- is_helium_default: boolean - Whether this is the official Helium default agent
- centrally_managed: boolean - Whether this agent is managed centrally by Helium
- management_version: string - Version identifier for central management
- restrictions: object - What editing restrictions apply to this agent
- installation_date: timestamp - When this agent was installed
- last_central_update: timestamp - Last time centrally managed updates were applied';

CREATE OR REPLACE FUNCTION is_helium_default_agent(agent_row agents)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN COALESCE((agent_row.metadata->>'is_helium_default')::boolean, false);
END;
$$;

CREATE OR REPLACE FUNCTION is_centrally_managed_agent(agent_row agents)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE  
AS $$
BEGIN
    RETURN COALESCE((agent_row.metadata->>'centrally_managed')::boolean, false);
END;
$$;

CREATE OR REPLACE FUNCTION get_agent_restrictions(agent_row agents)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN COALESCE(agent_row.metadata->'restrictions', '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION is_helium_default_agent(agents) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_centrally_managed_agent(agents) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_agent_restrictions(agents) TO authenticated, service_role;

DROP POLICY IF EXISTS agents_update_own ON agents;

CREATE POLICY agents_update_own ON agents
    FOR UPDATE
    USING (
        basejump.has_role_on_account(account_id, 'owner') 
        AND (
            NOT COALESCE((metadata->>'is_helium_default')::boolean, false)
            OR 
            (
                COALESCE((metadata->>'is_helium_default')::boolean, false) = true
            )
        )
    );

DROP POLICY IF EXISTS agents_delete_own ON agents;

CREATE POLICY agents_delete_own ON agents
    FOR DELETE
    USING (
        basejump.has_role_on_account(account_id, 'owner') 
        AND is_default = false 
        AND NOT COALESCE((metadata->>'is_helium_default')::boolean, false)
    );

COMMIT;
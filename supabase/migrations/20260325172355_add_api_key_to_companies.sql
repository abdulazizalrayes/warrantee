
ALTER TABLE companies ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

-- Create index for fast API key lookups
CREATE INDEX IF NOT EXISTS idx_companies_api_key ON companies(api_key) WHERE api_key IS NOT NULL;

-- Add comment
COMMENT ON COLUMN companies.api_key IS 'Bearer token for ERP API authentication';


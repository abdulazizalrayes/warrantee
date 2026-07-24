
-- Add missing notification_type enum values that the application code uses
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'general';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'whatsapp';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'claim_status_changed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'info_requested';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system';


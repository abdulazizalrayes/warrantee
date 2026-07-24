
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'awaiting_info';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'rejected';


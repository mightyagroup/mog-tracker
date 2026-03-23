-- Migration 001: Core Setup
-- Auto-update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enum types
CREATE TYPE entity_type AS ENUM ('exousia', 'vitalx', 'ironhouse');
CREATE TYPE lead_status AS ENUM ('new', 'reviewing', 'bid_no_bid', 'active_bid', 'submitted', 'awarded', 'lost', 'no_bid', 'cancelled');
CREATE TYPE commercial_status AS ENUM ('prospect', 'outreach', 'proposal', 'negotiation', 'contract', 'lost', 'inactive');
CREATE TYPE source_type AS ENUM ('sam_gov', 'govwin', 'eva', 'emma', 'local_gov', 'usaspending', 'manual', 'commercial');
CREATE TYPE set_aside_type AS ENUM ('wosb', 'edwosb', '8a', 'hubzone', 'sdvosb', 'small_business', 'total_small_business', 'full_and_open', 'sole_source', 'none');
CREATE TYPE contract_type AS ENUM ('firm_fixed', 'time_materials', 'cost_plus', 'idiq', 'bpa', 'purchase_order', 'commercial');

-- Migration 030: NASCENCE Playbook Alignment (LOCKED DOWN 2026-04-04)
-- Exousia: Primary 561210, Secondary 561720, 561730, 562111, 541614
-- IronHouse: Primary 561720, Secondary 561730, 561210, 562111
-- VitalX: Primary 492110, Secondary 492210, 621511, 621610, 485991, 485999, 561990

-- Step 1: Add psc_codes column to service_categories
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS psc_codes text[] DEFAULT '{}';

-- Step 2: Nullify all gov_leads FK references first (prevents FK violation on DELETE)
UPDATE gov_leads SET service_category_id = NULL WHERE service_category_id IS NOT NULL;

-- Step 3: Delete all existing service categories (they are stale/misaligned)
DELETE FROM service_categories;

-- Step 4: Insert IronHouse categories (4 Nascence pillars)
-- Primary: 561720 | Secondary: 561730, 561210, 562111
INSERT INTO service_categories (entity, name, naics_codes, psc_codes, keywords, color, sort_order) VALUES
  ('ironhouse', 'Custodial / Janitorial Services', '{561720}', '{S201}', '{custodial,janitorial,cleaning,sanitation,housekeeping,floor,restroom,disinfect}', '#06A59A', 1),
  ('ironhouse', 'Landscaping / Grounds Maintenance', '{561730}', '{S208}', '{landscaping,grounds,lawn,mowing,irrigation,turf,tree,shrub,mulch,snow removal}', '#059669', 2),
  ('ironhouse', 'Facilities Operations Support', '{561210}', '{S216}', '{facilities,operations,building,maintenance,hvac,plumbing,electrical,support,management}', '#2563EB', 3),
  ('ironhouse', 'Solid Waste Collection', '{562111}', '{S205}', '{solid waste,trash,garbage,refuse,collection,disposal,recycling,dumpster,waste removal}', '#D97706', 4);

-- Step 5: Insert Exousia categories (4 pillars + procurement consulting)
-- Primary: 561210 | Secondary: 561720, 561730, 562111, 541614
INSERT INTO service_categories (entity, name, naics_codes, psc_codes, keywords, color, sort_order) VALUES
  ('exousia', 'Facilities Operations Support', '{561210}', '{S216}', '{facilities,operations,building,maintenance,hvac,plumbing,electrical,support,management}', '#2563EB', 1),
  ('exousia', 'Custodial / Janitorial Services', '{561720}', '{S201}', '{custodial,janitorial,cleaning,sanitation,housekeeping,floor,restroom,disinfect}', '#06A59A', 2),
  ('exousia', 'Landscaping / Grounds Maintenance', '{561730}', '{S208}', '{landscaping,grounds,lawn,mowing,irrigation,turf,tree,shrub,mulch,snow removal}', '#059669', 3),
  ('exousia', 'Solid Waste Collection', '{562111}', '{S205}', '{solid waste,trash,garbage,refuse,collection,disposal,recycling,dumpster,waste removal}', '#D97706', 4),
  ('exousia', 'Procurement / Logistics Consulting', '{541614}', '{R706}', '{procurement,logistics,consulting,advisory,supply chain,distribution,acquisition}', '#7C3AED', 5);

-- Step 6: Insert VitalX categories (7 healthcare logistics)
-- Primary: 492110 | Secondary: 492210, 621511, 621610, 485991, 485999, 561990
INSERT INTO service_categories (entity, name, naics_codes, psc_codes, keywords, color, sort_order) VALUES
  ('vitalx', 'Medical Courier / Specimen Transport', '{492110}', '{V119}', '{courier,specimen,transport,delivery,medical,laboratory,express,package,blood,tissue,pathology}', '#06A59A', 1),
  ('vitalx', 'Pharmacy Delivery', '{492210}', '{V119}', '{pharmacy,medication,prescription,drug,delivery,local messenger}', '#059669', 2),
  ('vitalx', 'Lab Services Support', '{621511}', '{Q301}', '{lab,laboratory,clinical,pathology,testing,reference,diagnostic,blood work}', '#0891B2', 3),
  ('vitalx', 'Home Health Services', '{621610}', '{Q999}', '{home health,home care,nursing,patient,in-home,health aide}', '#7C3AED', 4),
  ('vitalx', 'Special Needs Transportation', '{485991}', '{V225}', '{special needs,transport,disability,accessible,paratransit,patient transport}', '#DC2626', 5),
  ('vitalx', 'NEMT', '{485999}', '{V225}', '{nemt,non-emergency,transport,patient,medical transport,ambulette}', '#8B5CF6', 6),
  ('vitalx', 'General Healthcare Support', '{561990}', '{Q999}', '{healthcare,health,support,services,general,medical,logistics}', '#6B7280', 7);

-- Note: gov_leads service_category_id was already nullified in Step 2.
-- The app's recategorize endpoint will re-assign categories on next load.

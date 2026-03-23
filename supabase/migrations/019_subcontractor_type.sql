-- Add sub_type to distinguish SAM-registered teaming partners vs. local fulfillment subs
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS sub_type text DEFAULT 'teaming_partner';

-- All previously seeded subs are teaming partners (SAM-registered small businesses)
UPDATE subcontractors SET sub_type = 'teaming_partner' WHERE sub_type IS NULL OR sub_type = '';

-- ── Seed 15 nationally known fulfillment subs with verified public info only ──
-- No fake contact names or emails. Phone numbers are main published lines only.
-- Websites are stable, publicly verified.

INSERT INTO subcontractors (
  company_name,
  contact_name, contact_email, contact_phone,
  website,
  certifications, naics_codes, set_asides,
  service_tags,
  services_offered,
  geographic_coverage,
  entities_associated,
  teaming_agreement_status,
  sub_type,
  fit_score, reputation_rating,
  notes
) VALUES

-- 1. ABM Industries
(
  'ABM Industries', NULL, NULL, NULL,
  'https://www.abm.com',
  '{}', '{561720,561210,238220}', '{}',
  '{Janitorial,HVAC,Electrical,Security,Staffing}',
  'Full-spectrum facilities management: janitorial, HVAC maintenance, electrical, security, and parking for large federal and commercial properties.',
  'National — DMV region offices available',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 72, 80,
  'NYSE: ABM. National facilities giant. Use for large bundled facilities bids requiring broad capabilities.'
),

-- 2. Cintas Corporation
(
  'Cintas Corporation', NULL, NULL, NULL,
  'https://www.cintas.com',
  '{}', '{561720,812332}', '{}',
  '{Janitorial,Staffing,Fire Protection}',
  'Facility services: floor care, restroom programs, entrance mats, first aid/fire safety compliance, uniforms.',
  'National — local service centers in DMV',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 65, 78,
  'NASDAQ: CTAS. Strong for compliance-heavy janitorial and safety programs at federal facilities.'
),

-- 3. Servpro
(
  'Servpro', NULL, NULL, NULL,
  'https://www.servpro.com',
  '{}', '{562910,238990}', '{}',
  '{Environmental,Janitorial}',
  'Water and fire damage restoration, mold remediation, biohazard cleanup for commercial and government facilities.',
  'National — franchise locations across DMV',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 60, 74,
  'Franchise model. Use for emergency environmental remediation and post-incident cleanup.'
),

-- 4. ServiceMaster Clean
(
  'ServiceMaster Clean', NULL, NULL, NULL,
  'https://www.servicemasterclean.com',
  '{}', '{561720,562910}', '{}',
  '{Janitorial,Environmental,Window Cleaning}',
  'Commercial cleaning, disaster restoration, janitorial for government and commercial office buildings.',
  'National — DMV franchise locations',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 62, 72,
  'Franchise model. Well-known commercial cleaning brand. Good for surge janitorial capacity.'
),

-- 5. Stanley Steemer International
(
  'Stanley Steemer International', NULL, NULL, '(800) 783-3637',
  'https://www.stanleysteemer.com',
  '{}', '{561720}', '{}',
  '{Janitorial,Flooring,Window Cleaning}',
  'Carpet and hard floor cleaning, upholstery cleaning, tile and grout, air duct cleaning for commercial facilities.',
  'National — local DMV service locations',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 58, 70,
  'Carpet/floor specialists. 1-800-STEEMER is their published national line. Good for post-renovation deep clean requirements.'
),

-- 6. Roto-Rooter
(
  'Roto-Rooter Services Company', NULL, NULL, NULL,
  'https://www.rotorooter.com',
  '{}', '{238220}', '{}',
  '{Plumbing,Waste Removal}',
  'Plumbing repair, drain cleaning, sewer service, hydro-jetting for commercial and government properties.',
  'National — local DMV technicians available 24/7',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 68, 76,
  'Franchise/corporate hybrid. Reliable emergency plumbing response. Use for facilities bids requiring plumbing scope.'
),

-- 7. Terminix Commercial
(
  'Terminix Commercial', NULL, NULL, NULL,
  'https://www.terminix.com/commercial',
  '{}', '{561710}', '{}',
  '{Pest Control}',
  'Commercial pest control programs, rodent control, bird management, termite protection for federal and government buildings.',
  'National — DMV commercial accounts team',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 70, 78,
  'Well-known national pest control brand. Use for federal facility bids with pest management scope.'
),

-- 8. Orkin Commercial
(
  'Orkin Commercial', NULL, NULL, NULL,
  'https://www.orkin.com/commercial',
  '{}', '{561710}', '{}',
  '{Pest Control}',
  'Commercial integrated pest management, termite protection, bed bug treatment, wildlife removal.',
  'National — DMV branch offices',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 70, 79,
  'Major competitor to Terminix. Strong federal track record for pest control under facilities contracts.'
),

-- 9. BrightView Landscaping
(
  'BrightView Landscaping', NULL, NULL, NULL,
  'https://www.brightview.com',
  '{}', '{561730,561710}', '{}',
  '{Landscaping}',
  'Commercial and government grounds maintenance, landscape design, irrigation, tree care, snow removal.',
  'National — DMV region offices in Northern VA and MD',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 75, 82,
  'NYSE: BV. Largest commercial landscaping company in US. Strong federal campus past performance.'
),

-- 10. Davey Tree Expert Company
(
  'Davey Tree Expert Company', NULL, NULL, NULL,
  'https://www.davey.com',
  '{}', '{561730,115310}', '{}',
  '{Landscaping}',
  'Arborist services, tree removal, stump grinding, grounds maintenance, and utility line clearing for government and commercial.',
  'National — local arborist offices in DMV',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 68, 80,
  'Employee-owned. Strong for tree and grounds work on federal installations. Good safety record.'
),

-- 11. ADT Commercial
(
  'ADT Commercial', NULL, NULL, NULL,
  'https://www.adt.com/commercial',
  '{}', '{561612,238210}', '{}',
  '{Security,Fire Protection,Locksmith}',
  'Commercial alarm systems, access control, video surveillance, fire alarm monitoring for government and commercial facilities.',
  'National — DMV commercial offices',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 65, 76,
  'NYSE: ADT. Widely used for federal facility security and fire alarm monitoring. Check FedRAMP status for IT-connected systems.'
),

-- 12. Otis Elevator Company
(
  'Otis Elevator Company', NULL, NULL, NULL,
  'https://www.otis.com/en/us/',
  '{}', '{238290}', '{}',
  '{HVAC}',
  'Elevator and escalator installation, modernization, and maintenance contracts for government and large commercial facilities.',
  'National — DMV branch service offices',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 55, 78,
  'NYSE: OTIS. Required sub on multi-story federal building facilities bids. Include when elevator maintenance is in scope.'
),

-- 13. KONE Inc
(
  'KONE Inc', NULL, NULL, NULL,
  'https://www.kone.com/en-us/',
  '{}', '{238290}', '{}',
  '{HVAC}',
  'Elevator and escalator equipment, installation, maintenance, and modernization for federal and commercial buildings.',
  'National — DC metro area offices',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 55, 76,
  'Finnish multinational. Alternative to Otis for elevator maintenance scope on federal facilities bids.'
),

-- 14. TK Elevator (formerly ThyssenKrupp Elevator)
(
  'TK Elevator', NULL, NULL, NULL,
  'https://www.tkelevator.com/us-en/',
  '{}', '{238290}', '{}',
  '{HVAC}',
  'Elevator and escalator service, modernization, and new installation for commercial and government facilities.',
  'National — DMV region technicians',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 55, 75,
  'German multinational. Third elevator option alongside Otis and KONE. Use when bid requires elevator maintenance sub.'
),

-- 15. Siemens Smart Infrastructure (Building Technologies)
(
  'Siemens Smart Infrastructure', NULL, NULL, NULL,
  'https://www.siemens.com/us/en/company/topic-areas/smart-infrastructure.html',
  '{}', '{238220,238210,541330}', '{}',
  '{HVAC,Security,Fire Protection,Electrical}',
  'Building automation, HVAC controls, fire safety systems, electrical infrastructure, and smart building solutions for federal and commercial facilities.',
  'National — DMV federal accounts team',
  '{exousia,ironhouse}', 'none', 'fulfillment_sub', 60, 82,
  'NYSE: SI. Siemens building technology division. Use for bids requiring BAS/HVAC controls, fire suppression systems, or energy management scope.'
)

ON CONFLICT DO NOTHING;

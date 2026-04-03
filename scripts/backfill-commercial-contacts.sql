-- Backfill deep contact info for existing VitalX commercial leads
-- and insert new high-value DMV healthcare prospects

-- ── UPDATE EXISTING LEADS ─────────────────────────────────────────────────────

-- Quest Diagnostics
UPDATE commercial_leads SET
  contact_department = 'Regional Operations',
  contact_direct_phone = '(866) 697-8378',
  office_name = 'Quest Diagnostics DC - 19th St',
  office_address = '1145 19th St NW, Suite 701',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20036',
  service_summary = 'Multiple patient service centers across DMV. Needs specimen courier between draw sites and regional processing labs. High-volume daily routes. Call customer service for regional management referral to procurement.'
WHERE organization_name ILIKE '%quest diagnostics%' AND entity = 'vitalx';

-- Labcorp
UPDATE commercial_leads SET
  contact_department = 'Regional Operations',
  contact_direct_phone = '(202) 293-9225',
  office_name = 'Labcorp DC - 19th St',
  office_address = '1145 19th St NW, Suite 601',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20036',
  service_summary = 'Six+ patient service centers in DC alone. High-volume specimen transport between draw sites and processing facilities. Major revenue opportunity for daily route contracts. Call for regional operations manager referral.'
WHERE organization_name ILIKE '%labcorp%' AND entity = 'vitalx';

-- Children's National Hospital
UPDATE commercial_leads SET
  contact_name = 'Yunchuan Delores Mo, MD',
  contact_title = 'Medical Director, Quality & Safety, Pathology & Lab Medicine',
  contact_department = 'Pathology & Laboratory Medicine',
  contact_direct_phone = '(202) 476-5433',
  contact_phone = '(202) 476-2226',
  office_name = 'Children''s National Hospital',
  office_address = '111 Michigan Avenue NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20010',
  service_summary = 'Major pediatric hospital. 24/7 transport team for critical specimens. Pathology lab direct line: 202-476-2051. Transport/logistics: 202-476-5433. High-priority prospect for pediatric specimen courier services.'
WHERE organization_name ILIKE '%children%national%' AND entity = 'vitalx';

-- George Washington University Hospital
UPDATE commercial_leads SET
  contact_name = 'Jason Barrett, FACHE',
  contact_title = 'Group VP, DC Market & CEO',
  contact_department = 'Hospital Administration',
  contact_direct_phone = '(202) 444-3597',
  contact_phone = '(202) 715-4000',
  office_name = 'George Washington University Hospital',
  office_address = '900 23rd Street NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20037',
  service_summary = 'Major academic medical center. Lab direct line: 202-444-3597. CMO: Bruno Petinaux, MD. CNO: Patricia Horgas, MSN, RN. Full pathology services. Target lab operations manager for specimen courier contracts.'
WHERE organization_name ILIKE '%george washington%' AND entity = 'vitalx';

-- Kaiser Permanente Mid-Atlantic
UPDATE commercial_leads SET
  contact_name = 'Jennifer McPherren',
  contact_title = 'Vice President of Supply Chain',
  contact_department = 'Supply Chain',
  office_name = 'Kaiser Permanente Mid-Atlantic Regional Office',
  office_city = 'Washington',
  office_state = 'DC',
  service_summary = 'Multi-state health system across DC, MD, VA. Regional supply chain under Jennifer McPherren (VP). Large network = multiple courier route opportunities between facilities. Contact corporate for Mid-Atlantic logistics procurement.'
WHERE organization_name ILIKE '%kaiser%' AND entity = 'vitalx';

-- Sentara Healthcare
UPDATE commercial_leads SET
  contact_name = 'Jennifer McPherren',
  contact_title = 'Vice President of Supply Chain',
  contact_department = 'Supply Chain',
  contact_direct_phone = '(757) 455-7788',
  office_name = 'Sentara Supply Chain HQ',
  office_address = '1545 Crossways Blvd, Suite 100',
  office_city = 'Chesapeake',
  office_state = 'VA',
  office_zip = '23320',
  service_summary = '12 hospitals across Virginia and NE North Carolina. Corporate HQ: 1300 Sentara Park, Virginia Beach. Supply chain: Luke Barbier (Director, Norfolk). Kahealani Fujimoto (Logistics Specialist). Ideal for multi-facility route contracts.'
WHERE organization_name ILIKE '%sentara%' AND entity = 'vitalx';

-- Novant Health UVA
UPDATE commercial_leads SET
  contact_name = 'Ashley Carter',
  contact_title = 'Director of Operations, Northern Virginia & Culpeper',
  contact_department = 'Operations',
  contact_direct_phone = '(703) 753-4045',
  office_name = 'Novant Health UVA Health System HQ',
  office_address = '7901 Lake Manassas Drive',
  office_city = 'Gainesville',
  office_state = 'VA',
  office_zip = '20155',
  service_summary = 'Multiple medical centers across Northern VA and Central VA (Prince William, Haymarket, Culpeper). Regional CEO: Melissa Robson. Operations Director: Ashley Carter. Multi-facility courier route opportunity.'
WHERE organization_name ILIKE '%novant%' AND entity = 'vitalx';

-- BioReference Laboratories
UPDATE commercial_leads SET
  contact_name = 'Elizabeth Fuentes, BS, MT (ASCP)',
  contact_title = 'Operations Director',
  contact_department = 'Operations',
  contact_email = 'efuentes@bioreference.com',
  contact_direct_phone = '(201) 800-2760',
  contact_phone = '(800) 229-5227',
  office_name = 'BioReference Laboratories - Gaithersburg',
  office_address = '207 Perry Parkway',
  office_city = 'Gaithersburg',
  office_state = 'MD',
  office_zip = '20877',
  service_summary = 'Specialty lab services. Operations Director: Elizabeth Fuentes (direct: 201-800-2760, email: efuentes@bioreference.com). Note: Some assets transferred to Labcorp. Verify current service availability in MD/VA before outreach.'
WHERE organization_name ILIKE '%bioreference%' AND entity = 'vitalx';

-- ICON plc
UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  office_city = 'Silver Spring',
  office_state = 'MD',
  service_summary = 'Clinical research organization (CRO). Mid-Atlantic offices in Baltimore MD, Silver Spring MD, Reston VA. Specimen transport needs for clinical trials, not routine hospital ops. Longer sales cycle but recurring contract potential for trial logistics.'
WHERE organization_name ILIKE '%icon%plc%' AND entity = 'vitalx';

-- Johns Hopkins Medicine (if exists)
UPDATE commercial_leads SET
  contact_department = 'Pathology & Laboratory Services',
  contact_direct_phone = '(410) 955-5000',
  office_name = 'Johns Hopkins Hospital',
  office_address = '1800 Orleans Street',
  office_city = 'Baltimore',
  office_state = 'MD',
  office_zip = '21287',
  service_summary = 'Major academic medical center and research hospital. Multiple affiliated facilities including Sibley Memorial (DC) and Suburban Hospital (Bethesda). High-volume specimen transport between all Hopkins facilities. Strategic anchor account for DMV expansion.'
WHERE organization_name ILIKE '%johns hopkins%medicine%' AND entity = 'vitalx';

-- VCU Health
UPDATE commercial_leads SET
  contact_name = 'Roxanne Mercer',
  contact_department = 'Laboratory Services',
  office_name = 'VCU Medical Center',
  office_address = '1250 E Marshall Street',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23298',
  service_summary = 'Academic medical center in Richmond. Contact: Roxanne Mercer. Full pathology and laboratory services. Potential for specimen courier between VCU Health network facilities across Central Virginia.'
WHERE organization_name ILIKE '%vcu health%' AND entity = 'vitalx';

-- MedStar Health
UPDATE commercial_leads SET
  contact_department = 'Supply Chain / Lab Operations',
  contact_direct_phone = '(202) 444-3597',
  office_name = 'MedStar Georgetown University Hospital',
  office_address = '3800 Reservoir Road NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20007',
  service_summary = 'Multi-hospital health system across DC and MD. Georgetown hospital lab: 202-444-3597. Lab Medical Director: Dr. Jennifer Broussard. Specimen slides: 202-784-3614. Major multi-facility courier route opportunity across all MedStar locations.'
WHERE organization_name ILIKE '%medstar%' AND entity = 'vitalx';

-- Inova Health System
UPDATE commercial_leads SET
  contact_department = 'Laboratory Services / Supply Chain',
  office_name = 'Inova Fairfax Hospital',
  office_address = '3300 Gallows Road',
  office_city = 'Falls Church',
  office_state = 'VA',
  office_zip = '22042',
  service_summary = 'Largest healthcare system in Northern Virginia. Multiple hospitals (Fairfax, Fair Oaks, Loudoun, Alexandria, Mt Vernon). High-volume specimen transport between facilities. Strategic anchor account for NoVA courier routes.'
WHERE organization_name ILIKE 'inova health system' AND entity = 'vitalx';

-- Mary Washington Healthcare
UPDATE commercial_leads SET
  contact_name = 'Donna Morris',
  contact_department = 'Laboratory Services',
  office_name = 'Mary Washington Hospital',
  office_city = 'Fredericksburg',
  office_state = 'VA',
  service_summary = 'Regional health system in Fredericksburg VA. Contact: Donna Morris. Two-hospital system serving greater Fredericksburg area. Potential for specimen transport between facilities and to reference labs.'
WHERE organization_name ILIKE '%mary washington%' AND entity = 'vitalx';


-- ── INSERT NEW HIGH-VALUE PROSPECTS ───────────────────────────────────────────

-- Georgetown University Hospital (MedStar)
INSERT INTO commercial_leads (entity, organization_name, contact_name, contact_title, contact_department, contact_direct_phone, contact_phone, office_name, office_address, office_city, office_state, office_zip, service_category, status, service_summary)
SELECT 'vitalx', 'Georgetown University Hospital (MedStar)', 'Dr. Jennifer Broussard', 'Lab Medical Director', 'Pathology & Laboratory Medicine', '(202) 444-3597', '(202) 784-3614', 'MedStar Georgetown University Hospital', '3800 Reservoir Road NW, Ground Floor Gorman Bldg', 'Washington', 'DC', '20007', 'Hospital Systems', 'prospect', 'Major academic medical center. Lab Medical Director: Dr. Jennifer Broussard. Lab phone: 202-444-3597. Specimen/slides: 202-784-3614. Fax: 202-291-5246. Full clinical and anatomical pathology laboratory. Part of MedStar Health system.'
WHERE NOT EXISTS (SELECT 1 FROM commercial_leads WHERE organization_name ILIKE '%georgetown%university%hospital%' AND entity = 'vitalx');

-- Howard University Hospital
INSERT INTO commercial_leads (entity, organization_name, contact_name, contact_title, contact_department, contact_direct_phone, contact_phone, office_name, office_address, office_city, office_state, office_zip, service_category, status, service_summary)
SELECT 'vitalx', 'Howard University Hospital', 'Tammey Naab', 'Laboratory Director', 'Pathology', '(202) 806-6306', '(202) 865-6100', 'Howard University Hospital', '2041 Georgia Avenue NW', 'Washington', 'DC', '20060', 'Hospital Systems', 'prospect', 'Academic medical center with high-volume lab. Lab Director: Tammey Naab. Pathology Chair: Roger A. Mitchell, MD. Pathology dept direct: 202-806-6306. Active residency program = high specimen volume. Priority DC prospect.'
WHERE NOT EXISTS (SELECT 1 FROM commercial_leads WHERE organization_name ILIKE '%howard%university%hospital%' AND entity = 'vitalx');

-- NIH Clinical Center
INSERT INTO commercial_leads (entity, organization_name, contact_name, contact_title, contact_department, contact_direct_phone, contact_phone, office_name, office_address, office_city, office_state, office_zip, service_category, status, service_summary)
SELECT 'vitalx', 'NIH Clinical Center', 'Katherine Stagliano', 'Deputy Chief, Dept of Laboratory Medicine', 'Laboratory Medicine', '(301) 832-7954', '(301) 496-5668', 'NIH Clinical Center, Building 10', '10 Center Drive, Room 2C306', 'Bethesda', 'MD', '20892', 'Hospital Systems', 'prospect', 'Federal research facility. Katherine Stagliano (Deputy Chief Lab Medicine): 301-832-7954. Stefania Pittaluga (Senior Research Physician): 301-480-8465. Specimen transport for clinical trials and research. Requires govt contracting credentials.'
WHERE NOT EXISTS (SELECT 1 FROM commercial_leads WHERE organization_name ILIKE '%nih clinical center%' AND entity = 'vitalx');

-- Walter Reed National Military Medical Center
INSERT INTO commercial_leads (entity, organization_name, contact_title, contact_department, contact_phone, office_name, office_address, office_city, office_state, office_zip, service_category, status, service_summary)
SELECT 'vitalx', 'Walter Reed National Military Medical Center', 'Director', 'Hospital Command', '(301) 295-4000', 'Walter Reed NMMC', '8901 Rockville Pike', 'Bethesda', 'MD', '20889', 'Hospital Systems', 'prospect', 'Federal military hospital. Director: Colonel Andrew M. Barr, US Army. Appointments: 855-227-6331. Strict vendor credentialing and security requirements. Govt contracting required. High-value long-term contract potential for secure medical courier.'
WHERE NOT EXISTS (SELECT 1 FROM commercial_leads WHERE organization_name ILIKE '%walter reed%' AND entity = 'vitalx');

-- Sibley Memorial Hospital (Johns Hopkins)
INSERT INTO commercial_leads (entity, organization_name, contact_department, contact_phone, office_name, office_address, office_city, office_state, office_zip, service_category, status, service_summary)
SELECT 'vitalx', 'Sibley Memorial Hospital (Johns Hopkins)', 'Pathology & Lab Services', '(202) 537-4000', 'Sibley Memorial Hospital', '5255 Loughboro Road NW', 'Washington', 'DC', '20016', 'Hospital Systems', 'prospect', 'Johns Hopkins-affiliated community hospital in NW DC. Full pathology services. Part of Hopkins network = opportunity to bundle with Suburban Hospital (Bethesda) and main Hopkins (Baltimore). Call main: 202-537-4000 for lab department referral.'
WHERE NOT EXISTS (SELECT 1 FROM commercial_leads WHERE organization_name ILIKE '%sibley%' AND entity = 'vitalx');

-- Suburban Hospital (Johns Hopkins)
INSERT INTO commercial_leads (entity, organization_name, contact_department, contact_phone, office_name, office_address, office_city, office_state, office_zip, service_category, status, service_summary)
SELECT 'vitalx', 'Suburban Hospital (Johns Hopkins)', 'Pathology & Lab Services', '(301) 896-3100', 'Suburban Hospital', '8600 Old Georgetown Road', 'Bethesda', 'MD', '20814', 'Hospital Systems', 'prospect', 'Johns Hopkins-affiliated hospital in Bethesda. CAP-accredited lab, CLIA# 21D0211537. Level II trauma center. Affiliated with NIH. Bundle opportunity with Sibley Memorial and main Hopkins. Call 301-896-3100 for lab department.'
WHERE NOT EXISTS (SELECT 1 FROM commercial_leads WHERE organization_name ILIKE '%suburban hospital%' AND entity = 'vitalx');

-- Add service_tags, fit_score, reputation_rating to subcontractors
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS service_tags text[] DEFAULT '{}';
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS fit_score int DEFAULT 0;
ALTER TABLE subcontractors ADD COLUMN IF NOT EXISTS reputation_rating int DEFAULT 0;

-- Seed 25 DMV-area subcontractors for Exousia + IronHouse
INSERT INTO subcontractors (
  company_name, contact_name, contact_email, contact_phone, website,
  certifications, naics_codes, set_asides, service_tags,
  services_offered, geographic_coverage, entities_associated,
  teaming_agreement_status, fit_score, reputation_rating, notes
) VALUES
(
  'Capital Building Services LLC', 'Marcus Johnson', 'mjohnson@capitalbuilding.com', '(703) 555-0101', NULL,
  '{WOSB,SWaM}', '{561720,561210}', '{wosb,small_business}',
  '{Janitorial,Window Cleaning,Waste Removal}',
  'Full commercial janitorial, deep cleaning, government facility maintenance.',
  'DMV Region', '{exousia,ironhouse}', 'executed', 85, 90,
  'Top janitorial sub. Active SAM.gov. Prior NOVA work.'
),
(
  'Patriot HVAC Solutions Inc', 'Derek Cole', 'dcole@patriothvac.com', '(703) 555-0102', NULL,
  '{SDVOSB}', '{238220}', '{sdvosb,small_business}',
  '{HVAC,Plumbing,Fire Protection}',
  'HVAC installation, preventive maintenance, emergency repair for government facilities.',
  'Northern Virginia, DC Metro', '{exousia,ironhouse}', 'executed', 80, 85,
  'SDVOSB. Strong past performance at federal facilities in NoVA.'
),
(
  'Mid-Atlantic Electrical Group', 'Sandra Park', 'spark@midatlanticelectric.com', '(301) 555-0103', NULL,
  '{8a}', '{238210}', '{8a,small_business}',
  '{Electrical,Fire Protection,Security}',
  'Electrical contracting, panel upgrades, lighting, emergency power for federal and commercial.',
  'MD, DC, VA', '{exousia,ironhouse}', 'drafting', 75, 80,
  '8(a). Strong federal past performance in MD corridor.'
),
(
  'Chesapeake Plumbing & Mechanical', 'Roy Torres', 'rtorres@chesapeakeplumbing.com', '(410) 555-0104', NULL,
  '{HUBZone}', '{238220}', '{hubzone,small_business}',
  '{Plumbing,HVAC}',
  'Commercial plumbing, pipe repair, fixture installation, preventive maintenance.',
  'MD, DC, Northern VA', '{exousia,ironhouse}', 'none', 65, 75,
  'HUBZone certified. Focus on MD federal buildings.'
),
(
  'Green Earth Grounds Management', 'Amara Osei', 'aosei@greenearth-grounds.com', '(571) 555-0105', NULL,
  '{WOSB,SWaM}', '{561730}', '{wosb,small_business}',
  '{Landscaping}',
  'Commercial landscaping, grounds maintenance, snow removal, irrigation systems.',
  'Northern Virginia, Fairfax/Prince William/Stafford', '{exousia,ironhouse}', 'executed', 90, 92,
  'WOSB. Primary landscaping sub. Excellent performance on Fairfax County contract.'
),
(
  'Allied Painting & Coatings LLC', 'Kevin Walsh', 'kwalsh@alliedpainting.com', '(703) 555-0106', NULL,
  '{SWaM}', '{238320}', '{small_business}',
  '{Painting,Environmental}',
  'Interior/exterior commercial painting, lead abatement, epoxy coatings for federal facilities.',
  'Virginia, Maryland', '{exousia,ironhouse}', 'none', 60, 70,
  'SWaM certified. Good pricing on large facilities.'
),
(
  'National Environmental Services Group', 'Priya Sharma', 'psharma@nesg.com', '(240) 555-0107', NULL,
  '{WOSB,8a}', '{562910,562211}', '{wosb,8a,small_business}',
  '{Environmental,Waste Removal}',
  'Hazardous waste removal, environmental remediation, spill cleanup, regulatory compliance.',
  'DMV Region, Mid-Atlantic', '{exousia,ironhouse}', 'none', 70, 80,
  'WOSB + 8(a). Specialized in federal environmental compliance work.'
),
(
  'Sentinel Security Group LLC', 'James Monroe', 'jmonroe@sentinelsecurity.com', '(703) 555-0108', NULL,
  '{VOSB}', '{561612}', '{sdvosb,small_business}',
  '{Security}',
  'Unarmed security guards, access control, CCTV monitoring, government facility security.',
  'Northern Virginia, DC', '{exousia,ironhouse}', 'none', 55, 72,
  'VOSB. Licensed in VA and DC. Federal clearance on file for guard staff.'
),
(
  'Metro Staffing Solutions LLC', 'Lena Fischer', 'lfischer@metrostaffing.com', '(202) 555-0109', NULL,
  '{WOSB,EDWOSB}', '{561320}', '{wosb,edwosb,small_business}',
  '{Staffing}',
  'Administrative and facilities support staffing. Temp-to-perm and contract placements.',
  'DC, MD, VA', '{exousia,ironhouse}', 'none', 50, 65,
  'EDWOSB. Good for surge staffing on admin or facilities bids.'
),
(
  'Premier Flooring Systems Inc', 'Calvin Reed', 'creed@premierflooringsystems.com', '(571) 555-0110', NULL,
  '{SWaM}', '{238330}', '{small_business}',
  '{Flooring}',
  'VCT, carpet, LVP, epoxy installation for government facilities and commercial buildings.',
  'Virginia, Maryland', '{exousia,ironhouse}', 'none', 55, 68,
  'SWaM. Good pricing. Past performance at VA state facilities.'
),
(
  'Eco-Guard Pest Management', 'Yolanda Brooks', 'ybrooks@ecoguardpest.com', '(703) 555-0111', NULL,
  '{WOSB}', '{561710}', '{wosb,small_business}',
  '{Pest Control}',
  'Integrated pest management for commercial, government, and industrial facilities.',
  'Northern Virginia, DC Metro', '{exousia,ironhouse}', 'executed', 72, 82,
  'WOSB. Recurring monthly contracts with federal tenants. Low complaints.'
),
(
  'Capital Locksmith & Access Control', 'David Nwosu', 'dnwosu@capitallocksmith.com', '(202) 555-0112', NULL,
  '{MBE}', '{561622}', '{small_business}',
  '{Locksmith,Security}',
  'Commercial locksmithing, key duplication, electronic access control, safe installation.',
  'DC, Northern Virginia', '{exousia,ironhouse}', 'none', 48, 70,
  'MBE certified in DC. Licensed bonded locksmith. Good for facilities bids requiring access control.'
),
(
  'Capitol Fire & Safety Services', 'Michael Okafor', 'mokafor@capitolfireservices.com', '(703) 555-0113', NULL,
  '{SWaM,SDVOSB}', '{561621}', '{sdvosb,small_business}',
  '{Fire Protection,Security}',
  'Fire suppression system installation, annual inspections, extinguisher service.',
  'Virginia, Maryland', '{exousia,ironhouse}', 'none', 65, 78,
  'SDVOSB. Required sub on most federal facilities bids. Good turnaround.'
),
(
  'Atlantic Roofing Group LLC', 'Thomas Henderson', 'thenderson@atlanticroofing.com', '(804) 555-0114', NULL,
  '{SWaM}', '{238160}', '{small_business}',
  '{Roofing}',
  'Commercial flat roofing, TPO, EPDM, metal roofing for government and industrial buildings.',
  'Virginia, Maryland, DC', '{exousia,ironhouse}', 'none', 50, 65,
  'SWaM. Strong in central and Northern VA.'
),
(
  'Crystal Clear Window Services', 'Angela Kim', 'akim@crystalclearwindows.com', '(703) 555-0115', NULL,
  '{WOSB}', '{561720}', '{wosb,small_business}',
  '{Window Cleaning,Janitorial}',
  'Commercial high-rise window cleaning, pressure washing, building exterior maintenance.',
  'Northern Virginia, DC Metro', '{exousia,ironhouse}', 'none', 68, 74,
  'WOSB. Often bundled with janitorial contracts. Professional and insured.'
),
(
  'Metro Waste & Recycling Solutions', 'Frank Delgado', 'fdelgado@metrowaste.com', '(240) 555-0116', NULL,
  '{MBE}', '{562111}', '{small_business}',
  '{Waste Removal,Environmental}',
  'Commercial waste hauling, dumpster rental, recycling compliance for government facilities.',
  'DMV Region', '{exousia,ironhouse}', 'none', 55, 68,
  'MBE. Competitive pricing on large facility waste contracts.'
),
(
  'Federal Building Services LLC', 'Denise Carter', 'dcarter@federalbuildingsvcs.com', '(703) 555-0117', NULL,
  '{WOSB,EDWOSB}', '{561720,561730,561210}', '{wosb,edwosb,small_business}',
  '{Janitorial,Landscaping,Window Cleaning}',
  'Full-service facilities management: janitorial, landscaping, grounds, and exterior building care.',
  'Northern Virginia, DC', '{exousia,ironhouse}', 'executed', 88, 91,
  'EDWOSB. Full-service sub. Used on multiple exousia bids. Strong federal past performance.'
),
(
  'Fairfax Landscaping & Snow Co', 'Paul Otieno', 'potieno@fairfaxlandscaping.com', '(703) 555-0118', NULL,
  '{SWaM}', '{561730}', '{small_business}',
  '{Landscaping}',
  'Commercial landscaping, snow plowing, grounds maintenance for federal installations.',
  'Fairfax, Prince William, Loudoun Counties', '{exousia,ironhouse}', 'none', 72, 76,
  'SWaM. Local. Good snow removal contacts.'
),
(
  'Sterling HVAC & Mechanical Inc', 'Brandon White', 'bwhite@sterlinghvac.com', '(571) 555-0119', NULL,
  '{SWaM,SDVOSB}', '{238220}', '{sdvosb,small_business}',
  '{HVAC,Plumbing}',
  'HVAC installation and maintenance, DDC controls, boiler systems for government buildings.',
  'Sterling, Loudoun, Fairfax, Arlington', '{exousia,ironhouse}', 'none', 70, 79,
  'SDVOSB in Loudoun County. Strong DMV federal track record.'
),
(
  'NoVA Electrical Contractors LLC', 'Isaac Brown', 'ibrown@novaelectrical.com', '(703) 555-0120', NULL,
  '{SWaM,MBE}', '{238210}', '{small_business}',
  '{Electrical,Fire Protection}',
  'Electrical systems, emergency lighting, generator hookups, panel work for federal properties.',
  'Northern Virginia', '{exousia,ironhouse}', 'none', 62, 72,
  'MBE + SWaM. Active VA contractor license. Good pricing.'
),
(
  'Pentagon City Plumbing & Drain', 'Carlos Ramirez', 'cramirez@pentagoncityplumbing.com', '(703) 555-0121', NULL,
  '{HUBZone,SWaM}', '{238220}', '{hubzone,small_business}',
  '{Plumbing}',
  'Plumbing repair, backflow prevention, drain cleaning, fixture installation.',
  'Arlington, Alexandria, Fairfax', '{exousia,ironhouse}', 'none', 58, 68,
  'HUBZone in Arlington. Good for Pentagon-area facility bids.'
),
(
  'Executive Cleaning Services LLC', 'Fatima Al-Hassan', 'falhassan@execclean.com', '(202) 555-0122', NULL,
  '{WOSB,EDWOSB,8a}', '{561720}', '{wosb,edwosb,8a,small_business}',
  '{Janitorial,Window Cleaning}',
  'Premium commercial janitorial for federal offices, embassies, and medical facilities.',
  'DC, MD, Northern VA', '{exousia,ironhouse}', 'none', 82, 88,
  'Triple-certified: EDWOSB + 8(a). Strong DC-area federal past performance. High quality.'
),
(
  'American Environmental Corp', 'Raymond Webb', 'rwebb@americanenvcorp.com', '(301) 555-0123', NULL,
  '{SWaM}', '{562910}', '{small_business}',
  '{Environmental,Waste Removal,Pest Control}',
  'Environmental consulting, asbestos abatement, mold remediation, industrial hygiene.',
  'MD, DC, VA', '{exousia,ironhouse}', 'none', 60, 72,
  'SWaM. Good for facilities needing environmental compliance.'
),
(
  'Guardian Security Services LLC', 'Victor Obi', 'vobi@guardiansecuritydmv.com', '(703) 555-0124', NULL,
  '{MBE,VOSB}', '{561612}', '{sdvosb,small_business}',
  '{Security}',
  'Armed and unarmed guard services, patrol, special event security for federal contractors.',
  'DMV Region', '{exousia,ironhouse}', 'none', 52, 66,
  'MBE + VOSB. Active in VA/DC/MD. Good for multi-entity facility bids.'
),
(
  'ProStaff Federal Solutions LLC', 'Nicole Osei-Bonsu', 'nosei@prostaffederal.com', '(571) 555-0125', NULL,
  '{WOSB,SWaM}', '{561320,541614}', '{wosb,small_business}',
  '{Staffing}',
  'Federal contractor staffing: admin support, project coordinators, facilities managers.',
  'Northern Virginia, DC Metro', '{exousia,ironhouse}', 'none', 55, 70,
  'WOSB. Good for staffing augmentation on Exousia consulting bids.'
)
ON CONFLICT DO NOTHING;

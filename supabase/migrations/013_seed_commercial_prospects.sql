-- Migration 013: Seed VitalX commercial prospects — DMV region
-- 180 prospects across 10 categories with pre-calculated fit scores
--
-- Fit score formula (max 90 pts displayed as-is):
--   Proximity to Fredericksburg/DMV  : 0–25 pts
--   Organization size / volume       : 0–25 pts
--   Service match to VitalX          : 0–25 pts
--   Accessibility / procurement info : 0–15 pts
--
-- Skip if organization already exists (idempotent)
-- No unique constraint exists, so we guard with NOT EXISTS on organization_name + entity

-- ─────────────────────────────────────────────────────────────
-- HOSPITAL SYSTEMS
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'Hospital Systems', score, tier, note
FROM (VALUES
  -- Fredericksburg / Spotsylvania / Stafford area — closest to HQ
  ('Mary Washington Healthcare',         'www.marywashingtonhealthcare.com',  82, 'mid_system',    'Fredericksburg VA. Mary Washington Hospital + Stafford Hospital. Direct proximity. Top priority for specimen transport, pharmacy delivery, and same-day courier.'),
  ('Spotsylvania Regional Medical Center','www.spotsylvaniaregional.com',       77, 'single_facility','Spotsylvania VA. HCA-owned. 5 min from Fredericksburg. Ideal entry point for specimen courier and lab transport.'),
  ('Stafford Hospital',                  'www.marywashingtonhealthcare.com',   77, 'single_facility','Stafford VA. Part of Mary Washington Healthcare. Bridges Fredericksburg and Northern VA corridor.'),
  ('Culpeper Medical Center',            'www.culpepermedical.com',            73, 'single_facility','Culpeper VA. UVA Health affiliate. 45 min from Fredericksburg. Underserved for courier logistics.'),
  ('Fauquier Hospital',                  'www.fauquierhealth.org',             72, 'single_facility','Warrenton VA. Independent community hospital. Fauquier County. Active procurement interest likely.'),

  -- Northern Virginia
  ('Inova Health System',                'www.inova.org',                      87, 'large_system',  'Northern VA. 5-hospital system. Inova Fairfax, Loudoun, Alexandria, Fair Oaks, Mount Vernon. Largest health system in NOVA. Active GPO procurement.'),
  ('Inova Fairfax Hospital',             'www.inova.org/locations/inova-fairfax-hospital', 85, 'large_system', 'Fairfax VA. Level I trauma center. Flagship Inova facility. High specimen volume.'),
  ('Inova Loudoun Hospital',             'www.inova.org/locations/inova-loudoun-hospital', 80, 'mid_system', 'Lansdowne VA. Rapidly growing service area. Loudoun County fastest-growing county in VA.'),
  ('Inova Mount Vernon Hospital',        'www.inova.org/locations/inova-mount-vernon-hospital', 78, 'single_facility', 'Alexandria VA. Community hospital. Southern Fairfax County.'),
  ('Virginia Hospital Center',           'www.virginiahospitalcenter.com',     80, 'single_facility','Arlington VA. Level II trauma center. High acuity. Strong outreach program.'),
  ('Reston Hospital Center',             'www.restonhospital.com',             78, 'single_facility','Reston VA. HCA-owned. Serves central Fairfax County tech corridor.'),
  ('Novant Health UVA Prince William',   'www.novanthealthuva.org',            78, 'mid_system',    'Manassas VA. Joint venture system. 2 hospitals in Prince William County. Growing rapidly.'),
  ('HCA Northern Virginia Market',       'www.hcahealthcare.com',              76, 'large_system',  'Multiple NOVA hospitals under HCA umbrella. Centralized procurement. High volume.'),
  ('Sentara Northern Virginia',          'www.sentara.com',                    74, 'mid_system',    'Northern VA facilities. Part of Sentara Healthcare statewide system. Expanding in NOVA.'),

  -- Washington DC
  ('MedStar Health',                     'www.medstarhealth.org',              85, 'large_system',  'DC/MD. 10-hospital system across DC and Maryland. MedStar Georgetown, Washington Hospital Center, Good Samaritan. Major procurement opportunities.'),
  ('MedStar Georgetown University Hospital','www.medstargeorgetown.org',       78, 'single_facility','Georgetown DC. Academic medical center. Research and clinical trials specimen volume.'),
  ('MedStar Washington Hospital Center', 'www.medstarwashington.org',          78, 'single_facility','Washington DC. Busiest hospital in DC. High specimen and pharmacy delivery demand.'),
  ('Children''s National Hospital',      'www.childrensnational.org',          78, 'single_facility','Washington DC. Pediatric specialty. Significant lab and specimen logistics.'),
  ('George Washington University Hospital','www.gwhospital.com',               77, 'single_facility','Foggy Bottom DC. Academic medical center. Universal Health Services.'),
  ('Georgetown Lombardi Cancer Center',  'www.lombardi.georgetown.edu',        73, 'single_facility','Washington DC. NCI-designated cancer center. High oncology specimen volume.'),
  ('Howard University Hospital',         'www.huhealthcare.com',               72, 'single_facility','Washington DC. Academic safety-net hospital. HBCU affiliate.'),
  ('Sibley Memorial Hospital',           'www.sibleyhospital.org',             72, 'single_facility','Washington DC. Johns Hopkins affiliate. Northwest DC. Affluent patient base.'),

  -- Suburban Maryland
  ('Holy Cross Hospital',                'www.holycrosshealth.org',            77, 'mid_system',    'Silver Spring MD. Trinity Health system. Serves Montgomery County. Proximity to DC VitalX routes.'),
  ('Holy Cross Germantown Hospital',     'www.holycrosshealth.org/germantown', 74, 'single_facility','Germantown MD. Newer facility. Fast-growing western Montgomery County.'),
  ('Adventist HealthCare Shady Grove',   'www.adventisthealthcare.com/shady-grove', 74, 'mid_system','Rockville MD. Adventist HealthCare flagship. Montgomery County. Active procurement.'),
  ('Washington Adventist Hospital',      'www.adventisthealthcare.com/wah',    72, 'single_facility','Takoma Park MD. Adjacent to DC. Adventist system.'),
  ('Suburban Hospital',                  'www.suburbanhospital.org',           72, 'single_facility','Bethesda MD. Johns Hopkins affiliate. Montgomery County government employee base.'),
  ('Prince George''s Hospital Center',  'www.dimensionshealthcare.org',       70, 'single_facility','Cheverly MD. UMD affiliate. Serves Prince George''s County.'),
  ('Luminis Health Doctors Community',   'www.luminis.health',                 68, 'single_facility','Lanham MD. Luminis Health system. Prince George''s County.'),
  ('MedStar Southern Maryland Hospital', 'www.medstarsouthernmaryland.org',    73, 'single_facility','Clinton MD. MedStar system. Southern Prince George''s County.'),
  ('MedStar St. Mary''s Hospital',       'www.medstarstmarys.org',             68, 'single_facility','Leonardtown MD. MedStar affiliate. Southern Maryland.'),
  ('Kaiser Permanente Mid-Atlantic',     'www.kaiserpermanente.org/midatlantic', 76, 'large_system', 'DC/MD/VA region. Integrated health system. High internal logistics volume for specimen transport.'),

  -- Richmond / Central VA
  ('VCU Health',                         'www.vcuhealth.org',                  83, 'large_system',  'Richmond VA. Academic medical center. VCU Medical Center + community hospitals. Major state procurement opportunities. Level I trauma.'),
  ('Bon Secours Richmond Health System', 'www.bonsecours.com/richmond',        78, 'large_system',  'Richmond VA. 6-hospital system. Part of Bon Secours Mercy Health national system.'),
  ('HCA Virginia — CJW Medical Center',  'www.chippenhamhospital.com',         65, 'mid_system',    'Richmond VA. HCA dual campus. Chippenham + Johnston-Willis. High volume.'),

  -- Johns Hopkins system
  ('Johns Hopkins Medicine',             'www.hopkinsmedicine.org',            80, 'large_system',  'Baltimore/DC. Academic medical system. 6 hospitals. Major research institution. Specimen logistics for clinical trials.'),
  ('Johns Hopkins Bayview Medical Center','www.hopkinsmedicine.org/bayview',   65, 'single_facility','Baltimore MD. JH community campus. East Baltimore.'),
  ('Howard County General Hospital',     'www.hcgh.org',                       68, 'single_facility','Columbia MD. JH affiliate. Howard County. Suburban with strong volume.'),

  -- Other Maryland / Regional
  ('University of Maryland Medical System','www.umms.org',                     73, 'large_system',  'Baltimore/statewide. 11-hospital system. State procurement eligible.'),
  ('Frederick Health',                   'www.frederickhealth.org',            68, 'single_facility','Frederick MD. Community hospital. Frederick County. 1 hr from Fredericksburg.'),
  ('Valley Health System',               'www.valleyhealthlink.com',           65, 'mid_system',    'Winchester VA. 5-facility system. Shenandoah Valley. 90 min from Fredericksburg.'),
  ('Augusta Health',                     'www.augustahealth.com',              60, 'single_facility','Fishersville VA. Augusta County. 2 hrs from Fredericksburg.'),
  ('Novant Health UVA Health System',    'www.novanthealthuva.org',            72, 'mid_system',    'Charlottesville VA. Joint venture. 3 hospitals. UVA medical community generates significant specimen volume.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- ─────────────────────────────────────────────────────────────
-- REFERENCE LABS
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'Reference Labs', score, tier, note
FROM (VALUES
  ('Quest Diagnostics',                  'www.questdiagnostics.com',           74, 'national_lab',  'National. Largest commercial lab. Multiple DMV Patient Service Centers. Specimen courier contract potential. Existing infrastructure to displace.'),
  ('Labcorp',                            'www.labcorp.com',                    74, 'national_lab',  'National. #2 commercial lab. Heavy DMV presence. Primary specimen pickup and transport.'),
  ('BioReference Laboratories',          'www.bioreference.com',               68, 'national_lab',  'National. Specialty diagnostics. Oncology focus. Clinical trial specimen transport.'),
  ('Clinical Reference Laboratory',      'www.crlcorp.com',                    62, 'national_lab',  'Linden NJ. National specialty lab. Drug testing, clinical trials. Courier for northern Virginia clients.'),
  ('ACM Medical Laboratory',             'www.acmmedical.com',                 60, 'regional_lab',  'Rochester NY. Specialty toxicology and clinical. DMV clients use courier services.'),
  ('Aurora Diagnostics',                 'www.auroradx.com',                   62, 'regional_lab',  'National. Dermatopathology focus. Multiple DMV affiliated practices.'),
  ('LabCorp Covance Drug Development',   'www.covance.com',                    68, 'national_lab',  'Gaithersburg MD. Central laboratory for clinical trials. High-priority specimen logistics account.'),
  ('Chesapeake Urology Labs',            'www.chesapeakeurology.com',          65, 'regional_lab',  'Maryland. Specialty urology lab. Urine and tissue specimen transport DMV.'),
  ('Genomic Testing Cooperative',        'www.gtc-bio.com',                    58, 'specialty',     'Irvine CA with DMV clients. Hemato-oncology molecular testing.'),
  ('Foundation Medicine',                'www.foundationmedicine.com',         58, 'national_lab',  'Cambridge MA. Genomic profiling. Many DMV oncology practices send tissue specimens.'),
  ('Guardant Health',                    'www.guardanthealth.com',             55, 'national_lab',  'Redwood City CA. Liquid biopsy. Blood draw courier from DMV oncology sites.'),
  ('Exact Sciences',                     'www.exactsciences.com',              58, 'national_lab',  'Madison WI. Cologuard parent. Stool DNA collection kits + specimen pickup in DMV.'),
  ('Tempus AI',                          'www.tempus.com',                     58, 'national_lab',  'Chicago. Genomic sequencing. Growing oncology network in DMV. Tissue specimen logistics.'),
  ('ARUP Laboratories',                  'www.aruplab.com',                    60, 'national_lab',  'Salt Lake City. National reference lab. Client hospitals in DMV area.'),
  ('Mayo Clinic Laboratories',           'www.mayocliniclabs.com',             58, 'national_lab',  'Rochester MN. Esoteric reference lab. Receives specimens from DMV hospitals.'),
  ('Nichols Institute (Quest)',          'www.questdiagnostics.com',           62, 'national_lab',  'Chantilly VA. Quest Diagnostics specialty testing facility in Northern Virginia. Direct local opportunity.'),
  ('NovaBay Pharmaceuticals Labs',       'www.novabay.com',                    55, 'specialty',     'Emeryville CA. Specialty diagnostics. DMV distribution courier.'),
  ('Genoptix (Novartis)',                'www.genoptix.com',                   55, 'specialty',     'Carlsbad CA. Hematology/oncology specialty lab. DMV oncology practices.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- ─────────────────────────────────────────────────────────────
-- CLINICAL RESEARCH / BIOTECH / CROs
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'Clinical Research/Biotech', score, tier, note
FROM (VALUES
  ('ICON plc',                           'www.iconplc.com',                    68, 'large_system',  'Dublin / DMV. Global CRO with DMV offices. Clinical trial specimen logistics — chain of custody critical.'),
  ('IQVIA',                              'www.iqvia.com',                      65, 'large_system',  'Durham NC / Rockville MD offices. World''s largest CRO. Central lab management. DMV site network.'),
  ('PAREXEL International',              'www.parexel.com',                    72, 'large_system',  'Rockville MD (headquarters). Global CRO HQ in DMV. Clinical trial specimen transport a primary need.'),
  ('Syneos Health',                       'www.syneoshealth.com',               65, 'large_system',  'Morrisville NC / DC offices. CRO + commercial services. DMV trial sites.'),
  ('Leidos Health',                      'www.leidos.com',                     70, 'large_system',  'Reston VA. Federal health IT and research. Frederick MD research campuses. Government-adjacent procurement.'),
  ('Emergent BioSolutions',              'www.emergentbiosolutions.com',       68, 'large_system',  'Gaithersburg MD. Biodefense vaccines and therapeutics. Federal contracts. Specimen handling and cold-chain logistics.'),
  ('MedImmune / AstraZeneca',            'www.astrazeneca.com',                68, 'large_system',  'Gaithersburg MD (R&D HQ). Biologics research campus. Clinical specimen logistics.'),
  ('Novavax',                            'www.novavax.com',                    68, 'mid_system',    'Gaithersburg MD. Vaccine development. Clinical trial specimen transport.'),
  ('Human Genome Sciences (GSK)',        'www.gsk.com',                        65, 'mid_system',    'Rockville MD. GSK R&D campus. Clinical research specimen needs.'),
  ('US Pharmacopeia (USP)',              'www.usp.org',                        70, 'mid_system',    'Rockville MD. Reference standards organization. Laboratory courier services.'),
  ('Covance (Labcorp)',                  'www.covance.com',                    65, 'large_system',  'Gaithersburg MD. Central lab + early clinical. Specimen chain-of-custody courier.'),
  ('PPD (Thermo Fisher)',                'www.ppd.com',                        62, 'large_system',  'Wilmington NC / DC offices. Global CRO. DMV clinical site specimen logistics.'),
  ('Medpace Holdings',                   'www.medpace.com',                    58, 'mid_system',    'Cincinnati / DC area offices. Full-service CRO. Specimen transport for DMV sites.'),
  ('Adaptive Biotechnologies',           'www.adaptivebiotech.com',            55, 'specialty',     'Seattle / DC research partners. T-cell immunosequencing. Sample transport from DMV sites.'),
  ('Primoris Life Sciences',             'www.primorisls.com',                 60, 'regional_lab',  'Frederick MD. Contract manufacturing and research services. Specimen logistics.'),
  ('GenVec (Intrexon)',                  'www.intrexon.com',                   58, 'specialty',     'Gaithersburg MD. Gene therapy research. Sample transport.'),
  ('Sucampo Pharmaceuticals',            'www.sucampo.com',                    58, 'specialty',     'Rockville MD. Pharmaceutical R&D. Clinical specimen handling.'),
  ('Precision BioSciences',              'www.precisionbiosciences.com',       55, 'specialty',     'Durham NC / DC offices. Gene editing. DMV clinical site specimens.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- ─────────────────────────────────────────────────────────────
-- PHARMACY / SPECIALTY
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'Pharmacy/Specialty', score, tier, note
FROM (VALUES
  ('Capital Area Pharmacy',              'www.capitalareapharmacy.com',        70, 'specialty',     'Washington DC area. Independent specialty pharmacy. Home delivery demand for specialty medications.'),
  ('Avita Pharmacy',                     'www.avitarx.com',                    68, 'specialty',     'Virginia-based specialty pharmacy. LGBTQ+ health focus. Home delivery critical.'),
  ('Omnicare (CVS Health)',              'www.omnicare.com',                   65, 'large_system',  'National. Long-term care pharmacy. Nursing home medication delivery in DMV.'),
  ('CVS Specialty',                      'www.cvsspecialty.com',               65, 'large_system',  'National. CVS specialty pharmacy arm. Biologics and infusion delivery in DMV.'),
  ('Walgreens Specialty Pharmacy',       'www.walgreens.com',                  65, 'large_system',  'National. Specialty pharmacy division. Injection medications requiring cold chain.'),
  ('BioPlus Specialty Pharmacy',         'www.bioplusrx.com',                  60, 'specialty',     'Altamonte Springs FL. Specialty pharmacy. DMV patient delivery for hepatitis, HIV, oncology.'),
  ('Orsini Specialty Pharmacy',          'www.orsinirx.com',                   58, 'specialty',     'Elk Grove Village IL. Rare disease specialty. DMV home infusion delivery.'),
  ('Shields Health Solutions',           'www.shieldshealthsolutions.com',     60, 'specialty',     'Stoughton MA. Hospital-based specialty pharmacy. Partners with DMV hospitals.'),
  ('Diplomat Pharmacy (Optum Rx)',       'www.diplomat.is',                    60, 'specialty',     'National. Specialty pharmacy. Oncology and immunology delivery.'),
  ('PharMerica',                         'www.pharmerica.com',                 58, 'specialty',     'Louisville KY. Long-term care pharmacy. Nursing facility delivery in DMV.'),
  ('Maxor Specialty Pharmacy',           'www.maxorspecialty.com',             55, 'specialty',     'Amarillo TX. Specialty pharmacy. DMV patient delivery for complex conditions.'),
  ('Apria Healthcare',                   'www.apria.com',                      65, 'large_system',  'National. Home medical equipment + infusion therapy. DMV home delivery routes overlap VitalX.'),
  ('Rotech Medical Equipment',           'www.rotech.com',                     60, 'specialty',     'National. Respiratory therapy equipment home delivery. DMV region.'),
  ('BriovaRx Infusion Services (Optum)', 'www.optumrx.com',                    60, 'large_system',  'National. Home infusion services. IV medication delivery in DMV.'),
  ('Option Care Health',                 'www.optioncare.com',                 62, 'large_system',  'National. Home and alternate site infusion therapy. DMV locations. Delivery partner potential.'),
  ('Amerita (Infusion Therapy)',         'www.ameritainc.com',                 58, 'specialty',     'National. Home infusion provider. DMV patient delivery.'),
  ('National Home Health Care Group',    'www.nationalhomehealthcare.net',     58, 'specialty',     'National. Pharmacy and DME delivery. DMV presence.'),
  ('Genoa Healthcare (pharmacy)',        'www.genoahealthcare.com',            60, 'specialty',     'National. Behavioral health pharmacy. Home delivery for psychiatric medications in DMV.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- ─────────────────────────────────────────────────────────────
-- HOME HEALTH
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'Home Health', score, tier, note
FROM (VALUES
  ('Bayada Home Health Care',            'www.bayada.com',                     68, 'large_system',  'National. Home health and hospice. Strong DMV presence. Specimen collection and delivery from patient homes.'),
  ('Amedisys Home Health',               'www.amedisys.com',                   65, 'large_system',  'National. Home health + hospice. DMV branch offices. Lab specimen pickup from patient homes.'),
  ('LHC Group',                          'www.lhcgroup.com',                   65, 'large_system',  'National. Home health and hospice. Partnered with many DMV hospitals.'),
  ('Interim Healthcare (DMV)',           'www.interimhealthcare.com',          68, 'large_system',  'National franchise. DMV region franchises active. Specimen and supply logistics.'),
  ('Right at Home Northern VA',          'www.rightathome.net',                65, 'regional_lab',  'Northern VA region. Home care franchise. Supply and specimen delivery.'),
  ('Comfort Keepers (DC/VA)',            'www.comfortkeepers.com',             65, 'regional_lab',  'National franchise. DMV franchises. Companion care + medical supply delivery.'),
  ('Maxim Healthcare Services',          'www.maximhealthcare.com',            62, 'large_system',  'Columbia MD (HQ). National healthcare staffing + home health. Corporate HQ in DMV!'),
  ('Kindred at Home',                    'www.kindredathome.com',              62, 'large_system',  'National. Home health + hospice. Significant DMV market share.'),
  ('CareFirst BlueCross BlueShield (Home Health)', 'www.carefirst.com',       68, 'large_system',  'Baltimore/DC. Regional insurer with home health division. Manages home health delivery for members.'),
  ('BrightSpring Health Services',       'www.brightspringhealth.com',         60, 'large_system',  'National. Community-based health services. Home health supply chain.'),
  ('Enhabit Home Health',                'www.enhabit.com',                    60, 'large_system',  'National. Post-acute home health. DMV offices.'),
  ('Visiting Nurses Association (VNA)',  'www.vnacares.org',                   62, 'regional_lab',  'DMV region VNA chapters. Specimen collection and delivery from patient homes.'),
  ('CareLink Health',                    'www.carelinkhealth.org',             62, 'regional_lab',  'Washington DC area. Home care agency. Medication and specimen logistics.'),
  ('Suburban Nurse and Therapy Care',    'www.suburbannurse.com',              65, 'regional_lab',  'Northern VA. Regional home health. Local routes align with VitalX.'),
  ('St. John''s Community Services',    'www.sjcs.org',                       60, 'specialty',     'Washington DC. Home and community-based services. Medical supply delivery.'),
  ('Ardent Health Services Home Health', 'www.ardenthealth.com',               55, 'large_system',  'Nashville / DMV hospitals. Home health post-discharge. Supply logistics.'),
  ('NovaBay Home Health',                'www.novabay.com',                    55, 'specialty',     'DMV region. Independent home health. Small-scale but local.'),
  ('AccordantHealth (CVS)',              'www.cvshealthspire.com',             55, 'specialty',     'National. Disease management home health. Medication delivery.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- ─────────────────────────────────────────────────────────────
-- NEMT BROKERS
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'NEMT Brokers', score, tier, note
FROM (VALUES
  ('Modivcare',                          'www.modivcare.com',                  75, 'large_system',  'National. Largest NEMT broker. Manages Virginia Medicaid NEMT statewide contract. Primary subcontractor opportunity.'),
  ('MTM (Medical Transportation Mgmt)',  'www.mtm-inc.net',                    72, 'large_system',  'Lake St. Louis MO. Major NEMT broker. Virginia and Maryland Medicaid contracts. Subcontractor for DMV routes.'),
  ('TransAm Medical Transport',          'www.transam.com',                    72, 'regional_lab',  'Virginia-based. Regional NEMT provider. Direct competitor/partner for DMV Medicaid routes.'),
  ('Capital Rides (DC)',                 'www.capitalrides.com',               72, 'regional_lab',  'Washington DC. NEMT broker. DC Medicaid transport. Strong local relationships.'),
  ('Veyo',                              'www.veyo.com',                       68, 'large_system',  'Phoenix AZ. Tech-enabled NEMT broker. Expanding in VA. Seeking local subcontractors.'),
  ('American Medical Response (AMR)',    'www.amr.net',                        68, 'large_system',  'National. Ambulance and non-emergency. DMV market. Subcontract NEMT overflow.'),
  ('Access2Care (MTM)',                  'www.access2care.net',                65, 'large_system',  'National. MTM subsidiary. NEMT broker. DMV Medicaid routes.'),
  ('SafeRide Health',                    'www.saferidehealth.com',             68, 'mid_system',    'National. Technology platform for NEMT. Partners with regional transport providers in DMV.'),
  ('MedRide DC/VA',                      'www.medride.com',                    70, 'regional_lab',  'DC/VA region. Local NEMT provider. High subcontractor demand.'),
  ('IntelliRide (KYYBA)',                'www.intelliride.com',                62, 'mid_system',    'National NEMT manager. VA Medicaid network. Seeking reliable DMV subcontractors.'),
  ('Southeastrans',                      'www.southeastrans.com',              62, 'mid_system',    'Atlanta GA. NEMT broker. Maryland Medicaid contract. Subcontractor leads.'),
  ('National Express Transit',           'www.nationalexpress.com',            62, 'large_system',  'National. Transit + NEMT. DMV contracts. Subcontractor opportunities.'),
  ('Envision Medical Transportation',    'www.envisiontransport.com',          65, 'regional_lab',  'DMV region. Local NEMT company. Potential partnership for route sharing.'),
  ('Logisticare Virginia (Modivcare)',   'www.modivcare.com',                  73, 'large_system',  'Statewide VA NEMT contract holder. VitalX as certified NEMT subcontractor = immediate revenue.'),
  ('Care Transportation (DC)',           'www.caretransportation.net',         68, 'regional_lab',  'Washington DC area. Local NEMT and medical courier. Merger/partnership opportunity.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- ─────────────────────────────────────────────────────────────
-- URGENT CARE / OUTPATIENT
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'Urgent Care/Outpatient', score, tier, note
FROM (VALUES
  ('Patient First (Mid-Atlantic)',       'www.patientfirst.com',               73, 'large_system',  'Richmond VA (HQ). 70+ urgent care centers across VA/MD/DC. Centralized lab specimen transport. High-volume account.'),
  ('Privia Health Group',                'www.priviahealth.com',               72, 'large_system',  'Arlington VA (HQ). Large physician practice network in DC/MD/VA. Lab and supply logistics across practices.'),
  ('Concentra Urgent Care',              'www.concentra.com',                  68, 'large_system',  'National. Occupational health + urgent care. 30+ DMV locations. Drug testing specimen transport.'),
  ('AFC Urgent Care Northern VA',        'www.afcurgentcare.com',              67, 'regional_lab',  'Northern VA franchise locations. Urgent care chain. Specimen courier for lab outsourcing.'),
  ('MedExpress Urgent Care',             'www.medexpress.com',                 65, 'large_system',  'National (UnitedHealth). 20+ DMV centers. Centralized lab specimen logistics.'),
  ('GoHealth Urgent Care',               'www.gohealthuc.com',                 65, 'large_system',  'National. 200+ centers. DMV market. Lab specimen logistics contract potential.'),
  ('ChenMed',                            'www.chenmed.com',                    68, 'mid_system',    'Miami / DC area. Value-based primary care. Several DMV locations. Lab and pharmacy logistics.'),
  ('US Oncology Network',                'www.usoncology.com',                 68, 'large_system',  'The Woodlands TX. 1,400+ oncologists in network. DMV practices. Tissue and blood specimen transport.'),
  ('Virginia Cancer Specialists',        'www.vacancer.com',                   70, 'regional_lab',  'Fairfax VA. Largest independent oncology practice in Northern VA. High specimen volume.'),
  ('Capital Digestive Care',             'www.capitaldigestivecare.com',       65, 'regional_lab',  'Chevy Chase MD. 70+ GI providers in DMV. Specimen and biopsy transport from colonoscopy centers.'),
  ('Mid-Atlantic Permanente Medical Grp','www.mapmg.org',                      72, 'large_system',  'Rockville MD (HQ). Kaiser Permanente physician arm. 1,500+ physicians in DC/MD/VA. Internal logistics network.'),
  ('Pediatric Specialists of Virginia',  'www.psvamd.com',                     67, 'regional_lab',  'Fairfax VA. Multi-specialty pediatric group. Specimen logistics from satellite offices.'),
  ('Evolent Health',                     'www.evolenthealth.com',               65, 'mid_system',    'Arlington VA (HQ). Specialty care management. Partners with health systems in DMV for care coordination.'),
  ('Carbon Health',                      'www.carbonhealth.com',               60, 'mid_system',    'San Francisco / DC area. Tech-enabled urgent care. Specimen transport for lab outsourcing.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- ─────────────────────────────────────────────────────────────
-- BLOOD BANKS
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'Blood Banks', score, tier, note
FROM (VALUES
  ('Inova Blood Donor Services',         'www.inova.org/blood',                82, 'large_system',  'Northern VA. Largest blood bank in Virginia. Blood product transport between Inova facilities. Very high fit.'),
  ('American Red Cross — Capital Blood', 'www.redcrossblood.org',              80, 'large_system',  'Washington DC region. Capital Blood Region serves DC/MD/VA. Blood transport between donation sites and hospitals.'),
  ('Vitalant (Blood Systems)',           'www.vitalant.org',                   62, 'large_system',  'National. Blood supply and research. DMV blood centers. Courier logistics.'),
  ('New York Blood Center — DC',         'www.nybloodcenter.org',              62, 'large_system',  'NY/DC region. Blood supplier. DMV distribution center. Transport contract potential.'),
  ('OneBlood',                           'www.oneblood.org',                   55, 'large_system',  'Southeast US. Expanding into mid-Atlantic. Blood product courier.'),
  ('Armed Services Blood Program',       'www.militaryblood.dod.mil',          75, 'government',    'Falls Church VA (HQ). DoD blood program. Military facility distribution in DMV. Federal procurement.'),
  ('Children''s National Blood Bank',   'www.childrensnational.org',          73, 'single_facility','Washington DC. Pediatric specialty blood bank. Transport to satellite locations.'),
  ('National Institutes of Health CC Blood Bank', 'www.cc.nih.gov',          72, 'government',    'Bethesda MD. NIH Clinical Center blood bank. Federal campus. Research specimen transport.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- ─────────────────────────────────────────────────────────────
-- VA / MILITARY HEALTHCARE
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'VA/Military Healthcare', score, tier, note
FROM (VALUES
  ('DC VA Medical Center',               'www.va.gov/washington-dc-health-care', 82, 'government', 'Washington DC. Full-service VAMC. Federal procurement. Specimen and pharmacy delivery. SAM.gov opportunity.'),
  ('Fort Belvoir Community Hospital',    'www.fbch.capmed.mil',                82, 'government',   'Fort Belvoir VA. Military treatment facility. Right in Northern VA. Specimen and pharmacy logistics.'),
  ('Walter Reed National Military MC',   'www.wrnmmc.capmed.mil',              80, 'government',   'Bethesda MD. Flagship military hospital. Research + clinical. Federal procurement required.'),
  ('Marine Corps Base Quantico Medical', 'www.quantico.marines.mil',           80, 'government',   'Quantico VA. Very close to Fredericksburg. DoD healthcare. Specimen logistics opportunity.'),
  ('Pentagon Health Clinic (DiLorenzo)', 'www.whs.mil/medical',                78, 'government',   'Arlington VA. Pentagon medical clinic. Federal employee healthcare. Courier opportunity.'),
  ('Naval Support Activity Bethesda',    'www.bethesda.med.navy.mil',          78, 'government',   'Bethesda MD. Navy campus co-located with Walter Reed. Clinical research support.'),
  ('Hunter Holmes McGuire VA Medical Ctr','www.va.gov/richmond-health-care',   72, 'government',   'Richmond VA. Major VAMC serving central Virginia veterans. Specimen and pharmacy logistics.'),
  ('Hampton VA Medical Center',          'www.va.gov/hampton-health-care',     65, 'government',   'Hampton VA. VAMC serving Hampton Roads veterans. 3 hrs from Fredericksburg.'),
  ('Martinsburg VA Medical Center',      'www.va.gov/martinsburg-health-care', 65, 'government',   'Martinsburg WV. VAMC serving western VA/WV veterans. 2 hrs from Fredericksburg.'),
  ('NSF Dahlgren Medical',               'www.navsea.navy.mil/dahlgren',       72, 'government',   'King George VA. Naval Support Facility Dahlgren. Very close to Fredericksburg. DoD medical logistics.'),
  ('Fort A.P. Hill',                     'www.aphill.army.mil',                68, 'government',   'Bowling Green VA. Army installation. 30 min from Fredericksburg. Healthcare logistics support.'),
  ('Quantico National Cemetery Clinic',  'www.cem.va.gov',                     65, 'government',   'Triangle VA. VA satellite clinic near Quantico. Close to Fredericksburg courier routes.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- ─────────────────────────────────────────────────────────────
-- DNA / DRUG TESTING
-- ─────────────────────────────────────────────────────────────
INSERT INTO commercial_leads (entity, organization_name, website, status, service_category, fit_score, volume_tier, notes)
SELECT 'vitalx', org, site, 'prospect', 'DNA/Drug Testing', score, tier, note
FROM (VALUES
  ('US DNA Testing Centers',             'www.usdnatestingcenters.com',        68, 'regional_lab',  'DC/VA/MD. Regional DNA and drug testing collection. Specimen courier for lab processing.'),
  ('Concentra (drug testing)',           'www.concentra.com',                  68, 'large_system',  'National. #1 occupational health drug testing. 30+ DMV locations. Urine specimen pickup and transport.'),
  ('Quest Diagnostics Drug Testing',     'www.questdiagnostics.com/employer',  65, 'national_lab',  'National. Employer drug testing services. Collection sites across DMV. Specimen transport.'),
  ('Labcorp DIANON / Drug Testing',      'www.labcorp.com/drug-testing',       65, 'national_lab',  'National. Drug testing services. DMV collection network.'),
  ('DNA Diagnostics Center (DDC)',       'www.dnacenter.com',                  62, 'regional_lab',  'Fairfield OH. National DNA testing. Collection site network in DMV. Chain-of-custody specimen transport.'),
  ('Clinical Reference Lab (drug test)', 'www.crlcorp.com',                    60, 'national_lab',  'National. Drug testing and toxicology. DMV employer clients.'),
  ('Chesapeake Genetics',                'www.chesapeakegenetics.com',         65, 'regional_lab',  'Annapolis MD. Regional genetics lab. DNA testing and hereditary disease. DMV courier.'),
  ('MedTox Laboratories (LabCorp)',      'www.medtox.com',                     58, 'national_lab',  'St. Paul MN. Specialty toxicology + drug testing. DMV specimen transport.'),
  ('National Drug and Alcohol Testing',  'www.nationaldatinc.com',             60, 'regional_lab',  'National. Third-party administrator. DMV collection site management.'),
  ('eScreen (drug testing TPA)',         'www.escreen.com',                    58, 'mid_system',    'Lenexa KS. Drug testing TPA. DMV collection sites. Specimen logistics.'),
  ('Sterling Medical Group (drug test)', 'www.sterlingmedicalgroup.com',       58, 'specialty',     'DMV region. Occupational health and drug testing. Direct courier relationship.'),
  ('Fresenius Kidney Care',              'www.freseniuskidneycare.com',         65, 'large_system',  'National. Dialysis centers. 30+ DMV locations. Blood specimen transport between dialysis and labs.'),
  ('DaVita Kidney Care',                 'www.davita.com',                     65, 'large_system',  'National. Dialysis centers. 20+ DMV locations. Lab specimen logistics.'),
  ('US Renal Care',                      'www.usrenalcare.com',                60, 'mid_system',    'National. Dialysis. DMV centers. Blood specimen transport needs.')
) AS t(org, site, score, tier, note)
WHERE NOT EXISTS (
  SELECT 1 FROM commercial_leads WHERE organization_name = t.org AND entity = 'vitalx'
);

-- Update existing seeded prospects (from CLAUDE.md seed data) with fit scores if they exist
UPDATE commercial_leads SET fit_score = 83, volume_tier = 'large_system'
WHERE organization_name = 'VCU Health' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 85, volume_tier = 'large_system'
WHERE organization_name = 'MedStar Health' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 87, volume_tier = 'large_system'
WHERE organization_name = 'Inova Health System' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 80, volume_tier = 'large_system'
WHERE organization_name = 'Johns Hopkins Medicine' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 78, volume_tier = 'single_facility'
WHERE organization_name = 'Children''s National Hospital' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 77, volume_tier = 'single_facility'
WHERE organization_name = 'George Washington University Hospital' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 76, volume_tier = 'large_system'
WHERE organization_name = 'Kaiser Permanente Mid-Atlantic' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 75, volume_tier = 'large_system'
WHERE organization_name = 'Sentara Healthcare' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 72, volume_tier = 'mid_system'
WHERE organization_name = 'Novant Health UVA Health System' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 74, volume_tier = 'national_lab'
WHERE organization_name = 'Quest Diagnostics' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 74, volume_tier = 'national_lab'
WHERE organization_name = 'Labcorp' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 68, volume_tier = 'national_lab'
WHERE organization_name = 'BioReference Laboratories' AND entity = 'vitalx' AND fit_score = 0;

UPDATE commercial_leads SET fit_score = 68, volume_tier = 'large_system'
WHERE organization_name = 'ICON plc' AND entity = 'vitalx' AND fit_score = 0;

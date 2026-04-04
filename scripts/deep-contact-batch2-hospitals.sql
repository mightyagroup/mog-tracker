-- BATCH 2: Hospital Systems (25 UPDATEs + 4 DELETEs for duplicates)
-- Deep contact research for VitalX commercial leads

-- HOSPITAL SYSTEMS

UPDATE commercial_leads SET
  contact_department = 'Supply Chain / Logistics',
  contact_direct_phone = '(703) 776-4001',
  office_name = 'Inova Fairfax Medical Campus',
  office_address = '3300 Gallows Road',
  office_city = 'Falls Church',
  office_state = 'VA',
  office_zip = '22042',
  service_summary = 'Inova Health System operates 5 hospitals and multiple outpatient facilities across Northern Virginia. High-volume specimen transport needs between facilities, reference labs, and outpatient centers. VitalX can provide STAT and scheduled courier routes for laboratory specimens, pathology samples, and pharmacy deliveries across their Northern Virginia network.'
WHERE organization_name ILIKE '%Inova Health System%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services / Pathology',
  contact_direct_phone = '(410) 955-5000',
  office_name = 'Johns Hopkins Hospital',
  office_address = '1800 Orleans Street',
  office_city = 'Baltimore',
  office_state = 'MD',
  office_zip = '21287',
  service_summary = 'Johns Hopkins Medicine operates 6 hospitals and dozens of outpatient sites across Maryland and DC. Massive specimen transport demands: research biospecimens, clinical trials, reference lab specimens, and inter-facility transfers. VitalX can provide HIPAA-compliant courier services for their DMV-area facilities and satellite locations.'
WHERE organization_name ILIKE '%Johns Hopkins%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Supply Chain Management',
  contact_direct_phone = '(301) 774-8882',
  office_name = 'MedStar Health Corporate',
  office_address = '10980 Grantchester Way',
  office_city = 'Columbia',
  office_state = 'MD',
  office_zip = '21044',
  service_summary = 'MedStar Health operates 10 hospitals across DC and Maryland including Georgetown University Hospital and Washington Hospital Center. VitalX can serve as a dedicated specimen courier partner for inter-facility lab transfers, STAT pathology runs, and pharmacy deliveries across their extensive DMV network.'
WHERE organization_name ILIKE '%MedStar Health%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Operations',
  contact_direct_phone = '(804) 828-9000',
  office_name = 'VCU Medical Center',
  office_address = '1250 East Marshall Street',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23298',
  service_summary = 'VCU Health System is a major academic medical center in Richmond with Level I trauma center and comprehensive lab services. High-volume specimen transport needs for research, clinical trials, and inter-facility transfers. VitalX can provide specialized medical courier services between VCU facilities and regional reference labs.'
WHERE organization_name ILIKE '%VCU Health%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Health Plan Operations',
  contact_direct_phone = '(301) 468-6000',
  office_name = 'Kaiser Permanente Mid-Atlantic Regional Office',
  office_address = '2101 East Jefferson Street',
  office_city = 'Rockville',
  office_state = 'MD',
  office_zip = '20852',
  service_summary = 'Kaiser Permanente Mid-Atlantic serves 800K+ members across DC, Maryland, and Virginia with 30+ medical centers. VitalX can provide specimen courier services between their medical centers, regional labs, and specialty facilities. Potential for high-volume scheduled routes.'
WHERE organization_name ILIKE '%Kaiser Permanente%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(757) 388-3000',
  office_name = 'Sentara Norfolk General Hospital',
  office_address = '600 Gresham Drive',
  office_city = 'Norfolk',
  office_state = 'VA',
  office_zip = '23507',
  service_summary = 'Sentara Healthcare operates 12 hospitals across Virginia and North Carolina with centralized lab operations. VitalX can provide specimen transport between their hospital labs, reference labs, and outpatient collection sites. Potential for dedicated courier routes across their Virginia network.'
WHERE organization_name ILIKE '%Sentara Healthcare%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory',
  contact_direct_phone = '(434) 924-0211',
  office_name = 'UVA Health System',
  office_address = '1215 Lee Street',
  office_city = 'Charlottesville',
  office_state = 'VA',
  office_zip = '22908',
  service_summary = 'Novant Health UVA Health System serves Central Virginia with multiple hospitals and clinics. VitalX can provide medical courier services for specimen transport, pathology samples, and inter-facility lab transfers across their growing Virginia network.'
WHERE organization_name ILIKE '%Novant Health UVA%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Client Services',
  contact_direct_phone = '(201) 847-4300',
  office_name = 'BioReference Laboratories - East Coast Operations',
  office_address = '481 Edward H Ross Drive',
  office_city = 'Elmwood Park',
  office_state = 'NJ',
  office_zip = '07407',
  service_summary = 'BioReference Laboratories (OPKO Health subsidiary) is a major clinical reference lab serving the East Coast. VitalX can provide dedicated specimen courier routes from DMV-area physician offices and clinics to BioReference processing facilities. High potential for daily scheduled pickups.'
WHERE organization_name ILIKE '%BioReference%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Trial Logistics',
  contact_direct_phone = '(215) 616-3000',
  office_name = 'ICON plc - North America',
  office_address = '500 Park Boulevard, Suite 100',
  office_city = 'Itasca',
  office_state = 'IL',
  office_zip = '60143',
  service_summary = 'ICON is a global contract research organization (CRO) managing clinical trials across the DMV. Critical need for time-sensitive specimen transport, investigational drug delivery, and clinical trial supply chain logistics. VitalX can provide HIPAA-compliant courier services for their trial sites across DC, Maryland, and Virginia.'
WHERE organization_name ILIKE '%ICON plc%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Pathology and Laboratory Medicine',
  contact_direct_phone = '(202) 476-5000',
  office_name = 'Children''s National Hospital',
  office_address = '111 Michigan Avenue NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20010',
  service_summary = 'Children''s National is the top pediatric hospital in the DC metro area with specialized laboratory and research needs. VitalX can provide temperature-controlled specimen transport, pediatric lab courier services, and research biospecimen logistics between their main campus and satellite locations.'
WHERE organization_name ILIKE '%Children''s National%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Medicine',
  contact_direct_phone = '(202) 715-4000',
  office_name = 'George Washington University Hospital',
  office_address = '900 23rd Street NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20037',
  service_summary = 'GW Hospital is a 395-bed academic medical center in downtown DC with Level I trauma center. VitalX can provide STAT specimen courier services, inter-facility lab transfers to GW medical faculty associates offices, and research specimen transport for their clinical programs.'
WHERE organization_name ILIKE '%George Washington University Hospital%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory and Pathology',
  contact_direct_phone = '(540) 741-1100',
  office_name = 'Mary Washington Healthcare',
  office_address = '1001 Sam Perry Boulevard',
  office_city = 'Fredericksburg',
  office_state = 'VA',
  office_zip = '22401',
  service_summary = 'Mary Washington Healthcare operates two hospitals and outpatient facilities in the Fredericksburg region. VitalX can provide specimen courier services between their facilities, reference labs, and outpatient collection sites serving the growing Fredericksburg-to-DC corridor.'
WHERE organization_name ILIKE '%Mary Washington%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(703) 698-1110',
  office_name = 'Virginia Hospital Center',
  office_address = '1701 N George Mason Drive',
  office_city = 'Arlington',
  office_state = 'VA',
  office_zip = '22205',
  service_summary = 'Virginia Hospital Center is a 394-bed hospital in Arlington providing comprehensive medical services. VitalX can provide specimen transport, laboratory courier, and pharmacy delivery services connecting VHC with reference labs and affiliated outpatient facilities.'
WHERE organization_name ILIKE '%Virginia Hospital Center%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Operations',
  contact_direct_phone = '(703) 858-7000',
  office_name = 'StoneSprings Hospital Center',
  office_address = '24440 Stone Springs Boulevard',
  office_city = 'Dulles',
  office_state = 'VA',
  office_zip = '20166',
  service_summary = 'StoneSprings Hospital Center (HCA Virginia) is a growing community hospital in western Loudoun County. VitalX can provide specimen courier services for their laboratory, connecting with regional reference labs and HCA network facilities.'
WHERE organization_name ILIKE '%StoneSprings%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory',
  contact_direct_phone = '(703) 369-8000',
  office_name = 'Novant Health Prince William Medical Center',
  office_address = '8700 Sudley Road',
  office_city = 'Manassas',
  office_state = 'VA',
  office_zip = '20110',
  service_summary = 'Novant Health Prince William Medical Center serves the rapidly growing Prince William County area. VitalX can provide specimen transport and lab courier services between the medical center, outpatient clinics, and reference laboratories.'
WHERE organization_name ILIKE '%Prince William Medical%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(571) 423-1000',
  office_name = 'Reston Hospital Center',
  office_address = '1850 Town Center Parkway',
  office_city = 'Reston',
  office_state = 'VA',
  office_zip = '20190',
  service_summary = 'Reston Hospital Center (HCA Virginia) is a 187-bed facility serving the Reston-Herndon corridor. VitalX can provide specimen courier services linking their lab with HCA network facilities and regional reference laboratories.'
WHERE organization_name ILIKE '%Reston Hospital%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory and Pathology',
  contact_direct_phone = '(703) 664-7000',
  office_name = 'Fauquier Health',
  office_address = '500 Hospital Drive',
  office_city = 'Warrenton',
  office_state = 'VA',
  office_zip = '20186',
  service_summary = 'Fauquier Health is a community hospital in Warrenton serving Fauquier and surrounding counties. VitalX can provide specimen transport services connecting their rural hospital lab with regional reference labs and specialty testing facilities.'
WHERE organization_name ILIKE '%Fauquier%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory',
  contact_direct_phone = '(301) 552-8118',
  office_name = 'Doctors Community Medical Center',
  office_address = '8118 Good Luck Road',
  office_city = 'Lanham',
  office_state = 'MD',
  office_zip = '20706',
  service_summary = 'Doctors Community Medical Center serves Prince George''s County with comprehensive medical services. VitalX can provide specimen courier services between the hospital, outpatient facilities, and reference labs serving the PG County community.'
WHERE organization_name ILIKE '%Doctors Community%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(301) 754-7000',
  office_name = 'Holy Cross Hospital',
  office_address = '1500 Forest Glen Road',
  office_city = 'Silver Spring',
  office_state = 'MD',
  office_zip = '20910',
  service_summary = 'Holy Cross Hospital is a 440-bed teaching hospital serving Montgomery County and surrounding areas. VitalX can provide specimen transport, lab courier, and pharmacy delivery services between Holy Cross, their Germantown campus, and affiliated facilities.'
WHERE organization_name ILIKE '%Holy Cross%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Pathology and Laboratory',
  contact_direct_phone = '(202) 877-7000',
  office_name = 'MedStar Washington Hospital Center',
  office_address = '110 Irving Street NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20010',
  service_summary = 'MedStar Washington Hospital Center is the largest private hospital in DC with 912 beds and Level I trauma center. Extremely high specimen transport volume. VitalX can provide dedicated courier routes for STAT labs, blood bank, pathology, and inter-facility transfers across the MedStar DC network.'
WHERE organization_name ILIKE '%Washington Hospital Center%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Operations',
  contact_direct_phone = '(202) 444-2000',
  office_name = 'MedStar Georgetown University Hospital',
  office_address = '3800 Reservoir Road NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20007',
  service_summary = 'MedStar Georgetown is a 609-bed academic medical center with Lombardi Comprehensive Cancer Center. High-value specimen transport needs for oncology research, clinical trials, and specialty pathology. VitalX can provide temperature-controlled courier services for their research and clinical operations.'
WHERE organization_name ILIKE '%Georgetown%University%Hospital%' AND entity = 'vitalx';

-- New inserts from previous session (Georgetown, Howard, NIH, Walter Reed, Sibley, Suburban already inserted)
-- These UPDATEs enrich the 6 newly inserted records

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(202) 444-2000',
  office_name = 'Georgetown University Hospital',
  office_address = '3800 Reservoir Road NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20007',
  service_summary = 'Georgetown University Hospital is a 609-bed academic medical center and MedStar flagship with Lombardi Cancer Center. VitalX can provide specimen courier, oncology sample transport, and clinical trial logistics across their DC campus and affiliated sites.'
WHERE organization_name ILIKE '%Georgetown University Hospital%' AND entity = 'vitalx' AND organization_name NOT ILIKE '%MedStar%';

UPDATE commercial_leads SET
  contact_department = 'Laboratory and Pathology',
  contact_direct_phone = '(202) 865-6100',
  office_name = 'Howard University Hospital',
  office_address = '2041 Georgia Avenue NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20060',
  service_summary = 'Howard University Hospital is a 270-bed teaching hospital and the only HBCU-affiliated hospital in the nation. VitalX can provide specimen transport, lab courier, and pharmacy delivery services supporting their clinical and research programs.'
WHERE organization_name ILIKE '%Howard University Hospital%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Center Laboratory',
  contact_direct_phone = '(301) 496-4000',
  office_name = 'NIH Clinical Center',
  office_address = '10 Center Drive',
  office_city = 'Bethesda',
  office_state = 'MD',
  office_zip = '20892',
  service_summary = 'NIH Clinical Center is the world''s largest research hospital with 200+ beds dedicated to clinical research. Extremely high specimen transport demands for research biospecimens, clinical trial samples, and inter-institute transfers. VitalX can provide specialized HIPAA-compliant courier services for their campus and affiliated research sites.'
WHERE organization_name ILIKE '%NIH Clinical Center%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Pathology and Laboratory Medicine',
  contact_direct_phone = '(301) 295-4611',
  office_name = 'Walter Reed National Military Medical Center',
  office_address = '8901 Wisconsin Avenue',
  office_city = 'Bethesda',
  office_state = 'MD',
  office_zip = '20889',
  service_summary = 'Walter Reed NMMC is the nation''s premier military medical center with 1,050+ beds. Massive specimen transport needs across trauma, oncology, blood bank, and research labs. VitalX can provide commercial courier backup for STAT specimen delivery and overflow logistics.'
WHERE organization_name ILIKE '%Walter Reed%' AND entity = 'vitalx' AND status = 'prospect';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(202) 537-4000',
  office_name = 'Sibley Memorial Hospital',
  office_address = '5255 Loughboro Road NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20016',
  service_summary = 'Sibley Memorial Hospital (Johns Hopkins affiliate) is a 318-bed community hospital in Northwest DC. VitalX can provide specimen courier services connecting Sibley with Johns Hopkins reference labs, outpatient sites, and other JHM network facilities in the DMV.'
WHERE organization_name ILIKE '%Sibley Memorial%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory',
  contact_direct_phone = '(301) 896-3100',
  office_name = 'Suburban Hospital',
  office_address = '8600 Old Georgetown Road',
  office_city = 'Bethesda',
  office_state = 'MD',
  office_zip = '20814',
  service_summary = 'Suburban Hospital (Johns Hopkins affiliate) is a 269-bed acute care hospital in Bethesda. VitalX can provide specimen transport between Suburban, JHM reference labs, and the broader Johns Hopkins network, plus STAT courier services for their emergency and surgical departments.'
WHERE organization_name ILIKE '%Suburban Hospital%' AND entity = 'vitalx';

-- DELETE duplicate blank records (from NPI Discovery import that duplicated the 6 new inserts)
DELETE FROM commercial_leads
WHERE organization_name = 'Georgetown Lombardi Comprehensive Cancer Center'
  AND entity = 'vitalx'
  AND contact_department IS NULL
  AND service_summary IS NULL;

DELETE FROM commercial_leads
WHERE organization_name = 'Howard University Hospital'
  AND entity = 'vitalx'
  AND contact_department IS NULL
  AND service_summary IS NULL
  AND id != (SELECT id FROM commercial_leads WHERE organization_name ILIKE '%Howard University Hospital%' AND entity = 'vitalx' ORDER BY created_at DESC LIMIT 1);

DELETE FROM commercial_leads
WHERE organization_name = 'Sibley Memorial Hospital'
  AND entity = 'vitalx'
  AND contact_department IS NULL
  AND service_summary IS NULL
  AND id != (SELECT id FROM commercial_leads WHERE organization_name ILIKE '%Sibley Memorial%' AND entity = 'vitalx' ORDER BY created_at DESC LIMIT 1);

DELETE FROM commercial_leads
WHERE organization_name = 'Suburban Hospital'
  AND entity = 'vitalx'
  AND contact_department IS NULL
  AND service_summary IS NULL
  AND id != (SELECT id FROM commercial_leads WHERE organization_name ILIKE '%Suburban Hospital%' AND entity = 'vitalx' ORDER BY created_at DESC LIMIT 1);

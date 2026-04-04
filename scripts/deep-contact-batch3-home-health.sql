-- BATCH 3: Home Health (18 organizations)
-- Deep contact research for VitalX commercial leads

-- HOME HEALTH (18 organizations)

-- 1. AccordantHealth (CVS)
UPDATE commercial_leads SET
  contact_department = 'Care Management Services',
  contact_direct_phone = '(703) 918-0600',
  office_name = 'Accordant Health - Ashburn Regional Office',
  office_address = '44645 Endicott Drive',
  office_city = 'Ashburn',
  office_state = 'VA',
  office_zip = '20147',
  service_summary = 'Accordant is a CVS Caremark subsidiary specializing in rare disease and chronic condition care management. VitalX can provide specimen transport, medication delivery, and home health logistics for their managed patient populations across the DMV region.'
WHERE organization_name ILIKE '%AccordantHealth%' AND entity = 'vitalx';

-- 2. Amedisys Home Health
UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(202) 783-7892',
  office_name = 'Amedisys Home Health Washington DC',
  office_address = '100 M Street SE Suite 210',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20003',
  service_summary = 'Amedisys is a national leader in home healthcare and hospice services. VitalX can support their patient care delivery with reliable specimen transport, lab draw logistics, and urgent medication delivery services for homebound patients in DC and surrounding areas.'
WHERE organization_name ILIKE '%Amedisys%' AND entity = 'vitalx';

-- 3. Ardent Health Services Home Health
UPDATE commercial_leads SET
  contact_department = 'Home Health Operations',
  contact_direct_phone = '(410) 740-3500',
  office_name = 'Ardent Home Health Solution - Maryland',
  office_address = '6740 Alexander Bell Drive',
  office_city = 'Columbia',
  office_state = 'MD',
  office_zip = '21046',
  service_summary = 'Ardent Home Health Solution serves Maryland seniors and disabled patients with in-home care. VitalX can enhance their service delivery with specimen transport, pharmacy coordination, and clinical lab logistics to support patient treatment compliance.'
WHERE organization_name ILIKE '%Ardent%' AND entity = 'vitalx';

-- 4. Bayada Home Health Care
UPDATE commercial_leads SET
  contact_department = 'Clinical Services',
  contact_direct_phone = '(703) 820-2001',
  office_name = 'BAYADA Home Health Falls Church',
  office_address = '6066 Leesburg Pike Suite 900',
  office_city = 'Falls Church',
  office_state = 'VA',
  office_zip = '22041',
  service_summary = 'BAYADA is a national home health leader serving complex patient populations. VitalX can provide reliable specimen courier, medication delivery, and home health logistics support to enhance patient care across Northern Virginia and DC.'
WHERE organization_name ILIKE '%Bayada%' AND entity = 'vitalx';

-- 5. BrightSpring Health Services
UPDATE commercial_leads SET
  contact_department = 'Home Health Operations',
  contact_direct_phone = '(502) 394-2100',
  office_name = 'BrightSpring Health Services - Mid-Atlantic',
  office_address = '10900 Gold Center Drive Suite 200',
  office_city = 'Rockville',
  office_state = 'MD',
  office_zip = '20850',
  service_summary = 'BrightSpring provides integrated home health and community care services across the Mid-Atlantic. VitalX can support their operations with specimen transport, pharmaceutical delivery, and urgent clinical logistics for homebound and recovering patients.'
WHERE organization_name ILIKE '%BrightSpring%' AND entity = 'vitalx';

-- 6. CareFirst BlueCross BlueShield (Home Health)
UPDATE commercial_leads SET
  contact_department = 'Member Services and Benefits',
  contact_direct_phone = '(410) 779-9369',
  office_name = 'CareFirst BCBS - Maryland Regional Office',
  office_address = '840 First Street NE',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20002',
  service_summary = 'CareFirst is a major health insurer serving the DMV with home health benefits for Medicaid and commercial members. VitalX can establish referral relationships to provide courier and specimen transport services for covered home health patient populations.'
WHERE organization_name ILIKE '%CareFirst%' AND entity = 'vitalx';

-- 7. CareLink Health
UPDATE commercial_leads SET
  contact_department = 'Clinical Coordination',
  contact_direct_phone = '(703) 481-0900',
  office_name = 'CareLink Home Health - Northern Virginia',
  office_address = '1300 East Main Street Suite 200',
  office_city = 'Herndon',
  office_state = 'VA',
  office_zip = '20170',
  service_summary = 'CareLink provides home healthcare and nursing services in Northern Virginia. VitalX can enhance their care coordination with specimen transport, pharmacy delivery, and urgent clinical logistics for their patient base.'
WHERE organization_name ILIKE '%CareLink%' AND entity = 'vitalx';

-- 8. Comfort Keepers (DC/VA)
UPDATE commercial_leads SET
  contact_department = 'Operations and Scheduling',
  contact_direct_phone = '(703) 520-2189',
  office_name = 'Comfort Keepers Fairfax',
  office_address = '10721 Main Street Suite 304',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22030',
  service_summary = 'Comfort Keepers provides in-home senior care and personal assistance services. VitalX can support their caregiver coordination with specimen transport, medication delivery, and health appointment logistics for elderly patients in the DC area.'
WHERE organization_name ILIKE '%Comfort Keepers%' AND entity = 'vitalx';

-- 9. Enhabit Home Health
UPDATE commercial_leads SET
  contact_department = 'Patient Services',
  contact_direct_phone = '(804) 675-2800',
  office_name = 'Enhabit Home Health and Hospice - Richmond',
  office_address = '3100 West Broad Street Suite 200',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23230',
  service_summary = 'Enhabit operates 255 home health and hospice locations across 34 states including Virginia and Maryland. VitalX can support their patient logistics with specimen transport, medication delivery, and clinical specimen collection services.'
WHERE organization_name ILIKE '%Enhabit%' AND entity = 'vitalx';

-- 10. Interim Healthcare (DMV)
UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(800) 357-8627',
  office_name = 'Interim HealthCare - Northern Virginia',
  office_address = '10775 Main Street Suite 200',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22030',
  service_summary = 'Interim HealthCare delivers home healthcare, hospice, and medical staffing services. VitalX can provide specimen transport, medication delivery, and urgent clinical logistics to support their patient care operations across the DMV.'
WHERE organization_name ILIKE '%Interim Healthcare%' AND entity = 'vitalx';

-- 11. Kindred at Home
UPDATE commercial_leads SET
  contact_department = 'Clinical Services',
  contact_direct_phone = '(301) 431-6000',
  office_name = 'Kindred at Home - Silver Spring',
  office_address = '9300 Columbia Boulevard Suite 100',
  office_city = 'Silver Spring',
  office_state = 'MD',
  office_zip = '20910',
  service_summary = 'Kindred at Home operates across the DMV providing skilled nursing and home health services. VitalX can enhance their care delivery with reliable specimen transport, lab logistics, and medication delivery for homebound patients.'
WHERE organization_name ILIKE '%Kindred at Home%' AND entity = 'vitalx';

-- 12. LHC Group
UPDATE commercial_leads SET
  contact_department = 'Home Health Operations',
  contact_direct_phone = '(410) 837-3500',
  office_name = 'HomeCall of Rockville',
  office_address = '15825 Shady Grove Road Suite 200',
  office_city = 'Rockville',
  office_state = 'MD',
  office_zip = '20850',
  service_summary = 'LHC Group operates 260+ home health locations including HomeCall and VNA of Maryland serving Baltimore and 17 surrounding counties. VitalX can provide specimen transport and clinical logistics to enhance their patient care outcomes.'
WHERE organization_name ILIKE '%LHC Group%' AND entity = 'vitalx';

-- 13. Maxim Healthcare Services
UPDATE commercial_leads SET
  contact_department = 'Regional Operations',
  contact_direct_phone = '(410) 494-0260',
  office_name = 'Maxim Healthcare - Silver Spring Regional',
  office_address = '7500 Greenway Center Drive Suite 1300',
  office_city = 'Greenbelt',
  office_state = 'MD',
  office_zip = '20770',
  service_summary = 'Maxim operates multiple regional offices across Maryland and Virginia providing home healthcare services. VitalX can support their operations with specimen transport, medication delivery, and clinical logistics for home health patients.'
WHERE organization_name ILIKE '%Maxim Healthcare%' AND entity = 'vitalx';

-- 14. NovaBay Home Health
UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(703) 831-1111',
  office_name = 'Nova Home Health Care Fairfax',
  office_address = '11240 Waples Mill Road Suite 202',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22030',
  service_summary = 'Nova Home Health Care is Joint Commission accredited and Medicare certified serving Northern Virginia. VitalX can enhance their service delivery with specimen transport, lab logistics, and medication delivery for homebound patients.'
WHERE organization_name ILIKE '%NovaBay%' AND entity = 'vitalx';

-- 15. Right at Home Northern VA
UPDATE commercial_leads SET
  contact_department = 'Care Coordination',
  contact_direct_phone = '(703) 538-4584',
  office_name = 'Right at Home Northern Virginia',
  office_address = '8260 Willow Oaks Corporate Drive Suite 120',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22031',
  service_summary = 'Right at Home provides in-home senior care and personal support services 24/7 across Northern Virginia. VitalX can support their care coordination with specimen transport, lab logistics, and medication delivery services.'
WHERE organization_name ILIKE '%Right at Home%' AND entity = 'vitalx';

-- 16. St. John's Community Services
UPDATE commercial_leads SET
  contact_department = 'Home Services Operations',
  contact_direct_phone = '(202) 939-1501',
  office_name = 'St. John''s Community Services DC',
  office_address = '1500 First Street NE',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20002',
  service_summary = 'St. John''s provides 150+ years of community support services across DC and Northern Virginia. VitalX can assist their home-based care clients with specimen transport, lab logistics, and healthcare appointment coordination.'
WHERE organization_name ILIKE '%St. John%' AND entity = 'vitalx';

-- 17. Suburban Nurse and Therapy Care
UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(301) 384-1600',
  office_name = 'Suburban Nurse and Therapy Care - Maryland',
  office_address = '7500 Old Georgetown Road Suite 300',
  office_city = 'Bethesda',
  office_state = 'MD',
  office_zip = '20814',
  service_summary = 'Suburban Nurse and Therapy Care specializes in skilled nursing and therapy services for disabled and recovering patients. VitalX can provide specimen transport, lab logistics, and clinical support services for their patient population.'
WHERE organization_name ILIKE '%Suburban Nurse%' AND entity = 'vitalx';

-- 18. Visiting Nurses Association (VNA)
UPDATE commercial_leads SET
  contact_department = 'Home Health Services',
  contact_direct_phone = '(202) 442-5955',
  office_name = 'VNA of DC',
  office_address = '2201 Shannon Place SE',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20020',
  service_summary = 'VNA of DC has served the community for over 100 years providing home health services. VitalX can enhance their care delivery with specimen transport, lab logistics, and urgent medication delivery for homebound patients across DC.'
WHERE organization_name ILIKE '%Visiting Nurses Association%' AND entity = 'vitalx';

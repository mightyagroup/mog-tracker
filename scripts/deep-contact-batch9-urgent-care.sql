-- BATCH 9: Urgent Care / Outpatient (14 organizations)
-- Deep contact research for VitalX commercial leads

UPDATE commercial_leads SET
  contact_department = 'Operations',
  contact_direct_phone = '(571) 516-3116',
  office_name = 'AFC Urgent Care Woodbridge',
  office_address = '14087 Richmond Hwy, Unit 101',
  office_city = 'Woodbridge',
  office_state = 'VA',
  office_zip = '22191',
  service_summary = 'AFC Urgent Care operates walk-in urgent care facilities across Northern Virginia offering physicals, lab testing, and acute care services. VitalX medical courier and specimen transport services can support their outpatient specimen delivery and lab logistics needs to reference labs and diagnostic centers.'
WHERE organization_name ILIKE '%AFC%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Gastroenterology',
  contact_direct_phone = '(301) 652-5520',
  office_name = 'Capital Digestive Care - Bethesda',
  office_address = '10215 Fernwood Road Suite 100',
  office_city = 'Bethesda',
  office_state = 'MD',
  office_zip = '20817',
  service_summary = 'Capital Digestive Care is a leading multi-location gastroenterology practice across Maryland and Virginia performing colonoscopies, endoscopies, and diagnostic procedures. VitalX can provide rapid specimen transport of GI biopsies and pathology samples to central labs.'
WHERE organization_name ILIKE '%Capital Digestive%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(888) 401-2861',
  office_name = 'Carbon Health - DC/Virginia',
  office_address = '1310 G Street NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20005',
  service_summary = 'Carbon Health operates primary and urgent care clinics providing same-day walk-in care and diagnostics. VitalX can support their specimen collection and transport needs, enabling efficient logistics for lab work and diagnostic testing across their DMV locations.'
WHERE organization_name ILIKE '%Carbon Health%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Senior Medical Services',
  contact_direct_phone = '(305) 749-1655',
  office_name = 'ChenMed - Mid-Atlantic',
  office_address = '10201 Hammocks Boulevard',
  office_city = 'Miami',
  office_state = 'FL',
  office_zip = '33196',
  service_summary = 'ChenMed operates dedicated senior medical centers providing comprehensive primary care for Medicare-eligible patients. VitalX courier services can support home health visits, specimen delivery, and pharmacy logistics for their senior outpatient population in the DMV.'
WHERE organization_name ILIKE '%ChenMed%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(703) 272-4305',
  office_name = 'Concentra Urgent Care - Fairfax',
  office_address = '8613 Lee Highway Suite 110',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22031',
  service_summary = 'Concentra operates urgent care and occupational health clinics across Virginia providing treatment for acute injuries, workplace health, and drug testing. VitalX can support their specimen handling, lab delivery, and urgent medical logistics across DMV locations.'
WHERE organization_name ILIKE '%Concentra Urgent Care%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Business Operations',
  contact_direct_phone = '(571) 389-6000',
  office_name = 'Evolent Health - Arlington',
  office_address = '800 N Glebe Road Suite 500',
  office_city = 'Arlington',
  office_state = 'VA',
  office_zip = '22203',
  service_summary = 'Evolent Health is a healthcare management company providing value-based care and specialty services across the Mid-Atlantic. VitalX can support their care coordination networks with reliable medical courier and specimen transport for affiliated outpatient centers.'
WHERE organization_name ILIKE '%Evolent%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(571) 307-2594',
  office_name = 'Inova-GoHealth Urgent Care - Fairfax',
  office_address = '13039 Lee Jackson Memorial Highway Suite C',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22033',
  service_summary = 'Inova-GoHealth Urgent Care operates 23 walk-in urgent care centers across Northern Virginia. VitalX specimen transport services can support their diagnostic testing needs, lab specimen delivery, and outpatient logistics across their multi-site network.'
WHERE organization_name ILIKE '%GoHealth%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Patient Services',
  contact_direct_phone = '(540) 535-1029',
  office_name = 'MedExpress Urgent Care - Winchester VA',
  office_address = '207 Gateway Drive',
  office_city = 'Winchester',
  office_state = 'VA',
  office_zip = '22603',
  service_summary = 'MedExpress Urgent Care operates walk-in clinics across Virginia offering immediate treatment with extended hours. VitalX medical courier services can support specimen collection, lab delivery, and medical transport logistics for their multi-location network.'
WHERE organization_name ILIKE '%MedExpress%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Medical Services',
  contact_direct_phone = '(703) 876-2788',
  office_name = 'Mid-Atlantic Permanente Medical Group - McLean',
  office_address = '8008 Westpark Drive',
  office_city = 'McLean',
  office_state = 'VA',
  office_zip = '22102',
  service_summary = 'Mid-Atlantic Permanente Medical Group is the physician network serving 765,000+ Kaiser Permanente members across MD, VA, and DC with 60+ specialties. VitalX specimen transport can support rapid delivery of diagnostic samples across their specialty care network.'
WHERE organization_name ILIKE '%Mid-Atlantic Permanente%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Patient Services',
  contact_direct_phone = '(703) 383-9011',
  office_name = 'Patient First - Fairfax',
  office_address = '10100 Fairfax Boulevard',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22030',
  service_summary = 'Patient First operates 79 urgent care centers across the Mid-Atlantic offering walk-in care 8am-8pm daily. VitalX can support their urgent specimen delivery, lab logistics, and diagnostic testing coordination across their DMV network.'
WHERE organization_name ILIKE '%Patient First%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Pediatric Services',
  contact_direct_phone = '(703) 876-2788',
  office_name = 'Pediatric Specialists of Virginia - Fairfax',
  office_address = '3023 Hamaker Court Suite 200',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22031',
  service_summary = 'Pediatric Specialists of Virginia (PSV) provides pediatric specialty care at multiple DMV locations. VitalX courier services can support their outpatient specimen transport, specialty lab delivery, and medical logistics for pediatric diagnostic testing.'
WHERE organization_name ILIKE '%Pediatric Specialists%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Provider Services',
  contact_direct_phone = '(571) 366-8850',
  office_name = 'Privia Health - Arlington',
  office_address = '950 N Glebe Road Suite 700',
  office_city = 'Arlington',
  office_state = 'VA',
  office_zip = '22203',
  service_summary = 'Privia Health Group manages outpatient medical practices across the Mid-Atlantic region. VitalX medical courier and specimen transport services can support their care coordination and reliable delivery of diagnostic specimens across their provider network.'
WHERE organization_name ILIKE '%Privia%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(281) 863-6500',
  office_name = 'US Oncology Network - Headquarters',
  office_address = '10101 Woodloch Forest Drive',
  office_city = 'The Woodlands',
  office_state = 'TX',
  office_zip = '77380',
  service_summary = 'US Oncology Network (McKesson) operates through affiliated practices like Virginia Oncology Associates providing outpatient oncology across Virginia. VitalX can provide specimen transport for tumor samples, pathology specimens, and diagnostic materials to reference labs and specialty centers.'
WHERE organization_name ILIKE '%US Oncology%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Patient Services',
  contact_direct_phone = '(703) 208-3100',
  office_name = 'Virginia Cancer Specialists - Fairfax',
  office_address = '8503 Arlington Boulevard Suite 400',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22031',
  service_summary = 'Virginia Cancer Specialists is a multi-location oncology practice across Northern Virginia, Maryland, and DC providing outpatient cancer treatment. VitalX can provide rapid specimen transport for pathology samples, tumor testing, and diagnostic materials critical to oncology care.'
WHERE organization_name ILIKE '%Virginia Cancer Specialists%' AND entity = 'vitalx';

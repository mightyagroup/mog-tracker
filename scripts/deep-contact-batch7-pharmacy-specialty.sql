-- BATCH 7: Pharmacy / Specialty (18 organizations)
-- Deep contact research for VitalX commercial leads

UPDATE commercial_leads SET
  contact_department = 'Infusion Therapy Operations',
  contact_direct_phone = '(888) 547-0520',
  office_name = 'Amerita (PharMerica) - Mid-Atlantic',
  office_address = '1901 Campus Commons Drive Suite 450',
  office_city = 'Reston',
  office_state = 'VA',
  office_zip = '20191',
  service_summary = 'Amerita provides home and alternate-site infusion therapy services across the Mid-Atlantic. VitalX can provide temperature-controlled delivery of infusion medications, IV supplies, and clinical specimens between Amerita pharmacies, patient homes, and physician offices in the DMV.'
WHERE organization_name ILIKE '%Amerita%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Home Healthcare Equipment',
  contact_direct_phone = '(800) 277-4288',
  office_name = 'Apria Healthcare - DC/Maryland Regional',
  office_address = '4500 Forbes Boulevard Suite 200',
  office_city = 'Lanham',
  office_state = 'MD',
  office_zip = '20706',
  service_summary = 'Apria provides home respiratory therapy, infusion services, and medical equipment across the DMV. VitalX can partner for pharmaceutical delivery, medical supply transport, and specimen pickup services supporting their home health patient populations.'
WHERE organization_name ILIKE '%Apria%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Specialty Pharmacy Operations',
  contact_direct_phone = '(855) 728-4825',
  office_name = 'Avita Pharmacy - National',
  office_address = '727 North 1st Street Suite 120',
  office_city = 'St. Louis',
  office_state = 'MO',
  office_zip = '63102',
  service_summary = 'Avita Pharmacy specializes in HIV/AIDS, hepatitis, and specialty medication dispensing and delivery. VitalX can provide HIPAA-compliant pharmacy delivery and specimen courier services for their DMV-area patients requiring specialty medications and routine lab monitoring.'
WHERE organization_name ILIKE '%Avita Pharmacy%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Specialty Pharmacy Services',
  contact_direct_phone = '(888) 292-6925',
  office_name = 'BioPlus Specialty Pharmacy - National',
  office_address = '4700 Millenia Boulevard Suite 410',
  office_city = 'Orlando',
  office_state = 'FL',
  office_zip = '32839',
  service_summary = 'BioPlus provides specialty pharmacy services for complex conditions including oncology, immunology, and rare diseases. VitalX can provide temperature-controlled medication delivery and specimen transport for BioPlus patients requiring lab monitoring in the DMV region.'
WHERE organization_name ILIKE '%BioPlus%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Infusion Services',
  contact_direct_phone = '(800) 254-1015',
  office_name = 'BriovaRx Infusion Services (Optum) - National',
  office_address = '11000 Optum Circle',
  office_city = 'Eden Prairie',
  office_state = 'MN',
  office_zip = '55344',
  service_summary = 'BriovaRx (Optum) provides specialty and infusion pharmacy services for complex chronic conditions. VitalX can provide HIPAA-compliant delivery of infusion medications, specialty drugs, and specimen pickups for lab monitoring across their DMV patient network.'
WHERE organization_name ILIKE '%BriovaRx%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Pharmacy Operations',
  contact_direct_phone = '(202) 544-4400',
  office_name = 'Capital Area Pharmacy - Washington DC',
  office_address = '650 Pennsylvania Avenue SE Suite 200',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20003',
  service_summary = 'Capital Area Pharmacy serves the DC community with prescription dispensing and health services. VitalX can provide local pharmacy delivery, prescription courier, and specimen transport services to support their patient care operations across the District.'
WHERE organization_name ILIKE '%Capital Area Pharmacy%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Specialty Pharmacy Distribution',
  contact_direct_phone = '(800) 238-7828',
  office_name = 'CVS Specialty - Mid-Atlantic Hub',
  office_address = '8001 Braddock Road',
  office_city = 'Springfield',
  office_state = 'VA',
  office_zip = '22151',
  service_summary = 'CVS Specialty is one of the largest specialty pharmacy operations in the US serving complex conditions. VitalX can provide last-mile pharmacy delivery, temperature-controlled medication transport, and specimen pickup services for CVS Specialty patients in the DMV region.'
WHERE organization_name ILIKE '%CVS Specialty%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Specialty Pharmacy Services',
  contact_direct_phone = '(877) 977-9118',
  office_name = 'Diplomat Pharmacy (Optum Rx) - National',
  office_address = '611 Kenmoor Avenue SE',
  office_city = 'Grand Rapids',
  office_state = 'MI',
  office_zip = '49546',
  service_summary = 'Diplomat (now part of Optum Rx) is a specialty pharmacy serving patients with complex chronic conditions. VitalX can provide temperature-controlled medication delivery and specimen courier services for Diplomat/Optum patients requiring ongoing lab monitoring in the DMV.'
WHERE organization_name ILIKE '%Diplomat Pharmacy%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Behavioral Health Pharmacy',
  contact_direct_phone = '(301) 762-7677',
  office_name = 'Genoa Healthcare Pharmacy - Rockville',
  office_address = '1301 Piccard Drive Suite 200',
  office_city = 'Rockville',
  office_state = 'MD',
  office_zip = '20850',
  service_summary = 'Genoa Healthcare operates pharmacies within behavioral health clinics and community health centers. VitalX can provide medication delivery and specimen transport services between their Rockville pharmacy, behavioral health sites, and patient homes across the DMV.'
WHERE organization_name ILIKE '%Genoa Healthcare%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Pharmacy Distribution',
  contact_direct_phone = '(800) 798-0822',
  office_name = 'Maxor Specialty Pharmacy - National',
  office_address = '320 South Polk Street Suite 200',
  office_city = 'Amarillo',
  office_state = 'TX',
  office_zip = '79101',
  service_summary = 'Maxor provides specialty pharmacy, pharmacy benefit management, and 340B program support. VitalX can provide last-mile delivery and specimen transport services for Maxor patients and healthcare facility partners in the DMV region.'
WHERE organization_name ILIKE '%Maxor%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Home Health Pharmacy Services',
  contact_direct_phone = '(800) 654-0321',
  office_name = 'National Home Health Care Group - Regional',
  office_address = '700 White Plains Road Suite 405',
  office_city = 'Scarsdale',
  office_state = 'NY',
  office_zip = '10583',
  service_summary = 'National Home Health Care Group provides home nursing, pharmacy, and therapy services to homebound patients. VitalX can provide medication delivery, specimen transport, and medical supply logistics for their DMV-area home health patient populations.'
WHERE organization_name ILIKE '%National Home Health Care%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Long-Term Care Pharmacy',
  contact_direct_phone = '(800) 564-1004',
  office_name = 'Omnicare (CVS Health) - Mid-Atlantic',
  office_address = '900 Omnicare Center',
  office_city = 'Livonia',
  office_state = 'MI',
  office_zip = '48152',
  service_summary = 'Omnicare (CVS Health) provides pharmacy services to long-term care facilities, assisted living, and skilled nursing facilities. VitalX can provide medication delivery, emergency prescription transport, and specimen pickups from nursing facilities across the DMV region.'
WHERE organization_name ILIKE '%Omnicare%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Infusion Services Operations',
  contact_direct_phone = '(877) 672-4488',
  office_name = 'Option Care Health - Mid-Atlantic',
  office_address = '3000 Highlands Parkway Suite 300',
  office_city = 'Smyrna',
  office_state = 'GA',
  office_zip = '30082',
  service_summary = 'Option Care Health is the largest independent home and alternate-site infusion services company in the US. VitalX can provide temperature-controlled infusion medication delivery, IV supply transport, and specimen courier services for their DMV-area patients.'
WHERE organization_name ILIKE '%Option Care%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Specialty Pharmacy Distribution',
  contact_direct_phone = '(877) 677-4641',
  office_name = 'Orsini Specialty Pharmacy - National',
  office_address = '1100 Virginia Drive Suite 400',
  office_city = 'Fort Washington',
  office_state = 'PA',
  office_zip = '19034',
  service_summary = 'Orsini provides specialty pharmacy services focusing on rare and orphan diseases with high-touch patient support. VitalX can provide temperature-controlled medication delivery and specimen transport for Orsini patients requiring ongoing monitoring in the DMV.'
WHERE organization_name ILIKE '%Orsini%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Pharmacy Operations',
  contact_direct_phone = '(800) 564-1004',
  office_name = 'PharMerica - Mid-Atlantic Region',
  office_address = '1901 Campus Commons Drive Suite 600',
  office_city = 'Reston',
  office_state = 'VA',
  office_zip = '20191',
  service_summary = 'PharMerica provides pharmacy services to long-term care, senior living, and behavioral health facilities. VitalX can provide medication delivery, emergency prescription transport, and specimen courier services for PharMerica-serviced facilities across the DMV.'
WHERE organization_name ILIKE '%PharMerica%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Equipment and Delivery Operations',
  contact_direct_phone = '(877) 476-8324',
  office_name = 'Rotech Healthcare - Regional',
  office_address = '3600 Vineland Road Suite 114',
  office_city = 'Orlando',
  office_state = 'FL',
  office_zip = '32811',
  service_summary = 'Rotech provides home medical equipment, respiratory services, and pharmacy products. VitalX can provide medical equipment delivery logistics, pharmaceutical transport, and specimen courier services for Rotech patients and healthcare partners in the DMV.'
WHERE organization_name ILIKE '%Rotech%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Hospital Pharmacy Partnerships',
  contact_direct_phone = '(617) 614-6700',
  office_name = 'Shields Health Solutions - Headquarters',
  office_address = '80 Guest Street Suite 500',
  office_city = 'Boston',
  office_state = 'MA',
  office_zip = '02135',
  service_summary = 'Shields Health Solutions partners with hospitals to manage specialty pharmacy programs and 340B optimization. VitalX can provide medication delivery and specimen transport services for Shields-partnered hospital pharmacies in the DMV region.'
WHERE organization_name ILIKE '%Shields Health%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Specialty Pharmacy Operations',
  contact_direct_phone = '(855) 292-6299',
  office_name = 'Walgreens Specialty Pharmacy - Mid-Atlantic',
  office_address = '200 Wilmot Road',
  office_city = 'Deerfield',
  office_state = 'IL',
  office_zip = '60015',
  service_summary = 'Walgreens Specialty Pharmacy dispenses and delivers specialty medications for complex conditions with pharmacist-led care management. VitalX can provide last-mile delivery, temperature-controlled medication transport, and specimen pickup services for Walgreens Specialty patients in the DMV.'
WHERE organization_name ILIKE '%Walgreens Specialty%' AND entity = 'vitalx';

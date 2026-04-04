-- BATCH 5: DNA / Drug Testing (11 organizations)
-- Deep contact research for VitalX commercial leads

UPDATE commercial_leads SET
  contact_department = 'Genetic Counseling and Testing',
  contact_direct_phone = '(410) 583-8080',
  office_name = 'Chesapeake Genetics - Baltimore',
  office_address = '6420 Dobbin Road Suite A',
  office_city = 'Columbia',
  office_state = 'MD',
  office_zip = '21045',
  service_summary = 'Chesapeake Genetics provides genetic testing and counseling services in the Baltimore-Washington corridor. VitalX can provide HIPAA-compliant specimen transport for genetic testing samples between collection sites, physician offices, and their processing laboratory.'
WHERE organization_name ILIKE '%Chesapeake Genetics%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Drug Testing Services',
  contact_direct_phone = '(800) 445-6917',
  office_name = 'Clinical Reference Laboratory - Headquarters',
  office_address = '8433 Quivira Road',
  office_city = 'Lenexa',
  office_state = 'KS',
  office_zip = '66215',
  service_summary = 'Clinical Reference Laboratory is a HHS-certified drug testing lab processing workplace and forensic drug screens nationwide. VitalX can provide specimen courier services from DMV-area employer collection sites and clinics to CRL processing facilities, supporting chain-of-custody specimen transport.'
WHERE organization_name ILIKE '%Clinical Reference Lab%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Occupational Health and Drug Testing',
  contact_direct_phone = '(703) 272-4305',
  office_name = 'Concentra - Fairfax Urgent Care',
  office_address = '8613 Lee Highway Suite 110',
  office_city = 'Fairfax',
  office_state = 'VA',
  office_zip = '22031',
  service_summary = 'Concentra operates occupational health clinics across the DMV providing employer drug testing, physicals, and workplace injury treatment. VitalX can provide specimen courier services for drug test samples from Concentra collection sites to reference labs, supporting chain-of-custody transport requirements.'
WHERE organization_name ILIKE '%Concentra%' AND organization_name ILIKE '%drug%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory Operations',
  contact_direct_phone = '(800) 244-0680',
  office_name = 'DaVita Kidney Care - DMV Regional',
  office_address = '2000 16th Street North',
  office_city = 'Arlington',
  office_state = 'VA',
  office_zip = '22201',
  service_summary = 'DaVita operates 40+ dialysis centers across the DMV region providing renal care and lab monitoring. VitalX can provide specimen transport for routine and urgent lab draws from dialysis centers to reference labs, supporting their high-volume monthly bloodwork requirements.'
WHERE organization_name ILIKE '%DaVita%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'DNA Testing Operations',
  contact_direct_phone = '(800) 613-5768',
  office_name = 'DNA Diagnostics Center (DDC) - Headquarters',
  office_address = '205 Corporate Court',
  office_city = 'Fairfield',
  office_state = 'OH',
  office_zip = '45014',
  service_summary = 'DDC is a leading DNA testing company for paternity, immigration, and forensic testing with collection sites across the DMV. VitalX can provide chain-of-custody specimen courier services from DDC collection sites to their processing lab, supporting time-sensitive legal and immigration DNA cases.'
WHERE organization_name ILIKE '%DNA Diagnostics Center%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Drug Screening Services',
  contact_direct_phone = '(800) 881-0722',
  office_name = 'eScreen - Headquarters',
  office_address = '8401 West Dodge Road Suite 200',
  office_city = 'Omaha',
  office_state = 'NE',
  office_zip = '68114',
  service_summary = 'eScreen is a drug testing third-party administrator (TPA) managing workplace drug screening programs with collection sites in the DMV. VitalX can provide specimen courier services for drug test samples from eScreen-managed collection sites to certified testing labs.'
WHERE organization_name ILIKE '%eScreen%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory Services',
  contact_direct_phone = '(800) 911-2564',
  office_name = 'Fresenius Kidney Care - DMV Regional',
  office_address = '920 Winter Street',
  office_city = 'Waltham',
  office_state = 'MA',
  office_zip = '02451',
  service_summary = 'Fresenius operates 30+ dialysis clinics across the DMV providing renal care and ongoing lab monitoring. VitalX can provide high-volume specimen transport from their dialysis centers to reference labs for routine bloodwork, drug level monitoring, and specialized renal testing panels.'
WHERE organization_name ILIKE '%Fresenius%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Drug and Alcohol Testing',
  contact_direct_phone = '(800) 745-9698',
  office_name = 'National Drug and Alcohol Testing - Operations',
  office_address = '1600 Stewart Avenue Suite 700',
  office_city = 'Westbury',
  office_state = 'NY',
  office_zip = '11590',
  service_summary = 'National Drug and Alcohol Testing provides DOT and non-DOT workplace drug screening programs with collection sites across the DMV. VitalX can provide HIPAA-compliant specimen courier services for drug test samples from collection sites to certified labs, maintaining chain-of-custody protocols.'
WHERE organization_name ILIKE '%National Drug and Alcohol%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Occupational Health Services',
  contact_direct_phone = '(703) 573-7300',
  office_name = 'Sterling Medical Group - Northern Virginia',
  office_address = '3914 Centreville Road Suite 350',
  office_city = 'Chantilly',
  office_state = 'VA',
  office_zip = '20151',
  service_summary = 'Sterling Medical Group provides occupational health services including drug testing, physicals, and workplace health programs in Northern Virginia. VitalX can provide specimen courier services for drug test samples and occupational health lab work from their collection sites to reference labs.'
WHERE organization_name ILIKE '%Sterling Medical Group%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'DNA Collection and Testing',
  contact_direct_phone = '(877) 786-9543',
  office_name = 'US DNA Testing Centers - National',
  office_address = '501 Silverside Road Suite 105',
  office_city = 'Wilmington',
  office_state = 'DE',
  office_zip = '19809',
  service_summary = 'US DNA Testing Centers provides paternity, immigration, and legal DNA testing services with mobile collection capabilities across the DMV. VitalX can provide specimen courier transport for DNA samples from collection events and office sites to processing laboratories.'
WHERE organization_name ILIKE '%US DNA Testing%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory Operations',
  contact_direct_phone = '(972) 939-6003',
  office_name = 'US Renal Care - DMV Regional',
  office_address = '2301 Eagle Park Drive',
  office_city = 'Plano',
  office_state = 'TX',
  office_zip = '75074',
  service_summary = 'US Renal Care operates dialysis clinics in the DMV region providing hemodialysis and peritoneal dialysis services. VitalX can provide specimen transport for monthly lab panels, drug monitoring, and urgent lab draws from their dialysis centers to reference labs.'
WHERE organization_name ILIKE '%US Renal Care%' AND entity = 'vitalx';

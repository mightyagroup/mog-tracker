-- BATCH 8: Reference Labs (14 organizations)
-- Deep contact research for VitalX commercial leads

UPDATE commercial_leads SET
  contact_department = 'Client Services',
  contact_direct_phone = '(800) 525-5227',
  office_name = 'ACM Global Laboratories - Headquarters',
  office_address = '160 Elmgrove Park',
  office_city = 'Rochester',
  office_state = 'NY',
  office_zip = '14624',
  service_summary = 'ACM Global Laboratories provides clinical trial, occupational, and forensic toxicology testing services. VitalX specimen transport and medical courier services can support ACM''s specimen collection and delivery operations for laboratory analysis across the DMV region.'
WHERE organization_name ILIKE '%ACM Medical Laboratory%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Client Services',
  contact_direct_phone = '(801) 583-2787',
  office_name = 'ARUP Laboratories - Headquarters',
  office_address = '500 Chipeta Way',
  office_city = 'Salt Lake City',
  office_state = 'UT',
  office_zip = '84108',
  service_summary = 'ARUP Laboratories is a national reference laboratory owned by the University of Utah offering 3,000+ tests. VitalX can provide DMV-region specimen collection and transport to ARUP for physicians and healthcare systems needing specialized reference testing.'
WHERE organization_name ILIKE '%ARUP Laboratories%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Anatomic Pathology',
  contact_direct_phone = '(561) 805-0730',
  office_name = 'Aurora Diagnostics - Corporate Office',
  office_address = '1411 N Flagler Drive Suite 6000',
  office_city = 'West Palm Beach',
  office_state = 'FL',
  office_zip = '33401',
  service_summary = 'Aurora Diagnostics is a specialized anatomic pathology laboratory network. VitalX can support specimen transport and diagnostic logistics for pathology samples from DMV healthcare facilities to Aurora processing centers.'
WHERE organization_name ILIKE '%Aurora Diagnostics%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Urology Lab Services',
  contact_direct_phone = '(410) 532-1700',
  office_name = 'Chesapeake Urology Labs - Columbia Office',
  office_address = '6420 Dobbin Road Suite A',
  office_city = 'Columbia',
  office_state = 'MD',
  office_zip = '21045',
  service_summary = 'Chesapeake Urology Labs provides specialized urological testing and diagnostic services across Maryland and Delaware. VitalX can provide rapid specimen transport of urology samples between Chesapeake''s DMV facilities and reference laboratories.'
WHERE organization_name ILIKE '%Chesapeake Urology%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Operations',
  contact_direct_phone = '(913) 492-3652',
  office_name = 'Clinical Reference Laboratory - Headquarters',
  office_address = '8433 Quivira Road',
  office_city = 'Lenexa',
  office_state = 'KS',
  office_zip = '66215',
  service_summary = 'Clinical Reference Laboratory provides comprehensive laboratory testing for clinical reference, insurance, and employer services. VitalX can enhance CRL''s specimen transport from DMV-area collection sites to their processing facilities.'
WHERE organization_name ILIKE '%Clinical Reference Laboratory%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Client Services',
  contact_direct_phone = '(844) 870-8870',
  office_name = 'Exact Sciences - Headquarters',
  office_address = '145 E Badger Road',
  office_city = 'Madison',
  office_state = 'WI',
  office_zip = '53713',
  service_summary = 'Exact Sciences provides molecular diagnostics for cancer detection including Cologuard and Oncotype DX. VitalX can support DMV-region specimen collection and transport for Exact Sciences cancer screening and genomic testing programs.'
WHERE organization_name ILIKE '%Exact Sciences%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Client Services',
  contact_direct_phone = '(617) 421-8200',
  office_name = 'Foundation Medicine - Headquarters',
  office_address = '150 Second Street',
  office_city = 'Cambridge',
  office_state = 'MA',
  office_zip = '02141',
  service_summary = 'Foundation Medicine (Roche subsidiary) provides comprehensive genomic profiling for cancer patients. VitalX can provide HIPAA-compliant specimen transport from DMV oncology practices and hospitals to Foundation Medicine labs for tumor profiling.'
WHERE organization_name ILIKE '%Foundation Medicine%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Client Services',
  contact_direct_phone = '(949) 540-9421',
  office_name = 'Genomic Testing Cooperative - Headquarters',
  office_address = '25371 Commercentre Drive',
  office_city = 'Lake Forest',
  office_state = 'CA',
  office_zip = '92630',
  service_summary = 'Genomic Testing Cooperative provides DNA/RNA sequencing and analysis for oncology and other specialties. VitalX can support DMV-area physicians with specimen courier services to GTC for advanced genomic testing.'
WHERE organization_name ILIKE '%Genomic Testing Cooperative%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Client Services',
  contact_direct_phone = '(760) 268-6200',
  office_name = 'Genoptix (NeoGenomics) - Carlsbad',
  office_address = '2131 Faraday Avenue',
  office_city = 'Carlsbad',
  office_state = 'CA',
  office_zip = '92008',
  service_summary = 'Genoptix (now NeoGenomics) provides molecular oncology and hematology testing. VitalX can provide DMV-area specimen transport for oncology samples requiring Genoptix/NeoGenomics specialty testing and molecular profiling.'
WHERE organization_name ILIKE '%Genoptix%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Client Services',
  contact_direct_phone = '(855) 698-8887',
  office_name = 'Guardant Health - Headquarters',
  office_address = '505 Penobscot Drive',
  office_city = 'Redwood City',
  office_state = 'CA',
  office_zip = '94063',
  service_summary = 'Guardant Health offers liquid biopsy and advanced genomic testing for cancer detection. VitalX can provide HIPAA-compliant courier services transporting blood draw specimens from DMV oncology offices to Guardant processing facilities.'
WHERE organization_name ILIKE '%Guardant Health%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Customer Service',
  contact_direct_phone = '(800) 533-1710',
  office_name = 'Mayo Clinic Laboratories - Rochester',
  office_address = '3050 Superior Drive NW',
  office_city = 'Rochester',
  office_state = 'MN',
  office_zip = '55905',
  service_summary = 'Mayo Clinic Laboratories provides comprehensive reference testing with 3,500+ available tests. VitalX can serve as the DMV-region specimen courier connecting area physicians and hospitals with Mayo Clinic reference testing services.'
WHERE organization_name ILIKE '%Mayo Clinic Laboratories%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Client Services',
  contact_direct_phone = '(866) 436-3463',
  office_name = 'Nichols Institute (Quest) - San Juan Capistrano',
  office_address = '33608 Ortega Highway',
  office_city = 'San Juan Capistrano',
  office_state = 'CA',
  office_zip = '92675',
  service_summary = 'Nichols Institute (Quest Diagnostics) provides specialized reference lab testing including endocrinology, genetics, and cytogenetics. VitalX can support DMV-area specimen transport for Nichols Institute specialty testing needs.'
WHERE organization_name ILIKE '%Nichols Institute%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Business Development',
  contact_direct_phone = '(510) 899-8800',
  office_name = 'NovaBay Pharmaceuticals - Corporate',
  office_address = '2000 Powell Street Suite 1150',
  office_city = 'Emeryville',
  office_state = 'CA',
  office_zip = '94608',
  service_summary = 'NovaBay Pharmaceuticals develops dermatology and wound care products. VitalX can support specimen and clinical trial material transport for NovaBay research partnerships and product testing with DMV-area dermatology practices.'
WHERE organization_name ILIKE '%NovaBay Pharmaceuticals%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Client Services',
  contact_direct_phone = '(800) 976-5448',
  office_name = 'Tempus AI - Headquarters',
  office_address = '600 West Chicago Avenue Suite 510',
  office_city = 'Chicago',
  office_state = 'IL',
  office_zip = '60654',
  service_summary = 'Tempus AI provides AI-powered genomic testing and precision medicine diagnostics for oncology. VitalX can provide HIPAA-compliant specimen transport from DMV oncology centers and hospitals to Tempus labs for advanced molecular profiling and treatment matching.'
WHERE organization_name ILIKE '%Tempus AI%' AND entity = 'vitalx';

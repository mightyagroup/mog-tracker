-- BATCH 6: NEMT Brokers (15 organizations)
-- Deep contact research for VitalX commercial leads

UPDATE commercial_leads SET
  contact_department = 'Operations',
  contact_direct_phone = '(866) 839-6564',
  office_name = 'MTM (Access2Care) - Richmond Regional Office',
  office_address = '1300 E Main St, Suite 240',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23219',
  service_summary = 'Access2Care is MTM''s non-emergency medical transportation platform serving Virginia and the broader DMV region. VitalX can partner for specimen transport, lab delivery, and pharmacy logistics integration with MTM''s NEMT broker network.'
WHERE organization_name ILIKE '%Access2Care%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Government Contracts',
  contact_direct_phone = '(703) 522-1004',
  office_name = 'American Medical Response - Northern Virginia',
  office_address = '2520 South Arlington Mill Drive',
  office_city = 'Arlington',
  office_state = 'VA',
  office_zip = '22206',
  service_summary = 'AMR operates non-emergency medical transport and ambulance services across the DMV with government contracts. VitalX can provide specimen courier support, medical logistics, and pharmacy delivery services to complement AMR''s network.'
WHERE organization_name ILIKE '%American Medical Response%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Dispatch and Logistics',
  contact_direct_phone = '(202) 635-2400',
  office_name = 'Capital Rides - Washington DC Headquarters',
  office_address = '2000 M Street NW, Suite 600',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20036',
  service_summary = 'Capital Rides manages non-emergency medical transportation for DC residents with Medicaid coverage. VitalX can integrate specimen transport and lab courier services to expand Capital Rides'' medical logistics offerings.'
WHERE organization_name ILIKE '%Capital Rides%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Medical Transport Division',
  contact_direct_phone = '(202) 289-2400',
  office_name = 'Care Transportation - DC Office',
  office_address = '1401 K Street NW, Suite 1000',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20005',
  service_summary = 'Care Transportation provides NEMT and medical courier services throughout Washington DC and Maryland. VitalX can partner to offer specialized specimen transport, home health delivery, and healthcare facility logistics.'
WHERE organization_name ILIKE '%Care Transportation%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Business Development',
  contact_direct_phone = '(301) 424-5000',
  office_name = 'Envision Medical Transportation - Maryland Regional',
  office_address = '6931 Arlington Road, Suite 404',
  office_city = 'Bethesda',
  office_state = 'MD',
  office_zip = '20814',
  service_summary = 'Envision Medical Transportation operates NEMT broker services across Maryland and Northern Virginia. VitalX can provide specimen courier, pharmacy delivery, and lab logistics services to enhance Envision''s medical transport network.'
WHERE organization_name ILIKE '%Envision Medical%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Operations and Compliance',
  contact_direct_phone = '(859) 233-7000',
  office_name = 'IntelliRide (KYYBA) - Kentucky Operations',
  office_address = '455 S 4th Street, Suite 700',
  office_city = 'Louisville',
  office_state = 'KY',
  office_zip = '40202',
  service_summary = 'IntelliRide operates NEMT brokerage serving multiple states with potential expansion into Virginia. VitalX can collaborate on cross-regional specimen and pharmacy transport, especially for border healthcare systems.'
WHERE organization_name ILIKE '%IntelliRide%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Network Operations',
  contact_direct_phone = '(434) 846-4500',
  office_name = 'Logisticare (Modivcare) - Virginia Regional Office',
  office_address = '701 W Broad St, Suite 415',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23219',
  service_summary = 'Logisticare Virginia is a Modivcare NEMT broker serving the state with medical transport coordination. VitalX can integrate specimen courier and medical logistics services to expand Logisticare''s service offerings.'
WHERE organization_name ILIKE '%Logisticare%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Medical Services',
  contact_direct_phone = '(202) 728-2400',
  office_name = 'MedRide DC/VA - District Headquarters',
  office_address = '1250 H Street NW, Suite 500',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20005',
  service_summary = 'MedRide operates non-emergency medical transportation in Washington DC and Northern Virginia with emphasis on healthcare compliance. VitalX can offer HIPAA-compliant specimen transport and pharmacy delivery to strengthen MedRide''s logistics capabilities.'
WHERE organization_name ILIKE '%MedRide%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Government Solutions',
  contact_direct_phone = '(703) 647-0000',
  office_name = 'Modivcare - Arlington Regional Center',
  office_address = '2300 N Clarendon Blvd, Suite 800',
  office_city = 'Arlington',
  office_state = 'VA',
  office_zip = '22201',
  service_summary = 'Modivcare is a national NEMT and medical transport broker with significant operations in the DMV. VitalX can provide white-label specimen courier, pharmacy logistics, and home health delivery services across Modivcare''s network.'
WHERE organization_name ILIKE '%Modivcare%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Partner Relations',
  contact_direct_phone = '(636) 695-2400',
  office_name = 'MTM (Medical Transportation Management) - Headquarters',
  office_address = '16 Hawk Ridge Drive',
  office_city = 'Lake St. Louis',
  office_state = 'MO',
  office_zip = '63367',
  service_summary = 'MTM is a leading nationwide NEMT broker managing non-emergency transport for millions of members. VitalX can partner to provide specialized specimen transport, lab courier, and healthcare logistics services across MTM''s extensive DMV network.'
WHERE organization_name ILIKE '%MTM%' AND organization_name ILIKE '%Medical Transportation%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Transit Services',
  contact_direct_phone = '(703) 228-3650',
  office_name = 'National Express Transit - Washington Metro Region',
  office_address = '14601 Balls Ford Road',
  office_city = 'Manassas',
  office_state = 'VA',
  office_zip = '20110',
  service_summary = 'National Express provides contracted medical transportation and logistics services across Northern Virginia and the DC metro. VitalX can integrate specimen courier and pharmacy delivery services to enhance National Express'' healthcare transport offerings.'
WHERE organization_name ILIKE '%National Express%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Medical Services Division',
  contact_direct_phone = '(844) 464-4383',
  office_name = 'SafeRide Health - Operations',
  office_address = '5550 LBJ Freeway Suite 200',
  office_city = 'Dallas',
  office_state = 'TX',
  office_zip = '75240',
  service_summary = 'SafeRide Health operates NEMT services serving DC and Maryland with focus on Medicaid recipients. VitalX can provide specimen transport, home health logistics, and pharmacy delivery to expand SafeRide''s service portfolio.'
WHERE organization_name ILIKE '%SafeRide%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Operations',
  contact_direct_phone = '(404) 209-6200',
  office_name = 'Southeastrans - Atlanta Headquarters',
  office_address = '4751 Best Road Suite 300',
  office_city = 'Atlanta',
  office_state = 'GA',
  office_zip = '30337',
  service_summary = 'Southeastrans operates NEMT brokerage serving southeastern states including Virginia. VitalX can explore regional partnerships for specimen courier and medical logistics across their Virginia service area.'
WHERE organization_name ILIKE '%Southeastrans%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Network Development',
  contact_direct_phone = '(703) 707-9800',
  office_name = 'TransAm Medical Transport - Northern Virginia',
  office_address = '3500 Precision Drive, Suite 110',
  office_city = 'Falls Church',
  office_state = 'VA',
  office_zip = '22042',
  service_summary = 'TransAm Medical Transport provides non-emergency medical transportation and logistics across Northern Virginia and the DC metro area. VitalX can partner to offer specimen courier, lab delivery, and HIPAA-compliant healthcare logistics services.'
WHERE organization_name ILIKE '%TransAm%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Healthcare Solutions',
  contact_direct_phone = '(844) 538-3396',
  office_name = 'Veyo - National Operations Center',
  office_address = '1265 South 1100 East',
  office_city = 'Salt Lake City',
  office_state = 'UT',
  office_zip = '84105',
  service_summary = 'Veyo is a digital NEMT platform connecting riders with healthcare transportation nationwide, including strong DMV coverage. VitalX can integrate as a white-label specimen courier and medical logistics partner on Veyo''s platform.'
WHERE organization_name ILIKE '%Veyo%' AND entity = 'vitalx';

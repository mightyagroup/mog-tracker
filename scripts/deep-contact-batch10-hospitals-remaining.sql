-- BATCH 10: Remaining Hospital Systems (16 organizations)
-- Deep contact research for VitalX commercial leads - gap fill

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(240) 826-6000',
  office_name = 'Adventist HealthCare Shady Grove Medical Center',
  office_address = '9901 Medical Center Drive',
  office_city = 'Rockville',
  office_state = 'MD',
  office_zip = '20850',
  service_summary = 'Adventist HealthCare Shady Grove is a 268-bed acute care hospital in Rockville serving Montgomery County. VitalX can provide specimen transport, lab courier, and pharmacy delivery services between Shady Grove and other Adventist HealthCare facilities in the DMV.'
WHERE organization_name ILIKE '%Adventist HealthCare Shady Grove%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory',
  contact_direct_phone = '(540) 332-4000',
  office_name = 'Augusta Health',
  office_address = '78 Medical Center Drive',
  office_city = 'Fishersville',
  office_state = 'VA',
  office_zip = '22939',
  service_summary = 'Augusta Health is a 255-bed community hospital in the Shenandoah Valley serving Augusta County and surrounding areas. VitalX can provide specimen transport and lab courier services connecting Augusta Health with regional reference labs and specialty testing facilities.'
WHERE organization_name ILIKE '%Augusta Health%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory and Pathology',
  contact_direct_phone = '(804) 764-5100',
  office_name = 'Bon Secours St. Mary''s Hospital',
  office_address = '5801 Bremo Road',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23226',
  service_summary = 'Bon Secours Richmond Health System operates multiple hospitals and outpatient sites across the Richmond metro area. VitalX can provide specimen courier services, inter-facility lab transfers, and pharmacy delivery across their Richmond network.'
WHERE organization_name ILIKE '%Bon Secours Richmond%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(540) 829-4100',
  office_name = 'Culpeper Medical Center',
  office_address = '501 Sunset Lane',
  office_city = 'Culpeper',
  office_state = 'VA',
  office_zip = '22701',
  service_summary = 'Culpeper Medical Center (Novant Health) is a community hospital serving Culpeper County and surrounding rural areas. VitalX can provide specimen transport between the hospital, outpatient sites, and regional reference laboratories.'
WHERE organization_name ILIKE '%Culpeper Medical%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory',
  contact_direct_phone = '(240) 566-3300',
  office_name = 'Frederick Health Hospital',
  office_address = '400 West Seventh Street',
  office_city = 'Frederick',
  office_state = 'MD',
  office_zip = '21701',
  service_summary = 'Frederick Health is a 275-bed regional medical center serving Frederick County and western Maryland. VitalX can provide specimen courier services between the hospital, satellite offices, and reference labs along the I-270 corridor.'
WHERE organization_name ILIKE '%Frederick Health%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Research Specimen Services',
  contact_direct_phone = '(202) 687-2110',
  office_name = 'Georgetown Lombardi Comprehensive Cancer Center',
  office_address = '3800 Reservoir Road NW',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20007',
  service_summary = 'Georgetown Lombardi is an NCI-designated comprehensive cancer center with high-volume research specimen and clinical trial sample needs. VitalX can provide temperature-controlled biospecimen transport, clinical trial logistics, and oncology sample courier services.'
WHERE organization_name ILIKE '%Georgetown Lombardi%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Supply Chain / Laboratory Logistics',
  contact_direct_phone = '(804) 320-3627',
  office_name = 'HCA Virginia - Northern Virginia Market',
  office_address = '7101 Jahnke Road',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23225',
  service_summary = 'HCA Northern Virginia Market oversees multiple hospitals including Reston, StoneSprings, and others. VitalX can provide centralized specimen courier services across HCA Northern Virginia facilities, connecting their labs with reference labs and pathology centers.'
WHERE organization_name ILIKE '%HCA Northern Virginia%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(804) 320-3911',
  office_name = 'HCA Virginia - CJW Medical Center',
  office_address = '7101 Jahnke Road',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23225',
  service_summary = 'CJW Medical Center (HCA Virginia) operates Chippenham and Johnston-Willis hospitals in Richmond with combined 800+ beds. VitalX can provide specimen transport and lab courier services between CJW campuses, outpatient centers, and reference laboratories.'
WHERE organization_name ILIKE '%CJW Medical%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory',
  contact_direct_phone = '(410) 740-7890',
  office_name = 'Howard County General Hospital',
  office_address = '5755 Cedar Lane',
  office_city = 'Columbia',
  office_state = 'MD',
  office_zip = '21044',
  service_summary = 'Howard County General Hospital (Johns Hopkins affiliate) is a 264-bed community hospital in Columbia. VitalX can provide specimen transport between HCGH, Johns Hopkins reference labs, and the broader JHM network in the Baltimore-DC corridor.'
WHERE organization_name ILIKE '%Howard County General%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(703) 664-7000',
  office_name = 'Inova Mount Vernon Hospital',
  office_address = '2501 Parkers Lane',
  office_city = 'Alexandria',
  office_state = 'VA',
  office_zip = '22306',
  service_summary = 'Inova Mount Vernon Hospital is a 237-bed community hospital in southern Fairfax County. VitalX can provide specimen courier services connecting Mount Vernon with the broader Inova Health System network, reference labs, and specialty testing facilities.'
WHERE organization_name ILIKE '%Inova Mount Vernon%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Pathology and Laboratory',
  contact_direct_phone = '(301) 618-2000',
  office_name = 'Prince George''s Hospital Center',
  office_address = '3001 Hospital Drive',
  office_city = 'Cheverly',
  office_state = 'MD',
  office_zip = '20785',
  service_summary = 'Prince George''s Hospital Center (UM Capital Region Health) is a major acute care hospital serving Prince George''s County. VitalX can provide specimen transport, lab courier, and pharmacy delivery services between the hospital and affiliated UM system facilities.'
WHERE organization_name ILIKE '%Prince George%Hospital%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory',
  contact_direct_phone = '(540) 498-4000',
  office_name = 'Spotsylvania Regional Medical Center',
  office_address = '4600 Spotsylvania Parkway',
  office_city = 'Fredericksburg',
  office_state = 'VA',
  office_zip = '22408',
  service_summary = 'Spotsylvania Regional Medical Center (HCA Virginia) is a growing community hospital in the Fredericksburg area. VitalX can provide specimen courier services between the hospital, HCA network facilities, and regional reference labs along the I-95 corridor.'
WHERE organization_name ILIKE '%Spotsylvania Regional%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(540) 741-9000',
  office_name = 'Stafford Hospital',
  office_address = '101 Hospital Center Boulevard',
  office_city = 'Stafford',
  office_state = 'VA',
  office_zip = '22554',
  service_summary = 'Stafford Hospital (Mary Washington Healthcare) is a 100-bed community hospital serving the rapidly growing Stafford County area. VitalX can provide specimen transport connecting Stafford Hospital with Mary Washington facilities and regional reference labs.'
WHERE organization_name ILIKE '%Stafford Hospital%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services and Pathology',
  contact_direct_phone = '(410) 328-8667',
  office_name = 'University of Maryland Medical Center',
  office_address = '22 South Greene Street',
  office_city = 'Baltimore',
  office_state = 'MD',
  office_zip = '21201',
  service_summary = 'University of Maryland Medical System operates 14 hospitals across Maryland with centralized lab operations. VitalX can provide specimen courier services, inter-facility lab transfers, and research biospecimen transport across their extensive Maryland network.'
WHERE organization_name ILIKE '%University of Maryland Medical System%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Laboratory',
  contact_direct_phone = '(540) 536-8000',
  office_name = 'Valley Health - Winchester Medical Center',
  office_address = '1840 Amherst Street',
  office_city = 'Winchester',
  office_state = 'VA',
  office_zip = '22601',
  service_summary = 'Valley Health System operates Winchester Medical Center and multiple hospitals across the northern Shenandoah Valley. VitalX can provide specimen transport and lab courier services connecting their facilities with regional reference labs and specialty testing centers.'
WHERE organization_name ILIKE '%Valley Health System%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(301) 891-7600',
  office_name = 'Washington Adventist Hospital',
  office_address = '7600 Carroll Avenue',
  office_city = 'Takoma Park',
  office_state = 'MD',
  office_zip = '20912',
  service_summary = 'Washington Adventist Hospital (Adventist HealthCare) is a community hospital in Takoma Park serving Montgomery and Prince George''s counties. VitalX can provide specimen courier, pharmacy delivery, and lab transport services between WAH and the Adventist HealthCare network.'
WHERE organization_name ILIKE '%Washington Adventist Hospital%' AND entity = 'vitalx';

-- Fix 3 missing phone numbers from earlier batches

UPDATE commercial_leads SET
  contact_direct_phone = '(202) 737-8300'
WHERE organization_name ILIKE '%American Red Cross%Capital Blood%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_direct_phone = '(202) 745-8000'
WHERE organization_name ILIKE '%DC VA Medical Center%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_direct_phone = '(571) 231-3224'
WHERE organization_name ILIKE '%Fort Belvoir Community Hospital%' AND entity = 'vitalx';

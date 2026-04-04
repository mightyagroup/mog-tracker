-- BATCH 1: Blood Banks (5) + VA/Military Healthcare (10)
-- Deep contact research for VitalX commercial leads

-- BLOOD BANKS

UPDATE commercial_leads SET
  contact_department = 'Blood Services Operations',
  contact_direct_phone = '(703) 681-8024',
  office_name = 'Armed Services Blood Program (ASBP)',
  office_address = '7700 Arlington Blvd, Suite 5143',
  office_city = 'Falls Church',
  office_state = 'VA',
  office_zip = '22042',
  service_summary = 'Armed Services Blood Program operates 20+ military blood donor centers globally, with significant presence at Walter Reed and Pentagon facilities. Critical need for specimen transport of whole blood, platelets, RBCs, and plasma between collection centers, processing labs, and MTFs across DMV. Procurement typically through military contracts on SAM.gov (set-asides available), but some emergency commercial logistics needs.'
WHERE organization_name ILIKE '%Armed Services Blood Program%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Blood Bank Operations',
  contact_direct_phone = '(301) 496-1048',
  office_name = 'National Institutes of Health Clinical Center Blood Bank',
  office_address = '10 Center Drive',
  office_city = 'Bethesda',
  office_state = 'MD',
  office_zip = '20892',
  service_summary = 'NIH CC Blood Bank provides transfusion support, blood products, and research specimens for intramural and extramural research programs. High-complexity specimen transport needs: research samples, diagnostic blood work, and clinical specimens across NIH campus and partnered facilities. HIPAA-compliant courier services required for research biospecimens. Mix of government and commercial procurement opportunities.'
WHERE organization_name ILIKE '%National Institutes of Health%' AND organization_name ILIKE '%Blood Bank%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Regional Operations',
  contact_direct_phone = '(800) 688-0900',
  office_name = 'New York Blood Center - DMV Region',
  office_address = '310 East 67th Street',
  office_city = 'New York',
  office_state = 'NY',
  office_zip = '10065',
  service_summary = 'NYBC serves Mid-Atlantic region including Maryland, Virginia, and Delaware with blood collection and transfusion services. Key specimen transport needs: blood products, QA samples, and diagnostic specimens between collection centers and hospital partners. VitalX can provide supplemental STAT and scheduled courier routes for emergency transfusions and same-day specimen delivery.'
WHERE organization_name ILIKE '%New York Blood Center%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Transportation and Logistics',
  contact_direct_phone = '(888) 663-5386',
  office_name = 'OneBlood Regional Operations',
  office_address = '200 E. Colonial Drive',
  office_city = 'Orlando',
  office_state = 'FL',
  office_zip = '32801',
  service_summary = 'OneBlood operates medical courier service transporting blood products, specimens, and supplies. Expansion opportunity: OneBlood courier network covers Eastern U.S. but lacks dedicated DMV presence. VitalX can provide HIPAA-compliant specimen transport and blood product logistics to fill gaps. Potential partnership for white-label or subcontract medical courier routes.'
WHERE organization_name ILIKE '%OneBlood%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Donor Services and Operations',
  contact_direct_phone = '(877) 258-4825',
  office_name = 'Vitalant - Virginia/Maryland',
  office_address = 'Multiple locations across Virginia and Maryland',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23219',
  service_summary = 'Vitalant operates 120+ blood donation centers across 20 states including Virginia and Maryland. Regional transfusion service supporting hospital networks in DMV. Specimen transport challenges: managing collection-to-processing turnaround and inter-facility blood product transfers. VitalX can provide supplemental courier services and specialized temperature-controlled transport for blood products.'
WHERE organization_name ILIKE '%Vitalant%' AND entity = 'vitalx';

-- VA/MILITARY HEALTHCARE

UPDATE commercial_leads SET
  contact_department = 'Medical Services / Laboratory',
  contact_direct_phone = '(804) 633-7400',
  office_name = 'Fort A.P. Hill Medical Center',
  office_address = '4300 Furniss Gate Drive',
  office_city = 'King George',
  office_state = 'VA',
  office_zip = '22485',
  service_summary = 'Army military treatment facility providing medical support to Fort A.P. Hill personnel. Specimen transport needs: laboratory specimens from collection points to main lab, inter-facility transfers to regional medical centers. Government procurement primarily through SAM.gov, but specimen courier services may use commercial contracts for urgent turnaround.'
WHERE organization_name ILIKE '%Fort A.P. Hill%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Blood Bank and Laboratory Services',
  contact_direct_phone = '(757) 722-9961',
  office_name = 'Hampton VA Medical Center',
  office_address = '100 Emancipation Drive',
  office_city = 'Hampton',
  office_state = 'VA',
  office_zip = '23667',
  service_summary = 'VA medical center (150+ bed facility) providing comprehensive medical care including laboratory and transfusion services. Specimen transport needs: high-volume blood products, laboratory specimens, STAT cardiac markers, and urgent diagnostic samples. Government contracts (SAM.gov), but commercial courier standby for emergency STAT runs.'
WHERE organization_name ILIKE '%Hampton VA Medical Center%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory and Pathology Services',
  contact_direct_phone = '(804) 675-5000',
  office_name = 'Hunter Holmes McGuire VA Medical Center',
  office_address = '1201 Broad Rock Boulevard',
  office_city = 'Richmond',
  office_state = 'VA',
  office_zip = '23249',
  service_summary = 'Major VA medical center (490+ beds) serving Central Virginia veterans with complex tertiary care. High-volume specimen transport needs: multiple laboratory specialties (hematology, chemistry, microbiology, transfusion medicine). VitalX can provide specialized medical courier services, temperature-controlled transport, and emergency STAT delivery.'
WHERE organization_name ILIKE '%Hunter Holmes McGuire%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Medical Services / Naval Health Clinic',
  contact_direct_phone = '(703) 784-1725',
  office_name = 'Marine Corps Base Quantico Medical',
  office_address = '3259 Catlin Avenue',
  office_city = 'Quantico',
  office_state = 'VA',
  office_zip = '22134',
  service_summary = 'Naval health clinic providing medical support to 20,000+ military personnel and dependents. Specimen transport challenges: laboratory specimens from multiple clinics, stat phlebotomy, and transfers to Naval Medical Center Bethesda for advanced testing. Military procurement via SAM.gov, but emergency/STAT courier services often procured commercially.'
WHERE organization_name ILIKE '%Marine Corps Base Quantico Medical%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(304) 626-7000',
  office_name = 'Martinsburg VA Medical Center',
  office_address = '510 Butler Avenue',
  office_city = 'Martinsburg',
  office_state = 'WV',
  office_zip = '25405',
  service_summary = 'VA medical center (290+ bed tertiary facility) serving West Virginia and border-state veterans. Full laboratory services. Specimen transport needs: routine and STAT laboratory specimens, inter-facility transfers to larger VA centers, and after-hours emergency specimen delivery. Government contracts dominant, but emergency medical courier services available commercially.'
WHERE organization_name ILIKE '%Martinsburg VA Medical Center%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services / Medical Operations',
  contact_direct_phone = '(301) 295-4607',
  office_name = 'Naval Support Activity Bethesda',
  office_address = '102 Wood Road',
  office_city = 'Bethesda',
  office_state = 'MD',
  office_zip = '20814',
  service_summary = 'Largest military medical center in U.S. (1,050+ bed flagship facility). Extremely high specimen transport demands: multiple specialty laboratories, blood bank (24 hrs), trauma/emergency pathology, oncology specimens. Military procurement through DHA/SAM.gov contracts, but urgent STAT specimen delivery often contracted commercially.'
WHERE organization_name ILIKE '%Naval Support Activity Bethesda%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Medical Laboratory',
  contact_direct_phone = '(540) 653-0282',
  office_name = 'NSF Dahlgren Medical - Naval Branch Health Clinic',
  office_address = '17457 Caffee Road, Suite 204',
  office_city = 'Dahlgren',
  office_state = 'VA',
  office_zip = '22448',
  service_summary = 'Naval branch health clinic for NSWC Dahlgren. Limited on-site laboratory capacity (Mon-Thu 7:30 AM-4 PM, Fri 7:30 AM-12 PM). Specimen transport needs: lab specimens requiring rapid turnaround to regional MTF labs and off-site specialty labs. Government procurement through Navy, but commercial courier standby for STAT specimen runs.'
WHERE organization_name ILIKE '%NSF Dahlgren Medical%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'DiLorenzo Pentagon Health Clinic Laboratory',
  contact_direct_phone = '(703) 692-8810',
  office_name = 'Pentagon Health Clinic (DiLorenzo)',
  office_address = 'The Pentagon, Corridor 8',
  office_city = 'Washington',
  office_state = 'DC',
  office_zip = '20310',
  service_summary = 'Military health clinic serving Pentagon personnel and military leaders. Laboratory services 7 AM-4 PM weekdays. Specimen transport needs: urgent laboratory specimens from multiple Pentagon locations, high-security specimen handling, and rapid transfer to Walter Reed or regional military labs. Government procurement dominates, but emergency after-hours specimen delivery may be contracted commercially.'
WHERE organization_name ILIKE '%Pentagon Health Clinic%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Cemetery Administration',
  contact_direct_phone = '(703) 221-2183',
  office_name = 'Quantico National Cemetery',
  office_address = '18424 Joplin Road',
  office_city = 'Triangle',
  office_state = 'VA',
  office_zip = '22172',
  service_summary = 'National Cemetery facility - primarily burial/administrative, not medical. Minimal specimen transport needs. Adjacent Naval Health Clinic Quantico provides medical services. NOTE: Consider consolidating with Marine Corps Base Quantico Medical entry or removing this entry as it has minimal medical courier relevance.'
WHERE organization_name ILIKE '%Quantico National Cemetery Clinic%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services / Specimen Accessioning',
  contact_direct_phone = '(301) 295-0250',
  office_name = 'Walter Reed National Military Medical Center',
  office_address = '8955 Wood Road, Building 1',
  office_city = 'Bethesda',
  office_state = 'MD',
  office_zip = '20889',
  service_summary = 'Premier military medical center (1,050+ bed tertiary/quaternary facility) with comprehensive laboratory services 24/7. Main lab with 24-hour specimen drop-off. Specimen transport demands extreme: trauma/emergency pathology, oncology, immunology, blood bank, research specimens. Government procurement, but high-volume STAT specimen delivery often uses commercial courier backup.'
WHERE organization_name ILIKE '%Walter Reed National Military%' AND entity = 'vitalx';

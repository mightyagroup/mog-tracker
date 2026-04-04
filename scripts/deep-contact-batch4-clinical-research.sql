-- BATCH 4: Clinical Research / Biotech (16 organizations)
-- Deep contact research for VitalX commercial leads

UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(206) 279-7444',
  office_name = 'Adaptive Biotechnologies - Headquarters',
  office_address = '1551 Eastlake Avenue E Suite 200',
  office_city = 'Seattle',
  office_state = 'WA',
  office_zip = '98102',
  service_summary = 'Adaptive Biotechnologies develops immune-driven diagnostics and therapeutics including clonoSEQ and T-Detect platforms. VitalX can support DMV-area clinical trial sites and physician offices with specimen collection logistics and temperature-controlled transport of blood samples to Adaptive processing labs.'
WHERE organization_name ILIKE '%Adaptive Biotechnologies%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Manufacturing and Operations',
  contact_direct_phone = '(240) 631-3200',
  office_name = 'Emergent BioSolutions - Gaithersburg Campus',
  office_address = '400 Professional Drive Suite 400',
  office_city = 'Gaithersburg',
  office_state = 'MD',
  office_zip = '20879',
  service_summary = 'Emergent BioSolutions is a life sciences company focused on biodefense and public health threats with major Gaithersburg and Baltimore facilities. VitalX can provide HIPAA-compliant specimen and biological sample transport between their Maryland manufacturing sites, research labs, and clinical testing partners.'
WHERE organization_name ILIKE '%Emergent BioSolutions%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Research Operations',
  contact_direct_phone = '(301) 398-5400',
  office_name = 'Precigen (formerly Intrexon/GenVec) - Germantown',
  office_address = '20374 Seneca Meadows Parkway',
  office_city = 'Germantown',
  office_state = 'MD',
  office_zip = '20876',
  service_summary = 'Precigen (formerly Intrexon, which acquired GenVec) develops gene therapy and synthetic biology products at their Germantown MD facility. VitalX can provide specialized courier services for biological specimens, gene therapy materials, and research samples between their lab and clinical partners in the DMV.'
WHERE organization_name ILIKE '%GenVec%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Research Operations',
  contact_direct_phone = '(301) 961-2400',
  office_name = 'GSK (formerly Human Genome Sciences) - Rockville',
  office_address = '14200 Shady Grove Road',
  office_city = 'Rockville',
  office_state = 'MD',
  office_zip = '20850',
  service_summary = 'GSK acquired Human Genome Sciences and maintains research operations in Rockville. VitalX can provide clinical trial specimen transport, biological sample courier, and research logistics services between GSK Rockville and DMV-area hospitals and clinical trial sites.'
WHERE organization_name ILIKE '%Human Genome Sciences%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Trial Services',
  contact_direct_phone = '(919) 998-2000',
  office_name = 'IQVIA - Durham Headquarters',
  office_address = '4820 Emperor Boulevard',
  office_city = 'Durham',
  office_state = 'NC',
  office_zip = '27703',
  service_summary = 'IQVIA is a global CRO managing thousands of clinical trials with investigator sites across the DMV. VitalX can provide HIPAA-compliant specimen courier services for clinical trial sites, biorepository transport, and investigational drug delivery across the DC, Maryland, and Virginia region.'
WHERE organization_name ILIKE '%IQVIA%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Health Solutions and Logistics',
  contact_direct_phone = '(800) 682-9701',
  office_name = 'Leidos Health - Reston Corporate',
  office_address = '1750 Presidents Street',
  office_city = 'Reston',
  office_state = 'VA',
  office_zip = '20190',
  service_summary = 'Leidos operates biomedical research labs in Frederick MD and health IT solutions from Reston VA. VitalX can provide specimen transport between their Frederick biomedical research facility, NIH campus, and DMV clinical partners. Strong overlap with federal health contracts.'
WHERE organization_name ILIKE '%Leidos%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(301) 398-0000',
  office_name = 'AstraZeneca (MedImmune) - Gaithersburg',
  office_address = '1 MedImmune Way',
  office_city = 'Gaithersburg',
  office_state = 'MD',
  office_zip = '20878',
  service_summary = 'AstraZeneca Gaithersburg (formerly MedImmune) is a major biologics R&D campus with clinical trial operations. VitalX can provide temperature-controlled specimen transport, clinical trial sample logistics, and biological material courier between their campus, DMV hospitals, and research sites.'
WHERE organization_name ILIKE '%MedImmune%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Operations',
  contact_direct_phone = '(513) 579-9911',
  office_name = 'Medpace Holdings - Headquarters',
  office_address = '5375 Medpace Way',
  office_city = 'Cincinnati',
  office_state = 'OH',
  office_zip = '45227',
  service_summary = 'Medpace is a full-service CRO providing Phase I-IV clinical trial management. VitalX can serve as DMV-region specimen courier for Medpace-managed trial sites, providing rapid turnaround on clinical sample transport to central and specialty labs.'
WHERE organization_name ILIKE '%Medpace%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Manufacturing and Supply Chain',
  contact_direct_phone = '(240) 268-2000',
  office_name = 'Novavax - Gaithersburg Headquarters',
  office_address = '21 Firstfield Road',
  office_city = 'Gaithersburg',
  office_state = 'MD',
  office_zip = '20878',
  service_summary = 'Novavax is a biotechnology company headquartered in Gaithersburg developing protein-based vaccines. VitalX can provide temperature-controlled courier services for biological specimens, vaccine samples, and clinical trial materials between their campus and DMV clinical sites.'
WHERE organization_name ILIKE '%Novavax%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Early Phase Clinical Operations',
  contact_direct_phone = '(919) 654-6600',
  office_name = 'PAREXEL International - Baltimore Clinical Unit',
  office_address = '2001 Market Center Boulevard',
  office_city = 'Raleigh',
  office_state = 'NC',
  office_zip = '27607',
  service_summary = 'PAREXEL is a global CRO with early-phase clinical pharmacology units in Baltimore. VitalX can provide specimen courier services between PAREXEL Baltimore clinical units, DMV investigator sites, and central labs for their Phase I-IV trials.'
WHERE organization_name ILIKE '%PAREXEL%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Services',
  contact_direct_phone = '(919) 456-5600',
  office_name = 'PPD (Thermo Fisher Scientific) - Rockville Lab',
  office_address = '929 N Front Street',
  office_city = 'Wilmington',
  office_state = 'NC',
  office_zip = '28401',
  service_summary = 'PPD (now Thermo Fisher) is a leading CRO with laboratory operations near the DMV including Rockville. VitalX can provide clinical trial specimen transport, bioanalytical sample courier, and research logistics between PPD labs and DMV-area trial sites.'
WHERE organization_name ILIKE '%PPD%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Research Operations',
  contact_direct_phone = '(919) 314-5512',
  office_name = 'Precision BioSciences - Headquarters',
  office_address = '302 East Pettigrew Street Suite A-100',
  office_city = 'Durham',
  office_state = 'NC',
  office_zip = '27701',
  service_summary = 'Precision BioSciences develops gene editing therapies using their ARCUS platform. VitalX can provide specialized courier services for biological specimens, gene therapy samples, and clinical trial materials from DMV-area clinical sites to their processing facilities.'
WHERE organization_name ILIKE '%Precision BioSciences%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Operations',
  contact_direct_phone = '(240) 715-5906',
  office_name = 'Primoris Life Sciences - Germantown',
  office_address = '20251 Century Boulevard Suite 200',
  office_city = 'Germantown',
  office_state = 'MD',
  office_zip = '20874',
  service_summary = 'Primoris Life Sciences provides bioanalytical and clinical trial laboratory services in Germantown MD. VitalX can provide specimen transport between their Germantown lab, DMV clinical trial sites, and healthcare facilities requiring specialized bioanalytical testing.'
WHERE organization_name ILIKE '%Primoris%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Corporate Operations',
  contact_direct_phone = '(301) 961-3400',
  office_name = 'Sucampo (Mallinckrodt) - Former Bethesda HQ',
  office_address = '805 King Farm Boulevard Suite 550',
  office_city = 'Rockville',
  office_state = 'MD',
  office_zip = '20850',
  service_summary = 'Sucampo Pharmaceuticals (acquired by Mallinckrodt in 2018) was a specialty pharma company based in Bethesda developing GI therapeutics. VitalX can provide clinical trial specimen transport and pharmaceutical logistics for any ongoing research or post-acquisition clinical programs in the DMV.'
WHERE organization_name ILIKE '%Sucampo%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Clinical Development',
  contact_direct_phone = '(919) 876-9300',
  office_name = 'Syneos Health - Headquarters',
  office_address = '1030 Sync Street',
  office_city = 'Morrisville',
  office_state = 'NC',
  office_zip = '27560',
  service_summary = 'Syneos Health is a biopharmaceutical solutions company combining CRO and commercial capabilities. VitalX can serve as the DMV-region specimen courier partner for Syneos-managed clinical trials, providing HIPAA-compliant transport from investigator sites to central labs.'
WHERE organization_name ILIKE '%Syneos%' AND entity = 'vitalx';

UPDATE commercial_leads SET
  contact_department = 'Laboratory Standards and Operations',
  contact_direct_phone = '(301) 881-0666',
  office_name = 'US Pharmacopeia (USP) - Rockville Headquarters',
  office_address = '12601 Twinbrook Parkway',
  office_city = 'Rockville',
  office_state = 'MD',
  office_zip = '20852',
  service_summary = 'USP sets pharmaceutical quality standards and operates reference standard labs in Rockville. VitalX can provide specimen and reference material transport between USP headquarters, their testing facilities, and pharmaceutical companies and labs across the DMV region.'
WHERE organization_name ILIKE '%US Pharmacopeia%' AND entity = 'vitalx';

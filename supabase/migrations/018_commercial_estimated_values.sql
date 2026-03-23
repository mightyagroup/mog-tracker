-- Populate estimated_annual_value for commercial leads that don't have it set
UPDATE commercial_leads
SET estimated_annual_value = CASE
  WHEN service_category = 'Hospital Systems'        THEN 120000
  WHEN service_category = 'VA/Military Healthcare'  THEN 100000
  WHEN service_category = 'Reference Labs'          THEN 60000
  WHEN service_category = 'Clinical Research/Biotech' THEN 60000
  WHEN service_category = 'NEMT Brokers'            THEN 50000
  WHEN service_category = 'Blood Banks'             THEN 35000
  WHEN service_category = 'Pharmacy/Specialty'      THEN 30000
  WHEN service_category = 'Home Health'             THEN 25000
  WHEN service_category = 'Urgent Care/Outpatient'  THEN 15000
  WHEN service_category = 'DNA/Drug Testing'        THEN 20000
  ELSE 40000
END
WHERE estimated_annual_value IS NULL;

# Bid Template Tokenization Audit

**Generated:** 2026-04-25 23:36:52

**Status:** All 14 Phase 1 templates + 1 Phase 2 SIF reference verified to contain real `{{TOKEN}}` placeholders. Counts independently re-verified after generation by re-opening each docx/xlsx and counting tokens via regex `{{[A-Z_0-9]+}}`.

## How to Re-Verify

```bash
python3 -c "
import os, re
from docx import Document
import openpyxl
OUT = 'src/lib/bid-templates/tokenized'
TOK = re.compile(r'\{\{[A-Z_0-9]+\}\}')
for f in sorted(os.listdir(OUT)):
    if f.endswith('.docx'):
        d = Document(os.path.join(OUT, f))
        text = ' '.join(p.text for p in d.paragraphs)
        for t in d.tables:
            for row in t.rows:
                for cell in row.cells:
                    text += ' ' + cell.text
        print(f, len(TOK.findall(text)))"
```

## Phase 1 Bid Starter Templates (14 docs, generated when solicitation uploaded)

| File | Source | Tokens (total / unique) | Notes |
|---|---|---|---|
| 01_Contract_Intel_Sheet.docx | Tokenized from Ella sample | 33 / 30 | Internal |
| 02_USASpending_Deep_Dive.docx | Tokenized from Ella sample | 42 / 23 | Internal |
| 03_Wage_Determination.docx | Built fresh | 16 / 13 | Internal — DOL wage extract + SCA disclaimer |
| 04a_Proposal_Pricing.docx | Tokenized from Ella sample (was 04) | 30 / 18 | Internal — pricing narrative |
| 04b_Proposal_Technical.docx | Built fresh | 33 / 24 | Internal — technical narrative skeleton |
| 05_Subcontractor_Scope_of_Work.docx | Tokenized from Ella sample | 13 / 13 | SANITIZED — goes to subs (no agency/sol#) |
| 06_Sub_Outreach_Email.docx | Built fresh | 22 / 14 | SANITIZED — cold outreach email to subs |
| 07_Subcontractor_Search.docx | Tokenized from Ella sample | 14 / 13 | Internal — VA's main working tool |
| 08_Tracker_Workbook.xlsx | Built fresh | 21 / 21 | Internal — multi-sheet bid tracker |
| 09_To_Do_List.docx | Built fresh | 9 / 9 | Internal — step-by-step bid execution |
| 10_Risk_Log.docx | Built fresh | 14 / 6 | Internal — risk register |
| 11_Contract_Summary.docx | Tokenized from Ella sample | 16 / 13 | Internal — bid one-pager |
| 12_Game_Plan.docx | Built fresh | 26 / 26 | Internal — strategic approach |
| 13_Submission_Checklist.docx | Tokenized from Ella sample | 18 / 14 | Internal — pre-submission gate |

## Phase 2 Reference Template

| File | Source | Tokens (total / unique) | Notes |
|---|---|---|---|
| 14_SIF_Subcontractor_Information_Form.docx | Tokenized from SOBERS sample | 32 / 27 | SANITIZED — per-sub form (Phase 2) |

## Per-File Token Inventory

### 01_Contract_Intel_Sheet.docx

- `{{CLIN_0001_DESCRIPTION}}` — string from solicitation_parser: CLIN 0001 description (base period)
- `{{CLIN_OY1_DESCRIPTION}}` — string from solicitation_parser: CLIN Option Year 1 description
- `{{CLIN_OY2_DESCRIPTION}}` — string from solicitation_parser: CLIN Option Year 2 description
- `{{CLIN_OY3_DESCRIPTION}}` — string from solicitation_parser: CLIN Option Year 3 description
- `{{CLIN_OY4_DESCRIPTION}}` — string from solicitation_parser: CLIN Option Year 4 description
- `{{CO_EMAIL}}` — string from solicitation_parser: Contracting Officer email
- `{{CO_NAME}}` — string from solicitation_parser: Contracting Officer name
- `{{CO_PHONE}}` — string from solicitation_parser: Contracting Officer phone
- `{{KO_CONTACT_SPECIALIST_EMAIL}}` — string from solicitation_parser: Contract specialist email
- `{{KO_CONTACT_SPECIALIST_NAME}}` — string from solicitation_parser: Contract specialist name
- `{{SOL_AGENCY}}` — string from solicitation_parser: Agency name (e.g., U.S. Army Corps of Engineers)
- `{{SOL_AMENDMENT_PENDING}}` — string from solicitation_parser: Amendment status placeholder
- `{{SOL_BASE_PERIOD}}` — string from solicitation_parser: Base period of performance
- `{{SOL_EVALUATION_METHOD}}` — string from solicitation_parser: Evaluation method (e.g., LPTA, Best Value)
- `{{SOL_NAICS_DESCRIPTION}}` — string from solicitation_parser: NAICS description
- `{{SOL_NAICS}}` — string from solicitation_parser: NAICS code
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_OPTION_YEARS}}` — string from solicitation_parser: Option years description
- `{{SOL_PLACE_OF_PERFORMANCE}}` — string from solicitation_parser: Place of performance (full)
- `{{SOL_RESEARCH_PENDING}}` — string from solicitation_parser: Research pending placeholder
- `{{SOL_RESPONSE_DEADLINE}}` — string from solicitation_parser: Response deadline (full)
- `{{SOL_SET_ASIDE}}` — string from solicitation_parser: Set-aside type
- `{{SOL_SITE_1}}` — string from solicitation_parser: Specific site 1 (internal only)
- `{{SOL_SITE_2}}` — string from solicitation_parser: Specific site 2 (internal only)
- `{{SOL_SITE_3}}` — string from solicitation_parser: Specific site 3 (internal only)
- `{{SOL_SUBMISSION_METHOD}}` — string from solicitation_parser: How to submit
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title
- `{{WAGE_DETERMINATION_LOCATION}}` — string from solicitation_parser: WD locality
- `{{WAGE_DETERMINATION_NUMBER}}` — string from solicitation_parser: WD number (e.g., WD 2015-4373 Rev 32)
- `{{WAGE_EQUIVALENT_RATES}}` — string from solicitation_parser: Equivalent WG rates

### 02_USASpending_Deep_Dive.docx

- `{{COMPETITIVE_ASSESSMENT_TABLE}}` — block from usaspending_lookup: Competitive assessment table
- `{{ENTITY_NAME}}` — string from entity_data.legalName: Legal entity name (e.g., "Exousia Solutions LLC")
- `{{ENTITY_PAST_PERFORMANCE_AREA}}` — string from entity_data.pastPerformance[0].scope: Domain of past performance
- `{{ENTITY_PAST_PERFORMANCE_NOTE}}` — string from entity_data.pastPerformance[0]: Brief past performance reference
- `{{ESTIMATE_HIGH_RANGE}}` — string from usaspending_lookup: High-end value estimate
- `{{ESTIMATE_MID_RANGE}}` — string from usaspending_lookup: Mid-range value estimate
- `{{SOL_FACILITY_NAME}}` — string from solicitation_parser: Specific federal facility (internal docs only)
- `{{SOL_LOCATION_CITY}}` — string from solicitation_parser: City of performance
- `{{SOL_LOCATION_STATE_ABBREV}}` — string from solicitation_parser: State abbreviation
- `{{SOL_LOCATION_STATE}}` — string from solicitation_parser: State of performance (full name)
- `{{SOL_NAICS}}` — string from solicitation_parser: NAICS code
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title
- `{{TARGET_PRICE_RANGE}}` — string from usaspending_lookup: Target bid price range
- `{{TEAMING_PARTNER_LOCATION}}` — string from manual: Teaming partner location
- `{{TEAMING_PARTNER_NAME}}` — string from manual: Teaming partner full name
- `{{TEAMING_PARTNER_SHORT}}` — string from manual: Teaming partner short name
- `{{WAGE_BASE_JANITOR}}` — string from solicitation_parser: Janitor base hourly rate
- `{{WAGE_DETERMINATION_NUMBER}}` — string from solicitation_parser: WD number (e.g., WD 2015-4373 Rev 32)
- `{{WAGE_FRINGE_EO13706}}` — string from solicitation_parser: Fringe under EO 13706
- `{{WAGE_FRINGE}}` — string from solicitation_parser: Fringe benefit rate
- `{{WAGE_RATES_TABLE}}` — block from solicitation_parser: Wage rates table (block placeholder)
- `{{WIN_PROBABILITY_RANGE}}` — string from usaspending_lookup: Estimated win probability

### 03_Wage_Determination.docx

- `{{ENTITY_NAME}}` — string from entity_data.legalName: Legal entity name (e.g., "Exousia Solutions LLC")
- `{{SOL_AGENCY}}` — string from solicitation_parser: Agency name (e.g., U.S. Army Corps of Engineers)
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_PLACE_OF_PERFORMANCE}}` — string from solicitation_parser: Place of performance (full)
- `{{SOL_SUB_AGENCY}}` — string from solicitation_parser: Sub-agency / district (e.g., Wilmington District)
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title
- `{{TODAY_DATE}}` — date from computed: Today YYYY-MM-DD
- `{{WAGE_DETERMINATION_LOCATION}}` — string from solicitation_parser: WD locality
- `{{WAGE_DETERMINATION_NUMBER}}` — string from solicitation_parser: WD number (e.g., WD 2015-4373 Rev 32)
- `{{WAGE_DETERMINATION_REVISION_DATE}}` — string from solicitation_parser: WD revision date
- `{{WAGE_FRINGE_EO13706}}` — string from solicitation_parser: Fringe under EO 13706
- `{{WAGE_FRINGE}}` — string from solicitation_parser: Fringe benefit rate
- `{{WAGE_RATES_TABLE}}` — block from solicitation_parser: Wage rates table (block placeholder)

### 04a_Proposal_Pricing.docx

- `{{ENTITY_CAGE}}` — string from entity_data.cageCode: CAGE code (5-char DLA ID)
- `{{ENTITY_NAME}}` — string from entity_data.legalName: Legal entity name (e.g., "Exousia Solutions LLC")
- `{{ENTITY_PHONE}}` — string from entity_data.phone: Phone number
- `{{ENTITY_SAM_EMAIL}}` — string from entity_data.samEmail: SAM.gov registered admin email
- `{{ENTITY_UEI}}` — string from entity_data.uei: Unique Entity Identifier (12-char SAM.gov ID)
- `{{LABOR_BREAKDOWN_TABLE}}` — block from solicitation_parser: Labor breakdown table
- `{{SOL_AGENCY_ABBREV}}` — string from solicitation_parser: Agency abbreviation (e.g., USACE)
- `{{SOL_CLIN_TABLE}}` — block from solicitation_parser: CLIN-based pricing table — generator builds rows
- `{{SOL_LOCATION_CITY_STATE}}` — string from solicitation_parser: City, State
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_PERFORMANCE_START_DATE}}` — string from solicitation_parser: Performance start date
- `{{SOL_PLACE_OF_PERFORMANCE}}` — string from solicitation_parser: Place of performance (full)
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title
- `{{SUPPLIES_MONTHLY_RANGE}}` — string from manual: Monthly supplies cost range
- `{{TEAMING_PARTNER_SHORT}}` — string from manual: Teaming partner short name
- `{{TODAY_DATE}}` — date from computed: Today YYYY-MM-DD
- `{{WAGE_DETERMINATION_LOCATION}}` — string from solicitation_parser: WD locality
- `{{WAGE_DETERMINATION_NUMBER}}` — string from solicitation_parser: WD number (e.g., WD 2015-4373 Rev 32)

### 04b_Proposal_Technical.docx

- `{{ENTITY_CAGE}}` — string from entity_data.cageCode: CAGE code (5-char DLA ID)
- `{{ENTITY_NAME}}` — string from entity_data.legalName: Legal entity name (e.g., "Exousia Solutions LLC")
- `{{ENTITY_PROPOSAL_LEAD_TITLE}}` — string from entity_data.proposalLeadTitle: Proposal lead title
- `{{ENTITY_PROPOSAL_LEAD}}` — string from entity_data.proposalLead: Proposal lead name (e.g., "Emmanuela Wireko-Brobbey")
- `{{ENTITY_UEI}}` — string from entity_data.uei: Unique Entity Identifier (12-char SAM.gov ID)
- `{{SECTION_L_M_CROSSWALK_TABLE}}` — block from solicitation_parser: Section L/M cross-walk for technical proposal
- `{{SOL_BASE_PERIOD}}` — string from solicitation_parser: Base period of performance
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_OPTION_YEARS}}` — string from solicitation_parser: Option years description
- `{{SOL_PLACE_OF_PERFORMANCE}}` — string from solicitation_parser: Place of performance (full)
- `{{SOL_SCOPE_SUMMARY}}` — string from solicitation_parser: 1-paragraph scope summary
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title
- `{{SOL_WORK_LOCATIONS}}` — string from solicitation_parser: Work locations bulleted
- `{{TECHNICAL_EQUIPMENT_NARRATIVE}}` — string from ai_drafted: Equipment narrative
- `{{TECHNICAL_MANAGEMENT_NARRATIVE}}` — string from ai_drafted: Management narrative
- `{{TECHNICAL_PAST_PERFORMANCE_NARRATIVE}}` — string from entity_data: Past performance narrative
- `{{TECHNICAL_QC_NARRATIVE}}` — string from entity_data: QC narrative (uses entity boilerplate)
- `{{TECHNICAL_SAFETY_NARRATIVE}}` — string from entity_data: Safety narrative (uses entity boilerplate)
- `{{TECHNICAL_SCHEDULE_NARRATIVE}}` — string from ai_drafted: Schedule narrative
- `{{TECHNICAL_SERVICE_DELIVERY_NARRATIVE}}` — string from ai_drafted: Service delivery narrative
- `{{TECHNICAL_STAFFING_NARRATIVE}}` — string from ai_drafted: Staffing narrative
- `{{TECHNICAL_SUBCONTRACTOR_NARRATIVE}}` — string from ai_drafted: Subcontractor approach narrative
- `{{TECHNICAL_TRANSITION_NARRATIVE}}` — string from ai_drafted: Transition narrative
- `{{TODAY_DATE}}` — date from computed: Today YYYY-MM-DD

### 05_Subcontractor_Scope_of_Work.docx

- `{{ENTITY_NAME}}` — string from entity_data.legalName: Legal entity name (e.g., "Exousia Solutions LLC")
- `{{ENTITY_PHONE}}` — string from entity_data.phone: Phone number
- `{{ENTITY_PROPOSAL_LEAD}}` — string from entity_data.proposalLead: Proposal lead name (e.g., "Emmanuela Wireko-Brobbey")
- `{{ENTITY_PUBLIC_EMAIL}}` — string from entity_data.publicEmail: Public-facing email (info@ or sales@)
- `{{RETURN_BY_DATE_FRIENDLY}}` — string from computed: Sub return-by friendly format
- `{{SOL_BASE_PERIOD_FRIENDLY}}` — string from solicitation_parser: Base period in friendly date format
- `{{SOL_FINAL_PERFORMANCE_END_DATE}}` — string from solicitation_parser: Final end date including options
- `{{SOL_GENERIC_LOCATION}}` — string from solicitation_parser: OPSEC-safe location (city/state only)
- `{{SOL_GENERIC_PROJECT_AREA}}` — string from solicitation_parser: OPSEC-safe project area
- `{{SOL_LOCATION_CITY_STATE_ZIP}}` — string from solicitation_parser: City, State ZIP
- `{{SOL_WORK_SITE_1}}` — string from solicitation_parser: Sub-facing work site 1 (sanitized)
- `{{SOL_WORK_SITE_2}}` — string from solicitation_parser: Sub-facing work site 2 (sanitized)
- `{{SOL_WORK_SITE_3}}` — string from solicitation_parser: Sub-facing work site 3 (sanitized)

### 06_Sub_Outreach_Email.docx

- `{{ENTITY_NAME}}` — string from entity_data.legalName: Legal entity name (e.g., "Exousia Solutions LLC")
- `{{ENTITY_PHONE}}` — string from entity_data.phone: Phone number
- `{{ENTITY_PROPOSAL_LEAD_TITLE}}` — string from entity_data.proposalLeadTitle: Proposal lead title
- `{{ENTITY_PROPOSAL_LEAD}}` — string from entity_data.proposalLead: Proposal lead name (e.g., "Emmanuela Wireko-Brobbey")
- `{{ENTITY_PUBLIC_EMAIL}}` — string from entity_data.publicEmail: Public-facing email (info@ or sales@)
- `{{RETURN_BY_DATE_FRIENDLY}}` — string from computed: Sub return-by friendly format
- `{{SOL_BASE_PERIOD_FRIENDLY}}` — string from solicitation_parser: Base period in friendly date format
- `{{SOL_FINAL_PERFORMANCE_END_DATE}}` — string from solicitation_parser: Final end date including options
- `{{SOL_GENERIC_LOCATION}}` — string from solicitation_parser: OPSEC-safe location (city/state only)
- `{{SOL_LOCATION_STATE}}` — string from solicitation_parser: State of performance (full name)
- `{{SOL_PERFORMANCE_START_DATE}}` — string from solicitation_parser: Performance start date
- `{{SOL_SCOPE_GENERIC_DESCRIPTION}}` — string from solicitation_parser: OPSEC-safe scope (no agency/sol#)
- `{{SUB_FIRST_NAME}}` — string from subcontractor_search: Sub primary first name (for greeting)
- `{{SUB_SOW_TITLE}}` — string from solicitation_parser: Brief SOW title (e.g., "Mowing Services")

### 07_Subcontractor_Search.docx

- `{{NEAREST_REGIONAL_HUB_MIN}}` — string from solicitation_parser: Distance to nearest hub in minutes
- `{{REGIONAL_HUB_CITY}}` — string from solicitation_parser: Regional hub city
- `{{RETURN_BY_DATE_SHORT}}` — string from computed: Sub return-by short format
- `{{SOL_AGENCY}}` — string from solicitation_parser: Agency name (e.g., U.S. Army Corps of Engineers)
- `{{SOL_BASE_PERIOD_RANGE}}` — string from solicitation_parser: Base period as month/year range
- `{{SOL_LOCATION_CITY_STATE}}` — string from solicitation_parser: City, State
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_PLACE_OF_PERFORMANCE}}` — string from solicitation_parser: Place of performance (full)
- `{{SOL_RESPONSE_DEADLINE_FRIENDLY}}` — string from solicitation_parser: Response deadline in friendly format
- `{{SUB_CANDIDATES_BLOCK_2}}` — block from subcontractor_search: Subcontractor candidates table 2
- `{{SUB_CANDIDATES_BLOCK_3}}` — block from subcontractor_search: Subcontractor candidates table 3
- `{{SUB_CANDIDATES_BLOCK_4}}` — block from subcontractor_search: Subcontractor candidates table 4
- `{{SUB_CANDIDATES_BLOCK}}` — block from subcontractor_search: Subcontractor candidates table 1

### 08_Tracker_Workbook.xlsx

- `{{ADDITIONAL_RISKS_BLOCK}}` — block from manual: Additional risks (manual fill)
- `{{COMPLIANCE_MATRIX_BLOCK}}` — block from solicitation_parser: Section L/M compliance items
- `{{ENTITY_PROPOSAL_LEAD}}` — string from entity_data.proposalLead: Proposal lead name (e.g., "Emmanuela Wireko-Brobbey")
- `{{SOL_AGENCY}}` — string from solicitation_parser: Agency name (e.g., U.S. Army Corps of Engineers)
- `{{SOL_BASE_PERIOD}}` — string from solicitation_parser: Base period of performance
- `{{SOL_CLIN_TABLE}}` — block from solicitation_parser: CLIN-based pricing table — generator builds rows
- `{{SOL_CONTRACT_TYPE}}` — string from solicitation_parser: Contract type (FFP, T&M, IDIQ, etc.)
- `{{SOL_ESTIMATED_VALUE}}` — number from solicitation_parser: Estimated contract value
- `{{SOL_NAICS_DESCRIPTION}}` — string from solicitation_parser: NAICS description
- `{{SOL_NAICS}}` — string from solicitation_parser: NAICS code
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_OPTION_YEARS}}` — string from solicitation_parser: Option years description
- `{{SOL_PLACE_OF_PERFORMANCE}}` — string from solicitation_parser: Place of performance (full)
- `{{SOL_RESPONSE_DEADLINE}}` — string from solicitation_parser: Response deadline (full)
- `{{SOL_SET_ASIDE}}` — string from solicitation_parser: Set-aside type
- `{{SOL_SUB_AGENCY}}` — string from solicitation_parser: Sub-agency / district (e.g., Wilmington District)
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title
- `{{SUB_CANDIDATES_BLOCK}}` — block from subcontractor_search: Subcontractor candidates table 1
- `{{TARGET_PRICE_RANGE}}` — string from usaspending_lookup: Target bid price range
- `{{TODAY_DATE}}` — date from computed: Today YYYY-MM-DD
- `{{WALK_AWAY_PRICE}}` — string from manual: Walk-away floor price

### 09_To_Do_List.docx

- `{{ENTITY_PROPOSAL_LEAD}}` — string from entity_data.proposalLead: Proposal lead name (e.g., "Emmanuela Wireko-Brobbey")
- `{{RETURN_BY_DATE_FRIENDLY}}` — string from computed: Sub return-by friendly format
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_REQUIRED_LICENSE_NAME}}` — string from solicitation_parser: Single primary required license
- `{{SOL_RESPONSE_DEADLINE_FRIENDLY}}` — string from solicitation_parser: Response deadline in friendly format
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title
- `{{TODAY_DATE}}` — date from computed: Today YYYY-MM-DD
- `{{TODO_OPEN_ITEMS_BLOCK}}` — block from manual: Open todo items (manual fill)
- `{{WAGE_DETERMINATION_NUMBER}}` — string from solicitation_parser: WD number (e.g., WD 2015-4373 Rev 32)

### 10_Risk_Log.docx

- `{{ADDITIONAL_RISKS_BLOCK}}` — block from manual: Additional risks (manual fill)
- `{{CLOSED_RISKS_BLOCK}}` — block from manual: Closed risks (manual fill)
- `{{ENTITY_PROPOSAL_LEAD}}` — string from entity_data.proposalLead: Proposal lead name (e.g., "Emmanuela Wireko-Brobbey")
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title
- `{{TODAY_DATE}}` — date from computed: Today YYYY-MM-DD

### 11_Contract_Summary.docx

- `{{CO_EMAIL}}` — string from solicitation_parser: Contracting Officer email
- `{{ENTITY_NAME_UPPER}}` — string from entity_data.legalName.toUpperCase(): Legal entity name in uppercase
- `{{SOL_AGENCY}}` — string from solicitation_parser: Agency name (e.g., U.S. Army Corps of Engineers)
- `{{SOL_BASE_PERIOD_FRIENDLY}}` — string from solicitation_parser: Base period in friendly date format
- `{{SOL_FACILITY_AND_LOCATION}}` — string from solicitation_parser: Facility name + location
- `{{SOL_FINAL_PERFORMANCE_END_DATE}}` — string from solicitation_parser: Final end date including options
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_RESPONSE_DEADLINE_FRIENDLY}}` — string from solicitation_parser: Response deadline in friendly format
- `{{SOL_SITE_1}}` — string from solicitation_parser: Specific site 1 (internal only)
- `{{SOL_SITE_2}}` — string from solicitation_parser: Specific site 2 (internal only)
- `{{SOL_SITE_3}}` — string from solicitation_parser: Specific site 3 (internal only)
- `{{SOL_SUB_AGENCY}}` — string from solicitation_parser: Sub-agency / district (e.g., Wilmington District)
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title

### 12_Game_Plan.docx

- `{{COMPETITIVE_POSITIONING_NARRATIVE}}` — string from manual: Competitive positioning narrative
- `{{DIFFERENTIATOR_1}}` — string from manual: Differentiator 1
- `{{DIFFERENTIATOR_2}}` — string from manual: Differentiator 2
- `{{DIFFERENTIATOR_3}}` — string from manual: Differentiator 3
- `{{ENTITY_PROPOSAL_LEAD}}` — string from entity_data.proposalLead: Proposal lead name (e.g., "Emmanuela Wireko-Brobbey")
- `{{GAME_PLAN_RATIONALE}}` — string from manual: Game plan rationale
- `{{MARGIN_ASSUMPTION}}` — string from manual: Margin assumption
- `{{PRICING_APPROACH}}` — string from manual: Pricing approach
- `{{PRIMARY_LOSS_RISK}}` — string from usaspending_lookup: Primary loss risk
- `{{PRIMARY_WIN_DRIVER}}` — string from usaspending_lookup: Primary win driver
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_RESPONSE_DEADLINE_FRIENDLY}}` — string from solicitation_parser: Response deadline in friendly format
- `{{SOL_TITLE}}` — string from solicitation_parser: Solicitation title
- `{{TARGET_PRICE_RANGE}}` — string from usaspending_lookup: Target bid price range
- `{{TEAMING_LOI_STATUS}}` — string from manual: LOI status
- `{{TEAMING_PARTNER_BACKUP}}` — string from manual: Backup teaming partner
- `{{TEAMING_PARTNER_NAME}}` — string from manual: Teaming partner full name
- `{{TEAMING_PARTNER_ROLE}}` — string from manual: Teaming partner role
- `{{TEAMING_STRATEGY_NARRATIVE}}` — string from manual: Teaming strategy narrative
- `{{TODAY_DATE}}` — date from computed: Today YYYY-MM-DD
- `{{TOP_RISK_1}}` — string from manual: Top risk 1
- `{{TOP_RISK_2}}` — string from manual: Top risk 2
- `{{TOP_RISK_3}}` — string from manual: Top risk 3
- `{{WALK_AWAY_PRICE}}` — string from manual: Walk-away floor price
- `{{WIN_PROBABILITY_CONFIDENCE}}` — string from usaspending_lookup: Confidence level
- `{{WIN_PROBABILITY_RANGE}}` — string from usaspending_lookup: Estimated win probability

### 13_Submission_Checklist.docx

- `{{CO_EMAIL}}` — string from solicitation_parser: Contracting Officer email
- `{{ENTITY_NAME}}` — string from entity_data.legalName: Legal entity name (e.g., "Exousia Solutions LLC")
- `{{ENTITY_PUBLIC_EMAIL}}` — string from entity_data.publicEmail: Public-facing email (info@ or sales@)
- `{{KO_CONTACT_SPECIALIST_EMAIL}}` — string from solicitation_parser: Contract specialist email
- `{{SOL_AMENDMENT_CHECK_DATE}}` — string from solicitation_parser: Last amendment check date
- `{{SOL_CLIN_COUNT}}` — number from solicitation_parser: Number of CLINs
- `{{SOL_NUMBER}}` — string from solicitation_parser: Solicitation number (e.g., W912BV26QA047)
- `{{SOL_PRICING_TOTAL_FORMATTED_SHORT}}` — string from pricing_calculator: Total formatted short
- `{{SOL_PRICING_TOTAL_FORMATTED}}` — string from pricing_calculator: Total formatted with cents
- `{{SOL_RESPONSE_DEADLINE_FRIENDLY}}` — string from solicitation_parser: Response deadline in friendly format
- `{{SUB_LICENSE_EXPIRY}}` — string from subcontractor_search: Sub license expiry
- `{{SUB_LICENSE_FILE}}` — string from subcontractor_search: Sub license filename
- `{{SUB_LICENSE_NAME}}` — string from subcontractor_search: Sub license name
- `{{SUB_NAME}}` — string from subcontractor_search: Sub company short name

### 14_SIF_Subcontractor_Information_Form.docx

- `{{ENTITY_NAME_UPPER}}` — string from entity_data.legalName.toUpperCase(): Legal entity name in uppercase
- `{{ENTITY_NAME}}` — string from entity_data.legalName: Legal entity name (e.g., "Exousia Solutions LLC")
- `{{ENTITY_PHONE}}` — string from entity_data.phone: Phone number
- `{{ENTITY_SAM_EMAIL}}` — string from entity_data.samEmail: SAM.gov registered admin email
- `{{INSURANCE_AUTO_REQ}}` — string from solicitation_parser: Auto liability requirement
- `{{INSURANCE_GL_REQ}}` — string from solicitation_parser: General liability requirement
- `{{INSURANCE_WORKERS_COMP_REQ}}` — string from solicitation_parser: Workers' comp requirement
- `{{RETURN_BY_DATE_FRIENDLY}}` — string from computed: Sub return-by friendly format
- `{{SOL_CONTRACT_TERM_DESCRIPTION}}` — string from solicitation_parser: Contract term description
- `{{SOL_GENERIC_AREA_1}}` — string from solicitation_parser: OPSEC-safe area 1
- `{{SOL_GENERIC_LOCATION}}` — string from solicitation_parser: OPSEC-safe location (city/state only)
- `{{SOL_GENERIC_WORK_AREAS}}` — string from solicitation_parser: OPSEC-safe list of work areas
- `{{SOL_NAICS_DESCRIPTION}}` — string from solicitation_parser: NAICS description
- `{{SOL_NAICS}}` — string from solicitation_parser: NAICS code
- `{{SOL_REQUIRED_LICENSE_AUTHORITY}}` — string from solicitation_parser: Issuing authority for required license
- `{{SOL_REQUIRED_LICENSE_NAME}}` — string from solicitation_parser: Single primary required license
- `{{SOL_SCOPE_GENERIC_DESCRIPTION}}` — string from solicitation_parser: OPSEC-safe scope (no agency/sol#)
- `{{SOL_SEASON_RANGE}}` — string from solicitation_parser: Mowing/peak season range
- `{{SOL_SIZE_STANDARD}}` — string from solicitation_parser: SBA size standard
- `{{SOL_WORK_HOURS}}` — string from solicitation_parser: Allowed work hours
- `{{SUB_COMPANY_NAME}}` — string from subcontractor_search: Sub legal company name
- `{{SUB_CONTACT_NAME}}` — string from subcontractor_search: Sub primary contact
- `{{SUB_EMAIL}}` — string from subcontractor_search: Sub email
- `{{SUB_FIRST_NAME}}` — string from subcontractor_search: Sub primary first name (for greeting)
- `{{SUB_PHONE}}` — string from subcontractor_search: Sub phone
- `{{SUB_SOW_TITLE}}` — string from solicitation_parser: Brief SOW title (e.g., "Mowing Services")
- `{{TODAY_MONTH_YEAR}}` — string from computed: Month and Year (e.g., April 2026)

## OPSEC Verification (Sub-Facing Documents)

Per `PHASE_1_HANDOFF.md` Rule 1, sub-facing docs (05, 06, 14_SIF) MUST NOT contain:
- `SOL_NUMBER`
- `SOL_AGENCY`
- `SOL_SUB_AGENCY`
- `SOL_NOTICE_ID`
- `SOL_SAM_URL`
- `SOL_ESTIMATED_VALUE`
- `SOL_INCUMBENT_CONTRACTOR`
- Any `CO_*` token

### Result:

- PASS: `05_Subcontractor_Scope_of_Work.docx` — no forbidden tokens
- PASS: `06_Sub_Outreach_Email.docx` — no forbidden tokens
- PASS: `14_SIF_Subcontractor_Information_Form.docx` — no forbidden tokens

**Overall OPSEC verification: PASS**

## Token Source Categories

| Source | Count | Description |
|---|---|---|
| `address-protocol Culpeper` | 1 | |
| `address-protocol.addressFor(docType)` | 1 | |
| `ai_drafted` | 7 | |
| `computed` | 7 | |
| `entity_data` | 3 | |
| `entity_data.cageCode` | 1 | |
| `entity_data.certifications` | 1 | |
| `entity_data.legalName` | 1 | |
| `entity_data.legalName.toUpperCase()` | 1 | |
| `entity_data.naicsCodes[primary]` | 1 | |
| `entity_data.pastPerformance[0]` | 1 | |
| `entity_data.pastPerformance[0].scope` | 1 | |
| `entity_data.phone` | 1 | |
| `entity_data.proposalLead` | 1 | |
| `entity_data.proposalLeadTitle` | 1 | |
| `entity_data.publicEmail` | 1 | |
| `entity_data.samEmail` | 1 | |
| `entity_data.uei` | 1 | |
| `manual` | 22 | |
| `pricing_calculator` | 2 | |
| `solicitation_parser` | 106 | |
| `subcontractor_search` | 13 | |
| `usaspending_lookup` | 10 | |

## Block Placeholders

Block placeholders are special — the doc generator expands them into tables or multi-paragraph blocks rather than a single text replacement.

| Placeholder | Source | Description |
|---|---|---|
| `{{ADDITIONAL_RISKS_BLOCK}}` | manual | Additional risks (manual fill) |
| `{{CLOSED_RISKS_BLOCK}}` | manual | Closed risks (manual fill) |
| `{{COMPETITIVE_ASSESSMENT_TABLE}}` | usaspending_lookup | Competitive assessment table |
| `{{COMPLIANCE_MATRIX_BLOCK}}` | solicitation_parser | Section L/M compliance items |
| `{{LABOR_BREAKDOWN_TABLE}}` | solicitation_parser | Labor breakdown table |
| `{{PRIOR_AWARDS_TABLE}}` | usaspending_lookup | Prior awards from USASpending |
| `{{SECTION_L_M_CROSSWALK_TABLE}}` | solicitation_parser | Section L/M cross-walk for technical proposal |
| `{{SOL_CLIN_TABLE}}` | solicitation_parser | CLIN-based pricing table — generator builds rows |
| `{{SUB_CANDIDATES_BLOCK}}` | subcontractor_search | Subcontractor candidates table 1 |
| `{{SUB_CANDIDATES_BLOCK_2}}` | subcontractor_search | Subcontractor candidates table 2 |
| `{{SUB_CANDIDATES_BLOCK_3}}` | subcontractor_search | Subcontractor candidates table 3 |
| `{{SUB_CANDIDATES_BLOCK_4}}` | subcontractor_search | Subcontractor candidates table 4 |
| `{{TODO_OPEN_ITEMS_BLOCK}}` | manual | Open todo items (manual fill) |
| `{{WAGE_RATES_TABLE}}` | solicitation_parser | Wage rates table (block placeholder) |

## Files Excluded From Phase 1

Phase 3 (Final Submission) templates (15-19) and Phase 4 (Master Subcontract Agreement) templates (20-25) live in `source/` only and are NOT tokenized in this pass. They will be tokenized when their respective phases ship.
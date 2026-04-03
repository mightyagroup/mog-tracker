/**
 * Proposal Generation - Module Index
 *
 * Centralized exports for the proposal generation system.
 * This module provides:
 *
 * Government Proposals (all entities):
 *   - generateProposalPackage() - Full 6-document government bid package
 *   - generateCapabilityStatement() - Single entity capability statement
 *
 * Commercial Proposals (VitalX):
 *   - generateCommercialProposalPackage() - 3-document commercial prospect package
 *
 * Entity Data:
 *   - getEntityData() - Entity-specific boilerplate, branding, and credentials
 *   - EXOUSIA_DATA, VITALX_DATA, IRONHOUSE_DATA - Direct access to entity data
 *
 * Document Types Generated:
 *
 * Government (per bid):
 *   1. Cover Letter - Formal submission letter with credentials table
 *   2. Technical Proposal - Title page, company overview, technical approach,
 *      management plan, safety, QC, and authorization sections
 *   3. Past Performance - Reference tables per past performance entry
 *   4. Compliance Certifications - FAR/DFARS representations
 *   5. Quality Control Plan - Inspection methods, documentation, corrective action
 *   6. Pricing Worksheet - CLIN table placeholder
 *   7. Capability Statement - Marketing one-pager (optional)
 *
 * Commercial (per prospect):
 *   1. Service Proposal - Sales document with tailored service descriptions,
 *      operations plan, compliance overview, and implementation timeline
 *   2. Service Level Agreement - Performance metrics, escalation, remedies
 *   3. Pricing Summary - Per-trip and flat-rate templates with volume discounts
 *   4. Capability Statement - VitalX marketing one-pager (shared with gov)
 */

// Government proposal generation
export {
  generateProposalPackage,
  generateCapabilityStatement,
  type ProposalInput,
} from './generate-proposal'

// Commercial proposal generation
export {
  generateCommercialProposalPackage,
  type CommercialProposalInput,
} from './generate-commercial-proposal'

// Entity data and types
export {
  getEntityData,
  EXOUSIA_DATA,
  VITALX_DATA,
  IRONHOUSE_DATA,
  type EntityProposalData,
} from './entity-data'

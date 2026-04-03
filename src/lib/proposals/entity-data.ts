/**
 * Entity-specific data for proposal generation.
 * All company information, boilerplate, certifications, and past performance
 * references used across proposals for each MOG entity.
 *
 * Server-side only.
 */

export interface EntityProposalData {
  companyName: string
  legalName: string
  brandColors: { primary: string; accent: string; light: string }
  tagline: string | null
  uei: string | null
  cageCode: string | null
  samEmail: string | null
  publicEmail: string
  phone: string | null
  website: string | null
  address: string
  naicsCodes: { code: string; description: string; primary?: boolean }[]
  certifications: string[]
  managingMember: string
  managingTitle: string
  proposalLead: string
  proposalLeadTitle: string
  companyOverview: string
  shortDescription: string
  teamingStatement: string
  pastPerformance: PastPerformanceRef[]
  complianceStatements: string[]
  safetyBoilerplate: string
  qualityControlBoilerplate: string
  managementApproachBoilerplate: string
  keyPersonnel: KeyPerson[]
}

export interface PastPerformanceRef {
  client: string
  prime: string | null
  role: string
  period: string
  scope: string
  impact: string
  contactName: string
  contactPhone: string
  contactEmail: string
}

export interface KeyPerson {
  role: string
  name: string
  responsibility: string
}

// ── EXOUSIA SOLUTIONS LLC ────────────────────────────────────────────────────

export const EXOUSIA_DATA: EntityProposalData = {
  companyName: 'Exousia Solutions',
  legalName: 'Exousia Solutions LLC',
  brandColors: { primary: '#253A5E', accent: '#D4AF37', light: '#F9F9F9' },
  tagline: 'Trust. Honor. Execute.',
  uei: 'XNZ2KYQYK566',
  cageCode: '0ENQ3',
  samEmail: 'admin@exousiaofficial.com',
  publicEmail: 'info@exousias.com',
  phone: null,
  website: null,
  address: '[Business Address]',
  naicsCodes: [
    { code: '561720', description: 'Janitorial Services' },
    { code: '561730', description: 'Landscaping Services', primary: true },
    { code: '561210', description: 'Facilities Support Services' },
    { code: '541614', description: 'Process, Physical Distribution, and Logistics Consulting Services' },
    { code: '541611', description: 'Administrative Management and General Management Consulting Services' },
    { code: '561110', description: 'Office Administrative Services' },
    { code: '237310', description: 'Highway, Street, and Bridge Construction' },
  ],
  certifications: [
    'Woman-Owned Small Business (WOSB)',
    'Small Business (SBA)',
    'Virginia SWaM Certified',
    'SAM.gov Active Registration',
  ],
  managingMember: 'Emmanuela Wireko-Brobbey',
  managingTitle: 'Managing Member',
  proposalLead: 'Emmanuela Wireko-Brobbey',
  proposalLeadTitle: 'Managing Member',
  companyOverview: `Exousia Solutions LLC is a compliance-driven facility management and government contracting company providing integrated services to federal agencies and state and local governments. Headquartered in the Washington, D.C. metropolitan area, Exousia Solutions delivers janitorial services, landscaping, facilities support, cybersecurity compliance consulting, and administrative support services.

As a certified Woman-Owned Small Business (WOSB) and Virginia SWaM firm, Exousia operates as a prime contractor and strategically teams with qualified subcontractors, including IronHouse Janitorial & Landscaping Services LLC, to deliver full-scope facility contracts efficiently and compliantly. Our teaming approach allows us to combine management oversight and compliance expertise with experienced on-site labor, ensuring quality performance across all contract requirements.`,

  shortDescription: 'Compliance-driven facility management and government contracting — janitorial, landscaping, facilities support, and consulting services for federal, state, and local agencies.',

  teamingStatement: `Exousia Solutions LLC teams with IronHouse Janitorial & Landscaping Services LLC to provide comprehensive facilities services. As prime contractor, Exousia provides overall contract management, compliance oversight, quality control, invoicing, and Government interface. IronHouse provides dedicated on-site labor, equipment, and operational execution under Exousia's management and compliance framework.`,

  pastPerformance: [
    {
      client: 'U.S. Securities and Exchange Commission (SEC)',
      prime: 'Zvolvant Solutions LLC / General Dynamics Information Technology (GDIT)',
      role: 'Subcontractor — Procurement and Compliance Support',
      period: 'Ongoing',
      scope: 'Federal cybersecurity compliance support including compliance documentation management, quality assurance for federal operations, and coordination with government representatives.',
      impact: 'Demonstrated ability to meet strict federal standards, maintain detailed records, and support multi-layered federal compliance requirements.',
      contactName: '[Available Upon Request]',
      contactPhone: '[Available Upon Request]',
      contactEmail: '[Available Upon Request]',
    },
    {
      client: 'IronHouse Janitorial & Landscaping Services LLC (Teaming Partner)',
      prime: null,
      role: 'Teaming Partner — On-Site Facilities Operations',
      period: '21+ years of experience',
      scope: 'Comprehensive grounds maintenance, janitorial services, and facilities support for Fairfax County Public Schools and commercial facilities throughout Virginia and Maryland.',
      impact: 'Over two decades of consistent, reliable facilities operations performance across institutional and commercial environments.',
      contactName: 'Nana Badu',
      contactPhone: '[Available Upon Request]',
      contactEmail: '[Available Upon Request]',
    },
  ],

  complianceStatements: [
    'Exousia Solutions LLC certifies that it is not an inverted domestic corporation as defined in 6 CFR Part 1002 and is not a subsidiary of such a corporation.',
    'Exousia Solutions LLC certifies that it has no delinquent federal tax liability that has been assessed and for which all judicial and administrative remedies have been exhausted or have lapsed.',
    'Exousia Solutions LLC certifies that no principal of the firm has been convicted of a felony criminal violation under any federal law within the preceding 24 months.',
    'Exousia Solutions LLC will comply with all Service Contract Labor Standards (SCA) requirements as applicable, including payment of prevailing wages and fringe benefits.',
    'Exousia Solutions LLC will comply with all E-Verify requirements under 8 U.S.C. Section 1324a, ensuring that all employees and subcontractors are authorized to work in the United States.',
    'Exousia Solutions LLC will ensure that all assigned personnel complete Department of Homeland Security Antiterrorism Level I training within thirty (30) days of contract award.',
    'Exousia Solutions LLC certifies compliance with DFARS 252.204-7018 regarding covered defense telecommunications equipment or services.',
  ],

  safetyBoilerplate: `Exousia Solutions LLC maintains full compliance with EM 385-1-1 (Safety and Health Requirements) and OSHA standards (29 CFR 1910/1926). All crew members are equipped with and required to wear appropriate personal protective equipment (PPE) including hard hats, steel-toe safety boots, Class III high-visibility vests, eye protection, and hearing protection as site conditions require.

Prior to commencement of any work, Exousia Solutions will prepare and submit an Activity Hazard Analysis (AHA) and Activity Proposal Package (APP) identifying potential hazards and mitigation measures. Weekly safety meetings will be conducted with all crew members. All personnel will maintain current CPR/First Aid certifications. A designated Safety Officer will conduct daily site inspections and maintain safety documentation.`,

  qualityControlBoilerplate: `Exousia Solutions LLC implements a comprehensive Quality Control Plan (QCP) for all contract performance. The designated Quality Control contact will oversee all operations and coordinate with the Contracting Officer's Representative (COR).

Quality control measures include: pre-work inspections before each service period, in-progress monitoring during all operations, post-completion inspections with photographic documentation, a daily contractor log documenting work completed, hours expended, equipment used, and any observed site conditions, weekly performance reports submitted to the COR, and immediate corrective action procedures for any deficiencies identified.

All work is subject to 100% Government inspection. Exousia Solutions maintains documentation of all quality control activities and makes records available to the Government upon request.`,

  managementApproachBoilerplate: `Exousia Solutions LLC will serve as the prime contractor providing overall contract management, compliance oversight, invoicing, and Government interface. IronHouse Janitorial & Landscaping Services LLC will serve as the subcontractor providing on-site labor and equipment.

A designated Program Manager will serve as the single point of contact for all contract communications. The Program Manager will conduct a pre-work meeting with the Contracting Officer's Representative (COR) prior to contract start to establish communication protocols, reporting requirements, and performance standards.

A dedicated Quality Control Inspector will be present during all service operations to ensure compliance with contract requirements and maintain quality documentation. Weekly coordination calls with the COR will be conducted to review performance, address concerns, and plan upcoming activities.`,

  keyPersonnel: [
    { role: 'Program Manager', name: 'Emmanuela Wireko-Brobbey', responsibility: 'Overall contract management, compliance oversight, Government interface, invoicing, and quality assurance.' },
    { role: 'Site Superintendent', name: 'Nana Badu', responsibility: 'On-site operations management, crew supervision, equipment coordination, and daily activity reporting.' },
    { role: 'Quality Control Inspector', name: '[To Be Designated]', responsibility: 'Pre-work and post-completion inspections, photographic documentation, safety compliance monitoring, and corrective action implementation.' },
  ],
}

// ── VITALX LLC ───────────────────────────────────────────────────────────────

export const VITALX_DATA: EntityProposalData = {
  companyName: 'VitalX',
  legalName: 'VitalX LLC',
  brandColors: { primary: '#064E3B', accent: '#06A59A', light: '#F0FDFA' },
  tagline: 'Care Without Delay.',
  uei: null, // Not yet registered
  cageCode: null,
  samEmail: null,
  publicEmail: 'info@thevitalx.com',
  phone: '(571) 622-9133',
  website: 'www.thevitalx.com',
  address: '[Business Address]',
  naicsCodes: [
    { code: '492110', description: 'Couriers and Express Delivery Services', primary: true },
    { code: '492210', description: 'Local Messengers and Local Delivery' },
    { code: '621511', description: 'Medical Laboratories' },
    { code: '621610', description: 'Home Health Care Services' },
    { code: '485991', description: 'Special Needs Transportation' },
    { code: '485999', description: 'All Other Transit and Ground Passenger Transportation' },
    { code: '561990', description: 'All Other Support Services' },
  ],
  certifications: [
    'HIPAA Compliant Operations',
    'Chain-of-Custody Certified Processes',
    'DOT Compliance (applicable services)',
    'OSHA Compliant',
  ],
  managingMember: 'Emmanuela Wireko-Brobbey',
  managingTitle: 'Founder & Managing Member',
  proposalLead: 'Emmanuela Wireko-Brobbey',
  proposalLeadTitle: 'Founder & Managing Member',
  companyOverview: `VitalX LLC is a HIPAA-compliant healthcare logistics company specializing in medical courier services, specimen transport, pharmacy delivery, and healthcare supply chain solutions in the Washington, D.C. metropolitan area (DMV region).

VitalX provides time-sensitive, temperature-controlled, chain-of-custody-verified logistics services to hospitals, laboratories, pharmacies, clinical research organizations, and government healthcare facilities. Every delivery is tracked in real time with digital proof of delivery, timestamped chain-of-custody documentation, and audit-ready compliance records.

Our operations are built on a compliance-first framework: HIPAA-compliant handling procedures, Business Associate Agreements (BAAs) with all clients, background-checked and trained couriers, and secure transport protocols for biological specimens, pharmaceuticals, and protected health information.`,

  shortDescription: 'HIPAA-compliant healthcare logistics — medical courier, specimen transport, pharmacy delivery, and supply chain services for hospitals, labs, and healthcare providers in the DMV region.',

  teamingStatement: `VitalX LLC operates as a direct service provider for all healthcare logistics engagements. For government contracts requiring expanded capabilities, VitalX teams with Exousia Solutions LLC for compliance management and administrative support, and with IronHouse Janitorial & Landscaping Services LLC for facility-based service components.`,

  pastPerformance: [
    {
      client: 'VitalX Commercial Operations',
      prime: null,
      role: 'Direct Service Provider',
      period: 'Current Operations',
      scope: 'Medical courier and specimen transport services including time-sensitive biological specimen delivery, pharmacy medication delivery, medical records transport, and laboratory supply chain logistics.',
      impact: 'Established operational framework with HIPAA-compliant processes, real-time tracking systems, and chain-of-custody documentation meeting healthcare industry standards.',
      contactName: '[Available Upon Request]',
      contactPhone: '[Available Upon Request]',
      contactEmail: '[Available Upon Request]',
    },
  ],

  complianceStatements: [
    'VitalX LLC maintains full HIPAA compliance for all protected health information (PHI) handling, transport, and storage operations.',
    'VitalX LLC executes Business Associate Agreements (BAAs) with all clients as required under HIPAA regulations.',
    'All VitalX couriers undergo comprehensive background checks, drug screening, and HIPAA privacy and security training prior to deployment.',
    'VitalX LLC maintains chain-of-custody documentation for all specimen and pharmaceutical transport, with digital timestamps, temperature monitoring, and proof of delivery records.',
    'VitalX LLC will comply with all E-Verify requirements under 8 U.S.C. Section 1324a.',
    'VitalX LLC maintains appropriate insurance coverage including general liability, professional liability, automobile liability, and cargo insurance.',
  ],

  safetyBoilerplate: `VitalX LLC maintains comprehensive safety protocols for all healthcare logistics operations. All couriers are trained in proper handling of biological specimens, hazardous materials (DOT compliant), temperature-sensitive pharmaceuticals, and protected health information.

Safety measures include: universal precautions and PPE for specimen handling, spill containment kits in all transport vehicles, temperature monitoring equipment for cold-chain compliance, secure lockboxes for PHI transport, GPS-tracked vehicles with real-time monitoring, and emergency response protocols for specimen incidents.

All personnel maintain current certifications in Bloodborne Pathogens, OSHA Hazard Communication, HIPAA Privacy and Security, and defensive driving.`,

  qualityControlBoilerplate: `VitalX LLC implements a comprehensive Quality Management System (QMS) for all healthcare logistics operations. Quality metrics include on-time delivery rates, specimen integrity rates, temperature compliance for cold-chain deliveries, and client satisfaction scores.

Quality control measures include: pre-route vehicle and equipment inspections, real-time GPS tracking with automated alerts, digital chain-of-custody verification at every handoff point, temperature logs for all climate-controlled deliveries, post-delivery confirmation with digital proof of delivery, weekly performance dashboards for all active clients, and monthly quality review meetings.

All quality records are maintained for a minimum of six (6) years in compliance with healthcare record retention requirements.`,

  managementApproachBoilerplate: `VitalX LLC provides direct operational management for all healthcare logistics services. A dedicated Account Manager is assigned to each client to serve as the single point of contact for service coordination, performance reporting, and issue resolution.

The Operations Manager oversees daily route planning, courier dispatch, and real-time delivery monitoring. A Compliance Officer ensures ongoing adherence to HIPAA requirements, chain-of-custody protocols, and client-specific handling procedures.

VitalX provides clients with access to a real-time tracking portal showing delivery status, estimated arrival times, and digital proof of delivery documentation. Monthly performance reports include delivery volume, on-time rates, incident reports, and compliance audit results.`,

  keyPersonnel: [
    { role: 'Founder & Managing Member', name: 'Emmanuela Wireko-Brobbey', responsibility: 'Overall company leadership, strategic direction, compliance oversight, and client relationship management.' },
    { role: 'Operations Manager', name: '[To Be Designated]', responsibility: 'Daily operations management, route planning, courier dispatch, and performance monitoring.' },
    { role: 'Compliance Officer', name: '[To Be Designated]', responsibility: 'HIPAA compliance, chain-of-custody protocol management, training, and audit preparation.' },
  ],
}

// ── IRONHOUSE JANITORIAL & LANDSCAPING SERVICES LLC ──────────────────────────

export const IRONHOUSE_DATA: EntityProposalData = {
  companyName: 'IronHouse',
  legalName: 'IronHouse Janitorial & Landscaping Services LLC',
  brandColors: { primary: '#292524', accent: '#B45309', light: '#FFFBEB' },
  tagline: null,
  uei: null,
  cageCode: null,
  samEmail: null,
  publicEmail: '[Contact Email]',
  phone: null,
  website: null,
  address: '[Business Address]',
  naicsCodes: [
    { code: '561720', description: 'Janitorial Services', primary: true },
    { code: '561730', description: 'Landscaping Services' },
    { code: '561210', description: 'Facilities Support Services' },
    { code: '562111', description: 'Solid Waste Collection' },
  ],
  certifications: [
    'Small Business',
  ],
  managingMember: 'Nana Badu',
  managingTitle: 'Owner',
  proposalLead: 'Nana Badu',
  proposalLeadTitle: 'Owner',
  companyOverview: `IronHouse Janitorial & Landscaping Services LLC is a facilities management company specializing in janitorial services, grounds maintenance, and building support operations for government and commercial clients. With over 21 years of direct facilities and grounds maintenance experience, IronHouse delivers reliable, high-quality service across institutional, commercial, and government environments.

IronHouse provides comprehensive facilities services including custodial cleaning, floor care, grounds mowing and trimming, landscaping, snow removal, pest control coordination, and general building maintenance. Our team brings extensive hands-on experience from long-term service with Fairfax County Public Schools and other institutional clients in the Virginia and Maryland region.`,

  shortDescription: 'Experienced facilities management — janitorial, landscaping, grounds maintenance, and building support services with 21+ years of operational experience.',

  teamingStatement: `IronHouse Janitorial & Landscaping Services LLC operates both independently as a prime contractor and as a teaming partner with Exousia Solutions LLC. When teaming with Exousia, IronHouse provides dedicated on-site labor, equipment, and operational execution while Exousia provides contract management, compliance oversight, and Government interface.`,

  pastPerformance: [
    {
      client: 'Fairfax County Public Schools',
      prime: null,
      role: 'Direct Service Provider',
      period: '21+ years',
      scope: 'Comprehensive facilities maintenance including custodial services, grounds maintenance, landscaping, floor care, and building support operations across multiple school facilities.',
      impact: 'Consistent, reliable performance over two decades maintaining high standards for institutional environments with strict safety and cleanliness requirements.',
      contactName: '[Available Upon Request]',
      contactPhone: '[Available Upon Request]',
      contactEmail: '[Available Upon Request]',
    },
  ],

  complianceStatements: [
    'IronHouse Janitorial & Landscaping Services LLC certifies that it is not an inverted domestic corporation as defined in 6 CFR Part 1002.',
    'IronHouse Janitorial & Landscaping Services LLC certifies no delinquent federal tax liability.',
    'IronHouse Janitorial & Landscaping Services LLC will comply with all E-Verify requirements under 8 U.S.C. Section 1324a.',
    'IronHouse Janitorial & Landscaping Services LLC will comply with all Service Contract Labor Standards (SCA) requirements as applicable.',
    'IronHouse Janitorial & Landscaping Services LLC will ensure all personnel complete required safety and antiterrorism training within specified timeframes.',
  ],

  safetyBoilerplate: `IronHouse Janitorial & Landscaping Services LLC maintains full compliance with OSHA standards (29 CFR 1910/1926) and applicable safety requirements. All crew members are equipped with appropriate personal protective equipment (PPE) including safety boots, high-visibility vests, eye protection, hearing protection, and task-specific protective gear.

All personnel maintain current certifications in applicable safety areas. Weekly safety briefings are conducted with all crew members. A daily safety checklist is completed before operations begin at each site. All equipment is inspected before each use per manufacturer and OSHA requirements.`,

  qualityControlBoilerplate: `IronHouse Janitorial & Landscaping Services LLC implements thorough quality control measures for all service operations. The Site Superintendent conducts daily inspections of completed work and maintains photographic documentation of all service activities.

Quality control includes: pre-work site assessments, in-progress monitoring, post-completion inspections, daily activity logs, and prompt corrective action for any deficiencies. All quality records are maintained and available for Government inspection.`,

  managementApproachBoilerplate: `IronHouse Janitorial & Landscaping Services LLC provides hands-on management for all facilities operations. Nana Badu, with over 21 years of facilities management experience, directly oversees all operations and serves as the primary point of contact.

Staffing levels are maintained to meet all contract requirements with trained backup personnel available for continuity of operations. Equipment maintenance schedules ensure all tools and machinery are in proper working condition for reliable performance.`,

  keyPersonnel: [
    { role: 'Owner / Operations Manager', name: 'Nana Badu', responsibility: 'Overall operations management, crew supervision, quality control, client coordination, and equipment management.' },
    { role: 'Lead Crew Supervisor', name: '[To Be Designated]', responsibility: 'On-site crew supervision, daily operations execution, and quality inspection.' },
  ],
}

// ── Entity lookup ────────────────────────────────────────────────────────────

export function getEntityData(entity: string): EntityProposalData {
  switch (entity) {
    case 'exousia': return EXOUSIA_DATA
    case 'vitalx': return VITALX_DATA
    case 'ironhouse': return IRONHOUSE_DATA
    default: return EXOUSIA_DATA
  }
}

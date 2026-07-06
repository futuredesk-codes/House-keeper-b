import { connectDB, disconnectDB } from '../config/db.js';
import Service from '../models/Service.js';

// One-time population of the Service catalogue from the content that used to
// be hardcoded across the Flutter app's 9 per-service screens, so the admin
// panel's Services section starts with real, editable copy instead of empty
// forms. Safe to re-run — skips any service whose name already exists.

function defaultMilestones(slaDays) {
  return [
    { label: 'Submitted', order: 0, expectedDays: 0 },
    { label: 'Document Verification', order: 1, expectedDays: Math.max(1, Math.round(slaDays * 0.2)) },
    { label: 'In Progress', order: 2, expectedDays: Math.max(2, Math.round(slaDays * 0.6)) },
    { label: 'Completed', order: 3, expectedDays: slaDays },
  ];
}

const SERVICES = [
  {
    name: 'Selling Property',
    category: 'NRK',
    userType: 'Non-Resident Kashmiri (NRK)',
    description: 'Sell your property quickly and at the best price with our expert team — we simplify the process for NRK/KP users from start to a successful sale.',
    slaDays: 21,
    whatWeHelp: [
      { title: 'Accurate Valuation', description: 'Get the best market price with expert valuation.' },
      { title: 'Verified Buyer Matching', description: 'We connect you with genuine and serious buyers.' },
      { title: 'Document & Paperwork', description: 'We prepare and review all sale documents.' },
      { title: 'Registration Support', description: 'Complete sale deed registration with full support.' },
      { title: 'Secure Fund Transfer', description: 'Compliant and secure transfer directly to your account.' },
    ],
    steps: [
      { title: 'Submit Property', description: 'Share property details and documents.' },
      { title: 'Verify Title', description: 'We verify ownership and documents.' },
      { title: 'Valuation', description: 'Get expert valuation and price advice.' },
    ],
    faqs: [
      { question: 'How do I list my property with Houseker Estates?', answer: 'Simply submit your property details and ownership documents through our platform. Our team will review the information and guide you through the next steps.' },
      { question: 'How is the property valuation determined?', answer: 'Our experts evaluate market trends, location, amenities and comparable properties.' },
      { question: 'How do you find potential buyers?', answer: 'We connect your property with verified buyers through our network and marketing channels.' },
      { question: 'Do you assist with legal documentation and paperwork?', answer: 'Yes, we provide complete legal documentation and registration support.' },
      { question: 'What are the charges for your property sale service?', answer: 'Charges depend on the selected package and property type.' },
    ],
    formSchema: [
      { key: 'propertyLocation', label: 'Property Location', type: 'location', required: true },
      { key: 'propertyType', label: 'Property Type', type: 'dropdown', required: true, options: ['Residential', 'Commercial', 'Land'] },
      { key: 'ownerName', label: 'Owner Full Name', type: 'text', required: true },
      { key: 'email', label: 'Email Address', type: 'text', required: true },
      { key: 'phone', label: 'Mobile Number', type: 'text', required: true },
      { key: 'country', label: 'Country of Residence', type: 'dropdown', required: true, options: ['India', 'UAE', 'USA', 'UK'] },
    ],
  },
  {
    name: 'Encroachment Check',
    category: 'NRK',
    userType: 'Non-Resident Kashmiri (NRK)',
    description: 'Ensure your property is free from unauthorized occupation or boundary encroachments with a thorough on-ground inspection and detailed report.',
    slaDays: 10,
    whatWeHelp: [
      { title: 'Boundary Verification', description: 'Inspect boundary pillars and property limits.' },
      { title: 'Unauthorized Structure Check', description: 'Detect any illegal construction or occupation.' },
      { title: 'Access Road Verification', description: 'Ensure roads and common access areas remain unobstructed.' },
      { title: 'Geo-Tagged Photo Report', description: 'Receive a detailed report with photographs and findings.' },
      { title: 'Risk Rating Assessment', description: 'Get a Low, Medium, or High risk evaluation.' },
    ],
    steps: [
      { title: 'Schedule Inspection', description: 'Request a one-time or recurring property check.' },
      { title: 'On-Site Verification', description: 'Our field agent visits and inspects the property.' },
      { title: 'Report Preparation', description: 'Photos, observations, and risk assessment are compiled.' },
    ],
    faqs: [
      { question: 'What does an encroachment check cover?', answer: 'We inspect boundary pillars, unauthorized construction, and access-road obstructions, then compile a geo-tagged photo report.' },
      { question: 'How long does an inspection take?', answer: 'Most inspections are completed and reported within 5-7 business days depending on location.' },
      { question: 'What is included in the final report?', answer: 'A detailed report with photographs, findings, and a Low/Medium/High risk rating.' },
      { question: 'Can this be done without visiting the property?', answer: 'No, our field agent must visit the site to verify boundaries and structures accurately.' },
      { question: 'What happens if encroachment is found?', answer: 'We share the findings with recommended next steps, including legal or rectification options.' },
    ],
    formSchema: [
      { key: 'propertyLocation', label: 'Property Location', type: 'location', required: true },
      { key: 'propertyType', label: 'Property Type', type: 'dropdown', required: true, options: ['Residential', 'Commercial', 'Land'] },
      { key: 'propertySubType', label: 'Property Sub Type (Optional)', type: 'dropdown', required: false, options: ['House', 'Apartment', 'Villa', 'Plot'] },
      { key: 'builtUpArea', label: 'Built-up Area', type: 'area_kanals', required: true, options: ['Sq Ft', 'Sq M'] },
      { key: 'purposeOfCheck', label: 'Purpose of Check', type: 'dropdown', required: true, options: ['Purchase', 'Sale', 'Investment', 'Legal Verification'] },
      { key: 'notes', label: 'Any Additional Notes (Optional)', type: 'long_text', required: false },
    ],
  },
  {
    name: 'Power of Attorney Assistance',
    category: 'NRK',
    userType: 'Non-Resident Kashmiri (NRK)',
    description: 'Appoint a trusted person to act on your behalf — we help you create a legally valid Power of Attorney with a verified local representative.',
    slaDays: 14,
    whatWeHelp: [
      { title: 'Authority Scope Selection', description: 'Choose the powers and limitations you want to grant.' },
      { title: 'Document Collection', description: 'We guide you on the documents required.' },
      { title: 'Draft Preparation', description: 'Our legal team drafts your POA with accuracy.' },
      { title: 'Notarisation Coordination', description: 'We coordinate with verified notaries near you.' },
      { title: 'Execution Support', description: 'End-to-end assistance until your POA is executed.' },
    ],
    steps: [
      { title: 'Request', description: 'Share basic details and your needs.' },
      { title: 'Select Scope', description: 'Define authority and limitations.' },
      { title: 'Upload Docs', description: 'Upload required identity & property documents.' },
    ],
    faqs: [
      { question: 'What is a Power of Attorney (POA)?', answer: 'A Power of Attorney is a legal document that authorizes a trusted person to act on your behalf for specific matters such as property management, legal procedures, or financial transactions.' },
      { question: 'Can I choose what powers to grant?', answer: 'Yes, you define the exact scope of authority — general or limited to specific tasks like sale, rental, or documentation.' },
      { question: 'Do you help find a notary?', answer: 'Yes, we coordinate with verified notaries near you to complete the notarisation process.' },
      { question: 'Do you assist with legal documentation and paperwork?', answer: 'Yes, we provide complete legal documentation and registration support.' },
      { question: 'How long does the process take?', answer: 'Typically 7-10 business days depending on document availability and notary scheduling.' },
    ],
    formSchema: [
      { key: 'fullName', label: 'Full Name', type: 'text', required: true },
      { key: 'email', label: 'Email Address', type: 'text', required: true },
      { key: 'phone', label: 'Mobile Number', type: 'text', required: true },
      { key: 'country', label: 'Country of Residence', type: 'dropdown', required: true, options: ['India', 'USA', 'UAE', 'UK'] },
      { key: 'poaType', label: 'Type of Power of Attorney', type: 'dropdown', required: true, options: ['General POA', 'Special POA', 'Irrevocable POA', 'Financial POA'] },
      { key: 'notes', label: 'Any Additional Notes (Optional)', type: 'long_text', required: false },
      { key: 'supportingDocument', label: 'Upload Supporting Document (Optional)', type: 'file', required: false },
    ],
  },
  {
    name: 'Foreign Remittance & Taxation',
    category: 'NRK',
    userType: 'Non-Resident Kashmiri (NRK)',
    description: 'Receive property sale proceeds or rental income securely with expert guidance on remittance, taxation, and regulatory compliance.',
    slaDays: 10,
    whatWeHelp: [
      { title: 'Sale Proceeds Remittance', description: 'Transfer property sale funds securely to your account.' },
      { title: 'Rental Income Transfers', description: 'Receive rental income through compliant channels.' },
      { title: 'Tax Calculation', description: 'Estimate TDS, taxes, and applicable deductions.' },
      { title: 'Form Filing Support', description: 'Assistance with required declarations and documentation.' },
      { title: 'Bank Coordination', description: 'Work with partner banks for smooth fund transfers.' },
    ],
    steps: [
      { title: 'Submit Property & Income Details', description: 'Provide information about your property transaction or rental income.' },
      { title: 'Review & Calculation', description: 'We calculate estimated taxes, deductions, and net proceeds.' },
      { title: 'Documentation Support', description: 'Assistance with required forms and compliance documents.' },
    ],
    faqs: [
      { question: 'Can you help with sale proceeds?', answer: 'Yes, we assist with transferring property sale proceeds through compliant channels.' },
      { question: 'Do you provide tax guidance?', answer: 'Yes, our experts calculate applicable TDS, taxes, and deductions before you transfer funds.' },
      { question: 'Can you assist with rental income transfers?', answer: 'Yes, we help you receive rental income through fully compliant banking channels.' },
      { question: "Will I know the final amount I'll receive?", answer: 'Yes, we provide a clear breakdown of taxes, deductions, and net proceeds before transfer.' },
      { question: 'Do I need to visit a bank?', answer: 'In most cases no — we coordinate directly with partner banks on your behalf.' },
    ],
    formSchema: [
      { key: 'propertyLocation', label: 'Property Location (Optional)', type: 'location', required: false },
      { key: 'propertyType', label: 'Property Type', type: 'dropdown', required: true, options: ['Residential', 'Commercial', 'Land'] },
      { key: 'transactionType', label: 'Transaction Type', type: 'dropdown', required: true, options: ['Property Purchase', 'Property Sale', 'Rental Income', 'Gift / Inheritance', 'Investment'] },
      { key: 'expectedAmount', label: 'Expected Amount', type: 'area_kanals', required: true, options: ['PKR', 'USD', 'AED', 'GBP', 'EUR'] },
      { key: 'notes', label: 'Any Additional Notes (Optional)', type: 'long_text', required: false },
    ],
  },
  {
    name: 'Revenue Paper Check & Legal Assistance',
    category: 'NRK',
    userType: 'Non-Resident Kashmiri (NRK)',
    description: 'Verify revenue records, identify discrepancies, and get expert legal support to resolve issues before any property transaction.',
    slaDays: 14,
    whatWeHelp: [
      { title: 'Jamabandi Verification', description: 'Verify ownership and land records.' },
      { title: 'Fard & Girdawari Review', description: 'Check revenue entries for accuracy and consistency.' },
      { title: 'Mutation Status Check', description: 'Confirm ownership transfers and pending mutations.' },
      { title: 'Discrepancy Identification', description: 'Detect errors, missing records, and title-chain issues.' },
      { title: 'Rectification Support', description: 'Assistance with correction and mutation applications.' },
    ],
    steps: [
      { title: 'Submit Record Details', description: 'Provide revenue document information and property details.' },
      { title: 'Official Verification', description: 'Records are cross-checked with relevant revenue offices.' },
      { title: 'Issue Analysis', description: 'Our experts identify discrepancies, risks, or missing updates.' },
    ],
    documentRequirements: ['Jamabandi', 'Girdawari', 'Fard', 'Mutation Records', 'Khasra Records'],
    faqs: [
      { question: 'Which documents can be verified?', answer: 'Jamabandi, Girdawari, Fard, Mutation Records, Khasra Records, and related revenue documents.' },
      { question: 'What happens if discrepancies are found?', answer: 'We flag every discrepancy and provide legal guidance on the correction or mutation process required.' },
      { question: 'Do you assist with mutation applications?', answer: 'Yes, we help you prepare and file mutation (Intiqal) applications with the relevant revenue office.' },
      { question: 'Can you provide legal assistance?', answer: 'Yes, we provide complete legal documentation and registration support.' },
      { question: 'What will I receive?', answer: 'A detailed verification report covering ownership status, discrepancies found, and recommended next steps.' },
    ],
    formSchema: [
      { key: 'propertyLocation', label: 'Property Location', type: 'location', required: true },
      { key: 'documentType', label: 'Document Type', type: 'dropdown', required: true, options: ['Fard (Registry Copy)', 'Jamabandi', 'Mutation (Intiqal)', 'Khata', 'Other'] },
      { key: 'documentYear', label: 'Year / Date (if known)', type: 'date', required: false },
      { key: 'khasraNumber', label: 'Khasra / Survey / Khata No. (if known)', type: 'text', required: false },
      { key: 'mouzaVillage', label: 'Mauza / Village (if known)', type: 'text', required: false },
      { key: 'notes', label: 'Any Additional Notes (Optional)', type: 'long_text', required: false },
    ],
  },
  {
    name: 'Ancestral Property Identification',
    category: 'KP',
    userType: 'Kashmiri Pandit (KP)',
    description: 'Helping Kashmiri Pandit families trace and confirm ancestral property in Kashmir using revenue records, old survey maps, and field verification.',
    slaDays: 30,
    whatWeHelp: [
      { title: 'Family Record Search', description: 'We search family names in old records and revenue registers.' },
      { title: 'Old Survey & Revenue Check', description: 'We review historic survey maps and revenue documents.' },
      { title: 'Approximate Location Mapping', description: 'We identify the likely property location on old maps.' },
      { title: 'On-Ground Field Visit', description: 'Our team verifies the site and collects local evidence.' },
      { title: 'Preliminary Property Report', description: 'You receive a summary report with findings and next steps.' },
    ],
    steps: [
      { title: 'Submit Family Details', description: 'Share basic details and your needs.' },
      { title: 'Record Search', description: 'We search records and old maps.' },
      { title: 'Field Verification', description: 'We visit the site and verify on ground.' },
    ],
    documentRequirements: ['Family name and lineage (if known)', 'Old survey number (if known)', 'Approximate village location', 'Old documents / photos (if available)'],
    faqs: [
      { question: 'How long does ancestral property identification take?', answer: 'Typically 3-4 weeks depending on record availability and the complexity of the search.' },
      { question: "What if I don't have any old documents?", answer: 'We can still search using family name, approximate village, and revenue records — documents simply speed up the process.' },
      { question: 'Is my family information kept confidential?', answer: "Yes, all information is handled with strict confidentiality and respect for your family's history." },
      { question: 'What do I receive at the end?', answer: 'A preliminary report summarizing findings, likely location, and recommended next steps for claiming or managing the property.' },
      { question: 'Do you assist with legal claims afterward?', answer: 'Yes, we can connect you with legal support for claiming or managing verified ancestral property.' },
    ],
    formSchema: [
      { key: 'fullName', label: 'Full Name', type: 'text', required: true },
      { key: 'cnicNumber', label: 'CNIC Number', type: 'text', required: true },
      { key: 'relationship', label: 'Relationship with Deceased', type: 'dropdown', required: true, options: ['Son', 'Daughter', 'Spouse', 'Sibling', 'Other'] },
      { key: 'contactNumber', label: 'Mobile Number', type: 'text', required: true },
      { key: 'deceasedName', label: "Deceased's Full Name", type: 'text', required: true },
      { key: 'deceasedCnic', label: 'CNIC Number (if known)', type: 'text', required: false },
      { key: 'dateOfDeath', label: 'Date of Death (if known)', type: 'dropdown', required: false, options: ['Before 1980', '1980–2000', '2000–2010', '2010–2020', 'After 2020'] },
      { key: 'lastResidence', label: 'Place of Residence (Last Known)', type: 'text', required: true },
      { key: 'propertyLocation', label: 'Property Location', type: 'location', required: false },
      { key: 'propertyType', label: 'Property Type', type: 'dropdown', required: false, options: ['Residential', 'Commercial', 'Land'] },
      { key: 'propertySubType', label: 'Property Sub Type (Optional)', type: 'dropdown', required: false, options: ['House', 'Apartment', 'Villa', 'Plot'] },
      { key: 'acquisitionYear', label: 'Approx. Year of Acquisition (if known)', type: 'date', required: false },
      { key: 'reference', label: 'Any Known Reference (Optional)', type: 'long_text', required: false },
      { key: 'additionalInfo', label: 'Any Additional Details About the Land', type: 'long_text', required: false },
    ],
  },
  {
    name: 'Document Procurement',
    category: 'NRK',
    userType: 'Non-Resident Kashmiri (NRK)',
    description: 'Obtain certified property and legal documents quickly through our trusted on-ground support team.',
    slaDays: 14,
    whatWeHelp: [
      { title: 'Jamabandi', description: 'Ownership and land record verification.' },
      { title: 'Girdawari', description: 'Cultivation and land usage records.' },
      { title: 'Fard', description: 'Certified extracts of revenue records.' },
      { title: 'Mutation Certificate', description: 'Verify ownership transfers and updates.' },
      { title: 'Site Plan', description: 'Official property layout and boundary documents.' },
    ],
    steps: [
      { title: 'Request a Document', description: 'Select the document type and provide available details.' },
      { title: 'Verification & Application', description: 'Our team reviews the request and applies through the relevant office.' },
      { title: 'Document Collection', description: 'Certified copies are collected from authorized authorities.' },
    ],
    documentRequirements: ['Jamabandi', 'Girdawari', 'Fard', 'Mutation Certificate', 'Site Plan'],
    faqs: [
      { question: 'What documents can Houseker procure?', answer: 'We assist with revenue records, ownership documents, mutation certificates, site plans, and more.' },
      { question: 'How long does the process take?', answer: 'Most documents are procured within 5-10 business days depending on the issuing authority.' },
      { question: 'Are the documents certified?', answer: 'Yes, all copies are certified extracts obtained directly from the relevant government office.' },
      { question: 'Can I access documents later?', answer: 'Yes, digital copies remain available in your account, and originals can be delivered on request.' },
      { question: 'Do I need to visit any office?', answer: 'No, our on-ground team handles the entire application and collection process for you.' },
    ],
    formSchema: [
      { key: 'propertyLocation', label: 'Property Location', type: 'location', required: true },
      { key: 'propertyType', label: 'Property Type', type: 'dropdown', required: true, options: ['Residential', 'Commercial', 'Land'] },
      { key: 'documentType', label: 'Select the Document You Want Us to Procure', type: 'dropdown', required: true, options: ['Fard (Registry Copy)', 'Mutation (Intiqal)', 'Jamabandi', 'NOC', 'Sale Deed', 'Other'] },
      { key: 'purposeOfDocument', label: 'Purpose of Document', type: 'dropdown', required: true, options: ['Sale', 'Purchase', 'Legal Proceedings', 'Bank Loan', 'Personal Records', 'Other'] },
      { key: 'documentYear', label: 'Year / Date (if known)', type: 'date', required: false },
      { key: 'ownerName', label: 'Owner / Applicant Name', type: 'text', required: true },
      { key: 'cnicNumber', label: 'CNIC Number', type: 'text', required: true },
      { key: 'notes', label: 'Any Known Reference (Optional)', type: 'long_text', required: false },
      { key: 'supportingDocument', label: 'Upload Supporting Document (Optional)', type: 'file', required: false },
    ],
  },
  {
    name: 'KP Sale Support',
    category: 'KP',
    userType: 'Kashmiri Pandit (KP)',
    description: 'End-to-end support for Khyber Pakhtunkhwa (KP) property sales — legal verification, documentation, and buyer coordination.',
    slaDays: 30,
    whatWeHelp: [
      { title: 'Legal Verification', description: 'Ensure legal and clear ownership before listing.' },
      { title: 'Documentation Support', description: 'Complete paperwork made easy, from sale agreement to registration.' },
      { title: 'Buyer Verification', description: 'Connect with genuine, KYC-verified buyers.' },
      { title: 'Expert Guidance', description: 'Guidance from KP property experts at every step.' },
    ],
    steps: [
      { title: 'Legal Verification', description: 'Ensure legal and clear ownership.' },
      { title: 'Documentation', description: 'Complete paperwork made easy.' },
      { title: 'Expert Assistance', description: 'Guidance from KP property experts.' },
    ],
    faqs: [
      { question: 'What support is included in KP Sale Support?', answer: 'Buyer verification, legal due diligence, sale agreement drafting, token/advance support, transfer & registration, and tax/FBR consultation.' },
      { question: 'Do I need to be physically present in KP to sell?', answer: 'No, our on-ground team can represent you throughout the sale process.' },
      { question: 'How are buyers verified?', answer: 'We conduct KYC and background checks before connecting you with any prospective buyer.' },
      { question: 'Can you help with tax and FBR matters?', answer: 'Yes, we provide guidance on applicable taxes and FBR compliance for your sale.' },
      { question: 'How long does a typical sale take?', answer: 'Timelines vary by property and buyer readiness, typically 4-8 weeks from listing to transfer.' },
    ],
    formSchema: [
      { key: 'propertyLocation', label: 'Property Location', type: 'location', required: true },
      { key: 'district', label: 'District', type: 'dropdown', required: true, options: ['Peshawar', 'Mardan', 'Swabi', 'Nowshera', 'Abbottabad', 'Mansehra', 'Other'] },
      { key: 'tehsil', label: 'Tehsil', type: 'dropdown', required: true, options: ['Peshawar City', 'Mardan City', 'Swabi City', 'Other'] },
      { key: 'propertyType', label: 'Property Type', type: 'dropdown', required: true, options: ['Residential', 'Commercial', 'Land'] },
      { key: 'plotSize', label: 'Plot / Land Size', type: 'area_kanals', required: true, options: ['Kanal', 'Sq M'] },
      { key: 'propertySubType', label: 'Property Sub Type (Optional)', type: 'dropdown', required: false, options: ['House', 'Apartment', 'Villa', 'Plot'] },
      { key: 'expectedSalePrice', label: 'Expected Sale Price (PKR)', type: 'number', required: true },
      { key: 'ownershipType', label: 'Current Ownership', type: 'dropdown', required: true, options: ['Single Owner', 'Joint Ownership', 'Legal Heir', 'Other'] },
      { key: 'isOwner', label: 'Are You the Owner?', type: 'radio', required: true, options: ['Yes, I am the owner', 'No, I am representing'] },
      { key: 'supportRequired', label: 'Type of Support Required', type: 'multiselect', required: true, options: ['Buyer Verification', 'Legal Due Diligence', 'Sale Agreement', 'Token / Advance Support', 'Transfer & Registration', 'Tax & FBR Consultation', 'Other (Please specify)'] },
      { key: 'notes', label: 'Any Additional Notes (Optional)', type: 'long_text', required: false },
    ],
  },
  {
    name: 'Joint Development',
    category: 'NRK',
    userType: 'Non-Resident Kashmiri (NRK)',
    description: 'Partner with Houseker and unlock the true value of your land — we build, you grow.',
    slaDays: 45,
    ctaLabel: 'Start Land Details',
    whatWeHelp: [
      { title: 'You Bring the Land', description: 'You retain ownership of your land.' },
      { title: 'We Handle Design, Construction & Sales', description: 'End-to-end execution by Houseker.' },
      { title: 'Transparent Partnership Model', description: 'Clear terms, shared success.' },
      { title: 'End-to-End Execution Support', description: 'From planning to project completion.' },
    ],
    steps: [
      { title: 'Submit Land Details', description: 'Share your land information with us.' },
      { title: 'Feasibility Review', description: "We evaluate the project's potential and value." },
      { title: 'Planning & Approvals', description: 'We handle design approvals and clearances.' },
    ],
    faqs: [
      { question: 'What is a Joint Development partnership?', answer: 'A Joint Development partnership allows landowners to collaborate with Houseker Estates to develop their land. You contribute the land, and we manage planning, approvals, construction, and project execution.' },
      { question: 'Do I retain ownership of my land?', answer: 'You retain ownership of your land throughout the partnership; Houseker manages planning, approvals, and construction.' },
      { question: 'What types of land are eligible for development?', answer: 'Land in Jammu & Kashmir, preferably 5+ kanals, with clear or resolvable title and residential/mixed-use potential.' },
      { question: 'How are profits or developed units shared?', answer: 'Terms are agreed upfront in a transparent partnership model before any construction begins.' },
      { question: 'Do I need to handle approvals and construction?', answer: 'No, our team manages design, approvals, construction, and sales end-to-end.' },
    ],
    formSchema: [
      { key: 'landLocation', label: 'Land Location', type: 'location', required: true },
      { key: 'district', label: 'District', type: 'dropdown', required: true, options: ['Peshawar', 'Mardan', 'Swabi', 'Nowshera', 'Abbottabad', 'Mansehra', 'Other'] },
      { key: 'tehsil', label: 'Tehsil', type: 'dropdown', required: true, options: ['Peshawar City', 'Mardan City', 'Swabi City', 'Other'] },
      { key: 'landType', label: 'Land Type', type: 'dropdown', required: true, options: ['Residential', 'Commercial', 'Agricultural', 'Industrial'] },
      { key: 'landArea', label: 'Land Area', type: 'area_kanals', required: true, options: ['Kanal', 'Marla', 'Acre', 'Sq Ft'] },
      { key: 'frontage', label: 'Frontage (Road Width)', type: 'area_kanals', required: true, options: ['Ft', 'M'] },
      { key: 'natureOfLand', label: 'Nature of Land', type: 'dropdown', required: true, options: ['Residential', 'Commercial', 'Agricultural', 'Industrial'] },
      { key: 'currentUse', label: 'Current Use', type: 'dropdown', required: true, options: ['Vacant Land', 'Cultivated', 'Under Construction', 'Factory', 'Other'] },
      { key: 'landStatus', label: 'Land Status', type: 'dropdown', required: true, options: ['Freehold', 'Leasehold', 'Inherited', 'Disputed'] },
      { key: 'zoningCategory', label: 'Zoning / Category (if any)', type: 'text', required: false },
      { key: 'isFreeFromDisputes', label: 'Is the Land Free From Disputes?', type: 'radio', required: true, options: ['Yes', 'No'] },
      { key: 'landAvailability', label: 'Land Availability', type: 'date', required: true },
      { key: 'additionalInfo', label: 'Any Additional Details About the Land', type: 'long_text', required: false },
    ],
  },
];

async function run() {
  await connectDB();

  for (const data of SERVICES) {
    const existing = await Service.findOne({ name: data.name });
    if (existing) {
      // eslint-disable-next-line no-console
      console.log(`[seed] Skipping "${data.name}" — already exists`);
      continue;
    }

    await Service.create({
      ...data,
      milestoneTemplate: defaultMilestones(data.slaDays),
    });
    // eslint-disable-next-line no-console
    console.log(`[seed] Created service: ${data.name}`);
  }

  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Failed:', err);
  process.exit(1);
});

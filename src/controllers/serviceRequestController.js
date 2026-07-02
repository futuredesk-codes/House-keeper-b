import Case from '../models/Case.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createNotification } from '../services/notificationService.js';

// Shared helper — creates a Case and fires a confirmation notification.
// Each service handler validates its own required fields, then calls this.
async function submitRequest(req, res, serviceType, displayName, submittedData, locationLabel) {
  const cas = await Case.create({
    userId: req.userId,
    serviceType,
    submittedData,
    location: { label: locationLabel || '' },
    status: 'submitted',
  });

  // Fire-and-forget — never throws
  createNotification({
    recipientType: 'user',
    userId: req.userId,
    title: 'Request Received',
    body: `Your ${displayName} request has been submitted. Case ID: ${cas.caseId}`,
    type: 'case_created',
    relatedId: cas._id,
    relatedType: 'case',
  });

  res.status(201).json({
    id: cas._id,
    caseId: cas.caseId,
    serviceType: cas.serviceType,
    status: cas.status,
    createdAt: cas.createdAt,
    message: `Your ${displayName} request has been submitted successfully.`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/user/service-requests/selling-property
// Fields: propertyLocation*, propertyType*, ownerName, email, phone, country
// ─────────────────────────────────────────────────────────────────────────────
export const submitSellingProperty = asyncHandler(async (req, res) => {
  const {
    propertyLocation, propertyType,
    ownerName, email, phone, country,
  } = req.body;

  if (!propertyLocation?.trim()) throw ApiError.badRequest('Property location is required');
  if (!propertyType?.trim()) throw ApiError.badRequest('Property type is required');

  await submitRequest(req, res, 'selling_property', 'Selling Property', {
    propertyLocation, propertyType, ownerName, email, phone, country,
  }, propertyLocation);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/user/service-requests/encroachment-check
// Fields: propertyLocation*, propertyType, propertySubType, builtUpArea,
//         areaUnit, purposeOfCheck, notes
// ─────────────────────────────────────────────────────────────────────────────
export const submitEncroachmentCheck = asyncHandler(async (req, res) => {
  const {
    propertyLocation, propertyType, propertySubType,
    builtUpArea, purposeOfCheck, notes,
  } = req.body;

  if (!propertyLocation?.trim()) throw ApiError.badRequest('Property location is required');

  await submitRequest(req, res, 'encroachment_check', 'Encroachment Check', {
    propertyLocation, propertyType, propertySubType,
    builtUpArea, purposeOfCheck, notes,
  }, propertyLocation);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/user/service-requests/poa-assistance
// Fields: fullName*, email, phone, country, notes,
//         poaType (section 2), documentUrl (optional upload)
// ─────────────────────────────────────────────────────────────────────────────
export const submitPoaAssistance = asyncHandler(async (req, res) => {
  const {
    fullName, email, phone, country, notes,
    poaType, documentUrl,
  } = req.body;

  if (!fullName?.trim()) throw ApiError.badRequest('Full name is required');

  await submitRequest(req, res, 'poa_assistance', 'Power of Attorney Assistance', {
    fullName, email, phone, country, notes, poaType, documentUrl,
  }, '');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/user/service-requests/foreign-remittance
// Fields: propertyLocation, propertyType, transactionType*, expectedAmount,
//         currency, notes
// ─────────────────────────────────────────────────────────────────────────────
export const submitForeignRemittance = asyncHandler(async (req, res) => {
  const {
    propertyLocation, propertyType, transactionType,
    expectedAmount, currency, notes,
  } = req.body;

  if (!transactionType?.trim()) throw ApiError.badRequest('Transaction type is required');

  await submitRequest(req, res, 'foreign_remittance', 'Foreign Remittance & Taxation', {
    propertyLocation, propertyType, transactionType,
    expectedAmount, currency, notes,
  }, propertyLocation || '');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. POST /api/user/service-requests/revenue-paper-check
// Fields: propertyLocation*, documentType, documentYear, khasraNumber,
//         mouzaVillage, notes
// ─────────────────────────────────────────────────────────────────────────────
export const submitRevenuePaperCheck = asyncHandler(async (req, res) => {
  const {
    propertyLocation, documentType, documentYear,
    khasraNumber, mouzaVillage, notes,
  } = req.body;

  if (!propertyLocation?.trim()) throw ApiError.badRequest('Property location is required');

  await submitRequest(req, res, 'revenue_paper_check', 'Revenue Paper Check', {
    propertyLocation, documentType, documentYear,
    khasraNumber, mouzaVillage, notes,
  }, propertyLocation);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /api/user/service-requests/ancestral-property
// Fields: fullName*, cnicNumber, relationship, contactNumber (section 1)
//         deceasedName, deceasedCnic, dateOfDeath, lastResidence (section 2)
//         propertyLocation, propertyType, propertySubType,
//         acquisitionYear, reference (section 3)
//         additionalInfo (section 4)
// ─────────────────────────────────────────────────────────────────────────────
export const submitAncestralProperty = asyncHandler(async (req, res) => {
  const {
    // Section 1 — Requester
    fullName, cnicNumber, relationship, contactNumber,
    // Section 2 — Deceased owner
    deceasedName, deceasedCnic, dateOfDeath, lastResidence,
    // Section 3 — Property
    propertyLocation, propertyType, propertySubType,
    acquisitionYear, reference,
    // Section 4
    additionalInfo,
  } = req.body;

  if (!fullName?.trim()) throw ApiError.badRequest('Full name is required');

  await submitRequest(req, res, 'ancestral_property', 'Ancestral Property Identification', {
    fullName, cnicNumber, relationship, contactNumber,
    deceasedName, deceasedCnic, dateOfDeath, lastResidence,
    propertyLocation, propertyType, propertySubType,
    acquisitionYear, reference, additionalInfo,
  }, propertyLocation || '');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. POST /api/user/service-requests/document-procurement
// Fields: propertyLocation*, propertyType (section 1)
//         documentType*, purposeOfDocument, documentYear,
//         ownerName, cnicNumber, notes (section 2)
//         documentUrl (optional upload)
// ─────────────────────────────────────────────────────────────────────────────
export const submitDocumentProcurement = asyncHandler(async (req, res) => {
  const {
    propertyLocation, propertyType,
    documentType, purposeOfDocument, documentYear,
    ownerName, cnicNumber, notes, documentUrl,
  } = req.body;

  if (!propertyLocation?.trim()) throw ApiError.badRequest('Property location is required');
  if (!documentType?.trim()) throw ApiError.badRequest('Document type is required');

  await submitRequest(req, res, 'document_procurement', 'Document Procurement', {
    propertyLocation, propertyType,
    documentType, purposeOfDocument, documentYear,
    ownerName, cnicNumber, notes, documentUrl,
  }, propertyLocation);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. POST /api/user/service-requests/kp-sale-support
// Fields: propertyLocation*, district, tehsil, propertyType,
//         plotSize, plotSizeUnit, propertySubType (section 1)
//         expectedSalePrice, ownershipType, isOwner (section 2)
//         supportRequired[] (checkboxes), notes (section 3)
// ─────────────────────────────────────────────────────────────────────────────
export const submitKpSaleSupport = asyncHandler(async (req, res) => {
  const {
    // Section 1 — Property
    propertyLocation, district, tehsil, propertyType,
    plotSize, plotSizeUnit, propertySubType,
    // Section 2 — Sale info
    expectedSalePrice, ownershipType, isOwner,
    // Section 3 — Support
    supportRequired, notes,
  } = req.body;

  if (!propertyLocation?.trim()) throw ApiError.badRequest('Property location is required');

  await submitRequest(req, res, 'kp_sale_support', 'KP Sale Support', {
    propertyLocation, district, tehsil, propertyType,
    plotSize, plotSizeUnit, propertySubType,
    expectedSalePrice, ownershipType, isOwner,
    supportRequired: Array.isArray(supportRequired) ? supportRequired : [],
    notes,
  }, propertyLocation);
});

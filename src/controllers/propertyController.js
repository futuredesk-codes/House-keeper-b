import mongoose from 'mongoose';
import Property from '../models/Property.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';

function publicProperty(p) {
  return {
    id: p._id,
    userId: p.userId,
    caseId: p.caseId,
    address: p.address,
    district: p.district,
    tehsil: p.tehsil,
    village: p.village,
    coordinates: p.coordinates,
    propertyType: p.propertyType,
    area: p.area,
    ownershipStatus: p.ownershipStatus,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

// GET /api/properties
export const listProperties = asyncHandler(async (req, res) => {
  const { userId, caseId } = req.query;
  const filter = {};

  if (userId) {
    assertValidId(userId, 'userId');
    filter.userId = userId;
  }
  if (caseId) {
    assertValidId(caseId, 'caseId');
    filter.caseId = caseId;
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Property.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Property.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicProperty), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/properties/:id
export const getProperty = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const property = await Property.findById(req.params.id);
  if (!property) throw ApiError.notFound('Property not found');
  res.json(publicProperty(property));
});

// POST /api/properties
export const createProperty = asyncHandler(async (req, res) => {
  const { userId, caseId, address, district, tehsil, village, coordinates, propertyType, area, ownershipStatus } = req.body;

  if (!userId && !caseId) throw ApiError.badRequest('userId or caseId is required');
  if (userId) assertValidId(userId, 'userId');
  if (caseId) assertValidId(caseId, 'caseId');

  const property = await Property.create({
    userId: userId || undefined,
    caseId: caseId || undefined,
    address,
    district,
    tehsil,
    village,
    coordinates,
    propertyType,
    area,
    ownershipStatus,
  });

  res.status(201).json(publicProperty(property));
});

// PATCH /api/properties/:id
export const updateProperty = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const property = await Property.findById(req.params.id);
  if (!property) throw ApiError.notFound('Property not found');

  const { address, district, tehsil, village, coordinates, propertyType, area, ownershipStatus } = req.body;
  if (address !== undefined) property.address = address;
  if (district !== undefined) property.district = district;
  if (tehsil !== undefined) property.tehsil = tehsil;
  if (village !== undefined) property.village = village;
  if (coordinates !== undefined) property.coordinates = coordinates;
  if (propertyType !== undefined) property.propertyType = propertyType;
  if (area !== undefined) property.area = area;
  if (ownershipStatus !== undefined) property.ownershipStatus = ownershipStatus;

  await property.save();
  res.json(publicProperty(property));
});

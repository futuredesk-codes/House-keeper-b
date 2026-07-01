import Service from '../models/Service.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';

function publicService(s) {
  return {
    id: s._id,
    name: s.name,
    category: s.category,
    userType: s.userType,
    description: s.description,
    formSchema: s.formSchema,
    milestoneTemplate: s.milestoneTemplate,
    documentRequirements: s.documentRequirements,
    slaDays: s.slaDays,
    active: s.active,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

// GET /api/services
export const listServices = asyncHandler(async (req, res) => {
  const { hasPermission } = await import('../constants/roles.js');
  const canViewAll = hasPermission(req.actor?.permissions ?? [], 'settings:manage');

  const filter = {};
  // Without manage permission, only active services are visible
  if (!canViewAll || req.query.all !== 'true') filter.active = true;

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Service.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Service.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicService), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/services/:id
export const getService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');
  res.json(publicService(service));
});

// POST /api/services
export const createService = asyncHandler(async (req, res) => {
  const { name, category, userType, description, formSchema, milestoneTemplate, documentRequirements, slaDays } = req.body;
  if (!name || !name.trim()) throw ApiError.badRequest('Service name is required');

  const service = await Service.create({
    name: name.trim(),
    category,
    userType,
    description,
    formSchema: formSchema || [],
    milestoneTemplate: milestoneTemplate || [],
    documentRequirements: documentRequirements || [],
    slaDays,
  });

  res.status(201).json(publicService(service));
});

// PATCH /api/services/:id
export const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');

  const { name, category, userType, description, formSchema, milestoneTemplate, documentRequirements, slaDays, active } = req.body;

  if (name !== undefined) service.name = name.trim();
  if (category !== undefined) service.category = category;
  if (userType !== undefined) service.userType = userType;
  if (description !== undefined) service.description = description;
  if (formSchema !== undefined) service.formSchema = formSchema;
  if (milestoneTemplate !== undefined) service.milestoneTemplate = milestoneTemplate;
  if (documentRequirements !== undefined) service.documentRequirements = documentRequirements;
  if (slaDays !== undefined) service.slaDays = slaDays;
  if (active !== undefined) service.active = active;

  await service.save();
  res.json(publicService(service));
});

// PATCH /api/services/:id/toggle
export const toggleService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');

  service.active = !service.active;
  await service.save();
  res.json(publicService(service));
});

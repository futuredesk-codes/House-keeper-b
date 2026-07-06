import Service from '../models/Service.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { cloudinary } from '../config/cloudinary.js';

function publicService(s) {
  return {
    id: s._id,
    name: s.name,
    category: s.category,
    userType: s.userType,
    description: s.description,
    heroImage: s.heroImage,
    icon: s.icon,
    bgColor: s.bgColor,
    ctaLabel: s.ctaLabel,
    features: s.features,
    whatWeHelp: s.whatWeHelp,
    steps: s.steps,
    faqs: s.faqs,
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
// Supports ?category=NRK|KP|Other for the app's tab filter.
// Without admin manage permission, only active services are returned.
export const listServices = asyncHandler(async (req, res) => {
  const { hasPermission } = await import('../constants/roles.js');
  const canViewAll = hasPermission(req.actor?.permissions ?? [], 'settings:manage');

  const filter = {};
  if (!canViewAll || req.query.all !== 'true') filter.active = true;
  if (req.query.category && req.query.category !== 'all') {
    filter.category = new RegExp(`^${req.query.category.trim()}$`, 'i');
  }

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
  const {
    name, category, userType, description,
    heroImage, icon, bgColor, ctaLabel,
    features, whatWeHelp, steps, faqs,
    formSchema, milestoneTemplate, documentRequirements, slaDays,
  } = req.body;
  if (!name || !name.trim()) throw ApiError.badRequest('Service name is required');

  const service = await Service.create({
    name: name.trim(),
    category,
    userType,
    description,
    heroImage,
    icon,
    bgColor,
    ctaLabel,
    features: features || [],
    whatWeHelp: whatWeHelp || [],
    steps: steps || [],
    faqs: faqs || [],
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

  const {
    name, category, userType, description,
    heroImage, icon, bgColor, ctaLabel,
    features, whatWeHelp, steps, faqs,
    formSchema, milestoneTemplate, documentRequirements, slaDays, active,
  } = req.body;

  if (name !== undefined) service.name = name.trim();
  if (category !== undefined) service.category = category;
  if (userType !== undefined) service.userType = userType;
  if (description !== undefined) service.description = description;
  if (heroImage !== undefined) service.heroImage = heroImage;
  if (icon !== undefined) service.icon = icon;
  if (bgColor !== undefined) service.bgColor = bgColor;
  if (ctaLabel !== undefined) service.ctaLabel = ctaLabel;
  if (features !== undefined) service.features = features;
  if (whatWeHelp !== undefined) service.whatWeHelp = whatWeHelp;
  if (steps !== undefined) service.steps = steps;
  if (faqs !== undefined) service.faqs = faqs;
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

// Upload an image buffer to Cloudinary. Dynamic public_id per service+field so
// re-uploads replace the previous banner/icon instead of piling up.
async function uploadImageToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'houseker/services',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

// POST /api/services/:id/upload — multipart field 'file', body field 'target' = 'hero' | 'icon'
export const uploadServiceImage = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) throw ApiError.notFound('Service not found');

  if (!req.file) throw ApiError.badRequest('Image file is required');

  const target = req.body.target === 'icon' ? 'icon' : 'hero';
  const result = await uploadImageToCloudinary(req.file.buffer, `${target}_${service._id}`);

  if (target === 'icon') service.icon = result.secure_url;
  else service.heroImage = result.secure_url;

  await service.save();
  res.json(publicService(service));
});

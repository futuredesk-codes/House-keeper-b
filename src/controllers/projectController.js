import mongoose from 'mongoose';
import Project from '../models/Project.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';
import { hasPermission, PERMISSIONS } from '../constants/roles.js';
import { PROJECT_STATUSES } from '../constants/statuses.js';

function publicProject(p) {
  return {
    id: p._id,
    name: p.name,
    type: p.type,
    location: p.location,
    status: p.status,
    startingPrice: p.startingPrice,
    heroImage: p.heroImage,
    images: p.images,
    floorPlans: p.floorPlans,
    amenities: p.amenities,
    description: p.description,
    featured: p.featured,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

// GET /api/projects
export const listProjects = asyncHandler(async (req, res) => {
  const canView = req.actor && hasPermission(req.actor.permissions, PERMISSIONS.PROJECT_VIEW);
  const filter = {};

  if (!canView || req.query.all !== 'true') filter.active = true;
  if (req.query.featured === 'true') filter.featured = true;
  if (req.query.status) {
    if (!PROJECT_STATUSES.includes(req.query.status)) throw ApiError.badRequest('Invalid status');
    filter.status = req.query.status;
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [items, total] = await Promise.all([
    Project.find(filter).sort({ featured: -1, createdAt: -1 }).skip(skip).limit(limit),
    Project.countDocuments(filter),
  ]);

  res.json({ items: items.map(publicProject), meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/projects/:id
export const getProject = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found');
  res.json(publicProject(project));
});

// POST /api/projects
export const createProject = asyncHandler(async (req, res) => {
  const { name, type, location, status, startingPrice, heroImage, images, floorPlans, amenities, description } = req.body;
  if (!name || !name.trim()) throw ApiError.badRequest('Project name is required');
  if (status && !PROJECT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');

  const project = await Project.create({
    name: name.trim(),
    type,
    location,
    status: status || 'upcoming',
    startingPrice,
    heroImage: heroImage || undefined,
    images: images || [],
    floorPlans: floorPlans || [],
    amenities: amenities || [],
    description,
  });

  res.status(201).json(publicProject(project));
});

// PATCH /api/projects/:id
export const updateProject = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found');

  const { name, type, location, status, startingPrice, heroImage, images, floorPlans, amenities, description, internalNotes } = req.body;

  if (name !== undefined) project.name = name.trim();
  if (type !== undefined) project.type = type;
  if (location !== undefined) project.location = location;
  if (status !== undefined) {
    if (!PROJECT_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status');
    project.status = status;
  }
  if (startingPrice !== undefined) project.startingPrice = startingPrice;
  if (heroImage !== undefined) project.heroImage = heroImage || undefined;
  if (images !== undefined) project.images = images;
  if (floorPlans !== undefined) project.floorPlans = floorPlans;
  if (amenities !== undefined) project.amenities = amenities;
  if (description !== undefined) project.description = description;
  if (internalNotes !== undefined) project.internalNotes = internalNotes;

  await project.save();
  res.json(publicProject(project));
});

// PATCH /api/projects/:id/toggle-active
export const toggleActive = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found');

  project.active = !project.active;
  await project.save();
  res.json(publicProject(project));
});

// PATCH /api/projects/:id/toggle-featured
export const toggleFeatured = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const project = await Project.findById(req.params.id);
  if (!project) throw ApiError.notFound('Project not found');

  project.featured = !project.featured;
  await project.save();
  res.json(publicProject(project));
});

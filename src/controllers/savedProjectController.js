import mongoose from 'mongoose';
import SavedProject from '../models/SavedProject.js';
import Project from '../models/Project.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, buildPageMeta } from '../utils/paginate.js';

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
    highlights: p.highlights,
    availableOptions: p.availableOptions,
    possessionYear: p.possessionYear,
    plotDetails: p.plotDetails,
    brochure: p.brochure,
    featured: p.featured,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function assertValidId(id, label = 'id') {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid ${label}`);
}

// POST /api/user/saved-projects/:projectId/toggle
export const toggleSaveProject = asyncHandler(async (req, res) => {
  assertValidId(req.params.projectId, 'project id');

  const project = await Project.findOne({ _id: req.params.projectId, active: true });
  if (!project) throw ApiError.notFound('Project not found');

  const existing = await SavedProject.findOneAndDelete({ userId: req.userId, projectId: project._id });
  if (existing) {
    return res.json({ saved: false, message: 'Project removed from saved list.' });
  }

  await SavedProject.create({ userId: req.userId, projectId: project._id });
  res.json({ saved: true, message: 'Project saved.' });
});

// GET /api/user/saved-projects
export const listSavedProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { userId: req.userId };

  const [items, total] = await Promise.all([
    SavedProject.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('projectId'),
    SavedProject.countDocuments(filter),
  ]);

  const shaped = items
    .filter((entry) => entry.projectId)
    .map((entry) => ({ ...publicProject(entry.projectId), savedAt: entry.createdAt }));

  res.json({ items: shaped, meta: buildPageMeta({ page, limit, total }) });
});

// GET /api/user/saved-projects/ids
export const getSavedProjectIds = asyncHandler(async (req, res) => {
  const saved = await SavedProject.find({ userId: req.userId }).select('projectId');
  res.json({ ids: saved.map((s) => String(s.projectId)) });
});

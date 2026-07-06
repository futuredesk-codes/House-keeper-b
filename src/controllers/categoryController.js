import Category from '../models/Category.js';
import Service from '../models/Service.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hasPermission } from '../constants/roles.js';

function publicCategory(c) {
  return {
    id: c._id,
    name: c.name,
    active: c.active,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// GET /api/categories
// Without admin manage permission, only active categories are returned.
export const listCategories = asyncHandler(async (req, res) => {
  const canViewAll = hasPermission(req.actor?.permissions ?? [], 'settings:manage');
  const filter = {};
  if (!canViewAll || req.query.all !== 'true') filter.active = true;

  const items = await Category.find(filter).sort({ name: 1 });
  res.json({ items: items.map(publicCategory) });
});

// POST /api/categories
export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) throw ApiError.badRequest('Category name is required');
  const trimmed = name.trim();

  const dup = await Category.findOne({ name: new RegExp(`^${trimmed}$`, 'i') });
  if (dup) throw ApiError.badRequest('A category with this name already exists');

  const category = await Category.create({ name: trimmed });
  res.status(201).json(publicCategory(category));
});

// PATCH /api/categories/:id
// Renaming cascades the new name onto every Service currently tagged with
// the old name, so the change is reflected everywhere immediately.
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const { name, active } = req.body;

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) throw ApiError.badRequest('Category name is required');
    if (trimmed.toLowerCase() !== category.name.toLowerCase()) {
      const dup = await Category.findOne({
        _id: { $ne: category._id },
        name: new RegExp(`^${trimmed}$`, 'i'),
      });
      if (dup) throw ApiError.badRequest('A category with this name already exists');

      const oldName = category.name;
      category.name = trimmed;
      await Service.updateMany({ category: oldName }, { category: trimmed });
    } else {
      category.name = trimmed;
    }
  }
  if (active !== undefined) category.active = active;

  await category.save();
  res.json(publicCategory(category));
});

// DELETE /api/categories/:id
// Hard delete is blocked while any Service still references this category —
// admin must reassign those services first (archive/deactivate is preferred).
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const inUse = await Service.countDocuments({ category: category.name });
  if (inUse > 0) {
    throw ApiError.badRequest(
      `${inUse} service${inUse === 1 ? '' : 's'} still use this category. Reassign them first.`,
    );
  }

  await category.deleteOne();
  res.json({ success: true });
});

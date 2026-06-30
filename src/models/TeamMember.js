import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, permissionsForRole } from '../constants/roles.js';
import { ACCOUNT_STATUSES } from '../constants/statuses.js';

// Admin / team / field-agent accounts. Spec 9.1 "TeamMember" + 10.1 roles.
const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },
    // Effective permissions (module:action). Defaults from role but customisable.
    permissions: { type: [String], default: [] },
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'active' },
    workload: { type: Number, default: 0 }, // count of open assignments
    rating: { type: Number, default: 0 },
    refreshTokenHash: { type: String, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

teamMemberSchema.pre('save', function assignDefaultPermissions(next) {
  if (this.isNew && (!this.permissions || this.permissions.length === 0)) {
    this.permissions = permissionsForRole(this.role);
  }
  next();
});

teamMemberSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

teamMemberSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('TeamMember', teamMemberSchema);

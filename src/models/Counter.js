import mongoose from 'mongoose';

// Atomic sequence generator for human-readable IDs (ENQ-2026-000124, HKR-CASE-2026-00045).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "enquiry:2026"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

export async function nextSequence(key) {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
}

/**
 * @param {string} prefix e.g. "ENQ"
 * @param {number} pad zero-padding width
 */
export async function generateId(prefix, pad = 6) {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`${prefix}:${year}`);
  return `${prefix}-${year}-${String(seq).padStart(pad, '0')}`;
}

export default Counter;

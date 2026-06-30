import mongoose from 'mongoose';

// Configurable service catalogue item with dynamic form schema, milestone & SLA templates.
// Spec 9.1 "Service" + 7.4 dynamic form builder.

const formFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'long_text', 'number', 'date', 'dropdown', 'multiselect',
        'file', 'image', 'video', 'checkbox', 'area_kanals', 'location'],
      required: true,
    },
    required: { type: Boolean, default: false },
    options: [String], // for dropdown/multiselect
    // Conditional logic: show this field only when another field has a value
    showWhen: {
      field: String,
      equals: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false },
);

const milestoneTemplateSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    order: { type: Number, default: 0 },
    expectedDays: { type: Number },
  },
  { _id: false },
);

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true }, // NRK / KP / Other
    userType: { type: String }, // intended audience
    description: { type: String },
    formSchema: { type: [formFieldSchema], default: [] },
    milestoneTemplate: { type: [milestoneTemplateSchema], default: [] },
    documentRequirements: { type: [String], default: [] },
    slaDays: { type: Number },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Service', serviceSchema);

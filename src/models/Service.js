import mongoose from 'mongoose';

// Configurable service catalogue item with dynamic form schema, milestone & SLA templates.
// Spec 9.1 "Service" + 7.4 dynamic form builder.

const formFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'long_text', 'number', 'date', 'dropdown', 'radio', 'multiselect',
        'file', 'image', 'video', 'checkbox', 'area_kanals', 'location'],
      required: true,
    },
    required: { type: Boolean, default: false },
    options: [String], // for dropdown/radio/multiselect
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

const featureSchema = new mongoose.Schema(
  { label: { type: String, required: true }, icon: { type: String } },
  { _id: false },
);

const whatWeHelpSchema = new mongoose.Schema(
  { title: { type: String, required: true }, description: String, icon: String },
  { _id: false },
);

const stepSchema = new mongoose.Schema(
  { title: { type: String, required: true }, description: String },
  { _id: false },
);

const faqSchema = new mongoose.Schema(
  { question: { type: String, required: true }, answer: String },
  { _id: false },
);

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true }, // NRK / KP / Other
    userType: { type: String }, // intended audience
    description: { type: String },

    // UI content fields (service detail screen)
    heroImage: { type: String }, // URL or file path for hero banner
    icon: { type: String },     // icon identifier for service list card
    bgColor: { type: String },  // icon background color
    ctaLabel: { type: String, default: 'Start Request' }, // bottom button text
    features: { type: [featureSchema], default: [] },     // top chip row
    whatWeHelp: { type: [whatWeHelpSchema], default: [] }, // "What We Help With"
    steps: { type: [stepSchema], default: [] },            // "Our 5 Steps Process"
    faqs: { type: [faqSchema], default: [] },              // "Additional Details" accordion

    formSchema: { type: [formFieldSchema], default: [] },
    milestoneTemplate: { type: [milestoneTemplateSchema], default: [] },
    documentRequirements: { type: [String], default: [] },
    slaDays: { type: Number },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Service', serviceSchema);

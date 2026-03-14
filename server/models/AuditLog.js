const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    action: { type: String, required: true, index: true },
    actor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
      role: { type: String },
      isAdmin: { type: Boolean },
      ip: { type: String },
      userAgent: { type: String },
    },
    target: {
      type: { type: String, required: true, index: true },
      id: { type: mongoose.Schema.Types.ObjectId, index: true },
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    request: {
      method: { type: String },
      path: { type: String },
      requestId: { type: String, index: true },
    },
    status: { type: String, enum: ['success', 'failure'], default: 'success', index: true },
    errorMessage: { type: String, default: null },
  },
  { versionKey: false }
);

module.exports = { name: 'AuditLog', schema: auditLogSchema };

'use strict';

const mongoose = require('mongoose');

const STATUSES = [
  'created',
  'analyzing',
  'analyzed',
  'architecture_generated',
  'deployment_ready',
  'deploying',
  'deployed',
  'failed',
];

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [120, 'Project name cannot exceed 120 characters'],
    },
    repoUrl: {
      type: String,
      required: [true, 'Repository URL is required'],
      trim: true,
      match: [/^https?:\/\/.+/, 'Repository URL must start with http:// or https://'],
    },
    repoName: {
      type: String,
      trim: true,
      default: '',
    },
    branch: {
      type: String,
      trim: true,
      default: 'main',
    },
    region: {
      type: String,
      default: 'ap-south-1',
    },
    requirements: {
      type: String,
      default: '',
      maxlength: [2000, 'Requirements cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'created',
    },
  },
  { timestamps: true }
);

// Derive repoName from repoUrl automatically
projectSchema.pre('save', function (next) {
  if (this.isModified('repoUrl') || !this.repoName) {
    try {
      const url = new URL(this.repoUrl);
      this.repoName = url.pathname.replace(/^\//, '').replace(/\.git$/, '') || this.repoUrl;
    } catch {
      this.repoName = this.repoUrl;
    }
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);

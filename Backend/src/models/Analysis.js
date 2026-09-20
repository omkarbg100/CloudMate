'use strict';

const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true, // one analysis document per project (upsert pattern)
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Repository analysis — raw summary string from FastAPI
    repositoryAnalysis: {
      type: String,
      default: null,
    },
    // Architecture — stored as parsed object (or { raw: string } fallback)
    architecture: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    requirements: {
      type: String,
      default: '',
    },
    region: {
      type: String,
      default: 'ap-south-1',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Analysis', analysisSchema);

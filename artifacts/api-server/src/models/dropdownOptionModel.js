const mongoose = require('mongoose');

const dropdownOptionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

// Ensure uniqueness per key + value combination
dropdownOptionSchema.index({ key: 1, value: 1 }, { unique: true });

module.exports = mongoose.model('DropdownOption', dropdownOptionSchema, 'dropdown_options');

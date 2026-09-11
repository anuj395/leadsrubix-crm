const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canonicalizeSource,
  matchSources,
  normalizeSource,
  getSourceRoot,
  matchLeadSourceAndCampaign
} = require('../../src/services/sourceMatcher');

test('Lead Source Dynamic Matching & Multi-Industry Isolation Suite', async (t) => {

  await t.test('Canonicalization: Generic Sources Never Corrupt Into Specific Compound Rules', () => {
    // Lead 'Website' must NEVER become 'Hospital Website' or 'Campus Website'
    const healthcareSources = ['Hospital Website', 'Practo', 'Doctor Referral', 'Emergency Walk-in'];
    assert.equal(
      canonicalizeSource('Website', healthcareSources),
      'Website',
      'Generic "Website" must remain "Website" and never be corrupted into "Hospital Website"'
    );

    const educationSources = ['Campus Website', 'Education Fair', 'Shiksha'];
    assert.equal(
      canonicalizeSource('Website', educationSources),
      'Website',
      'Generic "Website" must remain "Website" and never be corrupted into "Campus Website"'
    );

    const realEstateSources = ['99 Acres', 'Magicbricks', 'Housing.com', 'Website', 'Facebook'];
    assert.equal(
      canonicalizeSource('Website', realEstateSources),
      'Website',
      'When "Website" is registered, it must match "Website"'
    );
  });

  await t.test('Canonicalization: Case, Spacing, and Punctuation Normalization', () => {
    const registered = ['99 Acres', 'Magicbricks', 'Housing.com', 'Justdial', 'Website'];

    // Case normalization
    assert.equal(canonicalizeSource('website', registered), 'Website');
    assert.equal(canonicalizeSource('WEBSITE', registered), 'Website');
    assert.equal(canonicalizeSource('99 acres', registered), '99 Acres');

    // Punctuation and spacing normalization
    assert.equal(canonicalizeSource('99acres', registered), '99 Acres');
    assert.equal(canonicalizeSource('99-acres', registered), '99 Acres');
    assert.equal(canonicalizeSource('magic-bricks', registered), 'Magicbricks');
    assert.equal(canonicalizeSource('just-dial', registered), 'Justdial');
    assert.equal(canonicalizeSource('Just Dial', registered), 'Justdial');
  });

  await t.test('Canonicalization: Domain Root Matching', () => {
    const registered = ['Housing.com', 'Magicbricks', '99 Acres'];

    assert.equal(canonicalizeSource('housing.com', registered), 'Housing.com');
    assert.equal(canonicalizeSource('housing', registered), 'Housing.com');
    assert.equal(canonicalizeSource('Housing', registered), 'Housing.com');
  });

  await t.test('Canonicalization: Safe Prefix Match', () => {
    const registered = ['Facebook', 'Google Ads', 'LinkedIn'];

    assert.equal(canonicalizeSource('Facebook Lead Ad', registered), 'Facebook');
    assert.equal(canonicalizeSource('Google Ads Campaign 1', registered), 'Google Ads');
  });

  await t.test('Canonicalization: Empty, Null, or Unregistered Fallbacks Do NOT Hardcode Values', () => {
    const registered = ['99 Acres', 'Housing.com'];

    // Empty input must not produce hardcoded 'Website'
    assert.equal(canonicalizeSource('', registered), '', 'Empty string must return empty string');
    assert.equal(canonicalizeSource(null, registered), '', 'Null must return empty string');
    assert.equal(canonicalizeSource(undefined, registered), '', 'Undefined must return empty string');

    // Unregistered source must return untouched
    assert.equal(canonicalizeSource('Custom Portal XYZ', registered), 'Custom Portal XYZ');
  });

  await t.test('MatchSources: Substring Safety for Generic Tokens', () => {
    // Generic token in cleanLead must NOT match compound cleanRule
    assert.equal(
      matchSources('Website', 'Hospital Website'),
      false,
      'Lead "Website" must NOT match rule "Hospital Website"'
    );
    assert.equal(
      matchSources('website', 'campus website'),
      false,
      'Lead "website" must NOT match rule "campus website"'
    );
    assert.equal(
      matchSources('Call', 'Emergency Call'),
      false,
      'Lead "Call" must NOT match rule "Emergency Call"'
    );

    // Specific lead CAN match generic rule
    assert.equal(
      matchSources('Hospital Website', 'Website'),
      true,
      'Specific lead "Hospital Website" can match generic rule "Website"'
    );
    assert.equal(
      matchSources('Google Search Ads', 'Google Ads'),
      true,
      'Specific lead "Google Search Ads" can match rule "Google Ads"'
    );
  });

  await t.test('Campaign and Lead Source Combined Evaluation', () => {
    assert.equal(
      matchLeadSourceAndCampaign('Website', 'Google Search Campaign', 'Google Ads'),
      true,
      'Matches secondary campaign when primary source is generic'
    );
    assert.equal(
      matchLeadSourceAndCampaign('Website', 'Summer Promo', '99 Acres'),
      false,
      'Does not match when neither source nor campaign matches rule'
    );
  });
});

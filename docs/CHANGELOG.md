# Changelog

All notable changes to the Leads Rubix CRM platform will be documented in this file.

## [2026-07-24]

### Added
* Created project standard documentation inside the `docs` folder:
  * `ARCHITECTURE.md`
  * `NAMING_CONVENTIONS.md`
  * `CODING_STANDARDS.md`
  * `DATABASE_SCHEMA.md`
  * `API_DOCUMENTATION.md`
  * `FOLDER_STRUCTURE.md`
  * `SECURITY.md`
  * `DEPLOYMENT.md`
  * `CHANGELOG.md`

### Fixed
* Removed `.lean()` from Mongoose queries in `screenFieldModel.js` to prevent virtual getters from being stripped.
* Enabled public bypass for guest signups using `screenKey` (camelCase) in `screenRoutes.js` to resolve 401 errors.
* Mounted kebab-case routes in `routes/index.js` to match routing standards.

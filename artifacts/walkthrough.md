# Walkthrough - User Contact Number Validation & Duplicate Checks

Added format validation and duplicate checks for user **Contact Number** / **Mobile Number** fields during user creation and edit operations.

## Changes Made

### 1. Backend Duplicate & Format Validation (`userService.js`)
- In [userService.js](file:///Users/sta/Documents/anti-leads-rubix-updated-crm/Leads-Rubix-CRM/artifacts/api-server/src/services/userService.js):
  * Added validation in `exports.create` and `exports.update` to verify that contact numbers contain between 7 and 15 digits.
  * Added duplicate checking against existing user records (`contactNumber`, `contact_no`, `fields.contactNumber`, `fields.phone`).
  * If a duplicate contact number exists, throws a `400 Bad Request` error returning: `"User Contact Number Already Exists!!"`.

### 2. Client-Side Format Validation (`DynamicForm.tsx`)
- In [DynamicForm.tsx](file:///Users/sta/Documents/anti-leads-rubix-updated-crm/Leads-Rubix-CRM/artifacts/web/src/components/DynamicForm/DynamicForm.tsx):
  * Added digit count verification (7-15 digits) inside `validate()`, highlighting contact number fields with an inline validation message if invalid.

---

## Verification Results
Verified code compilation and builds successfully:
```bash
PORT=3000 pnpm run build
```
- **Result**: Success.

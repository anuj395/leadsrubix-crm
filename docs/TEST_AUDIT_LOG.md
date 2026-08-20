# LeadsRubix CRM — Automated System Audit Log

> **Run ID**: `audit_1787030206405`  
> **Timestamp**: `2026-08-18T05:16:46.405Z`  
> **Environment**: `Local / Hybrid PostgreSQL`  
> **Total Tests**: **12** | **Passed**: <span style="color:green">**12**</span> | **Failed**: <span style="color:red">**0**</span>  
> **Total Execution Time**: `1344ms`

---

## 📊 Summary of Test Modules

| Module | Total Tests | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication** | 2 | 2 | 0 | ✅ PASSED |
| **Dynamic Industries** | 2 | 2 | 0 | ✅ PASSED |
| **Workspace Provisioning** | 2 | 2 | 0 | ✅ PASSED |
| **Tenant Isolation** | 1 | 1 | 0 | ✅ PASSED |
| **Workspace Backup** | 1 | 1 | 0 | ✅ PASSED |
| **Account Deletion** | 2 | 2 | 0 | ✅ PASSED |
| **Subdomain Blacklist** | 1 | 1 | 0 | ✅ PASSED |
| **Navigation Engine** | 1 | 1 | 0 | ✅ PASSED |

---

## 🔍 Detailed Test Execution Log


### Module: Authentication

* **✅ SuperAdmin Login & Credential Verification** (`78ms`)
  * *Result*: Authenticated as team@leadsrubix.com (Role: superAdmin)

* **✅ Invalid Password Rejection with HTTP 401** (`77ms`)
  * *Result*: Correctly rejected invalid credentials



### Module: Dynamic Industries

* **✅ SuperAdmin Custom Industry Creation** (`28ms`)
  * *Result*: Created Industry: Auto Logistics & Fleet Transport with 3 template roles

* **✅ Retrieve Active Industries List** (`2ms`)
  * *Result*: Retrieved 14 active industries



### Module: Workspace Provisioning

* **✅ Onboard Client into Custom Industry** (`948ms`)
  * *Result*: Provisioned Workspace 'Global Speed Logistics Inc' (ID: p5a3NcZStFuyDh8DWnQx)

* **✅ Verify Cloned Industry Roles Inheritance** (`1ms`)
  * *Result*: Cloned 3 roles: admin, dispatcher, route_manager



### Module: Tenant Isolation

* **✅ Tenant Boundary Isolation on Contact & Task Records** (`8ms`)
  * *Result*: Tenant records strictly isolated (Created Contact: 6a83eabf0000e09de166d480, Task: 6a83eabf00000918e94c915a)



### Module: Workspace Backup

* **✅ Export Full Structured JSON Workspace Archive** (`17ms`)
  * *Result*: Backup archive generated with 165 fields, 1 contacts, 3 roles



### Module: Account Deletion

* **✅ Client Admin Submits Account Deletion Request** (`5ms`)
  * *Result*: Deletion request submitted: Account deletion request submitted successfully. Awaiting Platform Admin approval.

* **✅ SuperAdmin Reviews & Approves Account Deletion** (`32ms`)
  * *Result*: SuperAdmin approved deletion. Workspace status is DELETED



### Module: Subdomain Blacklist

* **✅ Enforce Subdomain Reallocation Protection (Tombstone)** (`6ms`)
  * *Result*: Successfully blocked with error: "The subdomain 'fleet_1787030206731' is permanently retired/blacklisted and cannot be allocated in live CRM."



### Module: Navigation Engine

* **✅ Resolve Client Admin Streamlined Navigation** (`2ms`)
  * *Result*: Resolved 0 sidebar menus for Client Admin



---
*Generated automatically by `scripts/run_full_system_audit.cjs`*

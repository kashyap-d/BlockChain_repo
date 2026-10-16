# Test Cases and Results

Environment: Remix IDE + Ganache (chain id 1337) + MetaMask, solc 0.8.19.

## A. Automated tests – Remix Solidity Unit Testing (`CertificateRegistry_test.sol`)

| # | Test | Category | Expected | Observed |
|---|---|---|---|---|
| 1 | test01_constructorSetsState | Valid | owner, name, owner-is-issuer set |  PASS |
| 2 | test02_issueValidCertificate | Valid | totalIssued = 1, found & valid |  PASS |
| 3 | test03_getCertificateDetails | Valid | stored fields match |  PASS |
| 4 | test04_verifyUnknownCertificate | Invalid | found = false, valid = false |  PASS |
| 5 | test05_rejectDuplicateId | Invalid | revert `Certificate ID already exists` |  PASS |
| 6 | test06_rejectEmptyStudentName | Invalid | revert `Student name cannot be empty` |  PASS |
| 7 | test07_rejectEmptyCertId | Invalid | revert `Certificate ID cannot be empty` |  PASS |
| 8 | test08_rejectRevokeNonExistent | Invalid | revert `Certificate does not exist` |  PASS |
| 9 | test09_rejectAddZeroAddressIssuer | Invalid | revert `Invalid address` |  PASS |
| 10 | test10_outsiderCannotIssue | Unauthorised | revert `Not an authorized issuer` |  PASS |
| 11 | test11_outsiderCannotRevoke | Unauthorised | revert `Not an authorized issuer` |  PASS |
| 12 | test12_outsiderCannotAddIssuer | Unauthorised | revert `Only owner can perform this action` |  PASS |
| 13 | test13_authorisedIssuerCanIssue | Valid | added issuer can issue, totalIssued = 2 |  PASS |
| 14 | test14_revokeCertificate | Valid | found = true, valid = false, totalRevoked = 1 |  PASS |
| 15 | test15_rejectDoubleRevoke | Invalid | revert `Certificate already revoked` |  PASS |
| 16 | test16_removedIssuerCannotIssue | Unauthorised | revert `Not an authorized issuer` |  PASS |

Summary: 16 / 16 passed (screenshot: `screenshots/07_unit_tests.png`)

## B. Manual tests through the UI (MetaMask)

| # | Type | Account | Input | Expected | Observed | Tx hash |
|---|---|---|---|---|---|---|
| V1 | Valid | Owner | Issue `DIT-2026-CSE-001`, Kashyapa Datta Dhondu, 230905392, B.Tech CSE, 8.4 | Success, count = 1 | Success, block 2, gas used 288935; `CertificateIssued` event logged; count = 1 (screenshots 04, 04a) | `0x5e5bb9ab402078eb34eec9e0bb3195cf9587afa4865b2653a5dc7ac15effddb8` |
| V2 | Valid | Any | Verify `DIT-2026-CSE-001` | Authentic & valid | Authentic & valid, all details shown (screenshot 06) | – (read) |
| I1 | Invalid | Owner | Issue duplicate ID `DIT-2026-CSE-001` (Testing mode on) | `Certificate ID already exists` | Transaction failed on-chain (screenshot 05) | see screenshot 05 |
| I5 | Invalid | Any | Verify `DIT-2026-CSE-001` before it was issued | Not found | Not found: "may be forged" (screenshot 06a) | – (read) |
| U1 | Unauthorised | Account 2 (not issuer) | Issue `DIT-2026-CSE-001` | `Not an authorized issuer` | Blocked: `Not an authorized issuer` shown in log (screenshot 08) | – (rejected before sending) |

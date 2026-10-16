# Deployment Details

| Field | Value |
|---|---|
| Network | Ganache (local) |
| RPC URL | `http://127.0.0.1:7545` |
| Chain ID | `1337` (network id `5777` in Ganache GUI) |
| Compiler | solc `0.8.19` (EVM version: paris) |
| Optimizer | Enabled, 200 runs |
| Deployed via | Remix IDE → Custom – External Http Provider (Ganache) |
| Constructor argument | `_institutionName = "Manipal Institute of Technology"` |
| **Contract address** | `0xF09604F25Ef088d3E69BA4f13Ac0B9CF98d7944C` |
| Deployer / owner address | `0x554C91ddd2f17b634eE73F8FA37d42b37f1529D5` |
| Deployment tx hash | `0x3ae7fbadade5ffbfe9e052aa42a1af3f19159e730abad0f6db80501db49dc09a` |
| Block number | 1 |
| Gas used | 2802834 |
| Date deployed | 2026-10-16 23:06:07 |

## Transactions performed

| # | Function | From | Tx hash | Status | Gas used |
|---|---|---|---|---|---|
| 1 | constructor (deploy) | Owner | `0x3ae7fbadade5ffbfe9e052aa42a1af3f19159e730abad0f6db80501db49dc09a` | Success (block 1) | 2802834 |
| 2 | issueCertificate(DIT-2026-CSE-001…) | Owner | `0x5e5bb9ab402078eb34eec9e0bb3195cf9587afa4865b2653a5dc7ac15effddb8` | Success (block 2) | 288935 |
| 3 | issueCertificate(duplicate ID), Testing mode | Owner | see screenshot 05 | Failed on-chain | |
| 4 | issueCertificate(…) | Account 2 (not an issuer) | not sent | Rejected: Not an authorized issuer (screenshot 08) | – |

## ABI

The ABI can be copied from Remix (*Solidity Compiler → ABI* button). The frontend uses an equivalent human-readable ABI in `frontend/app.js`.

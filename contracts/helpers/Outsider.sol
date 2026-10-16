// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../CertificateRegistry.sol";

/// Helper contract that calls the registry from a different address, used to test unauthorised calls.
contract Outsider {
    function tryIssue(CertificateRegistry r, string memory id) external returns (bool ok, string memory reason) {
        try r.issueCertificate(id, "Eve", "REG999", "B.Tech CSE", "A") {
            return (true, "");
        } catch Error(string memory e) {
            return (false, e);
        }
    }

    function tryRevoke(CertificateRegistry r, string memory id) external returns (bool ok, string memory reason) {
        try r.revokeCertificate(id, "Hacked") {
            return (true, "");
        } catch Error(string memory e) {
            return (false, e);
        }
    }

    function tryAddIssuer(CertificateRegistry r, address a) external returns (bool ok, string memory reason) {
        try r.addIssuer(a) {
            return (true, "");
        } catch Error(string memory e) {
            return (false, e);
        }
    }
}

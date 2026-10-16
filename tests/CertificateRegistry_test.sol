// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Run with the Remix Solidity Unit Testing plugin.
import "remix_tests.sol";
import "../contracts/CertificateRegistry.sol";
import "../contracts/helpers/Outsider.sol";

contract CertificateRegistryTest {
    CertificateRegistry registry;
    Outsider outsider;

    function beforeAll() public {
        registry = new CertificateRegistry("Manipal Institute of Technology");
        outsider = new Outsider();
    }

    function test01_constructorSetsState() public {
        Assert.equal(registry.owner(), address(this), "Deployer should be owner");
        Assert.equal(registry.institutionName(), "Manipal Institute of Technology", "Institution name mismatch");
        Assert.ok(registry.isIssuer(address(this)), "Owner should be an issuer");
    }

    function test02_issueValidCertificate() public {
        registry.issueCertificate("DIT-2026-CSE-001", "Kashyapa", "229301001", "B.Tech CSE", "9.1 CGPA");
        Assert.equal(registry.totalIssued(), uint256(1), "Total issued should be 1");
        (bool found, bool valid) = registry.verifyCertificate("DIT-2026-CSE-001");
        Assert.ok(found, "Certificate should be found");
        Assert.ok(valid, "Certificate should be valid");
    }

    function test03_getCertificateDetails() public {
        CertificateRegistry.Certificate memory c = registry.getCertificate("DIT-2026-CSE-001");
        Assert.equal(c.studentName, "Kashyapa", "Student name mismatch");
        Assert.equal(c.course, "B.Tech CSE", "Course mismatch");
        Assert.equal(c.issuedBy, address(this), "Issuer mismatch");
        Assert.ok(!c.revoked, "Should not be revoked");
    }

    function test04_verifyUnknownCertificate() public {
        (bool found, bool valid) = registry.verifyCertificate("FAKE-0000");
        Assert.ok(!found, "Unknown certificate should not be found");
        Assert.ok(!valid, "Unknown certificate should not be valid");
    }

    function test05_rejectDuplicateId() public {
        try registry.issueCertificate("DIT-2026-CSE-001", "Someone", "1", "X", "A") {
            Assert.ok(false, "Duplicate ID should revert");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Certificate ID already exists", "Wrong revert reason");
        }
    }

    function test06_rejectEmptyStudentName() public {
        try registry.issueCertificate("DIT-2026-CSE-002", "", "229301002", "B.Tech CSE", "A") {
            Assert.ok(false, "Empty name should revert");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Student name cannot be empty", "Wrong revert reason");
        }
    }

    function test07_rejectEmptyCertId() public {
        try registry.issueCertificate("", "Ravi", "229301003", "B.Tech CSE", "A") {
            Assert.ok(false, "Empty ID should revert");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Certificate ID cannot be empty", "Wrong revert reason");
        }
    }

    function test08_rejectRevokeNonExistent() public {
        try registry.revokeCertificate("NOPE-1", "Malpractice") {
            Assert.ok(false, "Revoking unknown cert should revert");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Certificate does not exist", "Wrong revert reason");
        }
    }

    function test09_rejectAddZeroAddressIssuer() public {
        try registry.addIssuer(address(0)) {
            Assert.ok(false, "Zero address should revert");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Invalid address", "Wrong revert reason");
        }
    }

    function test10_outsiderCannotIssue() public {
        (bool ok, string memory reason) = outsider.tryIssue(registry, "DIT-HACK-001");
        Assert.ok(!ok, "Outsider must not issue");
        Assert.equal(reason, "Not an authorized issuer", "Wrong revert reason");
    }

    function test11_outsiderCannotRevoke() public {
        (bool ok, string memory reason) = outsider.tryRevoke(registry, "DIT-2026-CSE-001");
        Assert.ok(!ok, "Outsider must not revoke");
        Assert.equal(reason, "Not an authorized issuer", "Wrong revert reason");
    }

    function test12_outsiderCannotAddIssuer() public {
        (bool ok, string memory reason) = outsider.tryAddIssuer(registry, address(outsider));
        Assert.ok(!ok, "Outsider must not add issuers");
        Assert.equal(reason, "Only owner can perform this action", "Wrong revert reason");
    }

    function test13_authorisedIssuerCanIssue() public {
        registry.addIssuer(address(outsider));
        (bool ok, ) = outsider.tryIssue(registry, "DIT-2026-CSE-010");
        Assert.ok(ok, "Newly added issuer should be able to issue");
        Assert.equal(registry.totalIssued(), uint256(2), "Total issued should be 2");
    }

    function test14_revokeCertificate() public {
        registry.revokeCertificate("DIT-2026-CSE-001", "Malpractice found");
        (bool found, bool valid) = registry.verifyCertificate("DIT-2026-CSE-001");
        Assert.ok(found, "Revoked certificate should still be found");
        Assert.ok(!valid, "Revoked certificate should be invalid");
        Assert.equal(registry.totalRevoked(), uint256(1), "Total revoked should be 1");
    }

    function test15_rejectDoubleRevoke() public {
        try registry.revokeCertificate("DIT-2026-CSE-001", "Again") {
            Assert.ok(false, "Double revoke should revert");
        } catch Error(string memory reason) {
            Assert.equal(reason, "Certificate already revoked", "Wrong revert reason");
        }
    }

    function test16_removedIssuerCannotIssue() public {
        registry.removeIssuer(address(outsider));
        (bool ok, string memory reason) = outsider.tryIssue(registry, "DIT-2026-CSE-011");
        Assert.ok(!ok, "Removed issuer must not issue");
        Assert.equal(reason, "Not an authorized issuer", "Wrong revert reason");
    }
}

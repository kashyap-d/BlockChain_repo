// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Certificate registry: a university can authorise issuers, issuers
/// issue or revoke certificates, and anyone can verify a certificate by its ID.
contract CertificateRegistry {
    struct Certificate {
        string certId;        // human-readable unique ID, e.g. "MIT-2026-CSE-0001"
        string studentName;
        string regNumber;
        string course;
        string grade;         // e.g. "A+", "8.9 CGPA"
        uint256 issueDate;    // block timestamp
        address issuedBy;
        bool revoked;
        string revokeReason;
    }

    address public owner;                     // university admin
    string public institutionName;
    uint256 public totalIssued;
    uint256 public totalRevoked;

    mapping(address => bool) public isIssuer;
    mapping(bytes32 => Certificate) private certificates;
    mapping(bytes32 => bool) private exists;
    bytes32[] private certKeys;               // for listing

    uint256 public constant MAX_LEN = 100;

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event CertificateIssued(string certId, string studentName, address indexed issuedBy, uint256 issueDate);
    event CertificateRevoked(string certId, string reason, address indexed revokedBy);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyIssuer() {
        require(isIssuer[msg.sender], "Not an authorized issuer");
        _;
    }

    constructor(string memory _institutionName) {
        require(bytes(_institutionName).length > 0, "Institution name required");
        require(bytes(_institutionName).length <= MAX_LEN, "Institution name too long");
        owner = msg.sender;
        institutionName = _institutionName;
        isIssuer[msg.sender] = true;          // owner is an issuer by default
        emit IssuerAdded(msg.sender);
    }

    function addIssuer(address _issuer) external onlyOwner {
        require(_issuer != address(0), "Invalid address");
        require(!isIssuer[_issuer], "Already an issuer");
        isIssuer[_issuer] = true;
        emit IssuerAdded(_issuer);
    }

    function removeIssuer(address _issuer) external onlyOwner {
        require(isIssuer[_issuer], "Address is not an issuer");
        require(_issuer != owner, "Cannot remove owner as issuer");
        isIssuer[_issuer] = false;
        emit IssuerRemoved(_issuer);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        require(_newOwner != owner, "Already the owner");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
        if (!isIssuer[_newOwner]) {
            isIssuer[_newOwner] = true;
            emit IssuerAdded(_newOwner);
        }
    }

    function issueCertificate(
        string calldata _certId,
        string calldata _studentName,
        string calldata _regNumber,
        string calldata _course,
        string calldata _grade
    ) external onlyIssuer {
        _validate(_certId, "Certificate ID");
        _validate(_studentName, "Student name");
        _validate(_regNumber, "Registration number");
        _validate(_course, "Course");
        _validate(_grade, "Grade");

        bytes32 key = _key(_certId);
        require(!exists[key], "Certificate ID already exists");

        certificates[key] = Certificate({
            certId: _certId,
            studentName: _studentName,
            regNumber: _regNumber,
            course: _course,
            grade: _grade,
            issueDate: block.timestamp,
            issuedBy: msg.sender,
            revoked: false,
            revokeReason: ""
        });
        exists[key] = true;
        certKeys.push(key);
        totalIssued++;

        emit CertificateIssued(_certId, _studentName, msg.sender, block.timestamp);
    }

    function revokeCertificate(string calldata _certId, string calldata _reason) external onlyIssuer {
        bytes32 key = _key(_certId);
        require(exists[key], "Certificate does not exist");
        require(!certificates[key].revoked, "Certificate already revoked");
        _validate(_reason, "Revocation reason");

        certificates[key].revoked = true;
        certificates[key].revokeReason = _reason;
        totalRevoked++;

        emit CertificateRevoked(_certId, _reason, msg.sender);
    }

    /// @return found  true if the ID was ever issued
    /// @return valid  true if issued and not revoked
    function verifyCertificate(string calldata _certId) external view returns (bool found, bool valid) {
        bytes32 key = _key(_certId);
        found = exists[key];
        valid = found && !certificates[key].revoked;
    }

    function getCertificate(string calldata _certId) external view returns (Certificate memory) {
        bytes32 key = _key(_certId);
        require(exists[key], "Certificate does not exist");
        return certificates[key];
    }

    function getCertificateByIndex(uint256 _index) external view returns (Certificate memory) {
        require(_index < certKeys.length, "Index out of range");
        return certificates[certKeys[_index]];
    }

    function getCertificateCount() external view returns (uint256) {
        return certKeys.length;
    }

    function _key(string calldata _certId) private pure returns (bytes32) {
        return keccak256(bytes(_certId));
    }

    function _validate(string calldata _value, string memory _field) private pure {
        uint256 len = bytes(_value).length;
        require(len > 0, string.concat(_field, " cannot be empty"));
        require(len <= MAX_LEN, string.concat(_field, " too long"));
    }
}

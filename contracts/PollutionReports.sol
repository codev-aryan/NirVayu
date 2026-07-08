// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PollutionReports {
    struct Report {
        bytes32 hash;
        uint256 wardId;
        uint256 timestamp;
        address reporter;
    }

    mapping(uint256 => Report[]) public wardReports;
    mapping(bytes32 => bool) public verifiedReports;

    event ReportSubmitted(bytes32 indexed reportHash, uint256 indexed wardId, address indexed reporter);

    function reportPollution(bytes32 _hash, uint256 _wardId) public {
        Report memory newReport = Report({
            hash: _hash,
            wardId: _wardId,
            timestamp: block.timestamp,
            reporter: msg.sender
        });

        wardReports[_wardId].push(newReport);
        verifiedReports[_hash] = true;

        emit ReportSubmitted(_hash, _wardId, msg.sender);
    }

    function getReportsByWard(uint256 _wardId) public view returns (Report[] memory) {
        return wardReports[_wardId];
    }

    function verifyReport(bytes32 _hash) public view returns (bool) {
        return verifiedReports[_hash];
    }
}

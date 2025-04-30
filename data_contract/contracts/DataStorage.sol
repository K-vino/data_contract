// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract DataStorage {
    struct VoteData {
        string candidateId;
        string salt;
        string timestamp;
        string voterId;
    }

    mapping(uint256 => VoteData) public storedVotes;
    uint256 public voteCount = 0;

    function storeData(string memory _candidateId, string memory _salt, string memory _timestamp, string memory _voterId) public {
        storedVotes[voteCount] = VoteData(_candidateId, _salt, _timestamp, _voterId);
        voteCount++;
    }

    function readData(uint256 _index) public view returns (string memory candidateId, string memory salt, string memory timestamp, string memory voterId) {
        require(_index < voteCount, "Index out of bounds.");
        return (storedVotes[_index].candidateId, storedVotes[_index].salt, storedVotes[_index].timestamp, storedVotes[_index].voterId);
    }

    function getVoteCount() public view returns (uint256) {
        return voteCount;
    }
}
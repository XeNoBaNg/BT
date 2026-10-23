// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Election
 * @dev Simple blockchain-based voting contract for the De-Vote DApp.
 * Implements election lifecycle (NotStarted, InProgress, Ended),
 * dynamic candidate and voter registration by Admin, single-vote casting,
 * and result tallying.
 */
contract Election {
    enum State {
        NotStarted,
        InProgress,
        Ended
    }

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint256 votedCandidateId;
    }

    address public owner;
    State public state;

    uint256 public candidateCount;
    mapping(uint256 => Candidate) public candidates;
    mapping(address => Voter) public voters;

    // Events
    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoterRegistered(address indexed voterAddress);
    event ElectionStarted();
    event ElectionEnded();
    event Voted(address indexed voter, uint256 indexed candidateId);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only admin can perform this action");
        _;
    }

    modifier inState(State expectedState) {
        require(state == expectedState, "Action not allowed in current election state");
        _;
    }

    constructor() {
        owner = msg.sender;
        state = State.NotStarted;
        candidateCount = 0;
    }

    /**
     * @dev Admin adds a new candidate by name while state is NotStarted.
     */
    function addCandidate(string memory _name) external onlyOwner inState(State.NotStarted) {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            voteCount: 0
        });
        emit CandidateAdded(candidateCount, _name);
    }

    /**
     * @dev Admin registers an eligible voter wallet address while state is NotStarted.
     */
    function registerVoter(address _voter) external onlyOwner inState(State.NotStarted) {
        require(_voter != address(0), "Invalid voter address");
        require(!voters[_voter].isRegistered, "Voter is already registered");
        voters[_voter].isRegistered = true;
        voters[_voter].hasVoted = false;
        voters[_voter].votedCandidateId = 0;
        emit VoterRegistered(_voter);
    }

    /**
     * @dev Admin starts the election, transitioning from NotStarted to InProgress.
     */
    function startElection() external onlyOwner inState(State.NotStarted) {
        require(candidateCount > 0, "Cannot start election with zero candidates");
        state = State.InProgress;
        emit ElectionStarted();
    }

    /**
     * @dev Admin ends the election, transitioning from InProgress to Ended.
     */
    function endElection() external onlyOwner inState(State.InProgress) {
        state = State.Ended;
        emit ElectionEnded();
    }

    /**
     * @dev Cast a vote for a candidate. Allowed only during InProgress by a registered voter who has not voted.
     */
    function vote(uint256 _candidateId) external inState(State.InProgress) {
        require(voters[msg.sender].isRegistered, "You are not registered to vote");
        require(!voters[msg.sender].hasVoted, "You have already voted");
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate ID");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedCandidateId = _candidateId;
        candidates[_candidateId].voteCount++;

        emit Voted(msg.sender, _candidateId);
    }

    /**
     * @dev Helper to get candidate details.
     */
    function getCandidate(uint256 _candidateId) external view returns (uint256 id, string memory name, uint256 voteCount) {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate ID");
        Candidate memory c = candidates[_candidateId];
        return (c.id, c.name, c.voteCount);
    }

    /**
     * @dev Helper to get voter status for a given address.
     */
    function getVoterStatus(address _voter) external view returns (bool isRegistered, bool hasVoted, uint256 votedCandidateId) {
        Voter memory v = voters[_voter];
        return (v.isRegistered, v.hasVoted, v.votedCandidateId);
    }

    /**
     * @dev Helper to get basic election info in one call.
     */
    function getElectionSummary() external view returns (
        address _owner,
        State _state,
        uint256 _candidateCount
    ) {
        return (owner, state, candidateCount);
    }
}

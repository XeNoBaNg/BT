const Election = artifacts.require("Election");

contract("Election Contract", (accounts) => {
  const [admin, voter1, voter2, voter3, nonAdmin] = accounts;

  let election;

  beforeEach(async () => {
    election = await Election.new({ from: admin });
  });

  it("should deploy with the deployer as owner and initial state as NotStarted", async () => {
    const owner = await election.owner();
    const state = await election.state();
    const candidateCount = await election.candidateCount();

    assert.equal(owner, admin, "Deployer is not set as owner");
    assert.equal(state.toNumber(), 0, "Initial state should be NotStarted (0)");
    assert.equal(candidateCount.toNumber(), 0, "Initial candidate count should be 0");
  });

  it("should allow admin to add candidates before start", async () => {
    await election.addCandidate("Alice", { from: admin });
    await election.addCandidate("Bob", { from: admin });

    const count = await election.candidateCount();
    assert.equal(count.toNumber(), 2, "Candidate count should be 2");

    const candidate1 = await election.getCandidate(1);
    assert.equal(candidate1.id.toNumber(), 1);
    assert.equal(candidate1.name, "Alice");
    assert.equal(candidate1.voteCount.toNumber(), 0);

    const candidate2 = await election.getCandidate(2);
    assert.equal(candidate2.id.toNumber(), 2);
    assert.equal(candidate2.name, "Bob");
    assert.equal(candidate2.voteCount.toNumber(), 0);
  });

  it("should prevent non-admin from adding a candidate", async () => {
    try {
      await election.addCandidate("Charlie", { from: nonAdmin });
      assert.fail("Non-admin should not be able to add a candidate");
    } catch (err) {
      assert.include(err.message, "Only admin can perform this action");
    }
  });

  it("should allow admin to register an eligible voter", async () => {
    await election.registerVoter(voter1, { from: admin });
    const voterStatus = await election.getVoterStatus(voter1);

    assert.equal(voterStatus.isRegistered, true, "Voter should be registered");
    assert.equal(voterStatus.hasVoted, false, "Voter has not voted yet");
  });

  it("should reject duplicate voter registration", async () => {
    await election.registerVoter(voter1, { from: admin });
    try {
      await election.registerVoter(voter1, { from: admin });
      assert.fail("Duplicate voter registration should fail");
    } catch (err) {
      assert.include(err.message, "Voter is already registered");
    }
  });

  it("should reject voting before the election starts", async () => {
    await election.addCandidate("Alice", { from: admin });
    await election.registerVoter(voter1, { from: admin });

    try {
      await election.vote(1, { from: voter1 });
      assert.fail("Voting should not be allowed when election has not started");
    } catch (err) {
      assert.include(err.message, "Action not allowed in current election state");
    }
  });

  it("should reject non-admin starting or ending the election", async () => {
    await election.addCandidate("Alice", { from: admin });

    try {
      await election.startElection({ from: nonAdmin });
      assert.fail("Non-admin cannot start election");
    } catch (err) {
      assert.include(err.message, "Only admin can perform this action");
    }

    await election.startElection({ from: admin });

    try {
      await election.endElection({ from: nonAdmin });
      assert.fail("Non-admin cannot end election");
    } catch (err) {
      assert.include(err.message, "Only admin can perform this action");
    }
  });

  it("should reject adding candidates or voters after the election starts", async () => {
    await election.addCandidate("Alice", { from: admin });
    await election.registerVoter(voter1, { from: admin });
    await election.startElection({ from: admin });

    try {
      await election.addCandidate("Bob", { from: admin });
      assert.fail("Cannot add candidate after start");
    } catch (err) {
      assert.include(err.message, "Action not allowed in current election state");
    }

    try {
      await election.registerVoter(voter2, { from: admin });
      assert.fail("Cannot register voter after start");
    } catch (err) {
      assert.include(err.message, "Action not allowed in current election state");
    }
  });

  it("should reject an unregistered address from voting", async () => {
    await election.addCandidate("Alice", { from: admin });
    await election.startElection({ from: admin });

    try {
      await election.vote(1, { from: voter1 });
      assert.fail("Unregistered address should not be able to vote");
    } catch (err) {
      assert.include(err.message, "You are not registered to vote");
    }
  });

  it("should reject voting with an invalid candidate ID", async () => {
    await election.addCandidate("Alice", { from: admin });
    await election.registerVoter(voter1, { from: admin });
    await election.startElection({ from: admin });

    try {
      await election.vote(99, { from: voter1 });
      assert.fail("Voting for non-existent candidate should fail");
    } catch (err) {
      assert.include(err.message, "Invalid candidate ID");
    }
  });

  it("should allow a registered voter to cast a vote and record it", async () => {
    await election.addCandidate("Alice", { from: admin });
    await election.addCandidate("Bob", { from: admin });
    await election.registerVoter(voter1, { from: admin });

    await election.startElection({ from: admin });

    const tx = await election.vote(1, { from: voter1 });

    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Voted");
    assert.equal(tx.logs[0].args.voter, voter1);
    assert.equal(tx.logs[0].args.candidateId.toNumber(), 1);

    const voterStatus = await election.getVoterStatus(voter1);
    assert.equal(voterStatus.hasVoted, true);
    assert.equal(voterStatus.votedCandidateId.toNumber(), 1);

    const candidate1 = await election.getCandidate(1);
    assert.equal(candidate1.voteCount.toNumber(), 1);
  });

  it("should prevent a voter from voting twice", async () => {
    await election.addCandidate("Alice", { from: admin });
    await election.registerVoter(voter1, { from: admin });
    await election.startElection({ from: admin });

    await election.vote(1, { from: voter1 });

    try {
      await election.vote(1, { from: voter1 });
      assert.fail("Second vote should fail");
    } catch (err) {
      assert.include(err.message, "You have already voted");
    }
  });

  it("should reject voting after the election has ended", async () => {
    await election.addCandidate("Alice", { from: admin });
    await election.registerVoter(voter1, { from: admin });
    await election.startElection({ from: admin });
    await election.endElection({ from: admin });

    try {
      await election.vote(1, { from: voter1 });
      assert.fail("Voting after election ended should fail");
    } catch (err) {
      assert.include(err.message, "Action not allowed in current election state");
    }
  });

  it("should accurately reflect final vote counts matching valid votes", async () => {
    await election.addCandidate("Alice", { from: admin }); // id 1
    await election.addCandidate("Bob", { from: admin });   // id 2
    await election.addCandidate("Carol", { from: admin }); // id 3

    await election.registerVoter(voter1, { from: admin });
    await election.registerVoter(voter2, { from: admin });
    await election.registerVoter(voter3, { from: admin });

    await election.startElection({ from: admin });

    await election.vote(1, { from: voter1 }); // Alice
    await election.vote(2, { from: voter2 }); // Bob
    await election.vote(1, { from: voter3 }); // Alice

    await election.endElection({ from: admin });

    const alice = await election.getCandidate(1);
    const bob = await election.getCandidate(2);
    const carol = await election.getCandidate(3);

    assert.equal(alice.voteCount.toNumber(), 2, "Alice should have 2 votes");
    assert.equal(bob.voteCount.toNumber(), 1, "Bob should have 1 vote");
    assert.equal(carol.voteCount.toNumber(), 0, "Carol should have 0 votes");

    const state = await election.state();
    assert.equal(state.toNumber(), 2, "Final state should be Ended (2)");
  });
});

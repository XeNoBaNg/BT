import React, { useState, useEffect, useCallback } from "react";
import Web3 from "web3";
import { getWeb3Instance, getContractInstance } from "./web3";

const STATES = {
  0: { label: "Not Started", className: "badge-not-started" },
  1: { label: "In Progress", className: "badge-in-progress" },
  2: { label: "Ended", className: "badge-ended" },
};

export default function App() {
  const [account, setAccount] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [electionState, setElectionState] = useState(null); // 0, 1, 2
  const [ownerAddress, setOwnerAddress] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [voterStatus, setVoterStatus] = useState({
    isRegistered: false,
    hasVoted: false,
    votedCandidateId: 0,
  });

  // UI state
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newVoterAddress, setNewVoterAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: string }
  const [contractError, setContractError] = useState(null);

  // Truncate address for display
  const truncateAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Determine role
  const isOwner =
    account &&
    ownerAddress &&
    account.toLowerCase() === ownerAddress.toLowerCase();
  const isVoter = voterStatus.isRegistered && !isOwner;
  const isUnauthorized = account && !isOwner && !voterStatus.isRegistered;

  // Load election data from the smart contract
  const loadBlockchainData = useCallback(async () => {
    try {
      const web3 = getWeb3Instance();
      if (!web3) {
        // Only set error if account was previously connected or after mount
        return;
      }

      const { contract, address, networkId: netId, error } =
        await getContractInstance(web3);

      if (error) {
        setContractError(error);
        if (netId) setNetworkId(netId);
        return;
      }

      setContractError(null);
      setContractAddress(address);
      setNetworkId(netId);

      // Fetch election owner and state
      const owner = await contract.methods.owner().call();
      const rawState = await contract.methods.state().call();
      const stateNum = Number(rawState.toString());
      const rawCount = await contract.methods.candidateCount().call();
      const count = Number(rawCount.toString());

      setOwnerAddress(owner);
      setElectionState(stateNum);

      // Fetch candidates
      const loadedCandidates = [];
      for (let i = 1; i <= count; i++) {
        const c = await contract.methods.getCandidate(i).call();
        loadedCandidates.push({
          id: Number((c.id ?? c[0]).toString()),
          name: c.name ?? c[1],
          voteCount: Number((c.voteCount ?? c[2]).toString()),
        });
      }
      setCandidates(loadedCandidates);

      // Fetch voter status if account is connected
      if (account) {
        const v = await contract.methods.getVoterStatus(account).call();
        setVoterStatus({
          isRegistered: Boolean(v.isRegistered ?? v[0]),
          hasVoted: Boolean(v.hasVoted ?? v[1]),
          votedCandidateId: Number((v.votedCandidateId ?? v[2]).toString()),
        });
      }
    } catch (err) {
      console.error("Error loading blockchain data:", err);
      setContractError(err.message || "Failed to query the blockchain.");
    }
  }, [account]);

  // Connect MetaMask
  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setStatusMessage({
        type: "error",
        text: "MetaMask is not detected in this browser. Please install the MetaMask extension from https://metamask.io and refresh this page.",
      });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(null);
      setContractError(null);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setStatusMessage({
          type: "success",
          text: `Connected wallet: ${accounts[0]}`,
        });
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "User rejected wallet connection request.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Listen to MetaMask provider initialization, account and chain changes
  useEffect(() => {
    const checkAccounts = () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum
          .request({ method: "eth_accounts" })
          .then((accounts) => {
            if (accounts && accounts.length > 0) {
              setAccount(accounts[0]);
            }
          })
          .catch(console.error);
        loadBlockchainData();
      }
    };

    if (typeof window !== "undefined") {
      if (window.ethereum) {
        checkAccounts();
      } else {
        window.addEventListener("ethereum#initialized", checkAccounts, {
          once: true,
        });
        const timer = setTimeout(checkAccounts, 1200);
        return () => {
          window.removeEventListener("ethereum#initialized", checkAccounts);
          clearTimeout(timer);
        };
      }
    }
  }, [loadBlockchainData]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setStatusMessage({
            type: "info",
            text: `Switched account to: ${accounts[0]}`,
          });
        } else {
          setAccount("");
          setVoterStatus({
            isRegistered: false,
            hasVoted: false,
            votedCandidateId: 0,
          });
          setStatusMessage({
            type: "info",
            text: "Wallet disconnected.",
          });
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  // Reload blockchain data whenever account or contract state changes
  useEffect(() => {
    loadBlockchainData();
  }, [loadBlockchainData]);

  // Admin: Add Candidate
  const handleAddCandidate = async (e) => {
    e.preventDefault();
    const trimmed = newCandidateName.trim();
    if (!trimmed) {
      setStatusMessage({ type: "error", text: "Please enter a valid candidate name." });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({ type: "info", text: `Submitting candidate "${trimmed}" to blockchain...` });

      const web3 = getWeb3Instance();
      const { contract } = await getContractInstance(web3);
      await contract.methods.addCandidate(trimmed).send({ from: account });

      setStatusMessage({
        type: "success",
        text: `Candidate "${trimmed}" added successfully!`,
      });
      setNewCandidateName("");
      await loadBlockchainData();
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to add candidate.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Admin: Register Voter
  const handleRegisterVoter = async (e) => {
    e.preventDefault();
    const trimmed = newVoterAddress.trim();
    const web3 = getWeb3Instance();

    if (!trimmed || !web3 || !web3.utils.isAddress(trimmed)) {
      setStatusMessage({
        type: "error",
        text: "Please enter a valid Ethereum wallet address (0x...).",
      });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({
        type: "info",
        text: `Registering voter wallet ${trimmed}...`,
      });

      const { contract } = await getContractInstance(web3);
      await contract.methods.registerVoter(trimmed).send({ from: account });

      setStatusMessage({
        type: "success",
        text: `Voter ${trimmed} registered successfully!`,
      });
      setNewVoterAddress("");
      await loadBlockchainData();
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to register voter.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Admin: Start Election
  const handleStartElection = async () => {
    if (candidates.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Cannot start election with zero candidates.",
      });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({ type: "info", text: "Starting election on blockchain..." });

      const web3 = getWeb3Instance();
      const { contract } = await getContractInstance(web3);
      await contract.methods.startElection().send({ from: account });

      setStatusMessage({
        type: "success",
        text: "Election is now In Progress! Registered voters may now cast their votes.",
      });
      await loadBlockchainData();
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to start election.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Admin: End Election
  const handleEndElection = async () => {
    try {
      setLoading(true);
      setStatusMessage({ type: "info", text: "Ending election on blockchain..." });

      const web3 = getWeb3Instance();
      const { contract } = await getContractInstance(web3);
      await contract.methods.endElection().send({ from: account });

      setStatusMessage({
        type: "success",
        text: "Election has ended. Final vote counts are now visible to all participants.",
      });
      await loadBlockchainData();
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to end election.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Voter: Cast Vote
  const handleCastVote = async () => {
    if (!selectedCandidateId) {
      setStatusMessage({
        type: "error",
        text: "Please select a candidate before casting your vote.",
      });
      return;
    }

    try {
      setLoading(true);
      setStatusMessage({
        type: "info",
        text: `Submitting your vote for Candidate #${selectedCandidateId}...`,
      });

      const web3 = getWeb3Instance();
      const { contract } = await getContractInstance(web3);
      await contract.methods
        .vote(Number(selectedCandidateId))
        .send({ from: account });

      setStatusMessage({
        type: "success",
        text: "Your vote has been successfully recorded on the blockchain!",
      });
      await loadBlockchainData();
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to cast vote.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to automatically add and switch to Ganache Local network in MetaMask
  const handleAddGanacheNetwork = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setStatusMessage({
        type: "error",
        text: "MetaMask is not detected. Please install the MetaMask extension.",
      });
      return;
    }
    try {
      setLoading(true);
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x1691", // 5777 in hex
            chainName: "Ganache Local",
            rpcUrls: ["http://127.0.0.1:7545"],
            nativeCurrency: {
              name: "Ethereum",
              symbol: "ETH",
              decimals: 18,
            },
          },
        ],
      });
      setStatusMessage({
        type: "success",
        text: "Added and switched to Ganache Local (5777) in MetaMask!",
      });
      await loadBlockchainData();
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to add Ganache network.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <h1 className="app-title">De-Vote</h1>
          <p className="app-subtitle">
            Transparent, Decentralized Voting Application on Ethereum
          </p>
        </div>

        <div className="header-wallet">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleAddGanacheNetwork}
            disabled={loading}
            title="Automatically add and switch to Ganache Local network in MetaMask"
          >
            + Add Ganache to MetaMask
          </button>
          {account ? (
            <div className="wallet-info">
              <span className="wallet-badge" title={account}>
                Connected: <strong>{truncateAddress(account)}</strong>
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={loadBlockchainData}
                disabled={loading}
                title="Refresh blockchain state"
              >
                ↻ Refresh
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={connectWallet}
              disabled={loading}
            >
              Connect MetaMask
            </button>
          )}
        </div>
      </header>

      {/* Network & Contract Banner */}
      <section className="network-strip">
        <div className="network-item">
          <span className="label">Network:</span>
          <span className="value">
            {networkId ? `Chain ID ${networkId} (Ganache RPC: 127.0.0.1:7545)` : "Not Connected"}
          </span>
        </div>
        <div className="network-item">
          <span className="label">Contract:</span>
          <span className="value" title={contractAddress || "None"}>
            {contractAddress ? truncateAddress(contractAddress) : "Not Deployed"}
          </span>
        </div>
        <div className="network-item">
          <span className="label">Status:</span>
          <span
            className={`badge ${
              electionState !== null
                ? STATES[electionState]?.className
                : "badge-not-started"
            }`}
          >
            {electionState !== null
              ? STATES[electionState]?.label
              : "Checking..."}
          </span>
        </div>
        {account && (
          <div className="network-item">
            <span className="label">Your Role:</span>
            <span className="badge badge-role">
              {isOwner
                ? "Admin (Contract Owner)"
                : voterStatus.isRegistered
                ? "Registered Voter"
                : "Unauthorized (Not Registered)"}
            </span>
          </div>
        )}
      </section>

      {/* Global Status / Alert Message */}
      {statusMessage && (
        <div className={`alert alert-${statusMessage.type}`}>
          <div className="alert-content">
            <span>{statusMessage.text}</span>
            <button
              className="alert-close"
              onClick={() => setStatusMessage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Contract / Setup Error Message */}
      {contractError && (
        <div className="alert alert-error">
          <div className="alert-content">
            <div>
              <strong>Setup Issue Detected: </strong>
              {contractError}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {!account ? (
          /* Disconnected State */
          <div className="card text-center hero-card">
            <h2>Welcome to De-Vote</h2>
            <p className="hero-desc">
              To participate in this election or manage candidates as an
              administrator, please connect your MetaMask wallet configured for
              the local Ganache blockchain network.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={connectWallet}
              disabled={loading}
            >
              Connect MetaMask Wallet
            </button>
          </div>
        ) : (
          <>
            {/* ADMIN VIEW */}
            {isOwner && (
              <section className="admin-section">
                <div className="section-header">
                  <h2>Admin Dashboard</h2>
                  <span className="section-tag">Election Administrator</span>
                </div>

                <div className="grid grid-2">
                  {/* Candidate Form */}
                  <div className="card">
                    <h3>Add Candidate</h3>
                    <p className="card-desc">
                      Nominate a candidate by name before starting the election.
                    </p>
                    <form onSubmit={handleAddCandidate} className="form-group">
                      <label htmlFor="cand-name" className="form-label">
                        Candidate Name
                      </label>
                      <input
                        id="cand-name"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Alice Sharma"
                        value={newCandidateName}
                        onChange={(e) => setNewCandidateName(e.target.value)}
                        disabled={electionState !== 0 || loading}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={
                          electionState !== 0 ||
                          !newCandidateName.trim() ||
                          loading
                        }
                      >
                        {loading ? "Adding..." : "Add Candidate"}
                      </button>
                      {electionState !== 0 && (
                        <p className="field-note">
                          Candidates can only be registered while state is Not Started.
                        </p>
                      )}
                    </form>
                  </div>

                  {/* Voter Form */}
                  <div className="card">
                    <h3>Register Voter</h3>
                    <p className="card-desc">
                      Authorize an Ethereum wallet address for voting.
                    </p>
                    <form onSubmit={handleRegisterVoter} className="form-group">
                      <label htmlFor="voter-addr" className="form-label">
                        Voter Wallet Address (0x...)
                      </label>
                      <input
                        id="voter-addr"
                        type="text"
                        className="form-input font-mono"
                        placeholder="0x0000000000000000000000000000000000000000"
                        value={newVoterAddress}
                        onChange={(e) => setNewVoterAddress(e.target.value)}
                        disabled={electionState !== 0 || loading}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={
                          electionState !== 0 ||
                          !newVoterAddress.trim() ||
                          loading
                        }
                      >
                        {loading ? "Registering..." : "Register Voter"}
                      </button>
                      {electionState !== 0 && (
                        <p className="field-note">
                          Voters can only be registered while state is Not Started.
                        </p>
                      )}
                    </form>
                  </div>
                </div>

                {/* Lifecycle Controls */}
                <div className="card lifecycle-card">
                  <h3>Election Lifecycle Controls</h3>
                  <p className="card-desc">
                    Transition election stage. Stage flow is strictly one-way:
                    <strong> Not Started → In Progress → Ended</strong>.
                  </p>
                  <div className="lifecycle-actions">
                    <button
                      className="btn btn-success"
                      onClick={handleStartElection}
                      disabled={
                        electionState !== 0 || candidates.length === 0 || loading
                      }
                    >
                      ▶ Start Election
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleEndElection}
                      disabled={electionState !== 1 || loading}
                    >
                      ⏹ End Election
                    </button>
                  </div>
                  {electionState === 0 && candidates.length === 0 && (
                    <p className="field-note">
                      Add at least one candidate before starting the election.
                    </p>
                  )}
                  {electionState === 2 && (
                    <p className="field-note success-text">
                      The election has concluded. Results are permanently finalized.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* VOTER VIEW (Registered Voter) */}
            {isVoter && (
              <section className="voter-section">
                <div className="section-header">
                  <h2>Voter Portal</h2>
                  <span className="section-tag">Registered Voter</span>
                </div>

                {electionState === 0 && (
                  <div className="card text-center info-card">
                    <h3>Waiting for Election to Start</h3>
                    <p>
                      You are an authorized voter! The election has not started
                      yet. Please check back once the administrator begins the
                      voting period.
                    </p>
                  </div>
                )}

                {electionState === 1 && (
                  <div className="card">
                    {voterStatus.hasVoted ? (
                      <div className="voted-confirmation">
                        <div className="check-icon">✓</div>
                        <h3>Vote Successfully Recorded!</h3>
                        <p>
                          You have cast your vote for Candidate #
                          <strong>{voterStatus.votedCandidateId}</strong>.
                        </p>
                        <p className="subtext">
                          Each registered voter may only cast a ballot once. Final
                          vote tallies will become visible once the administrator
                          concludes the election.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3>Cast Your Ballot</h3>
                        <p className="card-desc">
                          Select one of the nominated candidates below and
                          confirm your vote. This transaction will be
                          permanently recorded on the blockchain.
                        </p>

                        <div className="candidate-selection-list">
                          {candidates.map((cand) => (
                            <label
                              key={cand.id}
                              className={`candidate-choice-card ${
                                selectedCandidateId === String(cand.id)
                                  ? "selected"
                                  : ""
                              }`}
                            >
                              <input
                                type="radio"
                                name="candidate-select"
                                value={cand.id}
                                checked={selectedCandidateId === String(cand.id)}
                                onChange={(e) =>
                                  setSelectedCandidateId(e.target.value)
                                }
                              />
                              <div className="candidate-choice-info">
                                <span className="cand-id">Candidate #{cand.id}</span>
                                <span className="cand-name">{cand.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>

                        <div className="vote-action-bar">
                          <button
                            className="btn btn-primary btn-lg"
                            onClick={handleCastVote}
                            disabled={!selectedCandidateId || loading}
                          >
                            {loading ? "Recording Vote..." : "Submit Vote"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* UNAUTHORIZED VIEW */}
            {isUnauthorized && (
              <div className="card warning-card">
                <h3>Account Not Registered</h3>
                <p>
                  The connected wallet address (
                  <code>{truncateAddress(account)}</code>) has not been registered
                  as an eligible voter by the administrator.
                </p>
                <p className="subtext">
                  Only addresses registered prior to election start can cast a
                  ballot. You may still view the candidate list and final
                  results once the election concludes.
                </p>
              </div>
            )}

            {/* CANDIDATE LIST & RESULTS (Visible to all) */}
            <section className="candidates-section">
              <div className="section-header">
                <h2>
                  {electionState === 2 ? "Final Election Results" : "Candidates"}
                </h2>
                <span className="section-count">
                  {candidates.length} {candidates.length === 1 ? "Nominee" : "Nominees"}
                </span>
              </div>

              {candidates.length === 0 ? (
                <div className="card text-center empty-card">
                  <p>No candidates nominated yet.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="candidate-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Candidate Name</th>
                        {electionState === 2 && <th>Final Vote Count</th>}
                        {electionState === 2 && <th>Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Compute max votes for winner badge when ended
                        const maxVotes =
                          electionState === 2
                            ? Math.max(...candidates.map((c) => c.voteCount), 0)
                            : 0;

                        return candidates.map((cand) => {
                          const isWinner =
                            electionState === 2 &&
                            maxVotes > 0 &&
                            cand.voteCount === maxVotes;

                          return (
                            <tr
                              key={cand.id}
                              className={isWinner ? "row-winner" : ""}
                            >
                              <td className="font-mono">#{cand.id}</td>
                              <td className="cand-name-cell">
                                <strong>{cand.name}</strong>
                              </td>
                              {electionState === 2 && (
                                <td className="font-mono font-bold">
                                  {cand.voteCount}
                                </td>
                              )}
                              {electionState === 2 && (
                                <td>
                                  {isWinner && (
                                    <span className="badge badge-winner">
                                      ★ Leading / Winner
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {electionState !== 2 && (
                <p className="results-disclaimer">
                  🔒 Note: Candidate vote counts remain hidden in the interface
                  until the election is ended by the administrator.
                </p>
              )}
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          De-Vote Blockchain Voting DApp • SPPU Blockchain Technology Laboratory
        </p>
        <p className="footer-sub">
          Smart Contract on Ganache Local Network • Built with Solidity, Truffle, Web3.js & React
        </p>
      </footer>
    </div>
  );
}

# De-Vote — Blockchain-Based Voting DApp

**De-Vote** is a decentralized, transparent voting decentralized application (DApp) developed for the **Blockchain Technology (BT) Laboratory** (SPPU Computer Engineering curriculum).

The application demonstrates how smart contracts enforce electoral integrity, access control, and vote immutability without relying on a centralized database or authentication server.

---

## 1. System Architecture

```text
+-----------------------------------------------------------+
|                   Browser Client (React + Vite)           |
|  - Admin Dashboard (Candidates, Voter Whitelist, Lifecycle)|
|  - Voter Portal (Ballot Casting, Single-Vote Status)     |
|  - Results Display (Post-Election Tally & Winners)        |
+-----------------------------+-----------------------------+
                              |
                     Web3.js & MetaMask
                     (window.ethereum)
                              |
                              v  RPC: http://127.0.0.1:7545
+-----------------------------------------------------------+
|               Ganache Local Ethereum Blockchain           |
|                (Chain ID: 5777 or 1337)                   |
+-----------------------------+-----------------------------+
                              |
                              v  EVM Bytecode
+-----------------------------------------------------------+
|                 Election.sol Smart Contract               |
|  - State Lifecycle: NotStarted -> InProgress -> Ended     |
|  - Dynamic Candidate & Voter Registration                 |
|  - Strict One-Person-One-Vote Enforcement                 |
|  - Real-Time Event Emission & On-Chain Vote Tally         |
+-----------------------------------------------------------+
```

1. **Frontend (`client/`)**: Built with React (Vite) and plain CSS. Automatically detects connected MetaMask accounts, listens for network/account changes, and adapts the view according to the user's role (`Admin`, `Registered Voter`, or `Unauthorized`).
2. **Web3 Layer (`Web3.js`)**: Communicates with the Ethereum network and formats contract transactions.
3. **Wallet (`MetaMask`)**: Securely signs transactions using local Ganache test accounts without exposing private keys.
4. **Smart Contract (`contracts/Election.sol`)**: Written in Solidity 0.8.x. Contains the core election business logic, access control (`onlyOwner`), lifecycle stages, and vote storage.
5. **Local Blockchain (`Ganache`)**: Provides an instant, zero-cost Ethereum test environment with funded accounts and deterministic block mining.

---

## 2. Prerequisites

Before running the project, ensure you have:

- **Node.js**: `v18+` or `v20+` (Node `v26.x` is also verified compatible).
- **npm**: `v9+` or `v10+`.
- **MetaMask Browser Extension**: Installed in Google Chrome, Brave, or Firefox.
- **Ganache**: Either **Ganache GUI** or **Ganache CLI** (`npx ganache`).

---

## 3. Quick Start & Execution (Windows / PowerShell)

### Step 1: Install Dependencies

From the project root directory (`c:\college\BE\LP3\BT`):

```powershell
# 1. Install root dependencies (Truffle & Ganache)
npm install

# 2. Install client dependencies (React, Vite, Web3.js)
npm run client:install
```

---

### Step 2: Start Local Blockchain (Ganache)

You can use either **Ganache GUI** or **Ganache CLI**:

#### Option A: Ganache GUI (Recommended for lab demonstrations)
1. Open Ganache GUI.
2. Click **Quickstart Ethereum**.
3. In Ganache Settings (gear icon) -> **Server**:
   - Hostname: `127.0.0.1`
   - Port Number: `7545`
   - Network ID: `5777`
4. Click **Save and Restart**.

#### Option B: Ganache CLI via Terminal
Open a separate PowerShell window and run:
```powershell
npx ganache --port 7545 --server.host 127.0.0.1 --chain.networkId 5777
```
Leave this terminal window running.

---

### Step 3: Compile and Deploy the Smart Contract

In your main PowerShell terminal, run:

```powershell
# Compile the Solidity smart contract
npm run compile

# Migrate (deploy) the contract to Ganache
npm run migrate
```

*Note: Truffle will compile `contracts/Election.sol` and save the deployment artifact directly to `client/src/contracts/Election.json`.*

---

### Step 4: Start the Frontend Application

Run:

```powershell
npm run client:dev
```

Open your browser at:
```
http://localhost:3000
```

---

## 4. MetaMask Configuration Guide

To interact with the local blockchain, configure MetaMask to connect to Ganache and import test accounts.

### A. Add the Ganache Local Network to MetaMask
1. Open MetaMask and click the **Network Selector** dropdown (top-left).
2. Click **Add Network** -> **Add a network manually**.
3. Enter the following details:
   - **Network Name**: `Ganache Local`
   - **New RPC URL**: `http://127.0.0.1:7545`
   - **Chain ID**: `5777` (or `1337` if you did not specify a network ID)
   - **Currency Symbol**: `ETH`
4. Click **Save** and switch to `Ganache Local`.

### B. Import Ganache Test Accounts
1. In Ganache (GUI or CLI output), find the list of **Available Accounts** and their corresponding **Private Keys**:
   - Account `(0)`: Use as the **Admin / Deployer**.
   - Account `(1)`: Use as **Voter 1**.
   - Account `(2)`: Use as **Voter 2 / Unauthorized User**.
2. Copy the Private Key of Account `(0)` (in Ganache GUI, click the key icon next to the account).
3. In MetaMask:
   - Click the **Account circle icon** (top-right).
   - Click **Add account or hardware wallet** -> **Import account**.
   - Paste the private key and name it `Ganache Admin`.
4. Repeat the import for Account `(1)` and name it `Ganache Voter 1`.

---

## 5. Step-by-Step Demonstration Sequence (Viva / Lab Demo)

Follow this exact walkthrough to demonstrate all features:

1. **Connect as Admin**:
   - Select `Ganache Admin` in MetaMask.
   - Click **Connect MetaMask** in the De-Vote UI.
   - Notice the status badge displays **Not Started** and your role is **Admin (Contract Owner)**.

2. **Add Nominated Candidates**:
   - Under *Add Candidate*, enter a candidate name (e.g. `Alice Johnson`) and click **Add Candidate**.
   - Confirm the MetaMask transaction.
   - Add a second candidate (e.g. `Bob Smith`).
   - Notice the candidates appear in the Candidate list below with vote counts hidden.

3. **Register an Eligible Voter**:
   - In MetaMask, copy the wallet address of `Ganache Voter 1` (Account 1).
   - Switch back to `Ganache Admin` in MetaMask.
   - Under *Register Voter*, paste the address of `Ganache Voter 1` and click **Register Voter**.
   - Confirm the MetaMask transaction.

4. **Verify Duplicate Voter Rejection**:
   - Try registering the same wallet address again.
   - Notice the transaction reverts with the contract error: `"Voter is already registered"`.

5. **Start the Election**:
   - Under *Election Lifecycle Controls*, click **▶ Start Election**.
   - Confirm the transaction.
   - The status badge updates to **In Progress** (green). Candidate and voter registration are now locked.

6. **Switch to Voter & Cast a Ballot**:
   - In MetaMask, switch to the `Ganache Voter 1` account.
   - The UI automatically updates to display the **Voter Portal** (`Registered Voter`).
   - Select a candidate (e.g. `Candidate #1 Alice Johnson`) and click **Submit Vote**.
   - Confirm the transaction in MetaMask.
   - Upon completion, the screen displays a green confirmation: `"Vote Successfully Recorded!"` and disables further voting.

7. **Verify Double-Voting Prevention**:
   - The voting form is disabled. If a duplicate vote transaction is sent directly to the contract, it reverts with `"You have already voted"`.

8. **Test Unauthorized Account Behavior**:
   - Switch in MetaMask to an unregistered account (e.g. Account 2).
   - The UI displays an amber notice: `"Account Not Registered. This wallet address is not authorized to vote."`

9. **Conclude Election as Admin**:
   - Switch MetaMask back to `Ganache Admin`.
   - Click **⏹ End Election** under lifecycle controls and confirm.
   - The status badge updates to **Ended**.

10. **Inspect Final Results**:
    - The candidate list now unlocks the **Final Vote Count** and highlights the leading candidate with a **Winner** badge.
    - Switch back to any voter or unauthorized account: all users can now view the final verified results.

---

## 6. Automated Testing

A complete Truffle test suite (`test/election.js`) is provided, verifying 14 contract behaviors against the requirements.

To run the automated tests:

```powershell
npm test
```

### Verified Test Cases:
1. `should deploy with the deployer as owner and initial state as NotStarted`
2. `should allow admin to add candidates before start`
3. `should prevent non-admin from adding a candidate`
4. `should allow admin to register an eligible voter`
5. `should reject duplicate voter registration`
6. `should reject voting before the election starts`
7. `should reject non-admin starting or ending the election`
8. `should reject adding candidates or voters after the election starts`
9. `should reject an unregistered address from voting`
10. `should reject voting with an invalid candidate ID`
11. `should allow a registered voter to cast a vote and record it`
12. `should prevent a voter from voting twice`
13. `should reject voting after the election has ended`
14. `should accurately reflect final vote counts matching valid votes`

**Test Status**: All 14 tests pass successfully.

---

## 7. Known Educational Limitations

This project is an educational mini-project for demonstrating foundational blockchain concepts:
- **Centralized Administrator**: A single deployer account oversees candidate and voter registration.
- **Address-Based Whitelist**: Eligibility is tied directly to Ethereum public keys without zero-knowledge identity verification (e.g., Aadhaar / passport).
- **Public Tallies**: While vote counts are masked in the frontend until the election ends, EVM storage is publicly inspectable via raw RPC calls (`eth_getStorageAt`). It does not implement homomorphic encryption or secret-ballot ring signatures.
- **Local Network**: Intended exclusively for local Ganache test environments, not for production public mainnets.

---

## 8. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"MetaMask is not detected"** | MetaMask extension is not installed or enabled. | Install the MetaMask extension from [metamask.io](https://metamask.io) and reload the page. |
| **"Contract is not deployed on current network"** | Contract was not migrated or MetaMask is on the wrong network. | 1. Ensure Ganache is running on port 7545.<br>2. Run `npm run migrate`.<br>3. Switch MetaMask to the `Ganache Local` network (`RPC: http://127.0.0.1:7545`, Chain ID `5777` or `1337`). |
| **"CONNECTION ERROR: Couldn't connect to node http://127.0.0.1:7545"** | Ganache is not running or running on a different port. | Verify Ganache is running and listening on port 7545. Run `netstat -ano \| findstr 7545` to confirm. |
| **MetaMask "Nonce too high" or transaction failure** | Ganache was restarted and the account nonce was reset. | In MetaMask: Settings -> Advanced -> **Clear activity tab data** (or Reset Account). |

---

## 9. File Structure

```text
BT/
├── .gitignore                      # Git ignore rules for node_modules, build artifacts
├── AGENTS.md                       # Functional specification & source of truth
├── README.md                       # Comprehensive setup and user guide
├── package.json                    # Root scripts (compile, migrate, test, client)
├── truffle-config.js               # Truffle compiler (solc 0.8.19) and Ganache network
├── contracts/
│   └── Election.sol                # Core Solidity voting smart contract
├── migrations/
│   └── 1_deploy_election.js        # Deployment migration script
├── test/
│   └── election.js                 # 14 automated Truffle tests
└── client/
    ├── package.json                # Frontend dependencies (React, Vite, Web3.js)
    ├── vite.config.js              # Vite server & build configuration
    ├── index.html                  # HTML entry point with Inter font
    └── src/
        ├── main.jsx                # React root mount
        ├── App.jsx                 # Admin & Voter views, MetaMask logic
        ├── web3.js                 # Web3 & contract instantiation helper
        ├── styles.css              # Clean, responsive CSS styling
        └── contracts/
            └── Election.json       # Generated Truffle contract ABI & deployment address
```

# AGENTS.md — De-Vote Blockchain Voting DApp

## Mission

Build the entire project in this currently empty directory in one uninterrupted implementation pass. This is a small Blockchain Technology (BT) laboratory mini-project for a Computer Engineering student following the SPPU curriculum.

Project: **De-Vote — Blockchain-Based Voting DApp**

Treat the supplied project report as the functional source of truth. Implement a working, beginner-friendly demonstration—not a production election system. Do not stop after planning or scaffolding. Create the files, install/configure the project as far as the environment permits, run checks, fix errors, and leave clear run instructions.

## Non-negotiable constraints

- Keep the application extremely simple and straightforward.
- One implementation pass only. Do not create phases, milestones, subprojects, agent teams, or elaborate architecture.
- Do not hardcode student names, roll numbers, guide names, voter names, candidate names, addresses, account addresses, or sample election results.
- Candidate names and voter wallet addresses must be entered dynamically in the UI.
- It is acceptable for the smart contract to start with zero candidates; the Admin adds them before starting the election.
- No backend, database, authentication server, cloud service, or public-chain deployment.
- No fake/demo data presented as real on-chain data.
- Avoid unnecessary dependencies, overengineering, elaborate animations, dashboards, charts, and unrelated features.
- Keep code readable for a student who needs to explain it in a BT lab viva. Use meaningful names and short comments only where they help.
- Never claim a command, deployment, test, or integration succeeded unless you actually ran it and observed success.
- If a required tool or network dependency is unavailable, still complete the source files and explain the exact manual step needed.
- Do not copy an existing repository wholesale. Implement the small application from the report's requirements.

## Required stack

Use a single repository with two directories:

- `contracts/`: Solidity smart contract and Truffle configuration/migration
- `client/`: React + Vite frontend

Use:
- Solidity 0.8.x compatible with the chosen Truffle compiler configuration
- Truffle for compilation and deployment
- Ganache local blockchain, using the local RPC URL `http://127.0.0.1:7545`
- React + Vite + plain CSS
- Web3.js to communicate with the contract
- MetaMask (`window.ethereum`) to connect the user's wallet and sign transactions

Use npm, not Yarn. Keep dependencies minimal. Do not introduce a backend.

If Truffle/Web3.js package compatibility requires a small adjustment, choose the simplest working compatible versions and document the choice. Do not silently switch to an unrelated stack.

## Functional requirements

### 1. Smart contract

Create an `Election` contract with the following behavior:

- The account that deploys the contract is the Admin/owner.
- Election state has exactly three stages: `NotStarted`, `InProgress`, and `Ended`.
- Admin can add candidates by name only while state is `NotStarted`.
- Admin can register eligible voter wallet addresses only while state is `NotStarted`.
- Reject registering the same voter address twice.
- Admin can start the election once, transitioning from `NotStarted` to `InProgress`.
- Admin can end the election only from `InProgress`, transitioning to `Ended`.
- Only registered voters can vote.
- A registered wallet can vote only once.
- Voting is permitted only while state is `InProgress`.
- Reject invalid candidate IDs.
- Store candidate names and vote counts on-chain.
- Expose read methods for election state, candidate count/details, owner/role, voter eligibility, and whether an address has voted, as needed by the frontend.
- Emit a `Voted` event when a vote is cast.
- Use `require` checks with helpful revert messages.
- Do not display final vote totals in the frontend until the election has ended. Explain in the README that blockchain state can still be queried directly and this is not secret-ballot voting.
- Keep the contract small and auditable. No external libraries are needed.

Roles for UI purposes:
- Admin: deploying wallet
- Voter: registered wallet other than Admin
- Unauthorized: any other wallet

The contract must enforce permissions; hiding buttons in React is not a security control.

### 2. Frontend

Build a clean, simple, responsive interface with plain CSS. It should feel like a neat student-built utility, not an overdesigned AI-generated dashboard. Use a restrained palette, readable typography, clear spacing, accessible labels, and obvious buttons.

Include:

- A simple header with the app title “De-Vote” and a short description.
- A **Connect MetaMask** button and visible connected wallet address (shortened for display, full address available where useful).
- Clear network/contract status: disconnected, wrong/unavailable network, or connected.
- Election status badge/text: Not Started, In Progress, or Ended.
- **Admin view** for the contract owner:
  - Add candidate form.
  - Register voter form accepting a valid Ethereum address.
  - Start election button when valid.
  - End election button when valid.
  - Candidate list.
  - Helpful transaction progress, success, and error feedback.
- **Voter view** for registered voters:
  - Show candidate names while the election is in progress.
  - Let the voter select a candidate and submit a vote.
  - Clearly show if the connected wallet has already voted.
  - Disable voting when the election is not in progress or the voter has voted.
  - Show final candidate vote counts only after the election has ended.
- **Unauthorized view** for an unregistered account, explaining that the connected wallet is not registered.
- Before the election starts, voters should see a simple waiting message.
- After the election ends, all connected users can view final results.
- Refresh on-chain data after successful transactions and when the connected account changes.
- Handle MetaMask missing, rejected connection/transaction, wrong network, missing deployment artifact, and RPC/contract errors with understandable messages.
- Never show fake account balances, mock transactions, fabricated candidate data, or fabricated results.

### 3. Wallet and network behavior

- Connect through `window.ethereum` and request accounts only after the user clicks Connect.
- Listen for MetaMask `accountsChanged` and `chainChanged`; update or reload state safely.
- Use the configured local Ganache network at RPC `127.0.0.1:7545`.
- Do not assume a wallet is connected just because the page loaded.
- Do not request, store, or expose private keys or seed phrases.
- Clearly explain that the user must connect MetaMask to the local Ganache network and use a Ganache test account.
- If the current chain does not match the configured Ganache chain, display a helpful message with setup guidance rather than pretending the contract is connected.
- Do not hardcode a deployed contract address. Read the address from the Truffle deployment artifact generated by migration. If no deployment exists yet, display a clear “contract not deployed” setup message.

### 4. Project setup and deployment

Create all needed files, including at least:

- `AGENTS.md`
- `README.md`
- `.gitignore`
- `truffle-config.js`
- `contracts/Election.sol`
- `migrations/1_deploy_election.js`
- `client/package.json`
- `client/index.html`
- `client/src/main.jsx`
- `client/src/App.jsx`
- `client/src/styles.css`
- A small Web3/contract helper module
- Any required generated-artifact loading glue

Configure Truffle so its compiled/deployed contract artifact is accessible to the frontend in a reliable, simple way. Do not check in fake ABI/address values. Use the real generated artifact from Truffle migration, and make sure the frontend can find it after deployment.

Include scripts for the shortest practical workflow:
1. Install dependencies.
2. Start Ganache GUI on port 7545.
3. Compile and deploy the contract.
4. Start the frontend.
5. Connect MetaMask to Ganache and import/use a Ganache test account.

Prefer root-level npm scripts if they can be implemented simply; otherwise provide exact commands in README. Avoid requiring global tools where an `npx` command works reliably. If a tool must be installed separately, say so explicitly.

### 5. Tests and validation

Create a small automated Truffle test suite for core contract rules if feasible within the chosen setup. At minimum, test:

- Deployment sets deployer as owner and initial state is `NotStarted`.
- Admin can add a candidate before start.
- Non-admin cannot add a candidate.
- Admin can register a voter.
- Duplicate voter registration is rejected.
- Voting before start is rejected.
- Unregistered address cannot vote.
- Registered voter can vote during the election.
- A voter cannot vote twice.
- Invalid candidate ID is rejected.
- Non-admin cannot start or end the election.
- Adding candidates/voters after start is rejected.
- Voting after election ends is rejected.
- Final vote counts match valid votes.

Run available compilation, tests, and frontend production build. Fix any errors you find. Report exactly which checks were run and their actual outcomes. Do not invent test results or gas figures.

## UI and usability rules

- Make the main screen usable on a laptop and mobile.
- Use forms with visible labels and inline validation.
- Disable actions that are invalid for the current state, but rely on the contract for enforcement.
- Show loading/transaction states to prevent accidental repeated clicks.
- Keep errors near the relevant form/action and provide a concise overall connection error when appropriate.
- Keep the page focused on election administration, voting, and results.
- No “academic viva” section, fake analytics, fake activity feed, profile management, sign-in page, or unnecessary pages.
- Do not add any fixed sample candidate or voter identities.
- Do not expose live vote counts in the interface before the election ends.

## README requirements

Write beginner-friendly setup instructions for Windows/PowerShell first, plus brief notes for other operating systems if easy. Include:

- What the project does and what it demonstrates.
- A short architecture explanation: React UI → MetaMask/Web3.js → Ganache/Ethereum local node → Solidity contract.
- Prerequisites and exact install/run commands.
- How to deploy the contract and start the frontend.
- How to connect MetaMask to local Ganache and use separate Ganache test accounts for Admin and voters.
- A quick manual demonstration sequence: deploy as Admin, add candidates, register a voter's wallet address, start election, connect as voter, cast one vote, try a second vote to verify rejection, reconnect as Admin, end election, inspect results.
- How to run tests.
- Known limitations: single trusted Admin, eligibility is only wallet-address based, on-chain activity/tallies are not secret, local development network only, not suitable for real elections.
- Troubleshooting for Ganache not running, wrong MetaMask network, missing deployment artifact, and dependency/install issues.
- Never claim the test suite passed unless it was actually executed successfully.

## Implementation instructions

Work autonomously in the current empty directory.

1. Inspect the directory and available runtime/tools.
2. Create the complete project, contract, deployment configuration, frontend, styles, tests, and README.
3. Install dependencies where permitted.
4. Run Truffle compile and tests if Ganache/test setup allows; run the frontend production build.
5. Fix issues found and ensure artifact paths and scripts agree.
6. Review the final directory and remove placeholder, unused, or contradictory files.
7. Finish by summarizing the files created, the checks actually run and their outcomes, and the exact commands I should execute next.

Do not ask me questions unless an essential blocker cannot be resolved from the report and these instructions. Make sensible minimal choices and continue. The objective is a complete, runnable educational mini-project in one pass.

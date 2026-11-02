# Base Token Studio — pre-launch controls

## Current phase
The web UI is a non-custodial token-configuration and Solidity-source generator. It does not deploy contracts, collect funds, or request signing permissions. Wallet connection is optional and only used to identify the connected address and switch to Base Sepolia.

## Token design
- ERC-20 fixed supply generated from OpenZeppelin Contracts 5.x.
- Initial supply is minted once to the holder address chosen at deployment.
- No owner/admin role, upgradeability, blacklist, transfer tax, pause switch, or post-deployment mint function.
- 18 decimals; user-entered supply is converted to base units in generated source.

## Before enabling in-app deployment
1. Pin and install an exact OpenZeppelin Contracts release.
2. Add a factory contract with no custody and no privileged mint/admin methods.
3. Add unit tests for zero address, decimals, supply conversion, event emission, and creator allocation.
4. Run static analysis (Slither), fuzz/invariant tests, and independent manual review.
5. Deploy and verify the factory on Base Sepolia; test with disposable wallets.
6. Obtain an independent security audit before any Base mainnet deployment.
7. Obtain written legal advice on token issuance and crypto-asset service obligations for the operator and target markets, including Morocco and the US.
8. Only then enable a mainnet deployment flag and disclose fees, risks, and token configuration clearly.

## Network references
- Base Sepolia chain ID: 84532 (`0x14a34`); explorer: https://sepolia.basescan.org
- Base mainnet chain ID: 8453 (`0x2105`); explorer: https://basescan.org
- Use a production RPC provider for production traffic; public RPC endpoints are rate-limited.

## Launch blockers
- No factory contract address is configured.
- No in-app transaction flow exists.
- No platform fee collection exists.
- No legal opinion or independent audit has been obtained.

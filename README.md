# Predix - Advanced Prediction Markets on Stellar Soroban

Predix is a high-performance decentralized prediction market platform built on **Stellar Soroban**, featuring advanced inter-contract calls, real-time event streaming, and a premium mobile-first experience.

[![CI/CD Pipeline](https://github.com/your-username/stellar-level-4/actions/workflows/main.yml/badge.svg)](https://github.com/your-username/stellar-level-4/actions)

---

## 🚀 Stellar Level 4 Implementation
This submission demonstrates advanced Soroban patterns required for Level 4 certification:
- **Inter-Contract Calls**: The `PredictionMarket` contract performs atomic transfers by calling the `MarketToken` contract.
- **Custom Token**: Implemented a mintable MTK token following the Soroban token interface.
- **Event Streaming**: The frontend listens to contract events (`m_create`, `bet`, `resolve`) for real-time UI updates.
- **CI/CD**: Automated testing and build verification via GitHub Actions.
- **Mobile Responsive**: Custom CSS/Tailwind design optimized for all screen sizes.

---

## 📜 Contract Details (Stellar Testnet)

| Contract | Soroban ID | Features |
| :--- | :--- | :--- |
| **MarketToken (MTK)** | `CDBUI...` | Custom Mintable, SEP-41 Interface |
| **PredictionMarket** | `CCBUI...` | Inter-contract Calls, Event Emission |

---

## ✨ Features
- **Mint MTK**: Easily acquire betting tokens on the Testnet using the integrated Mint function.
- **Live Feed**: Markets update instantly as bets are placed, driven by ledger events.
- **Freighter Integration**: Secure, non-custodial transaction signing.
- **Mobile First**: Premium glassmorphism UI designed for high-end mobile devices.

---

## 🛠 Tech Stack
- **Smart Contracts**: Soroban (Rust), Stellar SDK
- **Frontend**: React 19, Vite, Tailwind CSS 4, Framer Motion
- **Wallet**: Freighter Wallet
- **CI/CD**: GitHub Actions

---

## 🕹 How to Use
1. **Connect Wallet**: Use Freighter to connect to the Stellar Testnet.
2. **Mint MTK**: Enter an amount on the home page and click "Initialize Mint" to get test tokens.
3. **Browse Markets**: View active markets in the "Live Feed".
4. **Place a Bet**: Click a market, select an outcome, and "Initialize Position".
5. **Real-time Sync**: Watch the pool and probabilities update instantly.

---

## 💻 Local Development

### Prerequisites
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-shell)
- Rust & Wasm target
- Node.js v18+

### Contract Build
```bash
# Build both contracts
make build

# Run contract tests
make test
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📸 Mobile Responsive Preview
![Mobile View](screenshots/mobile_view.png)
*(Optimized for iOS/Android high-density displays)*

---

## 🔗 Inter-Contract Architecture
The `PredictionMarket` contract acts as a vault and logic controller:
1. **Transfer From**: When a user bets, the Market contract calls `MarketToken.transfer_from` to pull funds into escrow.
2. **Atomic Payouts**: Upon resolution, the Market contract calls `MarketToken.transfer` to distribute the pool to winners in a single transaction.

---

*Built for the Stellar Soroban Level 4 Challenge.*

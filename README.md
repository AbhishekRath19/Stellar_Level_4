# Predix - Advanced Prediction Markets on Stellar Soroban

Predix is a high-performance decentralized prediction market platform built on **Stellar Soroban**, featuring advanced inter-contract calls, real-time event streaming, and a premium mobile-first experience.

[![CI/CD Pipeline](https://github.com/AbhishekRath19/Stellar_Level_4/actions/workflows/deploy.yml/badge.svg)](https://github.com/AbhishekRath19/Stellar_Level_4/actions)

---

## 🚀 Stellar Level 4 Implementation
This submission demonstrates advanced Soroban patterns required for Level 4 certification:
- **Inter-Contract Calls**: The `PredictionMarket` contract performs atomic transfers by calling the `MarketToken` contract.
- **Custom Token**: Implemented a mintable MTK token following the Soroban token interface.
- **Event Streaming**: The frontend listens to contract events (`m_create`, `bet`, `resolve`) for real-time UI updates.
- **CI/CD**: Automated testing and build verification via GitHub Actions (see `.github/workflows/deploy.yml`).
- **Mobile Responsive**: Custom CSS/Tailwind design optimized for all screen sizes, including a mobile bottom-sheet for betting.

---

## 📜 Contract Details (Stellar Testnet)

| Contract | Soroban ID | Features |
| :--- | :--- | :--- |
| **MarketToken (MTK)** | `CCJBOURAHBBDFHYNVYOAKPC2T3Z5QDBEMBXG4ENNUTENGMZVI2TOYSKJ` | Custom Mintable, SEP-41 Interface |
| **PredictionMarket** | `CDUZWM4LXMHNEWF45XBM5DBQDKBRKGT5SO6NXF7HSYUIDAWV37YQVOPS` | Inter-contract Calls, Event Emission |

---

## ✨ Features
- **Mint MTK**: Acquire betting tokens on the Testnet using the integrated "Mint MTK" section.
- **Live Feed**: Markets update instantly as bets are placed, driven by ledger events.
- **Freighter Integration**: Secure, robust transaction signing with enhanced XDR handling.
- **Mobile First**: Premium glassmorphism UI designed for high-end mobile devices with full responsive support.

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
- Node.js v20+

### Contract Build
```bash
# Build both contracts
cd contracts_soroban
cargo build --target wasm32-unknown-unknown --release
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security
- **Escrow Mechanics**: All bets are held in the `PredictionMarket` contract address.
- **Authorization**: The `MarketToken` implements `require_auth` to prevent unauthorized transfers.
- **Robust XDR Submission**: Enhanced frontend logic to handle signed transaction extraction and Base64 encoding across different browser environments.

---

## 📸 Mobile Responsive Preview
![Mobile View](screenshots/mobile_view.png)
*(Optimized for iOS/Android high-density displays with reactive layout shifts)*

---

## 🔗 Inter-Contract Architecture
The `PredictionMarket` contract acts as a vault and logic controller:
1. **Transfer From**: When a user bets, the Market contract calls `MarketToken.transfer_from` to pull funds into escrow.
2. **Atomic Payouts**: Upon resolution, the Market contract calls `MarketToken.transfer` to distribute the pool to winners in a single transaction.

---

*Built for the Stellar Soroban Level 4 Challenge by AbhishekRath19.*

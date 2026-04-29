# Predix Protocol - Stellar Soroban Level 4 Submission

![CI/CD Status](https://github.com/AbhishekRath19/Stellar_Level_4/actions/workflows/deploy.yml/badge.svg)

Predix is a high-performance, decentralized prediction market protocol built on the Stellar Soroban network. This project demonstrates advanced smart contract capabilities including inter-contract calls, automated liquidity, and real-time event streaming.

## 🚀 Live Demo
**Live Application:** [https://stellar-level-4-predix.vercel.app](https://stellar-level-4-predix.vercel.app)

## 📱 Features
- **Advanced Soroban Integration**: Robust transaction submission pipeline with pre-flight simulation and automated footprinting.
- **Custom Token (MTK)**: Native Soroban token implementing the standard token interface.
- **Inter-Contract Calls**: Prediction markets interact seamlessly with the token contract for betting and payouts.
- **Real-Time Feed**: Live event streaming from the Soroban RPC to track betting activity.
- **Mobile First**: Fully responsive glassmorphism UI designed for high-density touch input.
- **CI/CD**: Automated build and deployment pipeline via GitHub Actions.

## 🔗 Project Architecture
The protocol utilizes a two-wallet architecture for enhanced security:
- **Issuer (Wallet 1)**: Deploys contracts and maintains administrative control over metadata.
- **Distributor (Wallet 2)**: Handles user-facing operations such as minting and market creation.

### Contract Addresses (Testnet)
| Contract | ID |
|----------|----|
| **Market Contract** | `CDUZWM4LXMHNEWF45XBM5DBQDKBRKGT5SO6NXF7HSYUIDAWV37YQVOPS` |
| **Token Contract** | `CCJBOURAHBBDFHYNVYOAKPC2T3Z5QDBEMBXG4ENNUTENGMZVI2TOYSKJ` |

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
- **Stellar SDK**: `@stellar/stellar-sdk` v12.3.0
- **Wallet**: Freighter API Integration
- **Contracts**: Rust (Soroban SDK)
- **Deployment**: Vercel + GitHub Actions

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AbhishekRath19/Stellar_Level_4
   cd Stellar_Level_4
   ```

2. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

3. **Run locally**:
   ```bash
   npm run dev
   ```

## 🏗️ Development Progress (Level 4 Requirements)
- [x] **Inter-contract calls**: Implemented via `Market` -> `Token` interactions.
- [x] **Custom Token**: Deployed and functional MTK token.
- [x] **Real-time events**: Live polling of contract events via RPC.
- [x] **CI/CD Pipeline**: Passing builds on GitHub Actions.
- [x] **Mobile Responsive**: Verified across all breakpoints.
- [x] **Meaningful Commits**: 10+ architectural commits.
- [x] **Production Ready**: Deployed on Vercel.

## 🧪 Verification
You can verify the inter-contract calls by checking the transaction hash of a bet placement on Stellar Expert. The market contract will be seen invoking the `transfer` function on the token contract.

---
**Author**: Abhishek Rath
**Submission**: Stellar Level 4 (Yellow Belt Finalist)

# DEX Automated Market Maker (AMM)

![Solidity](https://img.shields.io/badge/Solidity-%23363636.svg?style=for-the-badge&logo=solidity&logoColor=white)
![Hardhat](https://img.shields.io/badge/Hardhat-FFCA28?style=for-the-badge&logo=nodedotjs&logoColor=black)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

## 📝 Overview
This project implements a simplified Decentralized Exchange (DEX) using the **Automated Market Maker (AMM)** model, inspired by Uniswap V2. The DEX allows users to provide liquidity, swap tokens without an order book, and earn fees in a fully decentralized and non-custodial manner.

The system is built with **Solidity**, tested using **Hardhat**, and containerized with **Docker** for consistent evaluation.

---

## ✨ Features
* **Liquidity Management:** Initial and subsequent liquidity provision.
* **Liquidity Removal:** Proportional share calculation for burning LP tokens.
* **AMM Swaps:** Token swaps based on the Constant Product Formula.
* **Fee Structure:** 0.3% trading fee automatically distributed to liquidity providers.
* **LP Accounting:** Integrated mapping-based LP token management.
* **Robust Testing:** Extensive coverage with 25+ test cases.

---

## 🏗 Architecture

### Smart Contracts
* **`DEX.sol`**: Manages liquidity pools, handles swaps, and implements AMM logic.
* **`MockERC20.sol`**: Simple mintable ERC-20 token used for testing environments.

### Design Decisions
* **Manual Reserve Tracking:** Tracks reserves internally rather than relying on `balanceOf(address(this))` to prevent manipulation.
* **Security First:** Utilizes OpenZeppelin’s `SafeERC20` and `ReentrancyGuard`.
* **Validation:** Explicit input validation with descriptive revert reasons.

---

## 📊 Mathematical Implementation

### 1. Constant Product Formula
The pool follows the invariant:  
**x * y = k** *(where x and y are token reserves and k is the constant product)*

### 2. Fee Calculation (0.3%)
For each swap, the output is calculated as:
* `amountInWithFee` = amountIn * 997
* `numerator` = amountInWithFee * reserveOut
* `denominator` = (reserveIn * 1000) + amountInWithFee
* **amountOut** = numerator / denominator

### 3. LP Token Minting
* **Initial:** `sqrt(amountA * amountB)`
* **Subsequent:** `(amountA * totalLiquidity) / reserveA`

---

## 🛠 Setup Instructions

### Prerequisites
* Docker & Docker Compose
* Git

### Installation & Execution
1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd dex-amm

2. **Start Docker Environmnt:**
   ```bash
   docker-compose up -d

2. **Compile and Test:**
   ```bash
   # Compile contracts
   docker-compose exec app npm run compile

   # Run test suite
   docker-compose exec app npm test

   # Run coverage report
   docker-compose exec app npm run coverage

## 🔒 Security Considerations
* **Overflow Protection:** Uses Solidity 0.8+ built-in checks.
* **Reentrancy:** Protected by ReentrancyGuard.
* **Safe Transfers:** Uses SafeERC20 to handle non-standard ERC20 tokens.
* **Zero-Check:** Validates all non-zero amounts and liquidity requirements.


## ⚠️ Known Limitations
Supports only a single token pair.
No Slippage Protection (missing minAmountOut).
No Deadline parameter for transaction expiration.

## 👤 Author
Pavan Kumar Goli
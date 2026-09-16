require('@nomicfoundation/hardhat-toolbox');

/**
 * Hardhat configuration.
 *
 * No private key is ever written here. Deployment reads `DEPLOYER_PRIVATE_KEY`
 * from a git-ignored `.env.local`, and the file is absent by default — running
 * a testnet deploy without it fails loudly rather than using a checked-in key.
 */
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = deployerKey ? [deployerKey] : [];

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: './contracts',
    tests: './contracts/test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    // Ronin Saigon testnet.
    saigon: {
      url: process.env.SAIGON_RPC_URL || 'https://saigon-testnet.roninchain.com/rpc',
      chainId: 2021,
      accounts,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      chainId: 11155111,
      accounts,
    },
    // Mainnet is intentionally absent. Adding it is a deliberate act, not a
    // config flag someone can flip by accident.
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
  },
};

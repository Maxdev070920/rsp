export const CHAINS = {
  2021: {
    id: 2021,
    hexId: '0x7e5',
    name: 'Ronin Saigon Testnet',
    shortName: 'Saigon',
    currency: { name: 'RON', symbol: 'RON', decimals: 18 },
    rpcUrls: ['https://saigon-testnet.roninchain.com/rpc'],
    explorer: 'https://saigon-app.roninchain.com',
    testnet: true,
  },
  2020: {
    id: 2020,
    hexId: '0x7e4',
    name: 'Ronin Mainnet',
    shortName: 'Ronin',
    currency: { name: 'RON', symbol: 'RON', decimals: 18 },
    rpcUrls: ['https://api.roninchain.com/rpc'],
    explorer: 'https://app.roninchain.com',
    testnet: false,
  },
  11155111: {
    id: 11155111,
    hexId: '0xaa36a7',
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    currency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.sepolia.org'],
    explorer: 'https://sepolia.etherscan.io',
    testnet: true,
  },
  31337: {
    id: 31337,
    hexId: '0x7a69',
    name: 'Hardhat Local',
    shortName: 'Local',
    currency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['http://127.0.0.1:8545'],
    explorer: '',
    testnet: true,
  },
};

export const getChain = (chainId) => CHAINS[Number(chainId)] || null;

export const explorerTxUrl = (chainId, hash) => {
  const chain = getChain(chainId);
  if (!chain?.explorer || !hash) return null;
  return `${chain.explorer}/tx/${hash}`;
};

export const explorerTokenUrl = (chainId, contract, tokenId) => {
  const chain = getChain(chainId);
  if (!chain?.explorer || !contract) return null;
  return `${chain.explorer}/token/${contract}${tokenId != null ? `?tokenId=${tokenId}` : ''}`;
};

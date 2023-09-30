import { CHAINS_ENUMS, CHAINS_IDS } from ".";

export const solanaMainnet = {
    index: 10,
    id: CHAINS_IDS.SOLANA,
    name: "Solana",
    logo: "https://storage.googleapis.com/frontier-wallet/blockchains/base/info/logo.svg",
    coinId: 8453,
    symbol: "ETH",
    chainId: "84531",
    chainIdHex: "0x14a33",
    decimals: 18,
    blockchain: CHAINS_ENUMS.SOLANA,
    derivation: {
        path: "m/44'/60'/0'/0/0",
    },
    curve: "secp256k1",
    publicKeyType: "secp256k1Extended",
    explorer: {
        url: "https://explorer.solana.com",
        explorerName: "Solana Explorer",
        txPath: "/tx/",
        accountPath: "/address/",
    },
    info: {
        url: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
        rpc: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    },
};
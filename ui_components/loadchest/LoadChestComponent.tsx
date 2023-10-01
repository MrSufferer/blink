import "react-toastify/dist/ReactToastify.css";

import AccountAbstraction from "@safe-global/account-abstraction-kit-poc";
import { EthersAdapter } from "@safe-global/protocol-kit";
import { SafeAccountConfig, SafeFactory } from "@safe-global/protocol-kit";
import { GelatoRelayPack } from "@safe-global/relay-kit";
import {
    MetaTransactionData,
    MetaTransactionOptions,
    OperationType,
} from "@safe-global/safe-core-sdk-types";
import { Dialog, Transition } from "@headlessui/react";
import { initWasm } from "@trustwallet/wallet-core";
import { serializeError } from "eth-rpc-errors";
import { ethers } from "ethers";
import Lottie from "lottie-react";
import Image from "next/image";
import { useRouter } from "next/router";
import { FC, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import { parseEther } from "viem";
import bs58 from "bs58";
import { Plink } from '../../utils/wallet/plink';
import { getSignedSeed } from '../../utils/helpers'
import { Keypair, Connection, Transaction, PublicKey, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl, sendAndConfirmTransaction } from '@solana/web3.js'
import { SolanaWallet } from "@web3auth/solana-provider"
import {
    getBalance,
    getRelayTransactionStatus,
    getSendTransactionStatus,
    getUsdPrice,
} from "../../apiServices";
import { Elusiv, TokenType, SEED_MESSAGE, airdropToken } from "@elusiv/sdk";
import { GlobalContext, ACTIONS } from "../../context/GlobalContext";
import { LOGGED_IN, THandleStep } from "../../pages";
import * as loaderAnimation from "../../public/lottie/loader.json";
import {
    getCurrencyFormattedNumber,
    getTokenFormattedNumber,
    getTokenValueFormatted,
    hexToNumber,
} from "../../utils";
import { BaseGoerli } from "../../utils/chain/baseGoerli";
import { icons } from "../../utils/images";
import { Wallet } from "../../utils/wallet";
import PrimaryBtn from "../PrimaryBtn";
import SecondaryBtn from "../SecondaryBtn";
import DepositAmountModal from "./DepositAmountModal";
import WormholeBridge from "@wormhole-foundation/wormhole-connect";
import { getAssociatedTokenAddress, getAccount, TokenAccountNotFoundError, Account, createAssociatedTokenAccountInstruction, TokenInvalidAccountOwnerError, createTransferInstruction, getOrCreateAssociatedTokenAccount} from "@solana/spl-token"

import PrivateSend from "../PrivateSend"
import { ProfileCard } from "./ProfileCard";
import { useWagmi } from "../../utils/wagmi/WagmiContext";
import ReactTyped from "react-typed";
import { SolanaWalletProvider } from "../../context/SolanaWalletContext";
import { sha512 } from "@noble/hashes/sha512";
import * as ed from "@noble/ed25519";
import DevelopmentBtn from "../DevelopmentBtn";

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));


export interface ILoadChestComponent {
    provider?: any;
}
export const LoadChestComponent: FC<ILoadChestComponent> = (props) => {
    const { provider } = props;

    const {
        state: { loggedInVia, address, tokenProgram },
        dispatch,
    } = useContext(GlobalContext);

    const router = useRouter();

    const [value, setValue] = useState("");
    const [price, setPrice] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [tokenPrice, setTokenPrice] = useState("");
    const [tokenValue, setTokenValue] = useState(0);
    const [fromAddress, setFromAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [transactionLoading, setTransactionLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [wormholeEnabled, setWormholeEnabled] = useState(false);
    const [wormholeLoading, setWormholeLoading] = useState(true);
    const [toggle, setToggle] = useState(true);
    const [btnDisable, setBtnDisable] = useState(true);
    const [balanceInUsd, setBalanceInUsd] = useState("");
    const [showActivity, setShowActivity] = useState(false);
    const [chestLoadingText, setChestLoadingText] = useState("");
    const [privateBalance, setPrivateBalance] = useState(BigInt(0));
    const [isElusivLoading, setIsElusivLoading] = useState(true);
    const [solanaWallet, setSolanaWallet] = useState<SolanaWallet>();
    const [elusiv, setElusiv] = useState<Elusiv>(null);

    const handleToggle = () => {
        setToggle(!toggle);
    };

    useEffect(() => {
        const setParams = async () => {
            const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com", "finalized");

            const wallet = new SolanaWallet(provider)
            setSolanaWallet(wallet)

            const accounts = await wallet.requestAccounts();

            const signedSeed = await wallet.signMessage(Buffer.from(SEED_MESSAGE))
            
            const elu = await Elusiv.getElusivInstance(
                signedSeed,
                new PublicKey(accounts[0]),
                connection,
                "mainnet-beta"
            );
          setElusiv(elu);
          setIsElusivLoading(false);
        };
    
        setParams();
    }, []);

    useEffect(() => {
        const getPrivateBalance = async () => {
          const tokenSymbol = (tokenProgram.tokenMint == "SOL") ? "LAMPORTS" : tokenProgram.name
          const privateBalance = await elusiv.getLatestPrivateBalance(tokenSymbol);
        
          setPrivateBalance(privateBalance);
        //   setFetching(false);
        };
    
        if (elusiv !== null) {
            getPrivateBalance().then(() => {});
        }
    }, [elusiv, tokenProgram]);

    const topup = async (
        elusivInstance: Elusiv,
        amount: number,
        tokenType: TokenType
      ) => {
        // Build our topup transaction
        const topupTx = await elusivInstance.buildTopUpTx(amount, tokenType);
        // Sign it (only needed for topups, as we're topping up from our public key there)

        const signedTx = await solanaWallet.signTransaction(topupTx.tx) as Transaction;
        topupTx.setSignedTx(signedTx)
        // Send it off
        return elusivInstance.sendElusivTx(topupTx);
    };

    const topupHandler = async (e) => {
        e.preventDefault();

        const _inputValue = inputValue.replace(/[^\d.]/g, "");
        const tokenSymbol = (tokenProgram.tokenMint == "SOL") ? "LAMPORTS" : tokenProgram.name
        if (_inputValue) {
            toast.info(`Initiating ${_inputValue} ${tokenProgram.name} topup...`);

            const sig = await topup(
              elusiv,
              Number(inputValue) * Math.pow(10, tokenProgram.decimals),
              tokenSymbol
            );

            fetchBalance()
            toast.success(`Topup ${_inputValue} ${tokenProgram.name} complete with sig ${sig.signature}`);
            const privateBalance = await elusiv.getLatestPrivateBalance(tokenSymbol);
            setPrivateBalance(privateBalance);  
        }
    };

    const send = async (
        elusivInstance: Elusiv,
        recipient: PublicKey,
        amount: number,
        tokenType: TokenType
      ) => {
        // Build the send transaction
        const sendTx = await elusivInstance.buildSendTx(
          amount,
          recipient,
          tokenType
        );
        // Send it off!
        return elusivInstance.sendElusivTx(sendTx);
    };

    useEffect(() => {
        if (address) {
            fetchBalance();
        }
    }, [address, tokenProgram]);

    const fetchBalance = async () => {
        setLoading(true);
        const tokenName = tokenProgram.tokenMint === "SOL" ? "solana" : tokenProgram.name
        getUsdPrice(tokenName)
            .then(async (res: any) => {
                setTokenPrice(res.data[tokenName] ? res.data[tokenName]["usd"] : 1);
                setFromAddress(address);
                const balanceRaw = (await getBalance(address, tokenProgram.tokenMint)) as any;
                console.log(balanceRaw)

                const balance =  
                    balanceRaw.result.value[0] ? balanceRaw.result.value[0]["account"]["data"]["parsed"]["info"]["tokenAmount"]["amount"]
                    : balanceRaw.result.value

                setTokenValue(
                    getTokenFormattedNumber(
                        balance as unknown as string,
                        tokenProgram.decimals,
                    ),
                );
                const formatBal = (
                    (balance / Math.pow(10, tokenProgram.decimals)) *
                    (res.data[tokenName] ? res.data[tokenName]["usd"] : 1)
                ).toFixed(3);
                setPrice(getCurrencyFormattedNumber(formatBal));
                setBalanceInUsd(formatBal);
                setLoading(false);
            })
            .catch((e) => {
                console.log(e);
            });
    };

    const handleValueClick = (val: string) => {
        setValue(`$${val}`);
        const valueWithoutDollarSign = val.replace(/[^\d.]/g, "");
        const tokenIputValue = Number(valueWithoutDollarSign) / Number(tokenPrice);
        setInputValue(getTokenValueFormatted(Number(tokenIputValue)));
        if (Number(valueWithoutDollarSign) < Number(balanceInUsd)) {
            setBtnDisable(false);
        } else {
            setBtnDisable(true);
        }
    };

    const handleInputChange = (val: string) => {
        const valueWithoutDollarSign = val.replace(/[^\d.]/g, "");
        let appendDollar = "";
        if (Number(valueWithoutDollarSign) > 0) {
            appendDollar = "$";
        }
        setValue(`${appendDollar}${valueWithoutDollarSign}`);
        const tokenIputValue = Number(valueWithoutDollarSign) / Number(tokenPrice);
        setInputValue(getTokenValueFormatted(Number(tokenIputValue)));
        if (Number(valueWithoutDollarSign) < Number(balanceInUsd)) {
            setBtnDisable(false);
        } else {
            setBtnDisable(true);
        }
    };

    const handleTokenProgramChange = async (e: any) => {
        e.preventDefault();

        const tokenProgram = e.target.value;
        const tokenSplits = tokenProgram.split("-");
        const isNative = (tokenSplits[0] === "SOL") ? true : false;

        dispatch({
            type: ACTIONS.SET_TOKEN_PROGRAM,
            payload: {tokenMint: tokenSplits[0], isNative, name: tokenSplits[1], decimals: Number(tokenSplits[2])},
        });
    }

    const handleOpenWormhole = (val: boolean) => {
        setWormholeEnabled(true)

        setTimeout(() => {
            setWormholeLoading(false);
        }, 1000);
    }

    const createWallet = async () => {
        const _inputValue = inputValue.replace(/[^\d.]/g, "");
        if (_inputValue) {
            setTransactionLoading(true);
            setChestLoadingText("Initializing wallet and creating link...");
            try {
                // const walletCore = await initWasm();
                // const wallet = new Wallet(walletCore);
                const payData = await Plink.create();

                console.log(payData)

                setChestLoadingText("Setting up destination signer and address");

                const destinationSigner = new Keypair(payData.keypair);
                // const destinationEOAAddress = await destinationSigner.getAddress();
                // const ethAdapter = new EthersAdapter({
                //     ethers,
                //     signerOrProvider: destinationSigner,
                // });
                setChestLoadingText("Creating solana contract for chest");
                // const safeFactory = await SafeFactory.create({
                //     ethAdapter: ethAdapter,
                // });
                // const safeAccountConfig: SafeAccountConfig = {
                //     owners: [destinationEOAAddress],
                //     threshold: 1,
                // };
                // const destinationAddress = await safeFactory.predictSafeAddress(
                //     safeAccountConfig,
                // );
                setChestLoadingText("contract created");

                if (loggedInVia === LOGGED_IN.GOOGLE) {
                    // const relayPack = new GelatoRelayPack(process.env.NEXT_PUBLIC_GELATO_RELAY_API_KEY);
                    setChestLoadingText(
                        "Initializing wallet for transaction relay",
                    );
                    var myHeaders = new Headers();
                    myHeaders.append("x-api-key", process.env.NEXT_PUBLIC_SHYFT_API_KEY || "");
                    
                    var requestOptions = {
                      method: 'POST',
                      headers: myHeaders,
                      redirect: 'follow'
                    };
                    
                    var feePayer = await fetch("https://api.shyft.to/sol/v1/txn_relayer/create", requestOptions)
                      .then(response => response.text())
                      .then(result => JSON.parse(result))
                      .catch(error => console.log('error', error));
                    // const fromEthProvider = new ethers.providers.Web3Provider(provider);
                    // const fromSigner = await fromEthProvider.getSigner();
                    // const safeAccountAbstraction = new AccountAbstraction(fromSigner);
                    // await safeAccountAbstraction.init({ relayPack });
                    setChestLoadingText("Transaction process has begun...");
                    // const safeTransactionData: MetaTransactionData = {
                    //     to: destinationAddress,
                    //     data: "0x",
                    //     value: parseEther(inputValue).toString(),
                    //     operation: OperationType.Call,
                    // };

                    // const options: MetaTransactionOptions = {
                    //     gasLimit: "100000",
                    //     isSponsored: true,
                    // };

                    // const gelatoTaskId = await safeAccountAbstraction.relayTransaction(
                    //     [safeTransactionData],
                    //     options,
                    // );
                    // console.log("gelatoTaskId ", gelatoTaskId);
                    // console.log(`https://relay.gelato.digital/tasks/status/${gelatoTaskId}`);
                    // solanaWallet is from above

                    console.log(feePayer)

                    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com", 'finalized');                
                    const block = await connection.getLatestBlockhash("finalized");

                    const transaction = new Transaction({
                        blockhash: block.blockhash,
                        lastValidBlockHeight: block.lastValidBlockHeight,
                        feePayer: new PublicKey(feePayer.result.wallet),
                    })

                    const associatedTokenProgramId = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
                    const tokenProgramId = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
                    
                    if (tokenProgram.isNative) {
                        const TransactionInstruction = SystemProgram.transfer({
                            fromPubkey: new PublicKey(address),
                            toPubkey: new PublicKey(destinationSigner.publicKey),
                            lamports: Number(inputValue) * Math.pow(10, 9),
                        });

                        transaction.add(TransactionInstruction);
                    } else {

                        const senderTokenAccountAddress = await getAssociatedTokenAddress(
                            new PublicKey(tokenProgram.tokenMint),
                            new PublicKey(address)
                        );

                        const createInstruction = createAssociatedTokenAccountInstruction(
                            new PublicKey(feePayer.result.wallet),
                            senderTokenAccountAddress,
                            new PublicKey(address),
                            new PublicKey(tokenProgram.tokenMint),
                            tokenProgramId,
                            associatedTokenProgramId
                        )

                        // Check if the receiver's token account exists
                        let senderTokenAccount: Account
                        try {
                            senderTokenAccount = await getAccount(
                            connection,
                            senderTokenAccountAddress,
                            "finalized",
                            tokenProgramId
                            )
                        } catch (e) {
                            // If the account does not exist, add the create account instruction to the transaction
                            transaction.add(createInstruction)
                        }                 

                        // Get the receiver's associated token account address
                        const receiverTokenAccountAddress = await getAssociatedTokenAddress(
                            new PublicKey(tokenProgram.tokenMint),
                            destinationSigner.publicKey
                        )

                        // Create an instruction to create the receiver's token account if it does not exist
                        const createAccountInstruction = createAssociatedTokenAccountInstruction(
                            new PublicKey(feePayer.result.wallet),
                            receiverTokenAccountAddress,
                            destinationSigner.publicKey,
                            new PublicKey(tokenProgram.tokenMint),
                            tokenProgramId,
                            associatedTokenProgramId
                        )

                        // Check if the receiver's token account exists
                        let receiverTokenAccount: Account
                        try {
                            receiverTokenAccount = await getAccount(
                            connection,
                            receiverTokenAccountAddress,
                            "finalized",
                            tokenProgramId
                            )
                        } catch (e) {
                            // If the account does not exist, add the create account instruction to the transaction
                            transaction.add(createAccountInstruction)
                        }

                        // Create an instruction to transfer 1 token from the sender's token account to the receiver's token account
                        // Adjusting for decimals of the MINT
                        const transferInstruction = await createTransferInstruction(
                            senderTokenAccountAddress,
                            receiverTokenAccountAddress,
                            new PublicKey(address),
                            Number(inputValue) * Math.pow(10, tokenProgram.decimals)
                        )

                        // Add the transfer instruction to the transaction
                        transaction.add(transferInstruction)

                    }
                    // we need a get the solana wallet to sign here
                    // const solanaWallet = new SolanaWallet(provider);

                    const signedTx = await solanaWallet.signTransaction(transaction);

                    const serializedTransaction = signedTx.serialize({ requireAllSignatures: false, verifySignatures: true });
                    const transactionBase64 = serializedTransaction.toString('base64');

                    var myHeaders = new Headers();
                    myHeaders.append("x-api-key", process.env.NEXT_PUBLIC_SHYFT_API_KEY || "");
                    myHeaders.append("Content-Type", "application/json");
                    
                    var raw = JSON.stringify({
                    "network": "mainnet-beta",
                    "encoded_transaction": transactionBase64
                    });
                    
                    var reqOptions = {
                    method: 'POST',
                    headers: myHeaders,
                    body: raw,
                    redirect: 'follow'
                    };
                    // const serializedTransaction = tx.serialize({ requireAllSignatures: false, verifySignatures: true });
                    // const transactionBase64 = serializedTransaction.toString('base64');
                    
                    var relayResult = await fetch("https://api.shyft.to/sol/v1/txn_relayer/sign", reqOptions)
                    .then(response => response.text())
                    .then(result => JSON.parse(result))
                    .catch(error => console.log('error', error));
                    if (relayResult) {
                        console.log(relayResult)
                        setChestLoadingText(
                            "Transaction on its way...",
                        );

                        const interval = setInterval(() => {
                            handleTransactionStatus(relayResult, payData.url.toString());
                            if (interval !== null) {
                                clearInterval(interval);
                            }
                        }, 15000);
                    }
                } else {
                    try {
                        // const sendAmount = await sendTransaction({
                        //     to: destinationAddress,
                        //     value: parseEther(inputValue),
                        // });
                        // handleTransactionStatus(sendAmount.hash, payData.url);
                    } catch (e: any) {
                        setTransactionLoading(false);
                        const err = serializeError(e);
                        toast.error(err.message);
                        console.log(e, "error");
                    }
                }
            } catch (e: any) {
                setTransactionLoading(false);
                const err = serializeError(e);
                toast.error(err.message);
                console.log(e, "e");
            }
        }
    };

    const createPrivateWallet = async () => {
        const _inputValue = inputValue.replace(/[^\d.]/g, "");
        if (_inputValue) {
            setTransactionLoading(true);
            setChestLoadingText("Initializing private wallet and creating link...");
            try {
                // const walletCore = await initWasm();
                // const wallet = new Wallet(walletCore);
                const payData = await Plink.create();

                console.log(payData)

                setChestLoadingText(`Sending ${_inputValue} SOL`);

                const destinationSigner = new Keypair(payData.keypair);
                // const destinationEOAAddress = await destinationSigner.getAddress();
                // const ethAdapter = new EthersAdapter({
                //     ethers,
                //     signerOrProvider: destinationSigner,
                // });
                setChestLoadingText("Creating solana address for chest");
                // const safeFactory = await SafeFactory.create({
                //     ethAdapter: ethAdapter,
                // });
                // const safeAccountConfig: SafeAccountConfig = {
                //     owners: [destinationEOAAddress],
                //     threshold: 1,
                // };
                // const destinationAddress = await safeFactory.predictSafeAddress(
                //     safeAccountConfig,
                // );
                setChestLoadingText("contract created");

                if (loggedInVia === LOGGED_IN.GOOGLE) {
                    // const relayPack = new GelatoRelayPack(process.env.NEXT_PUBLIC_GELATO_RELAY_API_KEY);
                    setChestLoadingText(
                        "Initializing wallet for transaction relay",
                    );
                    var myHeaders = new Headers();
                    myHeaders.append("x-api-key", process.env.NEXT_PUBLIC_SHYFT_API_KEY);
                    
                    var requestOptions = {
                      method: 'POST',
                      headers: myHeaders,
                      redirect: 'follow'
                    };
                    
                    var feePayer = await fetch("https://api.shyft.to/sol/v1/txn_relayer/create", requestOptions)
                      .then(response => response.text())
                      .then(result => JSON.parse(result))
                      .catch(error => console.log('error', error));
                    // const fromEthProvider = new ethers.providers.Web3Provider(provider);
                    // const fromSigner = await fromEthProvider.getSigner();
                    // const safeAccountAbstraction = new AccountAbstraction(fromSigner);
                    // await safeAccountAbstraction.init({ relayPack });
                    setChestLoadingText("Transaction process has begun...");
                    // const safeTransactionData: MetaTransactionData = {
                    //     to: destinationAddress,
                    //     data: "0x",
                    //     value: parseEther(inputValue).toString(),
                    //     operation: OperationType.Call,
                    // };

                    // const options: MetaTransactionOptions = {
                    //     gasLimit: "100000",
                    //     isSponsored: true,
                    // };

                    // const gelatoTaskId = await safeAccountAbstraction.relayTransaction(
                    //     [safeTransactionData],
                    //     options,
                    // );
                    // console.log("gelatoTaskId ", gelatoTaskId);
                    // console.log(`https://relay.gelato.digital/tasks/status/${gelatoTaskId}`);
                    // solanaWallet is from above

                    console.log(feePayer)

                    // const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
                    
                    // const block = await connection.getLatestBlockhash("finalized");
                    // const TransactionInstruction = SystemProgram.transfer({
                    //     fromPubkey: new PublicKey(address),
                    //     toPubkey: new PublicKey(destinationSigner.publicKey),
                    //     lamports: Number(inputValue) * Math.pow(10, 9),
                    // });

                    // const transaction = new Transaction({
                    //     blockhash: block.blockhash,
                    //     lastValidBlockHeight: block.lastValidBlockHeight,
                    //     feePayer: new PublicKey(feePayer.result.wallet),
                    // }).add(TransactionInstruction);

                    if (privateBalance > BigInt(0)) {
                        // Send half a SOL
                        setChestLoadingText("It should take a bit long...You may need a coffee");
                        const tokenSymbol = (tokenProgram.tokenMint == "SOL") ? "LAMPORTS" : tokenProgram.name
                        const sig = await send(
                            elusiv,
                            destinationSigner.publicKey,
                            Number(_inputValue) * Math.pow(10, tokenProgram.decimals),
                            tokenSymbol
                        );
                        setChestLoadingText(
                            `Operation Successful: Transaction Completed with sig ${sig.signature}`,
                        );
                        router.push(payData.url.toString());

                    }

                    // we need a get the solana wallet to sign here
                    // const solanaWallet = new SolanaWallet(provider);

                    // const signedTx = await solanaWallet.signTransaction(transaction);

                    // const serializedTransaction = signedTx.serialize({ requireAllSignatures: false, verifySignatures: true });
                    // const transactionBase64 = serializedTransaction.toString('base64');

                    // var myHeaders = new Headers();
                    // myHeaders.append("x-api-key", process.env.NEXT_PUBLIC_SHYFT_API_KEY);
                    // myHeaders.append("Content-Type", "application/json");
                    
                    // var raw = JSON.stringify({
                    // "network": "devnet",
                    // "encoded_transaction": transactionBase64
                    // });
                    
                    // var reqOptions = {
                    // method: 'POST',
                    // headers: myHeaders,
                    // body: raw,
                    // redirect: 'follow'
                    // };
                    // // const serializedTransaction = tx.serialize({ requireAllSignatures: false, verifySignatures: true });
                    // // const transactionBase64 = serializedTransaction.toString('base64');
                    
                    // var relayResult = await fetch("https://api.shyft.to/sol/v1/txn_relayer/sign", reqOptions)
                    // .then(response => response.text())
                    // .then(result => JSON.parse(result))
                    // .catch(error => console.log('error', error));
                    // if (relayResult) {
                    //     console.log(relayResult)
                    //     setChestLoadingText(
                    //         "Transaction on its way! Awaiting confirmation...",
                    //     );
                    //     handleTransactionStatus(relayResult, payData.url.toString());
                    // }
                } else {
                    try {
                        // const sendAmount = await sendTransaction({
                        //     to: destinationAddress,
                        //     value: parseEther(inputValue),
                        // });
                        // handleTransactionStatus(sendAmount.hash, payData.url);
                    } catch (e: any) {
                        setTransactionLoading(false);
                        const err = serializeError(e);
                        toast.error(err.message);
                        console.log(e, "error");
                    }
                }
            } catch (e: any) {
                setTransactionLoading(false);
                const err = serializeError(e);
                toast.error(err.message);
                console.log(e, "e");
            }
        }
    };

    const handleTransactionStatus = (relayResult: any, link: string) => {
        const intervalInMilliseconds = 2000;
        const interval = setInterval(() => {
            if (loggedInVia === LOGGED_IN.GOOGLE) {
                if (relayResult && relayResult.success) {

                        setChestLoadingText(
                            "Operation Successful: Transaction Completed!",
                        );
                        router.push(link);
                        if (interval !== null) {
                            clearInterval(interval);
                        }

                } else {
                    setTransactionLoading(false);
                    toast.error("Failed to Load Chest. Try Again");
                    if (interval !== null) {
                        clearInterval(interval);
                    }
                }
                // getRelayTransactionStatus(hash)
                //     .then((res: any) => {
                //         if (res) {
                //             console.log(res, "res");
                //             const task = res.data.task;
                //             if (task) {
                //                 setChestLoadingText("Verifying Transaction Status...");
                //                 if (task.taskState === "ExecSuccess") {
                //                     setChestLoadingText(
                //                         "Operation Successful: Transaction Completed!",
                //                     );
                //                     router.push(link);
                //                     if (interval !== null) {
                //                         clearInterval(interval);
                //                     }
                //                 }
                //             } else {
                //                 setTransactionLoading(false);
                //                 toast.error("Failed to Load Chest. Try Again");
                //                 if (interval !== null) {
                //                     clearInterval(interval);
                //                 }
                //             }
                //         }
                //     })
                //     .catch((e) => {
                //         setTransactionLoading(false);
                //         toast.error(e.message);
                //         console.log(e, "e");
                //         if (interval !== null) {
                //             clearInterval(interval);
                //         }
                //     });
            } else {
                // getSendTransactionStatus(hash)
                //     .then((res: any) => {
                //         if (res.result) {
                //             const status = Number(res.result.status);
                //             if (status === 1) {
                //                 router.push(link);
                //                 if (interval !== null) {
                //                     clearInterval(interval);
                //                 }
                //             } else {
                //                 setTransactionLoading(false);
                //                 toast.error("Failed to Load Chest. Try Again");
                //                 if (interval !== null) {
                //                     clearInterval(interval);
                //                 }
                //             }
                //         }
                //     })
                //     .catch((e) => {
                //         setTransactionLoading(false);
                //         toast.error(e.message);
                //         console.log(e, "e");
                //         if (interval !== null) {
                //             clearInterval(interval);
                //         }
                //     });
            }
        }, intervalInMilliseconds);
    };

    const handleShowActivity = () => {
        setShowActivity(!showActivity);
    };

    return (
        <div className="mx-auto relative flex items-center justify-center">
            <ToastContainer
                toastStyle={{ backgroundColor: "#282B30" }}
                className={`w-50`}
                style={{ width: "600px" }}
                position="bottom-center"
                autoClose={6000}
                hideProgressBar={true}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                theme="dark"
            />
            {(!wormholeEnabled && !transactionLoading) ? (
                <div className="max-w-[400px]">
                    <ProfileCard
                        balance={price}
                        showActivity={false}
                        transactionLoading={false}
                    ></ProfileCard>

                    {!showActivity ? (
                        <>
                            <div className="rounded-lg border border-white/40 bg-white/5 ">
                                <div className="flex items-center justify-between py-2 px-4">
                                    <div>
                                        <p className="text-[#798593] paragraph">
                                            YOUR BALANCE
                                        </p>
                                        <div className="flex items-start gap-3 my-2">
                                            <Image
                                                src={icons.transferIcon}
                                                alt="transferIcon"
                                                onClick={handleToggle}
                                                className="cursor-pointer"
                                            />
                                            {toggle ? (
                                                loading ? (
                                                    <div className="w-full h-full">
                                                        <div className="w-[40px] h-[10px] bg-white/10 animate-pulse rounded-lg mb-2"></div>
                                                        <div className="w[40px] h-[10px] bg-white/10 animate-pulse rounded-lg "></div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-white/80 text-[24px] font-semibold leading-10 mb-2">
                                                            {price}
                                                        </p>
                                                        <p className="text-white/30 text-[14px] leading-[14px]">
                                                            {tokenValue + " " + tokenProgram.name}
                                                        </p>
                                                    </div>
                                                )
                                            ) : loading ? (
                                                <div className="w-full h-full">
                                                    <div className="w-[40px] h-[10px] bg-white/10 animate-pulse rounded-lg mb-2"></div>
                                                    <div className="w[40px] h-[10px] bg-white/10 animate-pulse rounded-lg "></div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-white/80 text-[24px] font-semibold leading-10 mb-2">
                                                        ~ {tokenValue + " " + tokenProgram.name}
                                                    </p>
                                                    <p className="text-white/30 text-[12px] leading-[14px]">
                                                        {price}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-start gap-3 my-2">
                                            <p className="text-[#798593] text-[14px] font-semibold leading-10">
                                                Private Balance:
                                            </p>
                                            {toggle ? (
                                                loading ? (
                                                    <div className="w-full h-full">
                                                        <div className="w-[40px] h-[10px] bg-white/10 animate-pulse rounded-lg mb-2"></div>
                                                        <div className="w[40px] h-[10px] bg-white/10 animate-pulse rounded-lg "></div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-white/60 text-[14px] font-semibold leading-10">
                                                            {Number(privateBalance) / Math.pow(10, tokenProgram.decimals) + " " + tokenProgram.name + " (fee: ~0.1)"}
                                                        </p>
                                                    </div>
                                                )
                                            ) : loading ? (
                                                <div className="w-full h-full">
                                                    <div className="w-[40px] h-[10px] bg-white/10 animate-pulse rounded-lg mb-2"></div>
                                                    <div className="w[40px] h-[10px] bg-white/10 animate-pulse rounded-lg "></div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-white/80 text-[24px] font-semibold leading-10 mb-2">
                                                        ~ {privateBalance.toString() + " " + tokenProgram.name}
                                                    </p>
                                                    <p className="text-white/30 text-[12px] leading-[14px]">
                                                        {price}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Image src={(tokenProgram.tokenMint == "SOL") ? icons.solLogo: icons.usdcIcon} alt="transferIcon" />
                                        <select value={tokenProgram.tokenMint + "-" + tokenProgram.name + "-" + tokenProgram.decimals} onChange={handleTokenProgramChange}>
                                            <option value="SOL-SOL-9">SOL</option>
                                            <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v-USDC-6">USDC</option>
                                        </select>
                                    </div>
                                </div>
                                <div
                                    className="bg-white/80 py-2 rounded-b-lg cursor-pointer"
                                    role="presentation"
                                    onClick={() => {
                                        setOpen(true);
                                    }}
                                >
                                    <p className="text-[#010101] text-[14px] leading-[18px] font-medium text-center">
                                        + Add funds to your account
                                    </p>
                                </div>
                            </div>
                            <div className="w-full mt-5 ">
                                <div className="relative rounded-lg border bg-white/5 border-gray-500  h-auto  p-4">
                                    <div className="flex items-center justify-center">
                                        <div>
                                            <div className="flex items-center justify-center">
                                                {/* <p className="text-[32px] text-white">$</p> */}
                                                <input
                                                    name="usdValue"
                                                    style={{ caretColor: "white" }}
                                                    inputMode="decimal"
                                                    type="text"
                                                    className={`dollorInput pl-0 pt-2 pb-1 backdrop-blur-xl text-[32px] border-none text-center bg-transparent text-white dark:text-textDark-900 placeholder-white dark:placeholder-textDark-300 rounded-lg block w-full focus:outline-none focus:ring-transparent`}
                                                    placeholder="$0"
                                                    value={value}
                                                    onChange={(e) => {
                                                        handleInputChange(e.target.value);
                                                    }}
                                                    disabled={loading}
                                                    onWheel={() =>
                                                        (
                                                            document.activeElement as HTMLElement
                                                        ).blur()
                                                    }
                                                />
                                            </div>
                                            {Number(inputValue) > 0 && (
                                                <p className="text-white/30 text-[12px] leading-[14px] text-center">
                                                    ~ {inputValue + " " + tokenProgram.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-5">
                                <div
                                    className="rounded-lg border border-gray-500 bg-white/5 p-2 cursor-pointer"
                                    role="presentation"
                                    onClick={() => {
                                        handleValueClick("1");
                                    }}
                                >
                                    <p className="text-center text-white">$1</p>
                                </div>
                                <div
                                    className="rounded-lg border border-gray-500 bg-white/5 p-2 cursor-pointer"
                                    role="presentation"
                                    onClick={() => {
                                        handleValueClick("2");
                                    }}
                                >
                                    <p className="text-center text-white">$2</p>
                                </div>
                                <div
                                    className="rounded-lg border border-gray-500 bg-white/5 p-2 cursor-pointer"
                                    role="presentation"
                                    onClick={() => {
                                        handleValueClick("5");
                                    }}
                                >
                                    <p className="text-center text-white">$5</p>
                                </div>
                            </div>
                            <div className="relative mt-10">
                                <div
                                    className={`${
                                        !btnDisable && value
                                            ? "opacity-100"
                                            : "opacity-50"
                                    } flex gap-2 justify-between`}
                                >
                                    <PrimaryBtn
                                        className={`w-[45%] lg:w-[185px] max-w-[185px] mx-0 ${
                                            btnDisable || !value
                                                ? "cursor-not-allowed"
                                                : ""
                                        }`}
                                        title={"Create Link"}
                                        onClick={createWallet}
                                        btnDisable={btnDisable || !value}
                                    />
                                    <SecondaryBtn
                                        className={`w-[20%] lg:w-[185px] text-[#CEDDE0] max-w-[185px] mx-0 ${
                                            btnDisable || !value || tokenValue <= Number(inputValue)
                                                ? "cursor-not-allowed opacity-50"
                                                : ""
                                        }`}
                                        title={"Topup"}
                                        onClick={(e) => topupHandler(e)}
                                        btnDisable={btnDisable || !value || tokenValue <= Number(inputValue)}
                                    />
                                    <PrimaryBtn
                                        className={`w-[20%] lg:w-[185px] max-w-[185px] mx-0 ${
                                            btnDisable || !value || privateBalance <= Number(inputValue) * Math.pow(10, tokenProgram.decimals)
                                                ? "cursor-not-allowed opacity-50"
                                                : ""
                                        }`}
                                        title={"Private Link"}
                                        onClick={createPrivateWallet}
                                        btnDisable={btnDisable || !value || privateBalance <= Number(inputValue) * Math.pow(10, tokenProgram.decimals)}
                                    />
                                </div>
                            </div>
                            <div className="relative mt-10">
                                <div
                                    className={`flex gap-2 justify-center items-center`}
                                >
                                    <DevelopmentBtn
                                        className={`w-[50%] lg:w-[185px] max-w-[185px] mx-0 cursor-not-allowed`}
                                        title={"Invoice Request"}
                                        rightImage={icons.usdcIcon}
                                        onClick={(e) => {}}
                                        btnDisable={true}
                                    />
                                </div>
                            </div>
                            <div className="relative mt-5">
                                <div
                                    className={`flex gap-2 justify-between`}
                                >
                                    <DevelopmentBtn
                                        className={`w-[45%] lg:w-[185px] max-w-[185px] mx-0 cursor-not-allowed`}
                                        title={"cNFT Drops Link (token-gated)"}
                                        onClick={(e) => {}}
                                        btnDisable={true}
                                    />
                                    <DevelopmentBtn
                                        className={`w-[45%] lg:w-[185px] max-w-[185px] mx-0 cursor-not-allowed`}
                                        title={"Vault Instant Link (highest degen APR)"}
                                        onClick={(e) => {}}
                                        btnDisable={true}
                                    />
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            ) : (transactionLoading ? (
                <div className="w-[full] max-w-[600px] h-full relative flex flex-col text-center items-center gap-5 mx-auto mt-20">
                    <ReactTyped
                        className="text-white text-[24px]"
                        strings={[chestLoadingText]}
                        typeSpeed={40}
                        loop={true}
                    />
                    <Lottie animationData={loaderAnimation} />
                </div>
            ) : (
                <div className="lg:min-w-[600px] rounded-[12px] h-full relative justify-center items-center text-center mx-auto mt-20">
                    <WormholeBridge />
                    { wormholeLoading && 
                        <ReactTyped
                        className="text-white text-[24px]"
                        strings={["Wormhole loading...."]}
                        typeSpeed={40}
                        loop={true} 
                        />
                    }
                </div>
            ))}
            <DepositAmountModal
                open={open}
                setOpen={setOpen}
                openWormhole={handleOpenWormhole}
                walletAddress={fromAddress}
                tokenPrice={tokenPrice}
                fetchBalance={fetchBalance}
            />

        </div>
    );
};

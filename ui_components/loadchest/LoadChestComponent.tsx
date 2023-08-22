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
import { Plink } from '../../utils/wallet/plink';
import { Keypair, Connection, Transaction, PublicKey, SystemProgram, LAMPORTS_PER_SOL, sendTransaction } from '@solana/web3.js'
import { SolanaWallet } from "@web3auth/solana-provider"
import {
    getBalance,
    getRelayTransactionStatus,
    getSendTransactionStatus,
    getUsdPrice,
} from "../../apiServices";
import { GlobalContext } from "../../context/GlobalContext";
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
import PrivateSend from "../PrivateSend"
import { ProfileCard } from "./ProfileCard";
import { useWagmi } from "../../utils/wagmi/WagmiContext";
import ReactTyped from "react-typed";
import { SolanaWalletProvider } from "../../context/SolanaWalletContext";

export interface ILoadChestComponent {
    provider?: any;
}
export const LoadChestComponent: FC<ILoadChestComponent> = (props) => {
    const { provider } = props;

    const {
        state: { loggedInVia, address },
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
    const [toggle, setToggle] = useState(true);
    const [btnDisable, setBtnDisable] = useState(true);
    const [balanceInUsd, setBalanceInUsd] = useState("");
    const [showActivity, setShowActivity] = useState(false);
    const [chestLoadingText, setChestLoadingText] = useState("");

    const handleToggle = () => {
        setToggle(!toggle);
    };

    // const { sendTransaction } = useWagmi();

    useEffect(() => {
        if (address) {
            fetchBalance();
        }
    }, [address]);

    const fetchBalance = async () => {
        setLoading(true);
        getUsdPrice()
            .then(async (res: any) => {
                setTokenPrice(res.data.solana.usd);
                setFromAddress(address);
                const balance = (await getBalance(address)) as any;
                console.log(balance)
                setTokenValue(
                    getTokenFormattedNumber(
                        balance.result.value as unknown as string,
                        9,
                    ),
                );
                const formatBal = (
                    (balance.result.value / Math.pow(10, 9)) *
                    res.data.solana.usd
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
                        "Initializing account abstraction for transaction relay",
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

                    const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
                    
                    const block = await connection.getLatestBlockhash("finalized");
                    const TransactionInstruction = SystemProgram.transfer({
                        fromPubkey: new PublicKey(address),
                        toPubkey: new PublicKey(destinationSigner.publicKey),
                        lamports: Number(inputValue) * Math.pow(10, 9),
                    });

                    const transaction = new Transaction({
                        blockhash: block.blockhash,
                        lastValidBlockHeight: block.lastValidBlockHeight,
                        feePayer: new PublicKey(feePayer.result.wallet),
                    }).add(TransactionInstruction);

                    // we need a get the solana wallet to sign here
                    const solanaWallet = new SolanaWallet(provider);

                    const signedTx = await solanaWallet.signTransaction(transaction);

                    const serializedTransaction = signedTx.serialize({ requireAllSignatures: false, verifySignatures: true });
                    const transactionBase64 = serializedTransaction.toString('base64');

                    var myHeaders = new Headers();
                    myHeaders.append("x-api-key", process.env.NEXT_PUBLIC_SHYFT_API_KEY);
                    myHeaders.append("Content-Type", "application/json");
                    
                    var raw = JSON.stringify({
                    "network": "devnet",
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
                            "Transaction on its way! Awaiting confirmation...",
                        );
                        handleTransactionStatus(relayResult, payData.url.toString());
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
        <div className="mx-auto relative max-w-[400px]">
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
            {!transactionLoading ? (
                <div>
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
                                                        <p className="text-white/30 text-[12px] leading-[14px]">
                                                            {tokenValue} SOL
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
                                                        ~ {tokenValue} SOL
                                                    </p>
                                                    <p className="text-white/30 text-[12px] leading-[14px]">
                                                        {price}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Image src={icons.solLogo} alt="transferIcon" />
                                        <p className="text-white text-[24px] font-normal leading-9">
                                            SOL
                                        </p>
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
                                                    ~ {inputValue} SOL
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
                                        className={`w-[30%] lg:w-[185px] text-[#CEDDE0] max-w-[185px] mx-0 ${
                                            btnDisable || !value
                                                ? "cursor-not-allowed"
                                                : ""
                                        }`}
                                        title={"Private Link"}
                                        onClick={(e) => {}}
                                    />
                                </div>
                            </div>
                            {/* <PrivateSend /> */}

                        </>
                    ) : null}
                </div>
            ) : (
                <div className="w-[full] max-w-[600px] h-full relative flex flex-col text-center items-center gap-5 mx-auto mt-20">
                    <ReactTyped
                        className="text-white text-[24px]"
                        strings={[chestLoadingText]}
                        typeSpeed={40}
                        loop={true}
                    />
                    <Lottie animationData={loaderAnimation} />
                </div>
            )}
            <DepositAmountModal
                open={open}
                setOpen={setOpen}
                walletAddress={fromAddress}
                tokenPrice={tokenPrice}
                fetchBalance={fetchBalance}
            />
        </div>
    );
};

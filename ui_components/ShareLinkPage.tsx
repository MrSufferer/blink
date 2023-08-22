import "react-toastify/dist/ReactToastify.css";

import AccountAbstraction from "@safe-global/account-abstraction-kit-poc";
import { EthersAdapter, SafeAccountConfig, SafeFactory } from "@safe-global/protocol-kit";
import { GelatoRelayPack } from "@safe-global/relay-kit";
import Confetti from "react-confetti";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, Keypair } from "@solana/web3.js";

import {
    MetaTransactionData,
    MetaTransactionOptions,
    OperationType,
} from "@safe-global/safe-core-sdk-types";
import { initWasm } from "@trustwallet/wallet-core";
import { BigNumber } from "bignumber.js";
import { serializeError } from "eth-rpc-errors";
import { ethers } from "ethers";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { FC, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import { parseEther } from "viem";
import { Plink } from "../utils/wallet/plink"
import "tailwindcss/tailwind.css";

import {
    getBalance,
    getEstimatedGas,
    getNonce,
    getRelayTransactionStatus,
    getSendRawTransaction,
    getSendTransactionStatus,
    getUsdPrice,
} from "../apiServices";
import { GlobalContext } from "../context/GlobalContext";
import {
    encryptAndEncodeHexStrings,
    getCurrencyFormattedNumber,
    getTokenValueFormatted,
    hexFormatter,
    hexToNumber,
    numHex,
} from "../utils";
import { Base } from "../utils/chain/base";
import { BaseGoerli } from "../utils/chain/baseGoerli";
import { icons } from "../utils/images";
import { useWagmi } from "../utils/wagmi/WagmiContext";
import { Wallet } from "../utils/wallet";
import { TRANSACTION_TYPE, TTranx } from "../utils/wallet/types";
import ClaimBtnModal from "./ClaimBtnModal";
import Footer from "./footer";
import { QRComponent } from "./loadchest/QRComponent";
import PrimaryBtn from "./PrimaryBtn";
import QrModal from "./QrModal";
import SecondaryBtn from "./SecondaryBtn";
import { ShareBtnModal } from "./ShareBtnModal";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export interface IShareLink {
    uuid: string;
}

const ShareLink: FC<IShareLink> = (props) => {

    const { connection } = useConnection();
    const { publicKey, sendTransaction, connecting: isConnecting, connected, disconnecting } = useWallet();
    const {
        state: { isConnected },
    } = useContext(GlobalContext);
    const { uuid } = props;
    const [toAddress, setToAddress] = useState("");
    const [walletBalance, setWalletBalance] = useState(0);
    const [fromAddress, setFromAddress] = useState("");
    const [wallet, setWallet] = useState("" as unknown as Wallet);
    const [shareText, setShareText] = useState("Share");
    const [showShareIcon, setShowShareIcon] = useState(true);
    const [tokenValue, setTokenValue] = useState("");
    const [headingText, setHeadingText] = useState("Your Chest is ready to claim!");
    const [linkValueUsd, setLinkValueUsd] = useState("");
    const [isRedirected, setIsRedirected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [openClaimModal, setOpenClaimModal] = useState(false);
    const [openShareModal, setOpenShareModal] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [isClaimSuccessful, setIsClaimSuccessful] = useState(false);

    const [url, setUrl] = useState("");
    const shareData = {
        text: "Here is you Gifted Chest",
        url: typeof window !== "undefined" ? window.location.href : "",
    };

    const handleShareURL = () => {
        if (navigator?.share) {
            navigator
                .share(shareData)
                .then(() => console.log("Successfully shared"))
                .catch((error) => console.log("Error sharing", error));
        }
    };

    const copyAddress = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(fromAddress);
    };

    const copyToClipBoard = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(window.location.href);
        setShareText("Link Copied!");
        setShowShareIcon(false);
        setTimeout(() => {
            setShareText("Share");
            setShowShareIcon(true);
        }, 4000);
    };

    useMemo(async () => {
        if (uuid && uuid != "/[id]") {
            // const walletCore = await initWasm();
            // const wallet = new Wallet(walletCore);
            // setWallet(wallet);
            const plink = await Plink.fromLink("http://localhost:3000/" + uuid)
            
            const destinationSigner = new Keypair(plink.keypair)
            // const account = wallet.getAccountFromPayLink(uuid);
            // const eoaAddress = account.address;
            // const eoaKey = account.key;
            // const ethersProvider = new ethers.providers.JsonRpcProvider(
            //     BaseGoerli.info.rpc,
            // );
            // const destinationSigner = new ethers.Wallet(eoaKey, ethersProvider);
            // const ethAdapter = new EthersAdapter({
            //     ethers,
            //     signerOrProvider: destinationSigner,
            // });
            // const safeFactory = await SafeFactory.create({
            //     ethAdapter: ethAdapter,
            // });
            // const safeAccountConfig: SafeAccountConfig = {
            //     owners: [eoaAddress],
            //     threshold: 1,
            // };
            // const smartAddress = await safeFactory.predictSafeAddress(safeAccountConfig);
            if (destinationSigner.publicKey) {
                setFromAddress(destinationSigner.publicKey);
            } else {
                console.log("error", "invalid identifier");
            }
            await fetchBalance(destinationSigner.publicKey);
        }
    }, [uuid]);

    const fetchBalance = async (address: string) => {
        const balance = (await getBalance(address)) as any;
        const bgBal = BigNumber(balance.result.value);
        const bgNum = bgBal.dividedBy(Math.pow(10, 9)).toNumber();
        setWalletBalance(bgNum);
        getUsdPrice().then(async (res: any) => {
            setTokenValue(getTokenValueFormatted(bgNum, 9, false));
            setIsLoading(false);
            const formatBal = bgNum * res.data.solana.usd;
            setLinkValueUsd(getCurrencyFormattedNumber(formatBal, 2, "USD", true));
        });
    };

    const handleClaimClick = () => {
        setOpenClaimModal(true);
    };

    const handleCloseClaimModal = () => {
        setOpenClaimModal(false);
    };

    const handlePublicAddressTransaction = (toAdd: string) => {
        handleCloseClaimModal();
        sendToken(toAdd);
    };

    const handleConnect = async () => {
        // setProcessing(true);
        // if (connected) {
        //     setToAddress(publicKey);
        //     handleCloseClaimModal();
        //     sendToken(publicKey);
        // } else {
        //     try {
        //         // const result = await connect({
        //         //     chainId: baseGoerli.id,
        //         //     connector: injectConnector,
        //         // });
        //         // setToAddress(result.account);
        //         // toast.success(`Wallet Connected`);
        //         // handleCloseClaimModal();
        //         // sendToken(result.account);
        //     } catch (e: any) {
        //         const err = serializeError(e);
        //         console.log(err, "err");
        //         setProcessing(false);
        //         toast.error(e.message);
        //     }
        // }


    };

    useEffect(() => {
        if (connected) {
            setToAddress(publicKey);
            handleCloseClaimModal();
            sendToken(publicKey);
            toast.success("Claiming Token....");
        }
    }, [isConnecting]);



    const sendToken = async (toAdd: string) => {
        setProcessing(true);
        try {
            // const walletCore = await initWasm();
            // const wallet = new Wallet(walletCore);
            // const gasLimitData = (await getEstimatedGas({
            //     from: fromAddress,
            //     to: toAdd,
            //     value: walletBalanceHex,
            // })) as any;

            const fromLink = await Plink.fromLink("http://localhost:3000" + uuid);

            // const ethersProvider = new ethers.providers.JsonRpcProvider(
            //     BaseGoerli.info.rpc,
            // );
            // const relayPack = new GelatoRelayPack(process.env.NEXT_PUBLIC_GELATO_RELAY_API_KEY);

            // from signer address
            const fromSigner = new Keypair(fromLink.keypair);
            // const safeAccountAbstraction = new AccountAbstraction(fromSigner);
            // await safeAccountAbstraction.init({ relayPack });

            const amountValue = walletBalance * Math.pow(10, 9);

            // const safeTransactionData: MetaTransactionData = {
            //     to: toAdd,
            //     data: "0x",
            //     value: parseEther(amountValue.toString()).toString(),
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
            // console.log(gelatoTaskId, "task id");
            // if (gelatoTaskId) {
            //     handleTransactionStatus(gelatoTaskId);
            // }

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

            console.log(feePayer)

            const connection = new Connection("https://api.devnet.solana.com", 'confirmed');
            
            const block = await connection.getLatestBlockhash("finalized");
            const TransactionInstruction = SystemProgram.transfer({
                fromPubkey: new PublicKey(fromSigner.publicKey),
                toPubkey: new PublicKey(toAdd),
                lamports: amountValue,
            });

            const transaction = new Transaction({
                blockhash: block.blockhash,
                lastValidBlockHeight: block.lastValidBlockHeight,
                feePayer: new PublicKey(feePayer.result.wallet),
            }).add(TransactionInstruction);


            const signedTx = await transaction.sign(fromSigner);

            const serializedTransaction = await transaction.serialize({ requireAllSignatures: false, verifySignatures: true });
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
                handleTransactionStatus(relayResult);
            }

        } catch (e: any) {
            setProcessing(false);
            toast.error(e.message);
            console.log(e, "e");
        }
    };

    const handleTransactionStatus = (relayResult: any) => {
        const intervalInMilliseconds = 2000;
        const interval = setInterval(() => {

            if (relayResult && relayResult.success) {
                // if (task.taskState === "ExecSuccess") {
                    handleClaimSuccess();
                    if (interval !== null) {
                        clearInterval(interval);
                    }
                // }
            } else {
                setProcessing(false);
                const err = serializeError("Failed to Claim! Maybe out of gas fee");
                toast.error(err.message);
                if (interval !== null) {
                    clearInterval(interval);
                }
            }
        }, intervalInMilliseconds);
    };

    const handleClaimSuccess = () => {
        setIsClaimSuccessful(true);
        setProcessing(false);
        toast.success("Claimed Successfully");
        fetchBalance(fromAddress);
    };

    useEffect(() => {
        if (window.history.length <= 2) {
            setIsRedirected(false);
        } else {
            setIsRedirected(true);
        }
        setUrl(window.location.href);
    }, []);

    return (
        <div className="w-full h-screen relative flex items-center">
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
            <div className="w-full h-[70%] text-center p-4  flex flex-col gap-5 items-center">
                <p className="text-white text-[20px] font-bold">{headingText}</p>

                <div className="w-full md:w-[60%] max-w-[450px] h-[235px] shareLinkBg mb-16 cardShine">
                    <div className=" rounded-lg profileBackgroundImage flex flex-col justify-between h-full">
                        {isLoading ? (
                            <div className="w-full h-full mt-5 ml-5">
                                <div className="w-[15%] h-[20%] bg-white/10 animate-pulse rounded-lg mb-2"></div>
                                <div className="w-[10%] h-[12%] bg-white/10 animate-pulse rounded-lg "></div>
                            </div>
                        ) : (
                            <div className="flex justify-between">
                                <div className="flex gap-1 flex-col text-start ml-3">
                                    <p className="text-[40px] text-[#F4EC97] font bold">{`${linkValueUsd}`}</p>
                                    <p className="text-sm text-white/50">{`~ ${tokenValue} SOL`}</p>
                                    <div className="flex justify-around w-[100px] mx-auto mt-1.5">
                                        <Link
                                            href={`https://explorer.solana.com/address/${fromAddress}`}
                                            target="_blank"
                                        >
                                            <Image
                                                src={icons.linkWhite}
                                                alt="external link"
                                                className="w-5 cursor-pointer opacity-60 hover:opacity-100"
                                            />
                                        </Link>

                                        <Image
                                            src={icons.qrWhite}
                                            alt="show qr code"
                                            className="w-5 cursor-pointer opacity-60 hover:opacity-100"
                                            onClick={() => {
                                                setShowQr(!showQr);
                                            }}
                                        />
                                        <Image
                                            src={icons.copyIconWhite}
                                            alt="copy address"
                                            className="w-5 cursor-pointer opacity-60 hover:opacity-100"
                                            onClick={copyAddress}
                                        />
                                    </div>
                                </div>
                                {/* <div className="pr-8 pt-2">
                                    <QRComponent
                                        walletAddress={url}
                                        isShareQr={true}
                                        widthPx={120}
                                        heightPx={120}
                                    />
                                </div> */}
                            </div>
                        )}
                        <div className="self-end">
                            {isClaimSuccessful ? <Image className="mt-[-29px]" src={icons.tchestopen} alt="Chest Open" /> : <Image className="" src={icons.tchest} alt="Chest" />}
                        </div>
                    </div>
                </div>
                {isRedirected ? (
                    <>
                        <div className="lg:hidden block w-full">
                            <PrimaryBtn
                                className={`${isLoading ? "opacity-60" : "opacity-100"}`}
                                title="Share"
                                onClick={() => {
                                    handleShareURL();
                                }}
                                rightImage={showShareIcon ? icons.shareBtnIcon : ""}
                                showShareIcon={showShareIcon}
                                btnDisable={isLoading}
                            />
                        </div>
                        <div className="hidden lg:block w-full max-w-[400px]">
                            <PrimaryBtn
                                className={`${isLoading ? "opacity-60" : "opacity-100"}`}
                                title={shareText}
                                onClick={() => {
                                    setOpenShareModal(true);
                                }}
                                rightImage={showShareIcon ? icons.shareBtnIcon : ""}
                                btnDisable={isLoading}
                            />
                        </div>
                        <SecondaryBtn
                            className={`${isLoading ? "opacity-60" : "opacity-100"}`}
                            title={processing ? "Processing..." : "Claim"}
                            onClick={() => handleClaimClick()}
                            rightImage={processing ? undefined : icons.downloadBtnIcon}
                            btnDisable={isLoading}
                        />
                    </>
                ) : (
                    <>
                        <PrimaryBtn
                            className={`${isLoading ? "opacity-60" : "opacity-100"}`}
                            title={processing ? "Processing..." : "Claim"}
                            onClick={() => handleClaimClick()}
                            rightImage={
                                processing ? undefined : icons.downloadBtnIconBlack
                            }
                            btnDisable={isLoading}
                        />
                        <div className="lg:hidden block w-full">
                            <SecondaryBtn
                                className={`${isLoading ? "opacity-60" : "opacity-100"}`}
                                title="Share"
                                onClick={() => {
                                    handleShareURL();
                                }}
                                rightImage={showShareIcon ? icons.shareBtnIconWhite : ""}
                                showShareIcon={showShareIcon}
                                btnDisable={isLoading}
                            />
                        </div>
                        <div className="hidden lg:block w-full max-w-[400px]">
                            <SecondaryBtn
                                className={`${isLoading ? "opacity-60" : "opacity-100"}`}
                                title={shareText}
                                onClick={() => {
                                    setOpenShareModal(true);
                                }}
                                rightImage={showShareIcon ? icons.shareBtnIconWhite : ""}
                                btnDisable={isLoading}
                            />
                        </div>
                    </>
                )}
            </div>
            <ClaimBtnModal
                open={openClaimModal}
                setOpen={setOpenClaimModal}
                uuid={uuid}
                handleConnect={handleConnect}
                handlePublicAddressTransaction={handlePublicAddressTransaction}
            />
            <ShareBtnModal open={openShareModal} setOpen={setOpenShareModal} />
            <QrModal open={showQr} setOpen={setShowQr} value={fromAddress} />
            {isClaimSuccessful && <Confetti width={2400} height={1200} recycle={false} numberOfPieces={2000} />}

            <Footer />
        </div>
    );
};
export default ShareLink;

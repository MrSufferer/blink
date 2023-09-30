import { Dialog, Transition } from "@headlessui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { serializeError } from "eth-rpc-errors";
import dynamic from "next/dynamic";
import Image from "next/image";
import QRCodeStyling, {
    CornerDotType,
    CornerSquareType,
    DotType,
    DrawType,
    ErrorCorrectionLevel,
    Gradient,
    Mode,
    Options,
    ShapeType,
    TypeNumber,
} from "qr-code-styling";
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import React, { FC, Fragment, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import { useAccount } from "wagmi";
import WormholeBridge from '@wormhole-foundation/wormhole-connect';

import { icons } from "../../utils/images";
import { DepositAmountComponent } from "./DepositAmountComponent";
import PrivateSend from "../PrivateSend"
import { QRComponent } from "./QRComponent";

export default dynamic(() => Promise.resolve(DepositAmountModal), {
    ssr: false,
});
export interface IDepositAmountModal {
    open: boolean;
    setOpen: (val: boolean) => void;
    openWormhole: (val: boolean) => void;
    walletAddress: string;
    tokenPrice: string;
    fetchBalance: () => void;
}

export const DepositAmountModal: FC<IDepositAmountModal> = (props) => {
    const { open, setOpen, openWormhole, walletAddress, tokenPrice, fetchBalance } = props;

    // const { getAccount, injectConnector, connect, baseGoerli } = useWagmi();

    const { connection } = useConnection();
    const { publicKey, sendTransaction, connecting: isConnecting, connected: isConnected, disconnecting } = useWallet();

    const [connecting, setConnecting] = useState(false);

    const [options] = useState<Options>({
        width: 240,
        height: 240,
        type: "svg",
        image: icons.logo.src,
        margin: 5,
        qrOptions: {
            typeNumber: 0,
            mode: "Byte",
            errorCorrectionLevel: "Q",
        },
        dotsOptions: {
            type: "extra-rounded",
            color: "#FFFFFF",
        },
        imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.5,
            margin: 15,
            crossOrigin: "anonymous",
        },
        backgroundOptions: {
            color: "#2B2D30",
        },
    });
    const [showQR, setShowQr] = useState(false);
    const [showWormhole, setShowWormhole] = useState(false)
    const [showDeposit, setShowDeposit] = useState(false);
    const [showOptions, setShowOptions] = useState(true);
    const [showPrivateSend, setShowPrivateSend] = useState(false);

    const handlePublicKeyClick = () => {
        setShowOptions(false);
        setShowDeposit(false);
        setShowQr(true);
    };

    const handlePrivateSendClick = () => {
        setShowOptions(false);
        setShowDeposit(false);
        setShowQr(false);
        setShowPrivateSend(true)
    };

    const handleWalletConnectFlow = () => {
        setShowOptions(false);
        setShowQr(false);
        setShowDeposit(true);
    };

    useEffect(() => {
        if (isConnected) {
            handleWalletConnectFlow();
            toast.success("Wallet Connected Successfully");
        }
    }, [isConnecting]);

    const handleClose = () => {
        setShowDeposit(false);
        setShowQr(false);
        setOpen(false);
        setShowOptions(true);
    };



    if (typeof window === "object") {
        return ReactDOM.createPortal(
            <Transition.Root show={open} as={Fragment}>
                <Dialog as="div" className="relative z-[1000]" onClose={handleClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 z-[1000] overflow-y-hidden md:rounded-[16px] overflow-y-scroll">
                        <div className="flex min-h-full items-end justify-center sm:items-center p-0">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <Dialog.Panel
                                    className={`bg-lightGray lg:min-w-[600px] rounded-[12px] w-full lg:w-[600px]  py-5`}
                                >
                                    {open && showOptions ? (
                                        <div className="px-4">
                                            <div
                                                role="presentation"
                                                className="rounded-lg border border-gray-500 bg-white/5 p-2 cursor-pointer mb-5"
                                            >
                                                <p className="text-center text-white">
                                                    {connecting
                                                        ? "Connecting..."
                                                        : <WalletModalProvider>
                                                            <WalletMultiButton />
                                                        </WalletModalProvider>}
                                                </p>
                                            </div>
                                            <div
                                                role="presentation"
                                                className="rounded-lg border border-gray-500 bg-white/5 p-2 cursor-pointer mb-5"
                                                onClick={() => {
                                                    setShowOptions(false);
                                                    setShowDeposit(false);
                                                    setOpen(false);
                                                    openWormhole(true);
                                                }}
                                            >
                                                <p className="text-center text-white">
                                                #️⃣ Cross-chain Deposit to Solana
                                                </p>
                                            </div>         
                                            <div
                                                role="presentation"
                                                className="rounded-lg border border-gray-500 bg-white/5 p-2 cursor-pointer"
                                                onClick={() => {
                                                    handlePublicKeyClick();
                                                }}
                                            >
                                                <p className="text-center text-white">
                                                    QR
                                                </p>
                                            </div>
                                            <div
                                                role="presentation"
                                                className="rounded-lg border border-gray-500 bg-white/5 p-2 cursor-pointer"
                                            >
                                                <p className="text-center text-white">
                                                    On-ramp (upcoming)
                                                </p>
                                            </div>                                  
                                        </div>
                                    ) : showQR && !showDeposit ? (
                                        <QRComponent
                                            walletAddress={walletAddress}
                                            widthPx={240}
                                            heightPx={240}
                                        />
                                    ) : (
                                        showDeposit &&
                                        !showQR && (
                                            <DepositAmountComponent
                                                tokenPrice={tokenPrice}
                                                walletAddress={walletAddress}
                                                handleClose={handleClose}
                                                fetchBalance={fetchBalance}
                                            />
                                        )
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>,
            document.body,
        );
    }
    return null;
};

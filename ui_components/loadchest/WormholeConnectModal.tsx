import { Dialog, Transition } from "@headlessui/react";
import dynamic from "next/dynamic";
import QRCodeStyling, {
    Options
} from "qr-code-styling";

import React, { FC, Fragment, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

import WormholeBridge from '@wormhole-foundation/wormhole-connect';

import { icons } from "../../utils/images";


export default dynamic(() => Promise.resolve(WormholeConnectModal), {
    ssr: false,
});
export interface IWormholeConnectModal {
    open: boolean;
    setOpen: (val: boolean) => void;
    walletAddress: string;
    tokenPrice: string;
    fetchBalance: () => void;
}

export const WormholeConnectModal: FC<IWormholeConnectModal> = (props) => {
    const { open, setOpen, walletAddress, tokenPrice, fetchBalance } = props;


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
    const [showDeposit, setShowDeposit] = useState(false);
    const [showOptions, setShowOptions] = useState(true);
    const [showPrivateSend, setShowPrivateSend] = useState(false);


    const handleClose = () => {
        setShowDeposit(false);
        setShowQr(false);
        setOpen(false);
        setShowOptions(true);
    };

    const Bridge = React.forwardRef((props, forwardedRef) => {
        return (
          <div ref={forwardedRef}>
          <WormholeBridge />
          </div>
        )
    })

    if (typeof window === "object") {
        return ReactDOM.createPortal(
            <Transition.Root show={open} as={Fragment}>
                <Dialog as="div" className="relative z-[1000]" onClose={handleClose}>
                    <Bridge />
                </Dialog>
            </Transition.Root>,
            document.body,
        );
    }
    return null;
};

import { getNetwork } from "@wagmi/core";
import Image from "next/image";
import * as React from "react";
import Head from 'next/head';

import { icons } from "../../utils/images";
import PrimaryBtn from "../PrimaryBtn";

interface IHome {
    handleSetupChest: () => void;
}

export default function HomePage(props: IHome) {
    const { handleSetupChest } = props;
    const { chain, chains } = getNetwork();
    return (
        <div>
            <Head>
                <title>Home | Blink</title>
            </Head>
            <div className="w-full text-center items-center p-2 flex-col">
                <h1 className="hero_text mt-12 text-[32px] leading-3 font-bold">
                    Share crypto rewards <br /> in just a link. No private key. No BS.
                </h1>
                <p className="md:heading3_regular mt-5 opacity-50 mb-14 text-[16px] leading-14 text-white">
                    Load the chest link with token which can be <br /> claimed by anyone you
                    share the link with. Or, you can send it privately via a blind link (a.k.a Blink).
                </p>
                <Image className="m-auto mb-20" src={icons.tchest} alt="Chest" />
                <PrimaryBtn
                    title="Setup a Link"
                    onClick={() => handleSetupChest()}
                />
            </div>
        </div>
    );
}

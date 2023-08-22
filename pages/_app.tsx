import "./globals.css";

import type { AppProps } from "next/app";
import React, { FC } from "react";

import GlobalContextProvider from "../context/GlobalContext";
import { WagmiWrapper } from "../utils/wagmi/WagmiContext";
import { SolanaWalletProvider } from "../context/SolanaWalletContext";


const Layout: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <main>
            <GlobalContextProvider>
                    <WagmiWrapper>
                        <SolanaWalletProvider>

                            <Component {...pageProps} />
                        </SolanaWalletProvider>
                    </WagmiWrapper>

            </GlobalContextProvider>
        </main>
    );
};

export default Layout;

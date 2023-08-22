import { serializeError } from "eth-rpc-errors";
import { FC, useEffect, useCallback, useState } from "react";
import { toast } from "react-toastify";
import { parseEther } from "viem";

import { getSendTransactionStatus } from "../../apiServices";
import { getTokenFormattedNumber } from "../../utils";
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import PrimaryBtn from "../PrimaryBtn";
export interface IDepositAmountComponent {
    tokenPrice: string;
    walletAddress: string;
    handleClose: () => void;
    fetchBalance: () => void;
}
export const DepositAmountComponent: FC<IDepositAmountComponent> = (props) => {
    const { tokenPrice, walletAddress, handleClose, fetchBalance } = props;
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();

    const [value, setValue] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [transactionLoading, setTransactionLoading] = useState(false);

    const handleInputChange = (val: string) => {
        setValue(val);
        const tokenIputValue = Number(val) / Number(tokenPrice);
        const tokenVal = tokenIputValue * Math.pow(10, 9);
        setInputValue(String(getTokenFormattedNumber(String(tokenVal), 9)));
    };

    const onClick = useCallback(async () => {
        if (!publicKey) throw new WalletNotConnectedError();

        // 890880 lamports as of 2022-09-01
        const lamports = await connection.getMinimumBalanceForRentExemption(0);

        const recipient = new PublicKey(walletAddress)

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: recipient,
                lamports: Number(inputValue) * Math.pow(10, 9),
            })
        );

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();

        const signature = await sendTransaction(transaction, connection, { minContextSlot });

        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

        // const signature = await sendAndConfirmTransaction(
        //     connection,
        //     transaction,
        //     [publicKey],
        //   );
    }, [publicKey, sendTransaction, connection]);

    const handleDepositClick = async () => {
        setTransactionLoading(true);
        const toAmount = Number(inputValue) * Math.pow(10, 18);
        try {
            const result = await sendTransaction({
                to: walletAddress,
                value: parseEther(inputValue),
            });
            handleTransactionStatus(result.hash);
        } catch (e: any) {
            setTransactionLoading(false);
            const err = serializeError(e);
            toast.error(err.message);
            console.log(e, "error");
        }
    };

    const handleTransactionStatus = (hash: string) => {
        const intervalInMilliseconds = 2000;
        const interval = setInterval(() => {
            getSendTransactionStatus(hash)
                .then((res: any) => {
                    if (res.result) {
                        const status = Number(res.result.status);
                        if (status === 1) {
                            setTransactionLoading(false);
                            fetchBalance();
                            handleClose();
                            toast.success("Depositted Successfully");
                        } else {
                            setTransactionLoading(false);
                            toast.error("Failed to Deposit Amount. Try Again");
                        }
                        if (interval !== null) {
                            clearInterval(interval);
                        }
                    }
                })
                .catch((e) => {
                    setTransactionLoading(false);
                    const err = serializeError(e);
                    toast.error(err.message);
                    console.log(e, "error");
                });
        }, intervalInMilliseconds);
    };

    return (
        <div>
            <div className="w-full mt-5 p-5">
                <div className="relative rounded-lg border bg-white/5 border-gray-500  h-auto  p-4">
                    <div className="flex items-center justify-center">
                        <div>
                            <div className="flex items-center justify-center">
                                <p className="text-[32px] text-white">$</p>
                                <input
                                    name={"usd value"}
                                    style={{ caretColor: "white" }}
                                    inputMode="decimal"
                                    type="number"
                                    className={`dollorInput pl-0 pt-2 pb-1 backdrop-blur-xl text-[32px] border-none text-center bg-transparent text-white placeholder-white rounded-lg block w-full focus:outline-none focus:ring-transparent`}
                                    placeholder={"0"}
                                    autoFocus={true}
                                    value={value}
                                    onChange={(e) => {
                                        handleInputChange(`${e.target.value}`);
                                    }}
                                    onWheel={() =>
                                        (document.activeElement as HTMLElement).blur()
                                    }
                                />
                            </div>
                            <p className="text-white text-[12px] leading-[14px] text-center">
                                ~ {inputValue} SOL
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-5 cursor-pointer">
                    <PrimaryBtn
                        className="lg:w-[90%]"
                        title={transactionLoading ? "Processing.." : "Deposit Amount"}
                        onClick={() => onClick()}
                    />
                </div>
            </div>
        </div>
    );
};

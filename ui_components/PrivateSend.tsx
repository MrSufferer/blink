import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { getParams } from "../utils/helpers";
import { Elusiv, TokenType } from "@elusiv/sdk";
import SecondaryBtn from "./SecondaryBtn";
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Add a recipient public key here
const recipient = new PublicKey("FGWShGn5RZ7LwJSFh4sr3WAYAkePs4GBg1tTHLcst1aV");

const PrivateSend = () => {
  const [balance, setBalance] = useState(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [elusiv, setElusiv] = useState<Elusiv>(null);
  const [keyPair, setKeyPair] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [connection, setConnection] = useState(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const setParams = async () => {
      const { elusiv: e, keyPair: kp, connection: conn } = await getParams();
      setElusiv(e);
      setKeyPair(kp);
      setConnection(conn);
	  toast.info("Instantiated Elusiv");
      setIsLoading(false);
    };

    setParams();
  }, []);

  const topup = async (
    elusivInstance: Elusiv,
    keyPair: Keypair,
    amount: number,
    tokenType: TokenType
  ) => {
    // Build our topup transaction
    const topupTx = await elusivInstance.buildTopUpTx(amount, tokenType);
    // Sign it (only needed for topups, as we're topping up from our public key there)
    topupTx.tx.partialSign(keyPair);
    // Send it off
    return elusivInstance.sendElusivTx(topupTx);
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
    const getBalance = async () => {
	  toast.info("Fetching private balance...");
      const privateBalance = await elusiv.getLatestPrivateBalance("LAMPORTS");
	  toast.success("Fetched private balance!");
      setBalance(privateBalance);
      setFetching(false);
    };

    if (elusiv !== null) {
      getBalance().then(() => toast.success("Balance updated"));
    }
  }, [elusiv]);

  const topupHandler = async (e) => {
    e.preventDefault();
    toast.info("Initiating topup...");
    const sig = await topup(
      elusiv,
      keyPair,
      LAMPORTS_PER_SOL,
      "LAMPORTS"
    );
    toast.success(`Topup complete with sig ${sig.signature}`);
  };

  const sendHandler = async (e) => {
    e.preventDefault();
	setIsSending(true);
    if (balance > BigInt(0)) {
		// Send half a SOL
		toast.info("Sending...");
		const sig = await send(
			elusiv,
			recipient,
			0.5 * LAMPORTS_PER_SOL,
			"LAMPORTS"
		);
		toast.success(`Send complete with sig ${sig.signature}`);
	}
  };

  return (
    <>
      <p className="text-white">
        Send to: {isLoading ? "Loading..." : keyPair?.publicKey.toString()}
      </p>
      <p className="text-vodka">
        Private Balance:{" "}
        {fetching ? "Loading..." : `${Number(balance) / LAMPORTS_PER_SOL} SOL`}
      </p>
      <div className="relative mt-10">
        <div
            className={`opacity-70 flex gap-2 justify-between`}
        >
          <SecondaryBtn
            className={`w-[30%] lg:w-[185px] text-[#CEDDE0] max-w-[185px] mx-0 ${
                    isLoading
                    ? "cursor-not-allowed"
                    : ""
            }`}
            title={"Topup"}
            onClick={(e) => topupHandler(e)}
          />

          <SecondaryBtn
            className={`w-[30%] lg:w-[185px] text-[#CEDDE0] max-w-[185px] mx-0 ${
                  isLoading || balance <= 0 || isSending
                  ? "cursor-not-allowed"
                  : ""
            }`}
            title={"Send"}
            onClick={(e) => sendHandler(e)}
          />

          <SecondaryBtn
            className={`w-[30%] lg:w-[185px] text-[#CEDDE0] max-w-[185px] mx-0 `}
            title={"Private Link"}
            onClick={(e) => {}}
          />
        </div>
      </div>

	  <ToastContainer autoClose={5000} />
    </>
  );
};

export default PrivateSend;

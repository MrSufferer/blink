import { Elusiv, SEED_MESSAGE } from "@elusiv/sdk";
import { sign } from "@noble/ed25519";
import { Connection, Keypair } from "@solana/web3.js";

export async function getParams(): Promise<{
  elusiv: Elusiv;
  keyPair: Keypair;
  connection: Connection;
}> {
  const connection = new Connection("https://api.devnet.solana.com");
  // Add your own private key here
  const keyPair = Keypair.fromSecretKey(
    new Uint8Array([
      48, 231,  61,  62, 189,  86, 160,  56, 215,  88, 181,
      78, 134, 155, 127, 141, 103, 105,  14, 103, 245,  52,
      106, 157, 109, 103, 143, 196,  79, 143, 166, 252,  20,
      226, 120, 122, 110,  63, 209, 195, 143,  61, 149, 180,
      53,  38,  49,  69,  52, 171,  55, 118, 166, 103,  25,
      72, 185, 170, 244, 135,  66, 202, 240, 220
    ])
  );
  const seed = getSignedSeed(keyPair);
  console.log(seed);

  const elusiv = await Elusiv.getElusivInstance(
    seed,
    keyPair.publicKey,
    connection,
    "devnet"
  );

  return {
    elusiv,
    keyPair,
    connection,
  };
}

function getSignedSeed(keyPair: Keypair) {
    return sign(
      Buffer.from(SEED_MESSAGE, "utf-8"),
      keyPair.secretKey.slice(0, 32)
    );
};
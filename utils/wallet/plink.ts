import { Keypair } from '@solana/web3.js';
import _sodium from "libsodium-wrappers-sumo";
import { encode as b58encode, decode as b58decode } from "bs58";

const DEFAULT_PLINK_KEYLENGTH = 12;
const PLINK_ORIGIN = "https://plink-sol.vercel.app";
const PLINK_PATH = "/i"

const getSodium = async () => {
  await _sodium.ready;
  return _sodium;
}

const kdf = async (fullLength: number, pwShort: Uint8Array, salt: Uint8Array) => {
  const sodium = await getSodium();
  return sodium.crypto_pwhash(
    fullLength,
    pwShort,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT
  );
};

const randBuf = async (l: number) => {
  const sodium = await getSodium();
  return sodium.randombytes_buf(l);
};

const kdfz = async (fullLength: number, pwShort: Uint8Array) => {
  const sodium = await getSodium();
  const salt = new Uint8Array(sodium.crypto_pwhash_SALTBYTES);
  return await kdf(fullLength, pwShort, salt);
};

const pwToKeypair = async (pw: Uint8Array) => {
  const sodium = await getSodium();
  const seed = await kdfz(sodium.crypto_sign_SEEDBYTES, pw);
  return(Keypair.fromSeed(seed));
}

export class Plink {
  url: URL;
  keypair: Keypair;

  private constructor(url: URL, keypair: Keypair) {
    this.url = url;
    this.keypair = keypair;
  }

  public static async create(): Promise<Plink> {
    await getSodium();
    const b = await randBuf(DEFAULT_PLINK_KEYLENGTH);
    const keypair = await pwToKeypair(b);
    const link = new URL(PLINK_PATH, PLINK_ORIGIN);
    link.hash = b58encode(b);
    const plink = new Plink(link, keypair);
    return plink;
  }

  public static async fromUrl(url: URL): Promise<Plink> {
    const slug = url.hash.slice(1);
    const pw = Uint8Array.from(b58decode(slug));
    const keypair = await pwToKeypair(pw);
    const plink = new Plink(url, keypair);
    return plink;
  }

  public static async fromLink(link: string): Promise<Plink> {
    const url = new URL(link);
    return this.fromUrl(url);
  }

  // public getLink(): string {
    // return this.url.toString();
  // }
}

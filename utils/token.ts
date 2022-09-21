import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createMintToCheckedInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  transfer,
} from "@solana/spl-token";
import { getUserFromAddress, updateUser } from "utils/firebase";
import { increment } from "firebase/firestore";
import { AnchorWallet, WalletContextState } from "@solana/wallet-adapter-react";

export const updateTokensToDB = async (to: string, amount: number) => {
  const user = await getUserFromAddress(to);
  if (user.nftCount) {
    amount += ((user.nftCount - 1) * amount) / 10;
  }

  updateUser(user._id, {
    tokensEarned: increment(amount),
    tokensWithdrawable: increment(amount),
  });

  return amount;
};

export const sendTokensToUser = async (
  toWallet: WalletContextState,
  amount: number,
  decimals?: number
) => {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const secret = process.env.NEXT_PUBLIC_WALLET_SECRET?.replace(/ /g, "")
    .split(",")
    .map((item) => Number(item));
  const secretKey = Uint8Array.from(secret!);
  // Generate a new wallet keypair and airdrop SOL
  const fromWallet = Keypair.fromSecretKey(secretKey);

  const destMint = new PublicKey(
    // process.env.NEXT_PUBLIC_MINT_TOKEN_ADDRESS as string
    "9G55GTvGRcVKGrd6g7UZfej3PMfvUDnqbKqYnqPh6r6F"
  );

  // Get the token account of the fromWallet address, and if it does not exist, create it
  const mintInfo = await getMint(connection, destMint);

  console.log(mintInfo.mintAuthority?.toString());

  let ata = await getAssociatedTokenAddress(
    destMint, // mint
    toWallet.publicKey! // owner
  );
  console.log(ata.toString());
  // return;

  let tx = new Transaction().add(
    // createAssociatedTokenAccountInstruction(
    //   toWallet.publicKey, // payer
    //   ata, // ata
    //   toWallet.publicKey, // owner
    //   destMint // mint
    // )
    // createSetAuthorityInstruction(
    //   destMint,

    // )
    createMintToCheckedInstruction(
      destMint, // mint
      ata, // receiver (sholud be a token account)
      mintInfo.mintAuthority!, // mint authority
      1e9, // amount. if your decimals is 8, you mint 10^8 for 1 token.
      9 // decimals
    )
  );
  tx.feePayer = toWallet.publicKey!;
  let hash = await connection.getLatestBlockhash();
  tx.recentBlockhash = hash.blockhash;
  tx.lastValidBlockHeight = hash.lastValidBlockHeight;
  const signed = await toWallet.sendTransaction(tx, connection);

  // const signature = await connection.sendRawTransaction(signed.serialize());
  // var response = await connection.confirmTransaction({
  //   signature,
  //   lastValidBlockHeight: hash.lastValidBlockHeight,
  //   blockhash: hash.blockhash,
  // });
  console.log(signed);
  return signed;
  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    destMint,
    fromWallet.publicKey
  );

  // Get the token account of the toWallet address, and if it does not exist, create it
  // const toTokenAccount = await getOrCreateAssociatedTokenAccount(
  //   connection,
  //   fromWallet,
  //   destMint,
  //   toWallet.publicKey
  // );
  const transferAmount = amount * 10 ** 8;

  // const signature = await transfer(
  //   connection,
  //   fromWallet,
  //   fromTokenAccount.address,
  //   toTokenAccount.address,
  //   fromWallet.publicKey,
  //   transferAmount
  // );

  // const transaction = new Transaction().add(
  //   createTransferInstruction(
  //     destMint,
  //     toTokenAccount.address,
  //     fromTokenAccount.address,
  //     transferAmount
  //   )
  // );
  // transaction.feePayer = toWallet.publicKey;
  // let latestBlockHash = await connection.getLatestBlockhash();
  // transaction.recentBlockhash = latestBlockHash.blockhash;
  // transaction.lastValidBlockHeight = latestBlockHash.lastValidBlockHeight;

  // const signed = await toWallet.signTransaction(transaction);

  // const signature = await connection.sendRawTransaction(signed.serialize());

  // var response = await connection.confirmTransaction({
  //   signature,
  //   lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  //   blockhash: latestBlockHash.blockhash,
  // });
  // console.log(response);

  // updateUser(user._id, {
  //   tokensEarned: increment(amount),
  //   tokensWithdrawable: increment(amount),
  // });

  // return signature;
};

export const mintTokensToUser = async (
  toWallet: AnchorWallet,
  amount: number
) => {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const destMint = new PublicKey(
    process.env.NEXT_PUBLIC_MINT_TOKEN_ADDRESS as string
  );
  const keypair = Keypair.fromSeed(toWallet.publicKey.toBuffer());
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    destMint,
    toWallet.publicKey
  );
  const mintTransaction = new Transaction().add(
    createMintToInstruction(
      destMint,
      toTokenAccount.address,
      toTokenAccount.address,
      amount * Math.pow(10, 9)
    )
  );
  mintTransaction.feePayer = toWallet.publicKey;
  let hash = await connection.getLatestBlockhash();
  mintTransaction.recentBlockhash = hash.blockhash;

  let signedTrans = await toWallet.signTransaction(mintTransaction);

  let signature = await connection.sendRawTransaction(signedTrans.serialize());
  const result = await connection.confirmTransaction({
    blockhash: hash.blockhash,
    lastValidBlockHeight: hash.lastValidBlockHeight,
    signature,
  });
  console.log(result);

  return signature;
};

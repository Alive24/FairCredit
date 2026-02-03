import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  sendTransactionWithoutConfirmingFactory,
  getSignatureFromTransaction,
  address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";

export async function sendInstructions(
  rpcUrl: string,
  instructions: Instruction[],
  signer: TransactionSigner
): Promise<string> {
  const rpc = createSolanaRpc(rpcUrl);

  const blockhashResult = await rpc.getLatestBlockhash().send();
  const latestBlockhash =
    "value" in blockhashResult ? blockhashResult.value : blockhashResult;

  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx)
  );

  const transaction = await signTransactionMessageWithSigners(
    transactionMessage
  );
  const signature = getSignatureFromTransaction(transaction);

  const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc });
  try {
    await sendTransaction(transaction, { commitment: "confirmed" });
  } catch (e) {
    // Best-effort diagnostics for test/dev runs.
    try {
      const props =
        e && typeof e === "object" ? Object.getOwnPropertyNames(e) : [];
      console.error("sendInstructions failed:", e);
      if (props.length > 0) {
        console.error(
          "sendInstructions error details:",
          JSON.stringify(e, props, 2)
        );
      }
    } catch {
      // ignore
    }
    throw e;
  }

  return signature;
}

export function addressFromString(addr: string) {
  return address(addr);
}

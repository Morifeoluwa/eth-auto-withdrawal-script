/**
 * ALL RIGHTS RESERVED CYBRON DIGITAL RESOURCES 2023
 *
 * @author Adedeji Morifeoluwa M.
 * @see https://codewithmorife.netlify.app
 * @see https://github.com/morifeoluwa
 *
 * To start bot, enter `node index.js` in terminal
 */

//requiring the dotenv extension to read the .env file
require("dotenv").config();

//requiring ethers library
const ethers = require("ethers");
//bigNumber from ethers.js
const { BigNumber, utils } = ethers;

//seeting up our infure provider
const provider = new ethers.providers.WebSocketProvider(
  `wss://goerli.infura.io/ws/v3/${process.env.INFURA_ID}`,
  "goerli"
);

//getting a new instance of our bot wallet
const depositWallet = new ethers.Wallet(
  process.env.DEPOSIT_WALLET_PRIVATE_KEY,
  provider
);

//the main function
const main = async () => {
  //getting the wallet address from the private key
  const depositWalletAddress = await depositWallet.getAddress();
  //log...
  console.log(`Watching for incoming tx to ${depositWalletAddress}`);

  //listening to all pending transactions on the blockchain
  provider.on("pending", (txHash) => {
    try {
      provider.getTransaction(txHash).then((tx) => {
        if (tx === null) return;

        const { from, to, value } = tx;

        //checking if the receiver address is this bot address
        if (to === depositWalletAddress) {
          //log.....
          console.log(`Receiving ${utils.formatEther(value)} ETH from ${from}`);

          //initiating a transaction after the number of confirmation blocks
          tx.wait(process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL).then(
            async (_receipt) => {
              const currentBalance = await depositWallet.getBalance("latest");
              const gasPrice = await provider.getGasPrice();
              const gasLimit = 21000;
              const maxGasPrice = BigNumber.from(gasLimit).mul(gasPrice);

              const tx = {
                to: process.env.VAULT_WALLET_ADDRESS,
                from: depositWalletAddress,
                nonce: await depositWallet.getTransactionCount(),
                value: currentBalance.sub(maxGasPrice),
                gasPrice: gasPrice,
                gasLimit: gasLimit,
              };

              //signing the transaction
              depositWallet.sendTransaction(tx).then(
                (_receipt) => {
                  console.log(
                    `Withdrew ${utils.formatEther(
                      currentBalance.sub(maxGasPrice)
                    )} ETH to VAULT ${process.env.VAULT_WALLET_ADDRESS}`
                  );
                },
                (reason) => {
                  console.error("Withdrawal failed", reason);
                }
              );
            },
            (reason) => {
              console.error("Block confirmation error:", reason);
            }
          );
        }
      });
    } catch (err) {
      console.error(err);
    }
  });
};

if (require.main === module) {
  //calling the function
  main();
}

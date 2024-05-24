require('dotenv').config();
const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { writeFileSync } = require('fs');

// Replace this with your custom RPC URL from QuickNode or other provider
const rpcUrl = process.env.RPC_URL;
const connection = new Connection(rpcUrl, 'confirmed');
const mintAddress = process.env.TOKEN_MINT_ADDRESS;

// Define your token's mint address
const tokenMintAddress = new PublicKey(mintAddress);

async function getTokenAccountsByMint(mintAddress) {
  const accounts = await connection.getParsedProgramAccounts(
    TOKEN_PROGRAM_ID,
    {
      filters: [
        {
          dataSize: 165, // size of a token account
        },
        {
          memcmp: {
            offset: 0, // location of mint address in token account data
            bytes: mintAddress.toBase58(),
          },
        },
      ],
    }
  );

  // Filter accounts to show only those with more than 1000 tokens
 // Filter accounts to show only those with more than 1000 tokens
 return accounts
 .map(account => {
   const owner = account.account.data.parsed.info.owner;
   const ownerAddress = owner instanceof PublicKey ? owner.toBase58() : owner;
   return {
     ownerAddress,
     publicKey: account.pubkey.toBase58(),
     amount: parseFloat(account.account.data.parsed.info.tokenAmount.uiAmountString),
     airdrop: parseFloat(account.account.data.parsed.info.tokenAmount.uiAmountString) * 0.1
   };
 })
 .filter(account => account.amount > 100);
}

async function snapshotTokenHolders() {
  try {
    const tokenAccounts = await getTokenAccountsByMint(tokenMintAddress);
    console.log('Token Holders Snapshot:', tokenAccounts);
    writeFileSync('tokenHoldersSnapshot.json', JSON.stringify(tokenAccounts, null, 2));
    console.log('Snapshot written to tokenHoldersSnapshot.json');
  } catch (error) {
    if (error.message.includes('422 Unprocessable Entity')) {
      console.error(error.message);
      console.error('You may need to use a different RPC node or handle the error case differently.');
    } else {
      console.error('Error taking snapshot:', error);
    }
  }
}

snapshotTokenHolders();
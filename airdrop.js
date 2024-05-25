require('dotenv').config();
const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, createTransferInstruction } = require('@solana/spl-token');
const { readFileSync } = require('fs');

// Replace this with your custom RPC URL from QuickNode or other provider
const rpcUrl = process.env.RPC_URL;
const connection = new Connection(rpcUrl, 'confirmed');
const mintAddress = process.env.TOKEN_MINT_ADDRESS;
const decimals = process.env.TOKEN_DECIMALS; // Your token supports 9 decimals

// Define your token's mint address
const tokenMintAddress = new PublicKey(mintAddress);

// Load your payer keypair from a file
const payer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync('id.json'))));

async function airdropTokens(tokenAccounts) {
    let totalToBeAirdropped = 0;
    let totalAirdropped = 0;

    // Filter out the specified addresses from the tokenAccounts array
    const filteredTokenAccounts = tokenAccounts.filter(
        account => account.publicKey !== 'avFyrU1wWtuBERzSuYd4nZMXaP9amcrwbdHnn82bUr4' &&
                    account.publicKey !== 'HiHdPgZ9w9vUXnirbJCU2vufiuxWLUCP6Dsf1bNNkLhL'
    );

    // Calculate the total tokens to be airdropped
    filteredTokenAccounts.forEach(account => {
        totalToBeAirdropped += account.amount * 0.1;
    });

    console.log(`Total tokens to be airdropped: ${totalToBeAirdropped}`);

    // Get or create the payer's associated token account for the mint
    const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        tokenMintAddress,
        payer.publicKey
    );

    for (const account of filteredTokenAccounts) {
        try {
            const recipientPublicKey = new PublicKey(account.ownerAddress);
            const airdropAmount = Math.floor(account.amount * 0.1 * 10 ** decimals); // Convert to lamports

            // Get or create the recipient's associated token account
            const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
                connection,
                payer,
                tokenMintAddress,
                recipientPublicKey
            );

            // Create a transaction to transfer the airdrop amount
            const transaction = new Transaction().add(
                createTransferInstruction(
                    payerTokenAccount.address, // source should be payer's associated token account
                    recipientTokenAccount.address, // destination should be recipient's associated token account
                    payer.publicKey, // authority
                    airdropAmount,
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            // Sign and send the transaction
            await connection.sendTransaction(transaction, [payer], {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
            });

            console.log(`Airdropped ${airdropAmount / 10 ** decimals} tokens (${airdropAmount} lamports) to ${account.ownerAddress}`);
            totalAirdropped += airdropAmount;
        } catch (error) {
            console.error(`Error airdropping to ${account.ownerAddress}:`, error);
        }
    }

    console.log(`Total airdropped tokens: ${totalAirdropped / 10 ** decimals} tokens (${totalAirdropped} lamports)`);
}

async function runAirdrop() {
    try {
        const tokenAccounts = JSON.parse(readFileSync('tokenHoldersSnapshot.json'));
        await airdropTokens(tokenAccounts);
    } catch (error) {
        console.error('Error during airdrop:', error);
    }
}

runAirdrop();
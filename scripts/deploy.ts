import hre from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Manual deployment script for Agent Academy ecosystem
 * Run: npx hardhat run scripts/deploy.ts --network monadTestnet
 */

async function main() {
  console.log("🚀 Deploying Agent Academy + Marketplace to Monad...\n");
  
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("📍 Deploying from:", deployer.account.address);
  console.log("🌐 Network:", hre.network.name);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log("💰 Balance:", hre.viem.formatEther(balance), "MON\n");
  
  if (balance < BigInt(1e18)) {
    console.warn("⚠️  Warning: Low balance. Get MON from https://faucet.monad.xyz\n");
  }
  
  // Step 1: Deploy AgencyToken
  console.log("1️⃣  Deploying AgencyToken...");
  const token = await hre.viem.deployContract("AgencyToken", []);
  console.log("✅ AgencyToken deployed at:", token.address);
  console.log(`   Explorer: https://explorer.testnet.monad.xyz/address/${token.address}\n`);
  
  // Step 2: Deploy Reputation
  console.log("2️⃣  Deploying Reputation...");
  const reputation = await hre.viem.deployContract("Reputation", []);
  console.log("✅ Reputation deployed at:", reputation.address);
  console.log(`   Explorer: https://explorer.testnet.monad.xyz/address/${reputation.address}\n`);
  
  // Step 3: Deploy Academy
  console.log("3️⃣  Deploying Academy...");
  const academy = await hre.viem.deployContract("Academy", [token.address, reputation.address]);
  console.log("✅ Academy deployed at:", academy.address);
  console.log(`   Explorer: https://explorer.testnet.monad.xyz/address/${academy.address}\n`);
  
  // Step 4: Deploy Marketplace
  console.log("4️⃣  Deploying Marketplace...");
  const marketplace = await hre.viem.deployContract("Marketplace", [token.address, reputation.address]);
  console.log("✅ Marketplace deployed at:", marketplace.address);
  console.log(`   Explorer: https://explorer.testnet.monad.xyz/address/${marketplace.address}\n`);
  
  // Step 5: Setup permissions
  console.log("5️⃣  Setting up permissions...");
  
  // Authorize Academy to mint certifications
  const tx1 = await reputation.write.setAuthorizedUpdater([academy.address, true]);
  await publicClient.waitForTransactionReceipt({ hash: tx1 });
  console.log("✅ Academy authorized to mint certifications");
  
  // Authorize Marketplace to update job stats
  const tx2 = await reputation.write.setAuthorizedUpdater([marketplace.address, true]);
  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log("✅ Marketplace authorized to update job stats\n");
  
  // Save deployment addresses
  const deployment = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: {
      AgencyToken: token.address,
      Reputation: reputation.address,
      Academy: academy.address,
      Marketplace: marketplace.address,
    },
    explorers: {
      AgencyToken: `https://explorer.testnet.monad.xyz/address/${token.address}`,
      Reputation: `https://explorer.testnet.monad.xyz/address/${reputation.address}`,
      Academy: `https://explorer.testnet.monad.xyz/address/${academy.address}`,
      Marketplace: `https://explorer.testnet.monad.xyz/address/${marketplace.address}`,
    }
  };
  
  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const filename = `${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deployment, null, 2));
  
  console.log("📄 Deployment info saved to:", filepath);
  console.log("\n✨ Deployment Complete!\n");
  console.log("📋 Summary:");
  console.log("─".repeat(80));
  console.log(`AgencyToken:  ${token.address}`);
  console.log(`Reputation:   ${reputation.address}`);
  console.log(`Academy:      ${academy.address}`);
  console.log(`Marketplace:  ${marketplace.address}`);
  console.log("─".repeat(80));
  console.log("\n🔗 Next Steps:");
  console.log("1. Launch token on nad.fun: https://nad.fun");
  console.log("2. Update README with deployed addresses");
  console.log("3. Run offchain agents: ts-node offchain/agent.ts");
  console.log("4. Test enrollment → certification → job completion flow\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

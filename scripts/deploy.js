import hre from "hardhat";


async function main() {
  console.log("Deploying contracts...");

  // 1. Deploy MarketToken
  const MarketToken = await hre.ethers.getContractFactory("MarketToken");
  const token = await MarketToken.deploy();
  await token.waitForDeployment();
  console.log("MarketToken deployed to:", await token.getAddress());

  // 2. Deploy Oracle
  const Oracle = await hre.ethers.getContractFactory("Oracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  console.log("Oracle deployed to:", await oracle.getAddress());

  // 3. Deploy PredictionMarket
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const market = await PredictionMarket.deploy(await token.getAddress(), await oracle.getAddress());
  await market.waitForDeployment();
  console.log("PredictionMarket deployed to:", await market.getAddress());

  console.log("Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

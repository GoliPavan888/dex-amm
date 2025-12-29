async function main() {
  const [deployer] = await ethers.getSigners();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("Token A", "TKA");
  const tokenB = await MockERC20.deploy("Token B", "TKB");

  const DEX = await ethers.getContractFactory("DEX");
  const dex = await DEX.deploy(tokenA.address, tokenB.address);

  console.log("DEX deployed to:", dex.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

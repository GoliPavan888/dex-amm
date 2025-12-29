const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(tokenA.address, tokenB.address);

    await tokenA.approve(dex.address, ethers.utils.parseEther("1000000"));
    await tokenB.approve(dex.address, ethers.utils.parseEther("1000000"));

    await tokenA.mint(addr1.address, ethers.utils.parseEther("1000"));
    await tokenB.mint(addr1.address, ethers.utils.parseEther("1000"));
    await tokenA.connect(addr1).approve(dex.address, ethers.utils.parseEther("1000"));
    await tokenB.connect(addr1).approve(dex.address, ethers.utils.parseEther("1000"));
  });

  /* ------------------------- Liquidity Management ------------------------- */

  describe("Liquidity Management", function () {
    it("should allow initial liquidity provision", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("20")
      );
      const [a, b] = await dex.getReserves();
      expect(a).to.equal(ethers.utils.parseEther("10"));
      expect(b).to.equal(ethers.utils.parseEther("20"));
    });

    it("should mint correct LP tokens for first provider", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const lp = await dex.liquidity(owner.address);
      const total = await dex.totalLiquidity();
      expect(lp).to.equal(total);
    });

    it("should allow subsequent liquidity additions", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      await dex.addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );
      const [a, b] = await dex.getReserves();
      expect(a).to.equal(ethers.utils.parseEther("150"));
      expect(b).to.equal(ethers.utils.parseEther("300"));
    });

    it("should revert on zero liquidity addition", async function () {
      await expect(dex.addLiquidity(0, 0)).to.be.revertedWith("Zero amount");
    });

    it("should revert when removing more liquidity than owned", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("20")
      );
      const lp = await dex.liquidity(owner.address);
      await expect(
        dex.removeLiquidity(lp.add(1))
      ).to.be.revertedWith("Not enough liquidity");
    });
  });
      it("should not change reserves if liquidity addition reverts", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await expect(
        dex.addLiquidity(
          ethers.utils.parseEther("50"),
          ethers.utils.parseEther("80") // wrong ratio
        )
      ).to.be.revertedWith("Ratio mismatch");

      const [a, b] = await dex.getReserves();
      expect(a).to.equal(ethers.utils.parseEther("100"));
      expect(b).to.equal(ethers.utils.parseEther("200"));
    });

    it("should burn all LP tokens on full liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("20")
      );

      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp);

      const remaining = await dex.liquidity(owner.address);
      expect(remaining).to.equal(0);
    });


  /* ------------------------------ Token Swaps ------------------------------ */

  describe("Token Swaps", function () {
    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should swap token A for token B", async function () {
      await dex.swapAForB(ethers.utils.parseEther("1"));
      const [a] = await dex.getReserves();
      expect(a).to.be.gt(ethers.utils.parseEther("100"));
    });

    it("should swap token B for token A", async function () {
      await dex.swapBForA(ethers.utils.parseEther("1"));
      const [, b] = await dex.getReserves();
      expect(b).to.be.gt(ethers.utils.parseEther("200"));
    });

    it("should calculate correct output amount with fee", async function () {
      const out = await dex.getAmountOut(
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      expect(out).to.be.gt(0);
    });

    it("should update reserves after swap", async function () {
      await dex.swapAForB(ethers.utils.parseEther("1"));
      const [a, b] = await dex.getReserves();
      expect(a).to.not.equal(ethers.utils.parseEther("100"));
      expect(b).to.not.equal(ethers.utils.parseEther("200"));
    });

    it("should revert on zero swap amount", async function () {
      await expect(dex.swapAForB(0)).to.be.revertedWith("Zero input");
    });

    it("should handle large swaps", async function () {
      await dex.swapAForB(ethers.utils.parseEther("50"));
      const [a, b] = await dex.getReserves();
      expect(a).to.be.gt(0);
      expect(b).to.be.gt(0);
    });
  });
    it("should revert swap when output amount would be zero", async function () {
      await expect(
        dex.swapAForB(1)
      ).to.be.reverted;
    });

    it("should not allow swap when reserves are empty", async function () {
      const DEX = await ethers.getContractFactory("DEX");
      const emptyDex = await DEX.deploy(tokenA.address, tokenB.address);

      await expect(
        emptyDex.swapAForB(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("No liquidity");
    });

  /* --------------------------- Price Calculations --------------------------- */

  describe("Price Calculations", function () {
    it("should return correct initial price", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      const price = await dex.getPrice();
      expect(price).to.equal(2);
    });

    it("should update price after swaps", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const price = await dex.getPrice();
      expect(price).to.not.equal(2);
    });

    it("should revert price query when no liquidity", async function () {
      await expect(dex.getPrice()).to.be.revertedWith("No liquidity");
    });
  });
      it("should return same price when equal ratio liquidity is added", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const priceBefore = await dex.getPrice();

      await dex.addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );

      const priceAfter = await dex.getPrice();
      expect(priceAfter).to.equal(priceBefore);
    });


  /* ---------------------------- Fee Distribution ---------------------------- */

  describe("Fee Distribution", function () {
    it("should increase k after swap due to fees", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100")
      );
      const kBefore = (await dex.reserveA()).mul(await dex.reserveB());
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const kAfter = (await dex.reserveA()).mul(await dex.reserveB());
      expect(kAfter).to.be.gt(kBefore);
    });

    it("should allow LPs to earn fees", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100")
      );
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const lp = await dex.liquidity(owner.address);
      await dex.removeLiquidity(lp);
      const balance = await tokenA.balanceOf(owner.address);
      expect(balance).to.be.gt(ethers.utils.parseEther("100"));
    });
  });

  /* ----------------------------- Edge Cases ----------------------------- */

  describe("Edge Cases", function () {
    it("should handle very small liquidity amounts", async function () {
      await dex.addLiquidity(1, 1);
      const [a, b] = await dex.getReserves();
      expect(a).to.equal(1);
      expect(b).to.equal(1);
    });

    it("should handle very large liquidity amounts", async function () {
      const big = ethers.utils.parseEther("100000");
      await dex.addLiquidity(big, big);
      const [a, b] = await dex.getReserves();
      expect(a).to.equal(big);
      expect(b).to.equal(big);
    });

    it("should prevent swaps when no liquidity exists", async function () {
      await expect(
        dex.swapAForB(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("No liquidity");
    });
  });

  /* --------------------------- Authorization ---------------------------- */

  describe("Authorization", function () {
    it("should not allow unauthorized liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("20")
      );
      await expect(
        dex.connect(addr1).removeLiquidity(1)
      ).to.be.revertedWith("Not enough liquidity");
    });
  });
});

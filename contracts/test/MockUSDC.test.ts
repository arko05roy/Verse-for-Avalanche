import { expect } from "chai";
import { ethers } from "hardhat";
import { MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MockUSDC", function () {
  let mockUSDC: MockUSDC;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = (await MockUSDCFactory.deploy(owner.address)) as MockUSDC;
  });

  it("2.2.4.1: Deploys with correct name, symbol, and 6 decimals", async function () {
    expect(await mockUSDC.name()).to.equal("Mock USDC");
    expect(await mockUSDC.symbol()).to.equal("MUSDC");
    expect(await mockUSDC.decimals()).to.equal(6);
  });

  it("2.2.4.2: Owner can mint; non-owner cannot", async function () {
    await mockUSDC.mint(alice.address, 1_000_000);
    expect(await mockUSDC.balanceOf(alice.address)).to.equal(1_000_000);

    await expect(
      mockUSDC.connect(alice).mint(bob.address, 1_000_000)
    ).to.be.revertedWithCustomError(mockUSDC, "OwnableUnauthorizedAccount");
  });

  // Helper to create EIP-3009 signature
  async function signTransferAuthorization(
    signer: SignerWithAddress,
    to: string,
    value: bigint,
    validAfter: number,
    validBefore: number,
    nonce: string
  ) {
    const domain = {
      name: "Mock USDC",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await mockUSDC.getAddress(),
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const message = {
      from: signer.address,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
    };

    const sig = await signer.signTypedData(domain, types, message);
    const { v, r, s } = ethers.Signature.from(sig);
    return { v, r, s };
  }

  it("2.2.4.3: transferWithAuthorization succeeds with valid signature", async function () {
    await mockUSDC.mint(alice.address, 10_000_000);
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const { v, r, s } = await signTransferAuthorization(
      alice, bob.address, 5_000_000n, 0, 2_000_000_000, nonce
    );

    await mockUSDC.transferWithAuthorization(
      alice.address, bob.address, 5_000_000n, 0, 2_000_000_000, nonce, v, r, s
    );

    expect(await mockUSDC.balanceOf(bob.address)).to.equal(5_000_000);
  });

  it("2.2.4.4: transferWithAuthorization reverts with invalid signature", async function () {
    await mockUSDC.mint(alice.address, 10_000_000);
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    // Bob signs instead of Alice
    const { v, r, s } = await signTransferAuthorization(
      bob, bob.address, 5_000_000n, 0, 2_000_000_000, nonce
    );

    await expect(
      mockUSDC.transferWithAuthorization(
        alice.address, bob.address, 5_000_000n, 0, 2_000_000_000, nonce, v, r, s
      )
    ).to.be.revertedWith("Invalid signature");
  });

  it("2.2.4.5: transferWithAuthorization reverts if nonce already used", async function () {
    await mockUSDC.mint(alice.address, 10_000_000);
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const { v, r, s } = await signTransferAuthorization(
      alice, bob.address, 1_000_000n, 0, 2_000_000_000, nonce
    );

    await mockUSDC.transferWithAuthorization(
      alice.address, bob.address, 1_000_000n, 0, 2_000_000_000, nonce, v, r, s
    );

    await expect(
      mockUSDC.transferWithAuthorization(
        alice.address, bob.address, 1_000_000n, 0, 2_000_000_000, nonce, v, r, s
      )
    ).to.be.revertedWith("Authorization already used");
  });

  it("2.2.4.6: transferWithAuthorization reverts on timing constraints", async function () {
    await mockUSDC.mint(alice.address, 10_000_000);
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const futureTime = 9_999_999_999;
    const { v, r, s } = await signTransferAuthorization(
      alice, bob.address, 1_000_000n, futureTime, futureTime + 1000, nonce
    );

    await expect(
      mockUSDC.transferWithAuthorization(
        alice.address, bob.address, 1_000_000n, futureTime, futureTime + 1000, nonce, v, r, s
      )
    ).to.be.revertedWith("Authorization not yet valid");

    // Expired
    const nonce2 = ethers.hexlify(ethers.randomBytes(32));
    const { v: v2, r: r2, s: s2 } = await signTransferAuthorization(
      alice, bob.address, 1_000_000n, 0, 1, nonce2
    );

    await expect(
      mockUSDC.transferWithAuthorization(
        alice.address, bob.address, 1_000_000n, 0, 1, nonce2, v2, r2, s2
      )
    ).to.be.revertedWith("Authorization expired");
  });

  it("2.2.4.7: receiveWithAuthorization reverts if msg.sender != to", async function () {
    await mockUSDC.mint(alice.address, 10_000_000);
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    const domain = {
      name: "Mock USDC",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await mockUSDC.getAddress(),
    };

    const types = {
      ReceiveWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const message = {
      from: alice.address,
      to: bob.address,
      value: 1_000_000n,
      validAfter: 0,
      validBefore: 2_000_000_000,
      nonce,
    };

    const sig = await alice.signTypedData(domain, types, message);
    const { v, r, s } = ethers.Signature.from(sig);

    // owner (not bob) calls receiveWithAuthorization
    await expect(
      mockUSDC.connect(owner).receiveWithAuthorization(
        alice.address, bob.address, 1_000_000n, 0, 2_000_000_000, nonce, v, r, s
      )
    ).to.be.revertedWith("Caller must be the payee");
  });
});

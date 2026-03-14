import { expect } from "chai";
import { ethers } from "hardhat";
import { MockUSDC, VerseMaster } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("VerseMaster", function () {
  let mockUSDC: MockUSDC;
  let verseMaster: VerseMaster;
  let owner: SignerWithAddress;
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;
  let agent3: SignerWithAddress;
  let poster: SignerWithAddress;

  const STAKE = 1_000_000n; // 1 USDC
  const BOUNTY = 3_000_000n; // 3 USDC

  beforeEach(async function () {
    [owner, agent1, agent2, agent3, poster] = await ethers.getSigners();

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = (await MockUSDCFactory.deploy(owner.address)) as MockUSDC;

    const VerseMasterFactory = await ethers.getContractFactory("VerseMaster");
    verseMaster = (await VerseMasterFactory.deploy(await mockUSDC.getAddress(), 2)) as VerseMaster;

    const vmAddr = await verseMaster.getAddress();

    // Fund and approve agents
    for (const agent of [agent1, agent2, agent3]) {
      await mockUSDC.mint(agent.address, 10_000_000n);
      await mockUSDC.connect(agent).approve(vmAddr, ethers.MaxUint256);
    }

    // Fund poster
    await mockUSDC.mint(poster.address, 10_000_000n);
    await mockUSDC.connect(poster).approve(vmAddr, ethers.MaxUint256);
  });

  it("2.3.3.1: Deploy with correct paymentToken and consensusThreshold", async function () {
    expect(await verseMaster.paymentToken()).to.equal(await mockUSDC.getAddress());
    expect(await verseMaster.consensusThreshold()).to.equal(2);
  });

  it("2.3.3.2: Agent can stake (tokens transferred to contract)", async function () {
    await verseMaster.connect(agent1).stake();
    const info = await verseMaster.getAgentInfo(agent1.address);
    expect(info.staked).to.be.true;
    expect(await mockUSDC.balanceOf(await verseMaster.getAddress())).to.equal(STAKE);
  });

  it("2.3.3.3: Only staked agents can submitAnswer and submitVote", async function () {
    // Post a task first
    await verseMaster.connect(agent1).stake();
    await verseMaster.connect(poster).postTask("Test", BOUNTY);

    // Unstaked agent2 cannot submit
    await expect(
      verseMaster.connect(agent2).submitAnswer(0)
    ).to.be.revertedWith("Not staked");

    await expect(
      verseMaster.connect(agent2).submitVote(0, [agent1.address], [8])
    ).to.be.revertedWith("Not staked");
  });

  it("2.3.3.4: postTask creates task with correct bounty held in contract", async function () {
    await verseMaster.connect(poster).postTask("Explain AI", BOUNTY);
    expect(await verseMaster.taskCount()).to.equal(1);

    const task = await verseMaster.getTask(0);
    expect(task.poster).to.equal(poster.address);
    expect(task.prompt).to.equal("Explain AI");
    expect(task.bounty).to.equal(BOUNTY);
    expect(await mockUSDC.balanceOf(await verseMaster.getAddress())).to.equal(BOUNTY);
  });

  it("2.3.3.5: submitVote — cannot vote for self, cannot double-vote", async function () {
    await verseMaster.connect(agent1).stake();
    await verseMaster.connect(agent2).stake();
    await verseMaster.connect(poster).postTask("Test", BOUNTY);
    await verseMaster.connect(agent1).submitAnswer(0);
    await verseMaster.connect(agent2).submitAnswer(0);

    // Cannot vote for self
    await expect(
      verseMaster.connect(agent1).submitVote(0, [agent1.address], [8])
    ).to.be.revertedWith("Cannot vote for self");

    // Valid vote
    await verseMaster.connect(agent1).submitVote(0, [agent2.address], [8]);

    // Cannot double-vote
    await expect(
      verseMaster.connect(agent1).submitVote(0, [agent2.address], [7])
    ).to.be.revertedWith("Already voted");
  });

  it("2.3.3.6: finalize — reverts if votes < threshold; succeeds when met; bounty distributed proportionally", async function () {
    await verseMaster.connect(agent1).stake();
    await verseMaster.connect(agent2).stake();
    await verseMaster.connect(agent3).stake();
    await verseMaster.connect(poster).postTask("Test", BOUNTY);

    await verseMaster.connect(agent1).submitAnswer(0);
    await verseMaster.connect(agent2).submitAnswer(0);
    await verseMaster.connect(agent3).submitAnswer(0);

    // Not enough votes yet
    await expect(verseMaster.finalize(0)).to.be.revertedWith("Not enough votes");

    // Agent1 votes: Agent2=8, Agent3=4
    await verseMaster.connect(agent1).submitVote(0, [agent2.address, agent3.address], [8, 4]);
    // Agent2 votes: Agent1=6, Agent3=6
    await verseMaster.connect(agent2).submitVote(0, [agent1.address, agent3.address], [6, 6]);

    // Now 2 votes — meets threshold
    const vmAddr = await verseMaster.getAddress();
    const balBefore1 = await mockUSDC.balanceOf(agent1.address);
    const balBefore2 = await mockUSDC.balanceOf(agent2.address);
    const balBefore3 = await mockUSDC.balanceOf(agent3.address);

    await verseMaster.finalize(0);

    const task = await verseMaster.getTask(0);
    expect(task.finalized).to.be.true;

    // Scores: agent1=6, agent2=8, agent3=10. Total=24
    // agent1: 3M * 6/24 = 750000
    // agent2: 3M * 8/24 = 1000000
    // agent3: 3M * 10/24 = 1250000
    const bal1 = await mockUSDC.balanceOf(agent1.address);
    const bal2 = await mockUSDC.balanceOf(agent2.address);
    const bal3 = await mockUSDC.balanceOf(agent3.address);

    expect(bal1 - balBefore1).to.equal(750_000n);
    expect(bal2 - balBefore2).to.equal(1_000_000n);
    expect(bal3 - balBefore3).to.equal(1_250_000n);
  });

  it("2.3.3.7: finalize — stats updated correctly for all rewarded agents", async function () {
    await verseMaster.connect(agent1).stake();
    await verseMaster.connect(agent2).stake();
    await verseMaster.connect(poster).postTask("Test", BOUNTY);

    await verseMaster.connect(agent1).submitAnswer(0);
    await verseMaster.connect(agent2).submitAnswer(0);

    // Agent1 votes: Agent2=10
    await verseMaster.connect(agent1).submitVote(0, [agent2.address], [10]);
    // Agent2 votes: Agent1=5
    await verseMaster.connect(agent2).submitVote(0, [agent1.address], [5]);

    await verseMaster.finalize(0);

    const info1 = await verseMaster.getAgentInfo(agent1.address);
    const info2 = await verseMaster.getAgentInfo(agent2.address);

    expect(info1.tasksCompleted).to.equal(1);
    expect(info2.tasksCompleted).to.equal(1);
    // agent1: 3M * 5/15 = 1000000, agent2: 3M * 10/15 = 2000000
    expect(info1.totalEarned).to.equal(1_000_000n);
    expect(info2.totalEarned).to.equal(2_000_000n);
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { Ballot } from "../../typechain";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];

function convertStringArrayToBytes32(array: string[]) {
  const bytes32Array = [];
  for (let index = 0; index < array.length; index++) {
    bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
  }
  return bytes32Array;
}

async function giveRightToVote(ballotContract: Ballot, voterAddress: any) {
  const tx = await ballotContract.giveRightToVote(voterAddress);
  await tx.wait();
}

describe("Ballot", function () {
  let ballotContract: Ballot;
  let accounts: any[];

  this.beforeEach(async function () {
    accounts = await ethers.getSigners();
    const ballotFactory = await ethers.getContractFactory("Ballot");
    ballotContract = await ballotFactory.deploy(
      convertStringArrayToBytes32(PROPOSALS)
    );
    await ballotContract.deployed();
  });

  describe("when the contract is deployed", function () {
    it("has the provided proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(ethers.utils.parseBytes32String(proposal.name)).to.eq(
          PROPOSALS[index]
        );
      }
    });

    it("has zero votes for all proposals", async function () {
      for (let index = 0; index < PROPOSALS.length; index++) {
        const proposal = await ballotContract.proposals(index);
        expect(proposal.voteCount.toNumber()).to.eq(0);
      }
    });

    it("sets the deployer address as chairperson", async function () {
      const chairperson = await ballotContract.chairperson();
      expect(chairperson).to.eq(accounts[0].address);
    });

    it("sets the voting weight for the chairperson as 1", async function () {
      const chairpersonVoter = await ballotContract.voters(accounts[0].address);
      expect(chairpersonVoter.weight.toNumber()).to.eq(1);
    });
  });

  describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
    it("gives right to vote for another address", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      const voter = await ballotContract.voters(voterAddress);
      expect(voter.weight.toNumber()).to.eq(1);
    });

    it("can not give right to vote for someone that has voted", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await ballotContract.connect(accounts[1]).vote(0);
      await expect(
        giveRightToVote(ballotContract, voterAddress)
      ).to.be.revertedWith("The voter already voted.");
    });

    it("can not give right to vote for someone that has already voting rights", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await expect(
        giveRightToVote(ballotContract, voterAddress)
      ).to.be.revertedWith("");
    });
  });

  describe("when the voter interact with the vote function in the contract", function () {
    it("gives vote to correct proposal", async function () {
      const voterAddress = accounts[1].address;
      const proposalIndex = 0;
      await giveRightToVote(ballotContract, voterAddress);
      await ballotContract.connect(accounts[1]).vote(proposalIndex);
      const proposal = await ballotContract.proposals(proposalIndex);
      expect(proposal.voteCount.toNumber()).to.eq(1);
    });
    it("cannot vote with no right to vote", async function () {
      await expect(
        ballotContract.connect(accounts[1]).vote(0)
      ).to.be.revertedWith("Has no right to vote");
    });
    it("cannot vote if already voted", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await ballotContract.connect(accounts[1]).vote(0);
      await expect(
        ballotContract.connect(accounts[1]).vote(0)
      ).to.be.revertedWith("Already voted.");
    });
    it("cannot vote with nonexistant proposal", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await expect(ballotContract.connect(accounts[1]).vote(99)).to.be.reverted;
    });
  });

  describe("when the voter interact with the delegate function in the contract", function () {
    it("delegates vote to correct target voter", async function () {
      const delegatorAddress = accounts[1].address;
      const delegatedAddress = accounts[2].address;
      await giveRightToVote(ballotContract, delegatorAddress);
      await giveRightToVote(ballotContract, delegatedAddress);
      await ballotContract.connect(accounts[1]).delegate(delegatedAddress);
      const delegatedVoter = await ballotContract.voters(delegatedAddress);
      expect(delegatedVoter.weight.toNumber()).to.eq(2);
      const delegatorVoter = await ballotContract.voters(delegatorAddress);
      expect(delegatorVoter.voted).to.eq(true);
      expect(delegatorVoter.delegate).to.eq(delegatedAddress);
    });
    it("delegates vote to correct proposal if target voter has already voted", async function () {
      const delegatorAddress = accounts[1].address;
      const delegatedAddress = accounts[2].address;
      const proposalIndex = 0;
      await giveRightToVote(ballotContract, delegatorAddress);
      await giveRightToVote(ballotContract, delegatedAddress);
      await ballotContract.connect(accounts[2]).vote(proposalIndex);
      await ballotContract.connect(accounts[1]).delegate(delegatedAddress);
      const proposal = await ballotContract.proposals(proposalIndex);
      expect(proposal.voteCount.toNumber()).to.eq(2);
    });
    it("cannot delegate with no right to vote", async function () {
      const delegatorAddress = accounts[1].address;
      const delegatedAddress = accounts[1].address;
      await expect(
        ballotContract.connect(accounts[1]).delegate(delegatedAddress)
      ).to.be.revertedWith("You have no right to vote");
    });
    it("cannot delegate if already voted", async function () {
      const delegatorAddress = accounts[1].address;
      const delegatedAddress = accounts[2].address;
      await giveRightToVote(ballotContract, delegatorAddress);
      await ballotContract.connect(accounts[1]).vote(0);
      await expect(
        ballotContract.connect(accounts[1]).delegate(delegatedAddress)
      ).to.be.revertedWith("You already voted.");
    });
    it("cannot delegate to self", async function () {
      const delegatorAddress = accounts[1].address;
      await giveRightToVote(ballotContract, delegatorAddress);
      await expect(
        ballotContract.connect(accounts[1]).delegate(delegatorAddress)
      ).to.be.revertedWith("Self-delegation is disallowed.");
    });
    it("cannot delegate to voter with no right to vote", async function () {
      const delegatorAddress = accounts[1].address;
      const delegatedAddress = accounts[2].address;
      await giveRightToVote(ballotContract, delegatorAddress);
      await expect(
        ballotContract.connect(accounts[1]).delegate(delegatedAddress)
      ).to.be.revertedWith("Target address with no right to vote");
    });
  });

  describe("when an attacker interact with the giveRightToVote function in the contract", function () {
    it("cannot give right to vote if not chairperson", async function () {
      const voterAddress = accounts[1].address;
      expect(giveRightToVote(ballotContract, voterAddress)).to.be.revertedWith(
        "Only chairperson can give right to vote."
      );
    });
  });

  describe.skip("when an attacker interact with the vote function in the contract", function () {
    // TODO
    it("is not implemented", async function () {
      throw new Error("Not implemented");
    });
  });

  describe.skip("when an attacker interact with the delegate function in the contract", function () {
    // TODO
    it("is not implemented", async function () {
      throw new Error("Not implemented");
    });
  });

  describe("when someone interact with the winningProposal function before any votes are cast", function () {
    it("first proposal wins when everything is equal", async function () {
      const winningProp = await ballotContract
        .connect(accounts[0])
        .winningProposal();
      await expect(winningProp.toNumber()).to.eq(0);
    });
  });

  describe("when someone interact with the winningProposal function after one vote is cast for the second proposal", function () {
    // TODO
    it("second proposal wins when one vote is cast for second proposal", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await ballotContract.connect(accounts[1]).vote(1);
      const winningProp = await ballotContract
        .connect(accounts[1])
        .winningProposal();
      await expect(winningProp.toNumber()).to.eq(1);
    });
  });

  describe("when someone interact with the winnerName function before any votes are cast", function () {
    it("first proposal wins when everything is equal", async function () {
      const winningPropName = await ballotContract
        .connect(accounts[0])
        .winnerName();
      await expect(ethers.utils.parseBytes32String(winningPropName)).to.eq(
        PROPOSALS[0]
      );
    });
  });

  describe("when someone interact with the winnerName function after one vote is cast for the second proposal", function () {
    it("second proposal wins when one vote is cast for second proposal", async function () {
      const voterAddress = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress);
      await ballotContract.connect(accounts[1]).vote(1);
      const winningPropName = await ballotContract
        .connect(accounts[1])
        .winnerName();
      await expect(ethers.utils.parseBytes32String(winningPropName)).to.eq(
        PROPOSALS[1]
      );
    });
  });

  describe("when someone interact with the winningProposal function and winnerName after 5 random votes are cast for the proposals", function () {
    // TODO
    it("third proposal wins when multiple votes are ", async function () {
      const voterAddress1 = accounts[1].address;
      await giveRightToVote(ballotContract, voterAddress1);
      await ballotContract.connect(accounts[1]).vote(0);
      const voterAddress2 = accounts[2].address;
      await giveRightToVote(ballotContract, voterAddress2);
      await ballotContract.connect(accounts[2]).vote(1);
      const voterAddress3 = accounts[3].address;
      await giveRightToVote(ballotContract, voterAddress3);
      await ballotContract.connect(accounts[3]).vote(2);
      const voterAddress4 = accounts[4].address;
      await giveRightToVote(ballotContract, voterAddress4);
      await ballotContract.connect(accounts[4]).vote(2);
      const voterAddress5 = accounts[5].address;
      await giveRightToVote(ballotContract, voterAddress5);
      await ballotContract.connect(accounts[5]).vote(2);
      const winningPropName = await ballotContract
        .connect(accounts[1])
        .winnerName();
      await expect(ethers.utils.parseBytes32String(winningPropName)).to.eq(
        PROPOSALS[2]
      );
    });
  });
});

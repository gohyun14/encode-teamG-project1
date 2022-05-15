import { Contract, ethers } from "ethers";
import "dotenv/config";
import * as ballotJson from "../../artifacts/contracts/Ballot.sol/Ballot.json";
// eslint-disable-next-line node/no-missing-import
import { Ballot } from "../../typechain";

// This key is already public on Herong's Tutorial Examples - v1.03, by Dr. Herong Yang
// Do never expose your keys like this
const EXPOSED_KEY =
  "8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f";

async function main() {
  const wallet =
    process.env.MNEMONIC && process.env.MNEMONIC.length > 0
      ? ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
      : new ethers.Wallet(process.env.PRIVATE_KEY ?? EXPOSED_KEY);
  console.log(`Using address ${wallet.address}`);
  const provider = ethers.providers.getDefaultProvider("ropsten");
  const signer = wallet.connect(provider);
  if (process.argv.length < 3) throw new Error("Ballot address missing");
  const ballotAddress = process.argv[2];
  let search = false;
  if (process.argv.length == 4) search = true;
  console.log(
    `Attaching ballot contract interface to address ${ballotAddress}`
  );
  const ballotContract: Ballot = new Contract(
    ballotAddress,
    ballotJson.abi,
    signer
  ) as Ballot;
  if (search) {
    const proposalIndex = process.argv[3];
    try {
      const proposal = await ballotContract.proposals(proposalIndex);
      const proposalName = ethers.utils.parseBytes32String(proposal.name);
      const proposalVoteCount = proposal.voteCount.toNumber();
      console.log(
        "Printing name and vote count of proposal with index",
        proposalIndex
      );
      console.log(proposalName, ":", proposalVoteCount);
    } catch {
      console.log("No proposal with index", proposalIndex);
    }
  } else {
    let proposalIndex = 0;
    console.log("Printing name and vote count of all proposals");
    while (true) {
      try {
        const proposal = await ballotContract.proposals(proposalIndex);
        const proposalName = ethers.utils.parseBytes32String(proposal.name);
        const proposalVoteCount = proposal.voteCount.toNumber();
        console.log(proposalName, ":", proposalVoteCount);
        proposalIndex++;
      } catch (error) {
        break;
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

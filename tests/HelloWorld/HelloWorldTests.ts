import { expect } from "chai";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { HelloWorld } from "../../typechain/HelloWorld";

describe("HelloWorld", function () {
  let helloWorldContract: HelloWorld;

  this.beforeEach(async function () {
    const helloWorldFactory = await ethers.getContractFactory("HelloWorld");
    helloWorldContract = await helloWorldFactory.deploy();
    await helloWorldContract.deployed();
  });

  it("Should give a Hello World", async function () {
    const text = await helloWorldContract.helloWorld();
    const encodedText = ethers.utils.parseBytes32String(text);
    expect(await encodedText).to.equal("Hello World");
  });

  it("Should set owner to deployer account", async function () {
    const accounts = await ethers.getSigners();
    expect(await helloWorldContract.owner()).to.equal(accounts[0].address);
  });

  it("Should not allow anyone other than owner to call transferOwnership", async function () {
    const accounts = await ethers.getSigners();
    await expect(
      helloWorldContract
        .connect(accounts[1])
        .transferOwnership(accounts[1].address)
    ).to.be.revertedWith("Caller is not the owner");
  });

  it("Should change text correctly", async function () {
    const setTextTx = await helloWorldContract.setText(ethers.utils.formatBytes32String("Something New!"));
    await setTextTx.wait();
    expect(ethers.utils.parseBytes32String(await helloWorldContract.helloWorld())).to.equal("Something New!");
  });

  it("Should not allow anyone other than owner to change text", async function () {
    const accounts = await ethers.getSigners();
    await expect(
      helloWorldContract.connect(accounts[1]).setText(ethers.utils.formatBytes32String("Failure"))
    ).to.be.revertedWith("Caller is not the owner");
  });
});

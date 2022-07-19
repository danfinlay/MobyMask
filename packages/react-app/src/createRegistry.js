import { ethers } from "ethers";
const { abi } = require("./artifacts");
const { address, name } = require("./config.json");
const CONTRACT_NAME = name;

export default async function createRegistry(provider, readOnly = false) {
  const wallet = !readOnly && provider.getSigner();
  const toUse = readOnly ? provider : wallet;
  const registry = await attachRegistry(toUse);
  return registry;
}

async function attachRegistry(signer) {
  const Registry = new ethers.Contract(address, abi, signer);
  const _registry = await Registry.attach(address);
  const deployed = await _registry.deployed();
  return deployed;
}

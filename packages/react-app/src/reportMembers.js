import { ethers } from "ethers";
import contractInfo from "./contractInfo";
const types = require("./types");
const { createMembership } = require("eth-delegatable-utils");
const { abi } = require("./artifacts");
const { chainId, address, name } = require("./config.json");
const CONTRACT_NAME = name;

export default async function reportMembers(members, provider, invitation) {
  const membership = createMembership({
    contractInfo,
    invitation,
  });

  const wallet = provider.getSigner();
  const registry = await attachRegistry(wallet);

  const invocations = await Promise.all(
    members.map(async member => {
      const _member = member.indexOf("@") === "0" ? member.slice(1) : member;
      const desiredTx = await registry.populateTransaction.claimIfMember(`TWT:${_member.toLowerCase()}`, true);
      const invocation = {
        transaction: {
          to: address,
          data: desiredTx.data,
          gasLimit: 500000,
        },
      };
      return invocation;
    }),
  );

  const queue = Math.floor(Math.random() * 100000000);
  const signedInvocations = membership.signInvocations({
    batch: invocations,
    replayProtection: {
      nonce: 1,
      queue,
    },
  });

  return await registry.invoke([signedInvocations]);
}

async function attachRegistry(signer) {
  const Registry = new ethers.Contract(address, abi, signer);
  const _registry = await Registry.attach(address);
  const deployed = await _registry.deployed();
  return deployed;
}

import { ethers } from "ethers";
const types = require("./types");
const { createMembership } = require("eth-delegatable-utils");
const { abi } = require("./artifacts");
const { chainId, address, name } = require("./config.json");
import contractInfo from "./contractInfo";
const CONTRACT_NAME = name;

export default async function reportPhishers(phishers, provider, invitation) {
  const { key, signedDelegations } = invitation;
  const membership = createMembership({
    contractInfo,
    invitation,
  });

  const wallet = provider.getSigner();
  const registry = await attachRegistry(wallet);

  const invocations = await Promise.all(
    phishers.map(async phisher => {
      const _phisher = phisher.indexOf("@") === "0" ? phisher.slice(1) : phisher;
      const desiredTx = await registry.populateTransaction.claimIfPhisher(`TWT:${_phisher.toLowerCase()}`, true);
      const invocation = {
        transaction: {
          to: address,
          data: desiredTx.data,
          gasLimit: 500000,
        },
        authority: signedDelegations,
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

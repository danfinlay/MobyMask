import { ethers } from "ethers";
const types = require("./types");
const { generateUtil, recoverDelegationSigner } = require("eth-delegatable-utils");
const createTypedMessage = require("./createTypedMessage");
const sigUtil = require("@metamask/eth-sig-util");
const { chainId, address, name } = require("./config.json");
const CONTRACT_NAME = name;
const util = generateUtil({
  chainId,
  verifyingContract: address,
  name: CONTRACT_NAME,
});

types.domain.chainId = chainId;
types.domain.verifyingContract = address;

/*
type SignedDelegation = {
  delegation: Delegation,
  signature: string,
}

type Delegation = {
  delegate: string,
  authority: string,
  caveats: Caveat[],
}

type Caveat = {
  enforcer: string,
  terms: string,
}

type Invitation = {
  signedDelegations: SignedDelegation[],
  key: string,
}
*/
const ROOT_AUTHORITY = "0xDdb18b319BE3530560eECFF962032dFAD88212d4";

export function validateInvitation(invitation) {
  if (!invitation) {
    throw new Error("Invitation is required");
  }
  console.log("invitation", invitation);

  const { signedDelegations, key } = invitation;
  const wallet = new ethers.Wallet(key);

  // Trying to follow the code from Delegatable.sol as closely as possible here
  // To ensure readable correctness.
  let intendedSender = ROOT_AUTHORITY;
  let canGrant = intendedSender.toLowerCase();
  let authHash;

  for (let d = 0; d < signedDelegations.length; d++) {
    console.log(`Evaluating delegation number ${d}`);
    const signedDelegation = signedDelegations[d];
    const delegationSigner = recoverDelegationSigner(signedDelegation, {
      chainId,
      verifyingContract: address,
      name: CONTRACT_NAME,
    }).toLowerCase();

    if (d === 0) {
      intendedSender = delegationSigner;
      canGrant = intendedSender.toLowerCase();
    }

    const delegation = signedDelegation.delegation;
    if (delegationSigner !== canGrant) {
      throw new Error(`Delegation signer ${delegationSigner} does not match required signer ${canGrant}`);
    }

    const delegationHash = util.createSignedDelegationHash(signedDelegation);

    // Skipping caveat evaluation for now

    authHash = delegationHash;
    console.log(`Delegation ${d} of id ${authHash} signed by ${canGrant} granted to ${delegation.delegate}`);
    canGrant = delegation.delegate.toLowerCase();
  }

  return !!invitation;
}

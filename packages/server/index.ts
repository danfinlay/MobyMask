import { Router } from "@open-rpc/server-js";
import { ethers } from "ethers";
import assert from "assert";
const types = require('../react-app/src/types')
const cors = require('cors');
const createGanacheProvider = require('./providers/ganacheProvder');
const createTypedMessage = require('../react-app/src/createTypedMessage');
const sigUtil = require('eth-sig-util');
const { generateUtil } = require('eth-delegatable-utils');
const {
  TypedDataUtils,
} = sigUtil;
const {
  typedSignatureHash,
  encodeData,
} = TypedDataUtils;

const BASE_URI = 'https://mobymask.com/#';

// For reads, clients can hit the node directly.
/* so for now, we just care about this server being able to relay transactions.
  * We can add more features later, like pre-simulating txs so only process good ones.
  */

const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, './config.json');
const { privateKey, mnemonic, rpcUrl, baseURI = BASE_URI } = require('./secrets.json');

const openrpcDocument = require('./openrpc.json');
const { parseOpenRPCDocument } = require("@open-rpc/schema-utils-js");
const { Server } = require("@open-rpc/server-js");
const openrpcServer = require("@open-rpc/server-js");
const { HTTPTransport, HTTPSTransport } = openrpcServer.transports;

const phisherRegistryArtifacts = require('../hardhat/artifacts/contracts/PhisherRegistry.sol/PhisherRegistry.json');
const { abi } = phisherRegistryArtifacts;

let provider: ethers.providers.Provider;
if (process.env.ENV === 'PROD') {
  console.log('Deploying to PROD');
  provider = new ethers.providers.JsonRpcProvider(rpcUrl);
} else {
  console.log('TEST SERVER MODE');
  const ganacheProvder = createGanacheProvider(mnemonic);
  provider = new ethers.providers.Web3Provider(ganacheProvder);
}

let registry: ethers.Contract;
let signer: ethers.Wallet;
let _chainId: string;
let _name: string = 'MobyMask';

const methodMapping = {
  submitInvocations: async (signedInvocations: SignedInvocation[]): Promise<boolean> => {
    try {
      const tx = await registry.invoke(signedInvocations);
      const block = tx.block;
    } catch (err) {
      return false;
    }
    return true;
  }, 
};

setupSigner()
  .then(setupContract)
  .then(_registry => registry = _registry)
  .then(activateServer)
  .then(signDelegation)
  .catch(console.error);

async function setupSigner () {
  if (mnemonic) {
    signer = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
  }

  if (privateKey) {
    signer = new ethers.Wallet(privateKey, provider)
  }
}

async function activateServer () {
  const router = new Router(openrpcDocument, methodMapping);
  const serverOptions = {
    openrpcDocument: await parseOpenRPCDocument(openrpcDocument),
    transportConfigs: [
      {
        type: "HTTPTransport",
        options: {
          port: 3330,
          middleware: [],
        },
      },
      {
        type: "HTTPSTransport",
        options: {
          port: 3331,
          middleware: [],
        },
      },
    ],
    methodMapping,
  };
  const server = new Server(serverOptions);

  const httpOptions = {
    middleware: [ cors({ origin: "*" }) ],
    port: 4345
  };
  const httpTransport = new HTTPTransport(httpOptions);

  /*
  const httpsOptions = { // extends https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener
    middleware: [ cors({ origin: "*" }) ],
    port: 4346,
    key: await fs.readFile("test/fixtures/keys/agent2-key.pem"),
    cert: await fs.readFile("test/fixtures/keys/agent2-cert.pem"),
    ca: fs.readFileSync("ssl/ca.crt")
  };
  const httpsTransport = new HTTPSServerTransport(httpsOptions);
  */

  server.start();
  // server.addTransports([ httpTransport /*, httpsTransport */] ); // will be started immediately.
}



async function setupContract (): Promise<ethers.Contract> {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const { address, chainId, name } = config;
    _name = name;
    _chainId = chainId;
    return attachToContract(address)
  } catch (err) {
    console.log('No config detected, deploying contract and creating one.');
    return deployContract()
  }
}

async function deployContract () {
  const Registry = new ethers.ContractFactory(abi, phisherRegistryArtifacts.bytecode, signer);
  const balance = await provider.getBalance(signer?.address && signer.address);
  const _name = 'MobyMask';
  const registry = await Registry.deploy(_name);

  const address = registry.address;
  fs.writeFileSync(configPath, JSON.stringify({ address, name: _name, chainId: registry.deployTransaction.chainId }, null, 2));
  try {
    return await registry.deployed();
  } catch (err) {
    console.log('Deployment failed, trying to attach to existing contract.', err);
    throw err;
  }
}

async function attachToContract(address: string) {
  const Registry = new ethers.Contract(address, abi, signer);
  const registry = await Registry.attach(address);
  console.log('Attaching to existing contract');
  const deployed = await registry.deployed();
  return deployed;
}

type Invocation = {
  transaction: Transaction,
  authority: SignedDelegation[],
};

type Transaction = {
  to: string,
  gasLimit: string,
  data: string,
};

type SignedDelegation = {
  delegation: Delegation,
  signature: string,
}

type Delegation = {
  delegate: string,
  authority: string,
  caveats: Caveat[],
};

type Caveat = {
  enforcer: string,
  terms: string,
}

type SignedInvocation = {
  invocation: Invocation,
  signature: string,
}

async function signDelegation () {

  const { chainId } = await provider.getNetwork();
  const utilOpts = {
    chainId,
    verifyingContract: registry.address,
    name: _name,      
  };
  console.log('util opts', utilOpts);
  const util = generateUtil(utilOpts)
  const delegate = ethers.Wallet.createRandom();

  // Prepare the delegation message.
  // This contract is also a revocation enforcer, so it can be used for caveats:
  const delegation = {
    delegate: delegate.address,
    authority: '0x0000000000000000000000000000000000000000000000000000000000000000',
    caveats: [{
      enforcer: registry.address,
      terms: '0x0000000000000000000000000000000000000000000000000000000000000000',
    }],
  };

  const typedMessage = createTypedMessage(registry, delegation, 'Delegation', _name, _chainId);

  // Owner signs the delegation:
  const signedDelegation = util.signDelegation(delegation, signer.privateKey);
  const invitation = {
    v:1,
    signedDelegations: [signedDelegation],
    key: delegate.privateKey,
  }
  console.log('A SIGNED DELEGATION/INVITE LINK:');
  console.log(JSON.stringify(invitation, null, 2));
  console.log(baseURI + '/members?invitation=' + encodeURIComponent(JSON.stringify(invitation)));
}

function fromHexString (hexString: string) {
  console.dir(hexString);
  if (!hexString || typeof hexString !== 'string') {
    throw new Error('Expected a hex string.');
  }
  const matched = hexString.match(/.{1,2}/g)
  if (!matched) {
    throw new Error('Expected a hex string.');
  }
  const mapped = matched.map(byte => parseInt(byte, 16));
  if (!mapped || mapped.length !== 32) {
    throw new Error('Expected a hex string.');
  }
  return new Uint8Array(mapped);
}


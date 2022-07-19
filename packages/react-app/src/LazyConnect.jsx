import React, { useEffect, useState } from "react";
import MetaMaskOnboarding from "@metamask/onboarding";
import chainList from "./chainList";

export default function LazyConnect(props) {
  const { actionName, chainId } = props;
  let { opts = {} } = props;
  const { needsAccountConnected = true } = opts;
  const [provider, setInjectedProvider] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [userChainId, setUserChainId] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!provider && MetaMaskOnboarding.isMetaMaskInstalled()) {
    setInjectedProvider(window.ethereum);
  }

  const chainName = chainId ? chainList[Number(chainId)] : null;

  // Get accounts;
  useEffect(() => {
    if (!provider) {
      return;
    }
    getAccounts().then(setAccounts).catch(console.error);

    async function getAccounts() {
      try {
        const _accounts = await provider.request({ method: "eth_accounts" });
        if (_accounts.length > 0) {
          setAccounts(_accounts);
        }
      } catch (err) {
        console.log("Getting accounts failed!", err);
      }
    }

    provider.on("accountsChanged", setAccounts);

    return () => {
      provider.removeListener("accountsChanged", setAccounts);
    };
  }, []);

  // Get current selected network:
  useEffect(() => {
    if (!provider || userChainId) {
      return;
    }
    getUserChainId().then(setUserChainId).catch(console.error);

    async function getUserChainId() {
      const chainId = await provider.request({ method: "eth_chainId" });
      return chainId;
    }

    provider.on("chainChanged", setUserChainId);

    return () => {
      provider.removeListener("chainChanged", setUserChainId);
    };
  }, []);

  const needsToSwitchChain = Number(userChainId) !== chainId;
  const needsToConnectAccount = needsAccountConnected && (!accounts || accounts.length === 0);
  const requiresAction = needsToSwitchChain || needsToConnectAccount;

  if (!MetaMaskOnboarding.isMetaMaskInstalled()) {
    return (
      <div className="lazyConnect">
        {createChecklist({
          hasWallet: MetaMaskOnboarding.isMetaMaskInstalled(),
          provider,
          needsToConnectAccount,
          setLoading,
          chainId: chainId,
          userChainId,
          chainName,
          setAccounts,
          needsAccountConnected,
          actionName,
          accounts,
        })}
        <button
          onClick={() => {
            const onboarding = new MetaMaskOnboarding();
            onboarding.startOnboarding();
          }}
        >
          Get MetaMask
        </button>
      </div>
    );
  }

  if (requiresAction) {
    return (
      <div className="lazyConnect">
        {createChecklist({
          setLoading,
          provider,
          needsToConnectAccount,
          hasWallet: MetaMaskOnboarding.isMetaMaskInstalled(),
          chainId: chainId,
          userChainId,
          chainName,
          setAccounts,
          needsAccountConnected,
          actionName,
          accounts,
        })}
      </div>
    );
  }

  if (loading) {
    return <div className="lazyConnect">Loading...</div>;
  }

  const { children } = props;

  const childrenWithProps = React.Children.map(children, child => {
    // Checking isValidElement is the safe way and avoids a typescript
    // error too.
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { provider });
    }
    return child;
  });

  return <div className="lazyConnected">{childrenWithProps}</div>;
}

function createChecklist(checklistOpts) {
  const {
    chainId,
    userChainId,
    chainName,
    setAccounts,
    provider,
    setLoading,
    needsToConnectAccount,
    needsAccountConnected,
    actionName,
    hasWallet,
    accounts,
  } = checklistOpts;
  return (
    <div>
      <p>You need a few things to {actionName}.</p>
      <ol>
        {hasWallet ? (
          <li>✅ Get a web3 compatible Wallet (like MetaMask)</li>
        ) : (
          <li>☐ Get a web3 compatible Wallet (like MetaMask)</li>
        )}
        {switchAccountsItem({
          needsAccountConnected,
          needsToConnectAccount,
          setAccounts,
          provider,
          setLoading,
          accounts,
          hasWallet,
        })}
        {switchNetworkItem({ chainId, userChainId, chainName, setAccounts, provider, setLoading, hasWallet })}
      </ol>
    </div>
  );
}

function switchAccountsItem(opts) {
  const { needsToConnectAccount, setAccounts, accounts, provider, hasWallet } = opts;

  if (!needsToConnectAccount) {
    return null;
  }

  if (!hasWallet) {
    return <li>☐ Connect an account</li>;
  }

  if (typeof accounts !== "undefined" && accounts.length > 0) {
    return null;
  }

  return (
    <li>
      ☐{" "}
      <button
        onClick={async () => {
          const _accounts = await provider.request({ method: "eth_requestAccounts" });
          setAccounts(_accounts);
        }}
      >
        Connect an account
      </button>
    </li>
  );
}

function switchNetworkItem(opts) {
  const { chainId, userChainId, chainName, provider, setLoading, hasWallet } = opts;
  const needsToSwitchChain = !!chainId && Number(userChainId) !== chainId;

  if (!needsToSwitchChain) {
    return null;
  }

  if (!hasWallet) {
    return <li>Switch to the {chainName} network</li>;
  }

  return (
    <li>
      <button
        onClick={async () => {
          provider
            .request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x" + chainId.toString(16) }],
            })
            .then(() => {
              setLoading(false);
            })
            .catch(reason => {
              setLoading(false);
              setError(reason);
            });
          setLoading(true);
        }}
      >
        Switch to the {chainName} network
      </button>
    </li>
  );
}

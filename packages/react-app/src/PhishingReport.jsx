import React, { useEffect, useState } from "react";
import reportPhishers from "./reportPhishers";
import LazyConnect from "./LazyConnect";
const { ethers } = require("ethers");
const config = require("./config.json");
const { chainId } = config;
import TextInput from "./TextInput";

export default function (props) {
  const { invitation } = props;
  const [phisher, setPhisher] = useState();
  const [phishers, setPhishers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) {
      return;
    }
    try {
      const rawStorage = localStorage.getItem("pendingPhishers");
      let storedPhishers = JSON.parse(rawStorage) || [];
      setPhishers(storedPhishers);
      setLoaded(true);
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div className="box">
      <h3>Report a phishing attempt</h3>
      <TextInput
        placeholder="@phisher_person"
        buttonLabel="Report"
        onComplete={phisher => {
          const _phisher = phisher.indexOf("@") === 0 ? phisher.slice(1) : phisher;
          if (phishers.includes(_phisher)) return;
          const newPhishers = [...phishers, _phisher];
          console.log("new phishers is ", newPhishers);
          localStorage.setItem("pendingPhishers", JSON.stringify(newPhishers));
          setPhishers(newPhishers);
        }}
      />

      <button
        onClick={() => {
          if (phisher) {
            phishers.push(phisher);
            localStorage.setItem("pendingPhishers", JSON.stringify(phishers));
            setPhisher("");
          }
        }}
      >
        Report twitter phisher
      </button>

      <div className="phishers">
        {phishers && phishers.length > 0 ? (
          <div>
            <p>Pending phishing reports:</p>
            <ol>
              {phishers.map((phisher, index) => {
                return (
                  <li key={index}>
                    {phisher}{" "}
                    <button
                      onClick={() => {
                        const newPhishers = phishers.filter(p => p !== phisher);
                        localStorage.setItem("pendingPhishers", JSON.stringify(newPhishers));
                        setPhishers(newPhishers);
                      }}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ol>

            <LazyConnect actionName="submit reports directly to the blockchain" chainId={chainId}>
              <SubmitBatchButton phishers={phishers} invitation={invitation} setPhishers={setPhishers} />
            </LazyConnect>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SubmitBatchButton(props) {
  const { provider, phishers, invitation, setPhishers } = props;
  const ethersProvider = new ethers.providers.Web3Provider(provider, "any");
  console.log("trying to submit batch with", ethersProvider);
  return (
    <div>
      <button
        onClick={async () => {
          try {
            const block = await reportPhishers(phishers, ethersProvider, invitation);
            localStorage.clear();
            setPhishers([]);
          } catch (err) {
            alert(`Error: ${err.message}`);
          }
        }}
      >
        Submit batch to blockchain
      </button>
    </div>
  );
}

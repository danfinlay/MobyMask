import React, { useEffect, useState } from "react";
import reportMembers from "./reportMembers";
import LazyConnect from "./LazyConnect";
const { ethers } = require("ethers");
const config = require("./config.json");
const { chainId } = config;
import TextInput from "./TextInput";

export default function (props) {
  const { invitation } = props;
  const [members, setMembers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(function loadMembersFromDisk() {
    if (loaded) {
      return;
    }
    try {
      const rawStorage = localStorage.getItem("pendingMembers");
      let storedMembers = JSON.parse(rawStorage) || [];
      setMembers(storedMembers);
      setLoaded(true);
    } catch (err) {
      console.error(err);
    }
  });

  return (
    <div className="box">
      <h3>Endorse a member</h3>
      <TextInput
        placeholder="@member_person"
        buttonLabel="Endorse"
        onComplete={member => {
          const _member = member.indexOf("@") === 0 ? member.slice(1) : member;
          if (members.includes(_member)) return;
          const newMembers = [...members, _member];
          setMembers(newMembers);
          localStorage.setItem("pendingMembers", JSON.stringify(newMembers));
        }}
      />

      <div className="members">
        {members && members.length > 0 ? (
          <div>
            <p>Pending member nominations:</p>
            <ol>
              {members.map((member, index) => {
                return (
                  <li key={index}>
                    {member}{" "}
                    <button
                      onClick={() => {
                        const newMembers = members.filter(p => p !== member);
                        localStorage.setItem("pendingMembers", JSON.stringify(newMembers));
                        setMembers(newMembers);
                      }}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ol>

            <LazyConnect actionName="submit endorsements directly to the blockchain" chainId={chainId}>
              <SubmitBatchButton members={members} invitation={invitation} setMembers={setMembers} />
            </LazyConnect>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SubmitBatchButton(props) {
  const { provider, members, invitation, setMembers } = props;
  const ethersProvider = new ethers.providers.Web3Provider(provider, "any");
  return (
    <div>
      <button
        onClick={async () => {
          try {
            const block = await reportMembers(members, ethersProvider, invitation);
            localStorage.clear();
            setMembers([]);
          } catch (err) {
            console.error(err);
            alert(`Error: ${err.message}`);
          }
        }}
      >
        Submit batch to blockchain
      </button>
    </div>
  );
}

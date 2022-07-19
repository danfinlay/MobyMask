import React from "react";
import { BrowserRouter as Router, Route, Link, Switch, useLocation } from "react-router-dom";
import LazyConnect from "./LazyConnect";
import { PhisherCheckButton } from "./PhisherCheck";
const { chainId } = require("./config.json");

// Routes
import InstallExtension from "./InstallExtension";
import Members from "./Members";
import { MemberCheckButton } from "./MemberCheck";

export default function QueryParamsRouter(props) {
  const { provider } = props;
  let query = useQuery();

  return (
    <Switch>
      <Route exact path="/">
        <div className="box">
          <LazyConnect
            actionName="check if a user is a phisher or member"
            chainId={chainId}
            opts={{ needsAccountConnected: false }}
          >
            <PhisherCheckButton />
            <MemberCheckButton />
          </LazyConnect>
        </div>

        <InstallExtension />
      </Route>
      <Route path="/members/">
        <Members />
      </Route>
    </Switch>
  );
}

function useQuery() {
  const { search } = useLocation();

  return React.useMemo(() => new URLSearchParams(search), [search]);
}

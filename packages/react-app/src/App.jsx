import logo from "./logo.svg";
import QueryParamsRoute from "./QueryParamsRoute";
import "antd/dist/antd.min.css";
import { HashRouter as Router, Link, Route, Switch } from "react-router-dom";
import "./App.css";

function App(props) {
  return (
    <div className="App">
      <header className="App-header">
        <h1>
          <img src={logo} className="App-logo" alt="logo" />
          MobyMask
        </h1>
        <p>An alliance of good-hearted phish, aiming to eliminate phishers.</p>
      </header>

      <Router>
        <QueryParamsRoute />
      </Router>

      <div className="footer">
        <p>Reporters are added on an invite-only basis.</p>
        <p>
          <a href="https://mirror.xyz/0x55e2780588aa5000F464f700D2676fD0a22Ee160/8whNch3m5KMzeo6g5eblcXMMplPf8UpW228cSh3nmzg">
            Learn more
          </a>
        </p>
        <p>
          <a href="https://github.com/danfinlay/MobyMask/">Fork on GitHub</a>
        </p>
      </div>
    </div>
  );
}

export default App;

import { ApolloClient, ApolloLink, ApolloProvider, HttpLink, InMemoryCache } from "@apollo/client";
import React from "react";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

const themes = {
  dark: `${process?.env?.PUBLIC_URL}/dark-theme.css`,
  light: `${process?.env?.PUBLIC_URL}/light-theme.css`,
};

const prevTheme = window.localStorage.getItem("theme");

const subgraphUri = "http://localhost:8000/subgraphs/name/scaffold-eth/your-contract";
const watcherUri = process?.env?.REACT_APP_WATCHER_URI;

const subgraphEndpoint = new HttpLink({
  uri: subgraphUri,
});
const watcherEndpoint = new HttpLink({
  uri: watcherUri,
});

const client = new ApolloClient({
  link: ApolloLink.split(
    operation => operation.getContext().clientName === "watcher",
    watcherEndpoint,
    subgraphEndpoint,
  ),
  cache: new InMemoryCache(),
});

ReactDOM.render(
  <ApolloProvider client={client}>
    <ThemeSwitcherProvider themeMap={themes} defaultTheme={prevTheme || "light"}>
      <App subgraphUri={subgraphUri} />
    </ThemeSwitcherProvider>
  </ApolloProvider>,
  document.getElementById("root"),
);

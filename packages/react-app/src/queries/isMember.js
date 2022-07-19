export default `
  query isMember($blockHash: String!, $contractAddress: String!, $key0: String!) {
    isMember(blockHash: $blockHash, contractAddress: $contractAddress, key0: $key0) {
      value
      proof {
        data
      }
    }
  }
`;

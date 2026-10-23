import Web3 from "web3";
import ElectionArtifact from "./contracts/Election.json";

/**
 * Returns a Web3 instance using MetaMask's window.ethereum provider if present.
 */
export const getWeb3Instance = () => {
  if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
    return new Web3(window.ethereum);
  }
  return null;
};

/**
 * Initializes the Election contract instance from the Truffle artifact
 * based on the connected network ID.
 */
export const getContractInstance = async (web3) => {
  if (!web3) {
    return {
      contract: null,
      address: null,
      networkId: null,
      error: "Web3 provider is not available.",
    };
  }

  try {
    const rawNetworkId = await web3.eth.net.getId();
    const networkId = rawNetworkId.toString();

    const networks = ElectionArtifact.networks || {};
    let deployedNetwork = networks[networkId];

    // Ganache may report network ID 5777 while EVM chain ID is 1337 (or vice-versa)
    if (!deployedNetwork && (networkId === "1337" || networkId === "5777")) {
      deployedNetwork = networks["5777"] || networks["1337"];
    }

    if (!deployedNetwork || !deployedNetwork.address) {
      const deployedIds = Object.keys(networks);
      let errorMsg = `Election contract is not deployed on current network (ID: ${networkId}).`;
      if (deployedIds.length > 0) {
        errorMsg += ` It is deployed on network ID(s): ${deployedIds.join(", ")}. Please switch MetaMask to the Ganache network (RPC: 127.0.0.1:7545).`;
      } else {
        errorMsg += ` Please compile and migrate the contract using 'truffle migrate --reset'.`;
      }

      return {
        contract: null,
        address: null,
        networkId,
        error: errorMsg,
      };
    }

    const contract = new web3.eth.Contract(
      ElectionArtifact.abi,
      deployedNetwork.address
    );

    return {
      contract,
      address: deployedNetwork.address,
      networkId,
      error: null,
    };
  } catch (err) {
    return {
      contract: null,
      address: null,
      networkId: null,
      error: err.message || "Failed to load contract.",
    };
  }
};

export { ElectionArtifact };

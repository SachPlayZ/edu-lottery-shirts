import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { Chain } from "wagmi/chains";

// Define educhain configuration
const educhain: Chain = {
  id: 656476,
  name: "Educhain Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "EDU",
    symbol: "EDU",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.open-campus-codex.gelato.digital"],
    },
    public: {
      http: ["https://rpc.open-campus-codex.gelato.digital"],
    },
  },
};

export function getConfig() {
  return createConfig({
    chains: [educhain],
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
    transports: {
      [educhain.id]: http(),
    },
  });
}

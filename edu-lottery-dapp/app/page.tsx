"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import abi, { contractAddress } from "./abi";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";

// Add this constant at the top of the file, outside of the Home component
const ADMIN_ADDRESS = "0xe34b40f38217f9Dc8c3534735f7f41B2cDA73A75";

// First, let's define some types at the top of the file
type WinnerInfo = {
  winnerAddress: `0x${string}`;
  name: string;
  number: bigint;
};

// Add this type helper at the top with other types
type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function getErrorMessage(error: unknown) {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return "Unknown error occurred";
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [name, setName] = useState("");
  const [isRefetching, setIsRefetching] = useState(false);

  // Write contract functionality
  const {
    data: writeData,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();

  // Handle transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: writeData,
    });

  // Read functions with proper enablement and refetching capability
  const {
    data: participantCount,
    refetch: refetchParticipantCount,
    isLoading: isLoadingParticipantCount,
  } = useReadContract({
    abi,
    address: contractAddress,
    functionName: "getParticipantCount",
  });

  const {
    data: winnerCount,
    refetch: refetchWinnerCount,
    isLoading: isLoadingWinnerCount,
  } = useReadContract({
    abi,
    address: contractAddress,
    functionName: "getWinnerCount",
  });

  const { data: isUserWinner, refetch: refetchIsUserWinner } = useReadContract({
    abi,
    address: contractAddress,
    functionName: "isWinner",
    args: address ? [address as `0x${string}`] : undefined,
  });

  const {
    data: userInfo,
    refetch: refetchUserInfo,
    isLoading: isLoadingUserInfo,
  } = useReadContract({
    abi,
    address: contractAddress,
    functionName: "getParticipantInfo",
    args: address ? [address as `0x${string}`] : undefined,
  });

  const {
    data: latestWinner,
    refetch: refetchLatestWinner,
    isLoading: isLoadingLatestWinner,
  } = useReadContract({
    abi,
    address: contractAddress,
    functionName: "getLatestWinner",
  });

  // Inside the Home component, add this check
  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  // Function to refresh all contract data
  const refreshAllData = async () => {
    setIsRefetching(true);
    try {
      await Promise.all([
        refetchParticipantCount(),
        refetchWinnerCount(),
        refetchLatestWinner(),
        ...(address ? [refetchIsUserWinner(), refetchUserInfo()] : []),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefetching(false);
    }
  };

  // Effect to refresh data after transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      toast.success("Transaction confirmed successfully!");
      refreshAllData();
    }
  }, [isConfirmed]);

  // Effect to handle write errors
  useEffect(() => {
    if (writeError) {
      toast.error(
        `Transaction failed: ${writeError.message || "Unknown error"}`
      );
    }
  }, [writeError]);

  // Write functions with proper error handling
  const handleEnterRaffle = async () => {
    if (!name) {
      toast.error("Please enter your name first");
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      writeContract({
        abi,
        address: contractAddress,
        functionName: "enterRaffle",
        args: [name],
      });
    } catch (error: unknown) {
      console.error("Error entering raffle:", error);
      toast.error(`Failed to enter raffle: ${getErrorMessage(error)}`);
    }
  };

  const handleDrawWinner = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      writeContract({
        abi,
        address: contractAddress,
        functionName: "drawWinner",
      });
    } catch (error: unknown) {
      console.error("Error drawing winner:", error);
      toast.error(`Failed to draw winner: ${getErrorMessage(error)}`);
    }
  };

  // Add this new function to handle lottery reset
  const handleResetLottery = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      writeContract({
        abi,
        address: contractAddress,
        functionName: "resetLottery",
      });
    } catch (error: unknown) {
      console.error("Error resetting lottery:", error);
      toast.error(`Failed to reset lottery: ${getErrorMessage(error)}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white overflow-hidden">
      <div className="absolute inset-0 bg-purple-800 opacity-50 z-0"></div>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="z-10 text-center relative max-w-2xl w-full"
      >
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300">
            Swag Lottery
          </h1>
          <p className="text-lg md:text-xl text-purple-200">
            Enter the Lottery of Destiny
          </p>
        </div>

        {/* Wallet Connection - Always visible */}
        <div className="mb-8 flex justify-center">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <ConnectButton
              label="Connect Wallet"
              accountStatus="address"
              chainStatus="icon"
              showBalance={false}
            />
          </motion.div>
        </div>

        {/* Lottery Entry Form - Only shown when wallet is connected and not admin */}
        {isConnected && !isAdmin ? (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 flex flex-col items-center justify-center"
          >
            <Input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-64 md:w-80 text-center bg-purple-900 border-purple-500 text-white placeholder-purple-300"
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleEnterRaffle}
                disabled={!name || isConfirming || isPending}
                className="px-6 py-3 text-lg font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isPending || isConfirming ? "Processing..." : "Enter Lottery"}
              </Button>
            </motion.div>
          </motion.div>
        ) : !isConnected ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg text-purple-200"
          >
            Connect your wallet to enter the lottery
          </motion.p>
        ) : null}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="p-4 bg-purple-900 bg-opacity-80 rounded-lg shadow-md border border-purple-500 text-white">
            <h2 className="text-xl mb-2">Total Participants</h2>
            {isLoadingParticipantCount || isRefetching ? (
              <div className="animate-pulse h-8 bg-purple-700 rounded w-16 mx-auto"></div>
            ) : (
              <p className="text-2xl font-bold">
                {participantCount?.toString() || "0"}
              </p>
            )}
          </div>
          <div className="p-4 bg-purple-900 bg-opacity-80 rounded-lg shadow-md border border-purple-500 text-white">
            <h2 className="text-xl mb-2">Winners Drawn</h2>
            {isLoadingWinnerCount || isRefetching ? (
              <div className="animate-pulse h-8 bg-purple-700 rounded w-16 mx-auto"></div>
            ) : (
              <p className="text-2xl font-bold">
                {winnerCount?.toString() || "0"}
              </p>
            )}
          </div>
        </div>

        {/* User Info - Only show for connected non-admin users */}
        {isConnected && !isAdmin && (
          <div className="p-6 bg-purple-900 bg-opacity-80 rounded-lg shadow-md mt-8 border border-purple-500 text-white">
            <h2 className="text-2xl mb-4 font-bold">Your Information</h2>
            {isLoadingUserInfo || isRefetching ? (
              <div className="space-y-2">
                <div className="animate-pulse h-6 bg-purple-700 rounded w-3/4 mx-auto"></div>
                <div className="animate-pulse h-6 bg-purple-700 rounded w-1/2 mx-auto"></div>
                <div className="animate-pulse h-6 bg-purple-700 rounded w-2/3 mx-auto"></div>
              </div>
            ) : Array.isArray(userInfo) && userInfo.length > 0 ? (
              <>
                <p className="mb-2">
                  <span className="font-semibold">Name:</span>{" "}
                  {userInfo[0] || "Not registered"}
                </p>
                <p className="mb-2">
                  <span className="font-semibold">Number:</span>{" "}
                  {userInfo[1]?.toString() || "N/A"}
                </p>
                <p className="mb-2">
                  <span className="font-semibold">Winner Status:</span>{" "}
                  {isUserWinner ? (
                    <span className="text-yellow-300 font-bold">
                      🏆 Winner!
                    </span>
                  ) : (
                    "Not a winner yet"
                  )}
                </p>
              </>
            ) : (
              <p>You haven&apos;t entered the lottery yet.</p>
            )}
          </div>
        )}

        {/* Latest Winner */}
        <div className="p-6 bg-purple-900 bg-opacity-80 rounded-lg shadow-md mt-8 border border-purple-500 text-white">
          <h2 className="text-2xl mb-4 font-bold">Latest Winner</h2>
          {isLoadingLatestWinner || isRefetching ? (
            <div className="space-y-2">
              <div className="animate-pulse h-6 bg-purple-700 rounded w-3/4 mx-auto"></div>
              <div className="animate-pulse h-6 bg-purple-700 rounded w-1/2 mx-auto"></div>
              <div className="animate-pulse h-6 bg-purple-700 rounded w-2/3 mx-auto"></div>
            </div>
          ) : latestWinner && (latestWinner as WinnerInfo).winnerAddress ? (
            <>
              <p className="mb-2 break-words">
                <span className="font-semibold">Address:</span>{" "}
                {(latestWinner as WinnerInfo).winnerAddress}
              </p>
              <p className="mb-2">
                <span className="font-semibold">Name:</span>{" "}
                {(latestWinner as WinnerInfo).name}
              </p>
              <p className="mb-2">
                <span className="font-semibold">Number:</span>{" "}
                {(latestWinner as WinnerInfo).number.toString()}
              </p>
            </>
          ) : (
            <p>No winners drawn yet.</p>
          )}
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="p-6 bg-purple-900 bg-opacity-80 rounded-lg shadow-md mt-8 border border-purple-500 text-white">
            <h2 className="text-2xl mb-4 font-bold">Admin Actions</h2>
            <div className="space-x-4">
              <button
                onClick={handleDrawWinner}
                disabled={isPending || isConfirming}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? "Processing..." : "Draw Winner"}
              </button>
              <button
                onClick={handleResetLottery}
                disabled={isPending || isConfirming}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? "Processing..." : "Reset Lottery"}
              </button>
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {isPending && (
          <div className="p-4 bg-yellow-500 bg-opacity-90 rounded-lg mt-8 text-white">
            <p className="font-semibold">Waiting for wallet confirmation...</p>
          </div>
        )}
        {isConfirming && (
          <div className="p-4 bg-yellow-600 bg-opacity-90 rounded-lg mt-8 text-white">
            <p className="font-semibold">
              Transaction is being confirmed on the blockchain...
            </p>
          </div>
        )}
        {isConfirmed && (
          <div className="p-4 bg-green-500 bg-opacity-90 rounded-lg mt-8 text-white">
            <p className="font-semibold">Transaction confirmed successfully!</p>
          </div>
        )}

        {/* Manual Refresh Button */}
        <div className="mt-8">
          <Button
            onClick={refreshAllData}
            disabled={isRefetching}
            variant="outline"
            className="px-4 py-2 text-sm font-medium text-purple-300 border-purple-300 hover:bg-purple-800 transition-all duration-300"
          >
            {isRefetching ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </motion.div>

      <div className="absolute bottom-4 left-4 right-4 text-center text-purple-200 text-sm">
        <p>© 2025 Swag Lottery. All rights reserved.</p>
      </div>
    </main>
  );
}

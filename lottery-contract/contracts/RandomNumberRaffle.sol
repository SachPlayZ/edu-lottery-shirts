// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title RandomNumberRaffle
 * @dev A raffle contract where participants are assigned unique random numbers
 * and an admin can draw winners from the pool of participants.
 */
contract RandomNumberRaffle {
    // Contract owner/admin address
    address public admin;

    // Struct to store participant information
    struct Participant {
        string name;
        uint256 number;
        bool exists;
    }

    // Struct to store winner information
    struct WinnerInfo {
        address winnerAddress;
        string name;
        uint256 number;
    }

    // Mapping from participant address to their information
    mapping(address => Participant) public participants;

    // Array to store all assigned numbers (to check for uniqueness)
    uint256[] public assignedNumbers;

    // Array to store addresses of all participants
    address[] public participantAddresses;

    // Array to store winners' addresses
    address[] public winnerAddresses;

    // Array to store detailed winner information
    WinnerInfo[] public winners;

    // Mapping to track if a number has been assigned
    mapping(uint256 => bool) public numberAssigned;

    // Maximum number that can be assigned (1-100)
    uint256 public constant MAX_NUMBER = 100;

    // Events
    event ParticipantEntered(
        address indexed participant,
        string name,
        uint256 number
    );
    event WinnerDrawn(address indexed winner, string name, uint256 number);
    event LotteryReset(uint256 timestamp);

    /**
     * @dev Sets the contract deployer as the admin
     */
    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Modifier to restrict functions to admin only
     */
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    /**
     * @dev Allows a participant to enter the raffle
     * @param _name The name of the participant
     */
    function enterRaffle(string memory _name) external {
        // Check if participant has already entered
        require(
            !participants[msg.sender].exists,
            "You have already entered the raffle"
        );

        // Check if we still have available numbers
        require(
            assignedNumbers.length < MAX_NUMBER,
            "All numbers have been assigned"
        );

        // Generate a random number that hasn't been assigned yet
        uint256 randomNumber = _generateUniqueRandomNumber();

        // Store participant information
        participants[msg.sender] = Participant({
            name: _name,
            number: randomNumber,
            exists: true
        });

        // Mark number as assigned
        numberAssigned[randomNumber] = true;

        // Add number to assigned numbers
        assignedNumbers.push(randomNumber);

        // Add address to participant addresses
        participantAddresses.push(msg.sender);

        // Emit event
        emit ParticipantEntered(msg.sender, _name, randomNumber);
    }

    /**
     * @dev Draws a winner from the raffle participants
     * @return winnerInfo Struct containing the winner's address, name, and number
     */
    function drawWinner()
        external
        onlyAdmin
        returns (WinnerInfo memory winnerInfo)
    {
        // Check if there are participants who haven't won yet
        uint256 eligibleCount = 0;
        for (uint256 i = 0; i < participantAddresses.length; i++) {
            address participantAddress = participantAddresses[i];
            bool isCurrentWinner = false;

            // Check if participant is already a winner
            for (uint256 j = 0; j < winnerAddresses.length; j++) {
                if (winnerAddresses[j] == participantAddress) {
                    isCurrentWinner = true;
                    break;
                }
            }

            if (!isCurrentWinner) {
                eligibleCount++;
            }
        }

        require(eligibleCount > 0, "No eligible participants left");

        // Generate random index for selecting a winner
        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)
            )
        ) % eligibleCount;

        // Select winner
        address winnerAddress;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < participantAddresses.length; i++) {
            address participantAddress = participantAddresses[i];
            bool isCurrentWinner = false;

            // Check if participant is already a winner
            for (uint256 j = 0; j < winnerAddresses.length; j++) {
                if (winnerAddresses[j] == participantAddress) {
                    isCurrentWinner = true;
                    break;
                }
            }

            if (!isCurrentWinner) {
                if (currentIndex == randomIndex) {
                    winnerAddress = participantAddress;
                    break;
                }
                currentIndex++;
            }
        }

        // Get winner information
        Participant memory winner = participants[winnerAddress];

        // Create winner info struct
        winnerInfo = WinnerInfo({
            winnerAddress: winnerAddress,
            name: winner.name,
            number: winner.number
        });

        // Add winner to winners arrays
        winnerAddresses.push(winnerAddress);
        winners.push(winnerInfo);

        // Emit event
        emit WinnerDrawn(winnerAddress, winner.name, winner.number);

        return winnerInfo;
    }

    /**
     * @dev Internal function to generate a unique random number
     * @return A random number between 1 and MAX_NUMBER that hasn't been assigned
     */
    function _generateUniqueRandomNumber() internal view returns (uint256) {
        // Create an array of available numbers
        uint256[] memory availableNumbers = new uint256[](
            MAX_NUMBER - assignedNumbers.length
        );
        uint256 count = 0;

        // Populate available numbers
        for (uint256 i = 1; i <= MAX_NUMBER; i++) {
            if (!numberAssigned[i]) {
                availableNumbers[count] = i;
                count++;
            }
        }

        // Generate random index
        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    assignedNumbers.length
                )
            )
        ) % availableNumbers.length;

        // Return the number at the random index
        return availableNumbers[randomIndex];
    }

    /**
     * @dev Gets all winners with their detailed information
     * @return An array of WinnerInfo structs
     */
    function getAllWinners() external view returns (WinnerInfo[] memory) {
        return winners;
    }

    /**
     * @dev Gets winner count
     * @return The number of winners drawn so far
     */
    function getWinnerCount() external view returns (uint256) {
        return winners.length;
    }

    /**
     * @dev Gets a specific winner by index
     * @param _index The index of the winner in the winners array
     * @return WinnerInfo struct containing the winner's address, name, and number
     */
    function getWinnerByIndex(
        uint256 _index
    ) external view returns (WinnerInfo memory) {
        require(_index < winners.length, "Index out of bounds");
        return winners[_index];
    }

    /**
     * @dev Gets the latest winner
     * @return WinnerInfo struct containing the latest winner's address, name, and number
     */
    function getLatestWinner() external view returns (WinnerInfo memory) {
        require(winners.length > 0, "No winners yet");
        return winners[winners.length - 1];
    }

    /**
     * @dev Gets participant count
     * @return The number of participants in the raffle
     */
    function getParticipantCount() external view returns (uint256) {
        return participantAddresses.length;
    }

    /**
     * @dev Gets participant information
     * @param _participant The address of the participant
     * @return name The name of the participant
     * @return number The assigned number
     * @return exists Whether the participant exists
     */
    function getParticipantInfo(
        address _participant
    ) external view returns (string memory name, uint256 number, bool exists) {
        Participant memory participant = participants[_participant];
        return (participant.name, participant.number, participant.exists);
    }

    /**
     * @dev Checks if a participant is a winner
     * @param _participant The address of the participant
     * @return Boolean indicating if the participant is a winner
     */
    function isWinner(address _participant) external view returns (bool) {
        for (uint256 i = 0; i < winnerAddresses.length; i++) {
            if (winnerAddresses[i] == _participant) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Resets the lottery by clearing all participants and winners
     * Only admin can call this function
     */
    function resetLottery() external onlyAdmin {
        // Clear participants mapping
        for (uint256 i = 0; i < participantAddresses.length; i++) {
            delete participants[participantAddresses[i]];
        }

        // Clear all arrays
        delete participantAddresses;
        delete winnerAddresses;
        delete winners;
        delete assignedNumbers;

        // Clear number assignments
        for (uint256 i = 1; i <= MAX_NUMBER; i++) {
            numberAssigned[i] = false;
        }

        emit LotteryReset(block.timestamp);
    }
}

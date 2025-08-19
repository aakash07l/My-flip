// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract CoinFlipGame is ReentrancyGuard, Ownable, Pausable {
    uint256 public constant REWARD_AMOUNT = 0.001 ether;
    uint256 public constant HOUSE_EDGE = 2; // 2% house edge
    
    struct Player {
        uint256 totalFlips;
        uint256 totalRewards;
        uint256 winStreak;
        bool exists;
    }
    
    mapping(address => Player) public players;
    address[] public playerList;
    
    event CoinFlipped(address indexed player, bool won, uint256 reward);
    event LeaderboardUpdated(address indexed player, uint256 totalFlips);
    
    modifier validFlip() {
        require(!paused(), "Game is paused");
        require(address(this).balance >= REWARD_AMOUNT, "Insufficient contract balance");
        _;
    }
    
    constructor() {
        // Initialize with some sample players for demonstration
    }
    
    function flipCoin() external payable validFlip nonReentrant {
        require(msg.value >= 0.0001 ether, "Minimum bet required");
        
        // Generate pseudo-random result
        // In production, use Chainlink VRF for true randomness
        bool won = _generateRandomResult();
        
        // Update player stats
        if (!players[msg.sender].exists) {
            players[msg.sender].exists = true;
            playerList.push(msg.sender);
        }
        
        players[msg.sender].totalFlips++;
        
        uint256 reward = 0;
        if (won) {
            reward = REWARD_AMOUNT;
            players[msg.sender].totalRewards++;
            players[msg.sender].winStreak++;
            
            // Transfer reward
            (bool success, ) = payable(msg.sender).call{value: reward}("");
            require(success, "Reward transfer failed");
        } else {
            players[msg.sender].winStreak = 0;
        }
        
        emit CoinFlipped(msg.sender, won, reward);
        emit LeaderboardUpdated(msg.sender, players[msg.sender].totalFlips);
    }
    
    function _generateRandomResult() private view returns (bool) {
        // Simple pseudo-random generation
        // In production, use Chainlink VRF or similar oracle service
        uint256 randomHash = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            blockhash(block.number - 1)
        )));
        
        return (randomHash % 100) < (50 - HOUSE_EDGE);
    }
    
    function getTopPlayers(uint256 count) external view returns (
        address[] memory addresses,
        uint256[] memory flips,
        uint256[] memory rewards
    ) {
        require(count <= playerList.length, "Count exceeds player count");
        
        // Simple sorting - in production, use more efficient method
        address[] memory sortedAddresses = new address[](playerList.length);
        for (uint i = 0; i < playerList.length; i++) {
            sortedAddresses[i] = playerList[i];
        }
        
        // Bubble sort by total flips (descending)
        for (uint i = 0; i < sortedAddresses.length - 1; i++) {
            for (uint j = 0; j < sortedAddresses.length - i - 1; j++) {
                if (players[sortedAddresses[j]].totalFlips < players[sortedAddresses[j + 1]].totalFlips) {
                    address temp = sortedAddresses[j];
                    sortedAddresses[j] = sortedAddresses[j + 1];
                    sortedAddresses[j + 1] = temp;
                }
            }
        }
        
        addresses = new address[](count);
        flips = new uint256[](count);
        rewards = new uint256[](count);
        
        for (uint i = 0; i < count; i++) {
            addresses[i] = sortedAddresses[i];
            flips[i] = players[sortedAddresses[i]].totalFlips;
            rewards[i] = players[sortedAddresses[i]].totalRewards;
        }
        
        return (addresses, flips, rewards);
    }
    
    function getPlayerStats(address player) external view returns (
        uint256 totalFlips,
        uint256 totalRewards,
        uint256 winStreak
    ) {
        Player memory p = players[player];
        return (p.totalFlips, p.totalRewards, p.winStreak);
    }
    
    // Owner functions
    function fundContract() external payable onlyOwner {}
    
    function withdrawFunds(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {}
}

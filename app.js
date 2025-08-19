import { createConfig, http, connect, disconnect, getAccount, watchAccount } from 'https://esm.sh/@wagmi/core@2.13.4';
import { arbitrum } from 'https://esm.sh/@wagmi/core@2.13.4/chains';
import { injected } from 'https://esm.sh/@wagmi/connectors@5.0.4';

// Wagmi Configuration
const config = createConfig({
    chains: [arbitrum],
    connectors: [injected()],
    transports: {
        [arbitrum.id]: http(),
    },
});

// Game State
let gameState = {
    totalFlips: 0,
    rewardsWon: 0,
    currentStreak: 0,
    isFlipping: false,
    playerName: 'Anonymous'
};

// Contract Configuration
const CONTRACT_ADDRESS = '0x742d35Cc6635C0532925a3b8D45c9f53e7ad3C1b';
const REWARD_AMOUNT = '0.001';

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadLeaderboard();
    setupEventListeners();
    watchWalletConnection();
});

function initializeApp() {
    // Load saved game state
    const saved = localStorage.getItem('flipGameState');
    if (saved) {
        gameState = { ...gameState, ...JSON.parse(saved) };
        updateStats();
    }
    
    // Check if already connected
    const account = getAccount(config);
    if (account.isConnected) {
        updateWalletStatus(account.address);
    }
}

function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('flipButton').addEventListener('click', flipCoin);
}

function watchWalletConnection() {
    watchAccount(config, {
        onChange(account) {
            if (account.isConnected) {
                updateWalletStatus(account.address);
            } else {
                updateWalletStatus(null);
            }
        },
    });
}

async function connectWallet() {
    try {
        const result = await connect(config, { connector: injected() });
        showToast('Wallet connected successfully!', 'success');
        updateWalletStatus(result.accounts[0]);
    } catch (error) {
        console.error('Failed to connect wallet:', error);
        showToast('Failed to connect wallet', 'error');
    }
}

function updateWalletStatus(address) {
    const walletStatus = document.getElementById('walletStatus');
    if (address) {
        walletStatus.innerHTML = `
            <div class="wallet-connected">
                <span>🟢 ${address.slice(0, 6)}...${address.slice(-4)}</span>
                <button onclick="disconnectWallet()" class="disconnect-btn">Disconnect</button>
            </div>
        `;
        gameState.playerName = `${address.slice(0, 6)}...${address.slice(-4)}`;
    } else {
        walletStatus.innerHTML = '<button id="connectWallet" class="connect-btn">Connect Wallet</button>';
        document.getElementById('connectWallet').addEventListener('click', connectWallet);
    }
}

async function disconnectWallet() {
    try {
        await disconnect(config);
        showToast('Wallet disconnected', 'success');
    } catch (error) {
        console.error('Failed to disconnect:', error);
    }
}

async function flipCoin() {
    const account = getAccount(config);
    if (!account.isConnected) {
        showToast('Please connect your wallet first', 'error');
        return;
    }

    if (gameState.isFlipping) return;

    gameState.isFlipping = true;
    const flipButton = document.getElementById('flipButton');
    const coin = document.getElementById('coin');
    
    flipButton.disabled = true;
    flipButton.textContent = 'Flipping...';
    
    // Animate coin flip
    coin.classList.add('flipping');
    
    // Simulate flip result (50/50 chance)
    const isHeads = Math.random() < 0.5;
    
    setTimeout(async () => {
        // Set final coin position
        coin.classList.remove('flipping');
        if (isHeads) {
            coin.classList.add('heads-result');
            coin.classList.remove('tails-result');
        } else {
            coin.classList.add('tails-result');
            coin.classList.remove('heads-result');
        }
        
        // Update game state
        gameState.totalFlips++;
        
        if (isHeads) {
            gameState.rewardsWon++;
            gameState.currentStreak++;
            showToast(`🎉 Heads! You won ${REWARD_AMOUNT} ETH!`, 'success');
            
            // Simulate reward transaction (in real app, call smart contract)
            try {
                await simulateRewardTransaction();
            } catch (error) {
                console.error('Reward transaction failed:', error);
                showToast('Reward transaction failed', 'error');
            }
        } else {
            gameState.currentStreak = 0;
            showToast('😔 Tails! No reward this time.', 'error');
        }
        
        updateStats();
        updateLeaderboard();
        saveGameState();
        
        gameState.isFlipping = false;
        flipButton.disabled = false;
        flipButton.textContent = 'Flip Coin';
    }, 1000);
}

async function simulateRewardTransaction() {
    // In a real implementation, this would interact with the smart contract
    // For demo purposes, we'll just simulate the transaction
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`Simulated reward: ${REWARD_AMOUNT} ETH sent to user`);
            resolve();
        }, 500);
    });
}

function updateStats() {
    document.getElementById('totalFlips').textContent = gameState.totalFlips;
    document.getElementById('rewardsWon').textContent = gameState.rewardsWon;
    document.getElementById('currentStreak').textContent = gameState.currentStreak;
}

function saveGameState() {
    localStorage.setItem('flipGameState', JSON.stringify(gameState));
}

function loadLeaderboard() {
    // Sample leaderboard data - in real app, this would come from blockchain data
    const sampleData = [
        { name: "0xAlice...1234", flips: 42, rewards: 21 },
        { name: "0xBob...5678", flips: 38, rewards: 19 },
        { name: "0xCharlie...9abc", flips: 35, rewards: 18 },
        { name: "0xDiana...def0", flips: 31, rewards: 15 },
        { name: "0xEve...1357", flips: 28, rewards: 14 },
        { name: "0xFrank...2468", flips: 25, rewards: 12 },
        { name: "0xGrace...369c", flips: 22, rewards: 11 },
        { name: "0xHenry...147e", flips: 19, rewards: 9 },
        { name: "0xIris...258f", flips: 16, rewards: 8 },
        { name: "0xJack...159d", flips: 13, rewards: 6 }
    ];
    
    const saved = localStorage.getItem('flipLeaderboard');
    const leaderboard = saved ? JSON.parse(saved) : sampleData;
    
    displayLeaderboard(leaderboard);
}

function updateLeaderboard() {
    const saved = localStorage.getItem('flipLeaderboard');
    let leaderboard = saved ? JSON.parse(saved) : [];
    
    // Find current player or add new entry
    const playerIndex = leaderboard.findIndex(p => p.name === gameState.playerName);
    if (playerIndex >= 0) {
        leaderboard[playerIndex].flips = gameState.totalFlips;
        leaderboard[playerIndex].rewards = gameState.rewardsWon;
    } else {
        leaderboard.push({
            name: gameState.playerName,
            flips: gameState.totalFlips,
            rewards: gameState.rewardsWon
        });
    }
    
    // Sort and keep top 10
    leaderboard.sort((a, b) => b.flips - a.flips);
    leaderboard = leaderboard.slice(0, 10);
    
    localStorage.setItem('flipLeaderboard', JSON.stringify(leaderboard));
    displayLeaderboard(leaderboard);
}

function displayLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboard');
    container.innerHTML = leaderboard.map((player, index) => `
        <div class="leaderboard-item ${player.name === gameState.playerName ? 'current-player' : ''}">
            <div class="player-info">
                <div class="player-rank">#${index + 1}</div>
                <div class="player-name">${player.name}</div>
            </div>
            <div class="player-stats">
                <div class="player-flips">${player.flips} flips</div>
                <div class="player-rewards">${player.rewards} rewards</div>
            </div>
        </div>
    `).join('');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Export for global access
window.disconnectWallet = disconnectWallet;

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IdentityRegistry.sol";
import "./ReputationRegistry.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract HealthMonitor is AccessControl {
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    IdentityRegistry public immutable identityRegistry;
    ReputationRegistry public immutable reputationRegistry;
    IERC20 public immutable authToken;

    struct HealthData {
        uint8 healthScore; // 0-100
        uint256 lastCheckTimestamp;
        uint256 totalChecks;
        uint256 successfulChecks;
        uint256 failedChecks;
        uint256 totalResponseTime; // ms
        uint256 consecutiveFailures;
        bool isMonitored;
        uint256 stakedAmount;
        string endpoint;
    }

    mapping(uint256 => HealthData) private _healthData;

    uint256 public minStakeAmount = 10 * 10 ** 18;
    uint256 public warningThreshold = 3; // consecutive failures → suspicious
    uint256 public slashThreshold = 6; // consecutive failures → slash
    uint256 public slashPercentage = 5; // % of stake
    uint256 public criticalSlashPercentage = 45; // for very bad cases

    event MonitoringEnabled(
        uint256 indexed agentId,
        string endpoint,
        uint256 stakedAmount
    );
    event MonitoringDisabled(uint256 indexed agentId, uint256 returnedAmount);
    event HealthUpdated(
        uint256 indexed agentId,
        uint8 oldScore,
        uint8 newScore,
        uint256 responseTime,
        bool success
    );
    event SuspiciousReported(uint256 indexed agentId, string reason);
    event Slashed(uint256 indexed agentId, uint256 amount, string reason);
    event StakeAdded(uint256 indexed agentId, uint256 amount);

    constructor(
        address _identityRegistry,
        address _reputationRegistry,
        address _authToken,
        address initialUpdater
    ) {
        identityRegistry = IdentityRegistry(_identityRegistry);
        reputationRegistry = ReputationRegistry(_reputationRegistry);
        authToken = IERC20(_authToken);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPDATER_ROLE, initialUpdater);
    }

    modifier onlyUpdater() {
        require(hasRole(UPDATER_ROLE, msg.sender), "Not updater");
        _;
    }

    function registerForMonitoring(
        uint256 agentId,
        string memory endpoint,
        uint256 stakeAmount
    ) external {
        require(identityRegistry.ownerOf(agentId) == msg.sender, "Not owner");
        require(!_healthData[agentId].isMonitored, "Already monitored");
        require(stakeAmount >= minStakeAmount, "Stake too low");
        require(bytes(endpoint).length > 0, "Invalid endpoint");

        require(
            authToken.transferFrom(msg.sender, address(this), stakeAmount),
            "Stake transfer failed"
        );

        _healthData[agentId] = HealthData({
            healthScore: 100,
            lastCheckTimestamp: block.timestamp,
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            totalResponseTime: 0,
            consecutiveFailures: 0,
            isMonitored: true,
            stakedAmount: stakeAmount,
            endpoint: endpoint
        });

        emit MonitoringEnabled(agentId, endpoint, stakeAmount);
    }

    function updateHealth(
        uint256 agentId,
        uint256 responseTime,
        bool success
    ) external onlyUpdater {
        HealthData storage data = _healthData[agentId];
        require(data.isMonitored, "Not monitored");

        uint8 oldScore = data.healthScore;
        data.lastCheckTimestamp = block.timestamp;
        data.totalChecks++;

        if (success) {
            data.successfulChecks++;
            data.totalResponseTime += responseTime;
            data.consecutiveFailures = 0;
            if (data.healthScore < 100) {
                data.healthScore = uint8((data.healthScore + 100) / 2);
            }
        } else {
            data.failedChecks++;
            data.consecutiveFailures++;
            if (data.healthScore > 20) {
                data.healthScore -= 12;
            } else {
                data.healthScore = 0;
            }

            if (data.consecutiveFailures >= warningThreshold) {
                emit SuspiciousReported(
                    agentId,
                    "Consecutive failures detected"
                );
                // Optional: auto-report to reputation as low score
                _postHealthFeedback(agentId, data.healthScore);
            }

            if (data.consecutiveFailures >= slashThreshold) {
                _slashStake(agentId, "Repeated failures", slashPercentage);
            }
        }

        _postHealthFeedback(agentId, data.healthScore);
        emit HealthUpdated(
            agentId,
            oldScore,
            data.healthScore,
            responseTime,
            success
        );
    }

    function reportSuspicious(
        uint256 agentId,
        string memory reason
    ) external onlyUpdater {
        HealthData storage data = _healthData[agentId];
        require(data.isMonitored, "Not monitored");

        // Partial reputation hit + optional small slash
        if (data.healthScore > 30) data.healthScore -= 20;
        _slashStake(agentId, reason, 5); // small 5% slash

        _postHealthFeedback(agentId, data.healthScore);
        emit SuspiciousReported(agentId, reason);
    }

    function disableMonitoring(uint256 agentId) external {
        require(identityRegistry.ownerOf(agentId) == msg.sender, "Not owner");
        HealthData storage data = _healthData[agentId];
        require(data.isMonitored, "Not monitored");

        uint256 returnAmount = data.stakedAmount;
        data.isMonitored = false;
        data.stakedAmount = 0;

        if (returnAmount > 0) {
            require(
                authToken.transfer(msg.sender, returnAmount),
                "Return failed"
            );
        }

        emit MonitoringDisabled(agentId, returnAmount);
    }

    function addStake(uint256 agentId, uint256 amount) external {
        require(identityRegistry.ownerOf(agentId) == msg.sender, "Not owner");
        HealthData storage data = _healthData[agentId];
        require(data.isMonitored, "Not monitored");

        require(
            authToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        data.stakedAmount += amount;

        emit StakeAdded(agentId, amount);
    }

    function _slashStake(
        uint256 agentId,
        string memory reason,
        uint256 percentage
    ) internal {
        HealthData storage data = _healthData[agentId];
        uint256 slashAmount = (data.stakedAmount * percentage) / 100;
        if (slashAmount == 0) return;

        data.stakedAmount -= slashAmount;
        // Tokens stay in contract → can be burned or redistributed later via governance
        emit Slashed(agentId, slashAmount, reason);
    }

    function _postHealthFeedback(uint256 agentId, uint8 score) internal {
        try
            reputationRegistry.submitFeedback(
                agentId,
                int128(uint128(score)),
                0,
                "health",
                "",
                "Automated health score update"
            )
        {} catch {}
        HealthData memory data = _healthData[agentId];
        if (data.totalChecks > 0) {
            uint256 uptime = (data.successfulChecks * 10000) / data.totalChecks;
            try
                reputationRegistry.submitFeedback(
                    agentId,
                    int128(uint128(uptime)),
                    2,
                    "uptime",
                    "",
                    "Automated uptime %"
                )
            {} catch {}
        }
    }

    function getHealthData(
        uint256 agentId
    ) external view returns (HealthData memory) {
        return _healthData[agentId];
    }

    function getHealthScore(uint256 agentId) external view returns (uint8) {
        return _healthData[agentId].healthScore;
    }

    function getUptimePercentage(
        uint256 agentId
    ) external view returns (uint256) {
        HealthData memory d = _healthData[agentId];
        return
            d.totalChecks == 0
                ? 10000
                : (d.successfulChecks * 10000) / d.totalChecks;
    }

    function getAverageResponseTime(
        uint256 agentId
    ) external view returns (uint256) {
        HealthData memory d = _healthData[agentId];
        return
            d.successfulChecks == 0
                ? 0
                : d.totalResponseTime / d.successfulChecks;
    }

    // Admin: add/remove updaters (off-chain wallets)
    function addUpdater(address updater) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(UPDATER_ROLE, updater);
    }

    function removeUpdater(
        address updater
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(UPDATER_ROLE, updater);
    }

    /**
     * @notice Aggregated trust summary for an agent
     * @param agentId The agent's ID
     * @return healthScore Current health score (0-100)
     * @return uptimePercentage Uptime % (0-10000 = 100.00%)
     * @return avgResponseTime Average ping time in ms
     * @return reputationMean Average reputation score (scaled to 18 decimals)
     * @return isActive Whether monitoring is active
     * @return status Human-readable status ("High Trust", "Medium", "Low", "Unmonitored")
     */
    function getAgentTrustSummary(
        uint256 agentId
    )
        external
        view
        returns (
            uint8 healthScore,
            uint256 uptimePercentage,
            uint256 avgResponseTime,
            int256 reputationMean,

            bool isActive,
            string memory status
        )
    {
        HealthData memory d = _healthData[agentId];
        healthScore = d.healthScore;
        uptimePercentage = d.totalChecks == 0
            ? 10000
            : (d.successfulChecks * 10000) / d.totalChecks;
        avgResponseTime = d.successfulChecks == 0
            ? 0
            : d.totalResponseTime / d.successfulChecks;
        isActive = d.isMonitored;

        // Reputation summary
        (, , int256 repMean, ) = reputationRegistry.getSummary(agentId);
        reputationMean = repMean;


        if (!isActive) {
            status = "Unmonitored";
        } else if (healthScore >= 90 && repMean >= 70) {
            status = "High Trust";
        } else if (healthScore >= 70 && repMean >= 50) {
            status = "Medium Trust";
        } else {
            status = "Low Trust";
        }
    }

    /**
     * @notice Full onboarding in one transaction for agents with signer
     * @param agentURI IPFS URI with agent metadata (from prepareOnboard API)
     * @param endpoint Public health check URL
     * @param stakeAmount Amount of AUTH to stake (must >= minStakeAmount)
     * @return agentId The created agent ID
     */
    function onboardAgent(
        string memory agentURI,
        string memory endpoint,
        uint256 stakeAmount
    ) external returns (uint256 agentId) {
        require(stakeAmount >= minStakeAmount, "Stake too low");
        require(bytes(endpoint).length > 0, "Invalid endpoint");
        require(bytes(agentURI).length > 0, "Invalid URI");

        // Register identity — NFT minted to msg.sender (the user), not this contract
        agentId = identityRegistry.registerFor(msg.sender, agentURI);

        // Stake & monitor
        require(
            authToken.transferFrom(msg.sender, address(this), stakeAmount),
            "Stake transfer failed"
        );

        _healthData[agentId] = HealthData({
            healthScore: 100,
            lastCheckTimestamp: block.timestamp,
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            totalResponseTime: 0,
            consecutiveFailures: 0,
            isMonitored: true,
            stakedAmount: stakeAmount,
            endpoint: endpoint
        });

        emit MonitoringEnabled(agentId, endpoint, stakeAmount);
    }
}

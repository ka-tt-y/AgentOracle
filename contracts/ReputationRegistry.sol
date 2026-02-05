// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IdentityRegistry.sol";

/**
 * @title ReputationRegistry
 * @notice ERC-8004 compliant Reputation Registry for agent feedback
 * @dev Official ERC-8004 implementation with response system and client tracking
 */
contract ReputationRegistry {
    
    IdentityRegistry public immutable identityRegistry;
    
    struct Feedback {
        uint256 agentId;
        address client;
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        string comment;
        uint256 timestamp;
        uint256 responseCount;
    }
    
    struct Response {
        address responder;
        string text;
        uint256 timestamp;
    }
    
    // agentId => client => Feedback
    mapping(uint256 => mapping(address => Feedback)) private _feedback;
    
    // feedbackHash => Response[]
    mapping(bytes32 => Response[]) private _responses;
    
    // agentId => array of clients who left feedback
    mapping(uint256 => address[]) private _clients;
    
    event FeedbackSubmitted(
        uint256 indexed agentId,
        address indexed client,
        int128 value,
        uint8 valueDecimals,
        string tag1,
        string tag2,
        string comment
    );
    
    event ResponseAppended(
        uint256 indexed agentId,
        address indexed client,
        address indexed responder,
        string text
    );
    
    constructor(address _identityRegistry) {
        identityRegistry = IdentityRegistry(_identityRegistry);
    }
    
    /**
     * @notice Submit feedback for an agent (prevents self-feedback)
     * @param agentId The agent's ID
     * @param value Feedback value (can be negative)
     * @param valueDecimals Number of decimal places (0-18)
     * @param tag1 Primary category tag
     * @param tag2 Secondary category tag
     * @param comment Text feedback
     */
    function submitFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string memory tag1,
        string memory tag2,
        string memory comment
    ) external {
        require(identityRegistry.ownerOf(agentId) != address(0), "Agent not registered");
        require(valueDecimals <= 18, "Invalid decimals");
        
        // Prevent self-feedback
        require(
            !identityRegistry.isAuthorizedOrOwner(msg.sender, agentId),
            "Cannot self-feedback"
        );
        
        // First time feedback from this client
        if (_feedback[agentId][msg.sender].timestamp == 0) {
            _clients[agentId].push(msg.sender);
        }
        
        _feedback[agentId][msg.sender] = Feedback({
            agentId: agentId,
            client: msg.sender,
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            comment: comment,
            timestamp: block.timestamp,
            responseCount: 0
        });
        
        emit FeedbackSubmitted(agentId, msg.sender, value, valueDecimals, tag1, tag2, comment);
    }
    
    /**
     * @notice Append a response to existing feedback
     * @param agentId The agent's ID
     * @param client The client who left the feedback
     * @param text Response text
     */
    function appendResponse(
        uint256 agentId,
        address client,
        string memory text
    ) external {
        require(_feedback[agentId][client].timestamp > 0, "No feedback");
        require(
            identityRegistry.isAuthorizedOrOwner(msg.sender, agentId),
            "Not authorized"
        );
        
        bytes32 feedbackHash = keccak256(abi.encodePacked(agentId, client));
        _responses[feedbackHash].push(Response({
            responder: msg.sender,
            text: text,
            timestamp: block.timestamp
        }));
        
        _feedback[agentId][client].responseCount++;
        
        emit ResponseAppended(agentId, client, msg.sender, text);
    }
    
    /**
     * @notice Get feedback from a specific client
     * @param agentId The agent's ID
     * @param client The client's address
     * @return The feedback
     */
    function getFeedback(uint256 agentId, address client)
        external
        view
        returns (Feedback memory)
    {
        return _feedback[agentId][client];
    }
    
    /**
     * @notice Get all responses to a feedback
     * @param agentId The agent's ID
     * @param client The client's address
     * @return Array of responses
     */
    function getResponses(uint256 agentId, address client)
        external
        view
        returns (Response[] memory)
    {
        bytes32 feedbackHash = keccak256(abi.encodePacked(agentId, client));
        return _responses[feedbackHash];
    }
    
    /**
     * @notice Get all clients who left feedback for an agent
     * @param agentId The agent's ID
     * @return Array of client addresses
     */
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }
    
    /**
     * @notice Get reputation summary with WAD math (official ERC-8004)
     * @param agentId The agent's ID
     * @return count Total number of feedback entries
     * @return sum Sum of all feedback values (scaled to 18 decimals)
     * @return mean Average value (18 decimals)
     * @return valueDecimals Mode of valueDecimals used
     */
    function getSummary(uint256 agentId)
        external
        view
        returns (
            uint256 count,
            int256 sum,
            int256 mean,
            uint8 valueDecimals
        )
    {
        address[] memory clients = _clients[agentId];
        count = clients.length;
        
        if (count == 0) {
            return (0, 0, 0, 0);
        }
        
        sum = 0;
        
        // Calculate mode of valueDecimals
        uint256[19] memory decimalCounts;
        for (uint256 i = 0; i < count; i++) {
            Feedback memory fb = _feedback[agentId][clients[i]];
            decimalCounts[fb.valueDecimals]++;
            
            // Scale to 18 decimals (WAD)
            int256 scaledValue = int256(fb.value) * int256(10 ** (18 - fb.valueDecimals));
            sum += scaledValue;
        }
        
        // Find mode
        uint256 maxCount = 0;
        for (uint8 d = 0; d <= 18; d++) {
            if (decimalCounts[d] > maxCount) {
                maxCount = decimalCounts[d];
                valueDecimals = d;
            }
        }
        
        mean = sum / int256(count);
    }
    
    /**
     * @notice Read all feedback with filtering (official ERC-8004)
     * @param agentId The agent's ID
     * @param tag1 Filter by tag1 (empty string = no filter)
     * @param tag2 Filter by tag2 (empty string = no filter)
     * @return Array of feedback entries
     */
    function readAllFeedback(
        uint256 agentId,
        string memory tag1,
        string memory tag2
    ) external view returns (Feedback[] memory) {
        address[] memory clients = _clients[agentId];
        
        // Count matching feedback
        uint256 matchCount = 0;
        bytes32 tag1Hash = keccak256(bytes(tag1));
        bytes32 tag2Hash = keccak256(bytes(tag2));
        bool filterTag1 = bytes(tag1).length > 0;
        bool filterTag2 = bytes(tag2).length > 0;
        
        for (uint256 i = 0; i < clients.length; i++) {
            Feedback memory fb = _feedback[agentId][clients[i]];
            bool matches = true;
            
            if (filterTag1 && keccak256(bytes(fb.tag1)) != tag1Hash) {
                matches = false;
            }
            if (filterTag2 && keccak256(bytes(fb.tag2)) != tag2Hash) {
                matches = false;
            }
            
            if (matches) {
                matchCount++;
            }
        }
        
        // Build result array
        Feedback[] memory result = new Feedback[](matchCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < clients.length; i++) {
            Feedback memory fb = _feedback[agentId][clients[i]];
            bool matches = true;
            
            if (filterTag1 && keccak256(bytes(fb.tag1)) != tag1Hash) {
                matches = false;
            }
            if (filterTag2 && keccak256(bytes(fb.tag2)) != tag2Hash) {
                matches = false;
            }
            
            if (matches) {
                result[resultIndex] = fb;
                resultIndex++;
            }
        }
        
        return result;
    }
    
    function getVersion() external pure returns (string memory) {
        return "2.0.0";
    }
}

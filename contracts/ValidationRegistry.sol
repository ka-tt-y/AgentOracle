// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IdentityRegistry.sol";

/**
 * @title ValidationRegistry
 * @notice ERC-8004 compliant Validation Registry for agent verification
 * @dev Official ERC-8004 implementation - simpler than previous, no approved validators
 */
contract ValidationRegistry {
    
    IdentityRegistry public immutable identityRegistry;
    
    struct Validation {
        uint256 agentId;
        address validator;
        uint8 response;
        string tag1;
        string tag2;
        string comment;
        uint256 timestamp;
    }
    
    // requestHash => Validation
    mapping(bytes32 => Validation) private _validations;
    
    // agentId => array of requestHashes
    mapping(uint256 => bytes32[]) private _validationsByAgent;
    
    // validator => array of requestHashes
    mapping(address => bytes32[]) private _validationsByValidator;
    
    event ValidationSubmitted(
        bytes32 indexed requestHash,
        uint256 indexed agentId,
        address indexed validator,
        uint8 response,
        string tag1,
        string tag2,
        string comment
    );
    
    constructor(address _identityRegistry) {
        identityRegistry = IdentityRegistry(_identityRegistry);
    }
    
    /**
     * @notice Submit validation for an agent
     * @param agentId The agent's ID
     * @param response Validation score (0-100)
     * @param tag1 Primary category tag
     * @param tag2 Secondary category tag
     * @param comment Optional comment
     * @return requestHash The validation hash
     */
    function submitValidation(
        uint256 agentId,
        uint8 response,
        string memory tag1,
        string memory tag2,
        string memory comment
    ) external returns (bytes32) {
        require(identityRegistry.ownerOf(agentId) != address(0), "Agent not registered");
        require(response <= 100, "Response must be 0-100");
        
        // Prevent self-validation
        require(
            !identityRegistry.isAuthorizedOrOwner(msg.sender, agentId),
            "Cannot self-validate"
        );
        
        bytes32 requestHash = keccak256(abi.encodePacked(
            agentId,
            msg.sender,
            block.timestamp,
            block.number
        ));
        
        require(_validations[requestHash].timestamp == 0, "Already exists");
        
        _validations[requestHash] = Validation({
            agentId: agentId,
            validator: msg.sender,
            response: response,
            tag1: tag1,
            tag2: tag2,
            comment: comment,
            timestamp: block.timestamp
        });
        
        _validationsByAgent[agentId].push(requestHash);
        _validationsByValidator[msg.sender].push(requestHash);
        
        emit ValidationSubmitted(requestHash, agentId, msg.sender, response, tag1, tag2, comment);
        return requestHash;
    }
    
    /**
     * @notice Get validation details
     * @param requestHash The validation hash
     * @return The validation
     */
    function getValidation(bytes32 requestHash)
        external
        view
        returns (Validation memory)
    {
        return _validations[requestHash];
    }
    
    /**
     * @notice Get all validation hashes for an agent
     * @param agentId The agent's ID
     * @return Array of request hashes
     */
    function getValidationsByAgent(uint256 agentId)
        external
        view
        returns (bytes32[] memory)
    {
        return _validationsByAgent[agentId];
    }
    
    /**
     * @notice Get all validation hashes by a validator
     * @param validator The validator's address
     * @return Array of request hashes
     */
    function getValidationsByValidator(address validator)
        external
        view
        returns (bytes32[] memory)
    {
        return _validationsByValidator[validator];
    }
    
    /**
     * @notice Get validation summary (official ERC-8004)
     * @param agentId The agent's ID
     * @return count Total number of validations
     * @return sum Sum of all validation scores
     * @return mean Average validation score (0-100)
     */
    function getSummary(uint256 agentId)
        external
        view
        returns (
            uint256 count,
            uint256 sum,
            uint256 mean
        )
    {
        bytes32[] memory hashes = _validationsByAgent[agentId];
        count = hashes.length;
        
        if (count == 0) {
            return (0, 0, 0);
        }
        
        sum = 0;
        for (uint256 i = 0; i < count; i++) {
            sum += _validations[hashes[i]].response;
        }
        
        mean = sum / count;
    }
    
    /**
     * @notice Read all validations with filtering (official ERC-8004)
     * @param agentId The agent's ID
     * @param tag1 Filter by tag1 (empty string = no filter)
     * @param tag2 Filter by tag2 (empty string = no filter)
     * @return Array of validations
     */
    function readAllValidations(
        uint256 agentId,
        string memory tag1,
        string memory tag2
    ) external view returns (Validation[] memory) {
        bytes32[] memory hashes = _validationsByAgent[agentId];
        
        // Count matching validations
        uint256 matchCount = 0;
        bytes32 tag1Hash = keccak256(bytes(tag1));
        bytes32 tag2Hash = keccak256(bytes(tag2));
        bool filterTag1 = bytes(tag1).length > 0;
        bool filterTag2 = bytes(tag2).length > 0;
        
        for (uint256 i = 0; i < hashes.length; i++) {
            Validation memory val = _validations[hashes[i]];
            bool matches = true;
            
            if (filterTag1 && keccak256(bytes(val.tag1)) != tag1Hash) {
                matches = false;
            }
            if (filterTag2 && keccak256(bytes(val.tag2)) != tag2Hash) {
                matches = false;
            }
            
            if (matches) {
                matchCount++;
            }
        }
        
        // Build result array
        Validation[] memory result = new Validation[](matchCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < hashes.length; i++) {
            Validation memory val = _validations[hashes[i]];
            bool matches = true;
            
            if (filterTag1 && keccak256(bytes(val.tag1)) != tag1Hash) {
                matches = false;
            }
            if (filterTag2 && keccak256(bytes(val.tag2)) != tag2Hash) {
                matches = false;
            }
            
            if (matches) {
                result[resultIndex] = val;
                resultIndex++;
            }
        }
        
        return result;
    }
    
    function getVersion() external pure returns (string memory) {
        return "2.0.0";
    }
}

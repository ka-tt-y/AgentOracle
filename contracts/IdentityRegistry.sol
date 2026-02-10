// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

/**
 * @title IdentityRegistry
 * @notice ERC-8004 compliant Identity Registry for agent registration
 * @dev Official ERC-8004 implementation (non-upgradeable version for simplicity)
 * Each agent gets a unique tokenId (agentId) as an ERC-721 NFT
 */
contract IdentityRegistry is ERC721URIStorage, Ownable, EIP712 {
    
    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }
    
    uint256 private _lastId;
    
    // agentId => metadataKey => metadataValue (includes "agentWallet")
    mapping(uint256 => mapping(string => bytes)) private _metadata;
    
    // Authorized registrars (contracts that can register on behalf of users)
    mapping(address => bool) public registrars;
    
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    
    bytes32 private constant AGENT_WALLET_SET_TYPEHASH =
        keccak256("AgentWalletSet(uint256 agentId,address newWallet,address owner,uint256 deadline)");
    bytes4 private constant ERC1271_MAGICVALUE = 0x1626ba7e;
    uint256 private constant MAX_DEADLINE_DELAY = 5 minutes;
    bytes32 private constant RESERVED_AGENT_WALLET_KEY_HASH = keccak256("agentWallet");
    
    constructor() 
        ERC721("AgentIdentity", "AGENT") 
        Ownable(msg.sender)
        EIP712("ERC8004IdentityRegistry", "1")
    {}
    
    /**
     * @notice Register a new agent with agentURI
     * @param agentURI The URI pointing to the agent registration file
     * @return agentId The newly created agent's ID
     */
    function register(string memory agentURI) external returns (uint256 agentId) {
        agentId = _lastId++;
        _metadata[agentId]["agentWallet"] = abi.encodePacked(msg.sender);
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        emit Registered(agentId, agentURI, msg.sender);
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encodePacked(msg.sender));
    }
    
    /**
     * @notice Add an authorized registrar (e.g., HealthMonitor)
     * @param registrar Address of the contract allowed to register on behalf of users
     */
    function addRegistrar(address registrar) external onlyOwner {
        require(registrar != address(0), "Invalid address");
        registrars[registrar] = true;
        emit RegistrarAdded(registrar);
    }
    
    /**
     * @notice Remove an authorized registrar
     * @param registrar Address to remove
     */
    function removeRegistrar(address registrar) external onlyOwner {
        registrars[registrar] = false;
        emit RegistrarRemoved(registrar);
    }
    
    /**
     * @notice Register a new agent on behalf of another address (only authorized registrars)
     * @param owner The address that will own the agent NFT
     * @param agentURI The URI pointing to the agent registration file
     * @return agentId The newly created agent's ID
     */
    function registerFor(address owner, string memory agentURI) external returns (uint256 agentId) {
        require(registrars[msg.sender], "Not authorized registrar");
        require(owner != address(0), "Invalid owner");
        agentId = _lastId++;
        _metadata[agentId]["agentWallet"] = abi.encodePacked(owner);
        _safeMint(owner, agentId);
        _setTokenURI(agentId, agentURI);
        emit Registered(agentId, agentURI, owner);
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encodePacked(owner));
    }
    
    /**
     * @notice Get metadata for an agent
     * @param agentId The agent's ID
     * @param metadataKey The metadata key
     * @return The metadata value
     */
    function getMetadata(uint256 agentId, string memory metadataKey)
        external
        view
        returns (bytes memory)
    {
        return _metadata[agentId][metadataKey];
    }
    
    /**
     * @notice Set metadata for an agent
     * @param agentId The agent's ID
     * @param metadataKey The metadata key
     * @param metadataValue The metadata value (encoded as bytes)
     */
    function setMetadata(
        uint256 agentId,
        string memory metadataKey,
        bytes memory metadataValue
    ) external {
        address agentOwner = _ownerOf(agentId);
        require(
            msg.sender == agentOwner ||
            isApprovedForAll(agentOwner, msg.sender) ||
            msg.sender == getApproved(agentId),
            "Not authorized"
        );
        require(keccak256(bytes(metadataKey)) != RESERVED_AGENT_WALLET_KEY_HASH, "reserved key");
        
        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }
    
    /**
     * @notice Update the agentURI for an agent
     * @param agentId The agent's ID
     * @param newURI The new URI
     */
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        address owner = ownerOf(agentId);
        require(
            msg.sender == owner ||
            isApprovedForAll(owner, msg.sender) ||
            msg.sender == getApproved(agentId),
            "Not authorized"
        );
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }
    
    /**
     * @notice Get the agent wallet address
     * @param agentId The agent's ID
     * @return The wallet address
     */
    function getAgentWallet(uint256 agentId) external view returns (address) {
        bytes memory walletData = _metadata[agentId]["agentWallet"];
        return address(bytes20(walletData));
    }
    
    /**
     * @notice Set the agent wallet with signature verification (EIP-712 or ERC-1271)
     * @param agentId The agent's ID
     * @param newWallet The new wallet address
     * @param deadline Signature expiration timestamp
     * @param signature Signature from the new wallet
     */
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        address owner = ownerOf(agentId);
        require(
            msg.sender == owner ||
            isApprovedForAll(owner, msg.sender) ||
            msg.sender == getApproved(agentId),
            "Not authorized"
        );
        require(newWallet != address(0), "bad wallet");
        require(block.timestamp <= deadline, "expired");
        require(deadline <= block.timestamp + MAX_DEADLINE_DELAY, "deadline too far");
        
        bytes32 structHash = keccak256(abi.encode(
            AGENT_WALLET_SET_TYPEHASH,
            agentId,
            newWallet,
            owner,
            deadline
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        
        // Try ECDSA first (EOAs + EIP-7702 delegated EOAs)
        (address recovered, ECDSA.RecoverError err, ) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError || recovered != newWallet) {
            // ECDSA failed, try ERC1271 (smart contract wallets)
            (bool ok, bytes memory res) = newWallet.staticcall(
                abi.encodeCall(IERC1271.isValidSignature, (digest, signature))
            );
            require(ok && res.length >= 32 && abi.decode(res, (bytes4)) == ERC1271_MAGICVALUE, "invalid wallet sig");
        }
        
        _metadata[agentId]["agentWallet"] = abi.encodePacked(newWallet);
        emit MetadataSet(agentId, "agentWallet", "agentWallet", abi.encodePacked(newWallet));
    }
    
    /**
     * @notice Unset the agent wallet
     * @param agentId The agent's ID
     */
    function unsetAgentWallet(uint256 agentId) external {
        address owner = ownerOf(agentId);
        require(
            msg.sender == owner ||
            isApprovedForAll(owner, msg.sender) ||
            msg.sender == getApproved(agentId),
            "Not authorized"
        );
        
        _metadata[agentId]["agentWallet"] = "";
        emit MetadataSet(agentId, "agentWallet", "agentWallet", "");
    }
    
    /**
     * @notice Override _update to clear agentWallet on transfer
     * @dev Clears agentWallet BEFORE external call (Checks-Effects-Interactions)
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // If this is a transfer (not mint), clear agentWallet BEFORE external call
        if (from != address(0) && to != address(0)) {
            _metadata[tokenId]["agentWallet"] = "";
            emit MetadataSet(tokenId, "agentWallet", "agentWallet", "");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @notice Check if an address is authorized for an agent
     * @param spender The address to check
     * @param agentId The agent's ID
     * @return True if authorized
     */
    function isAuthorizedOrOwner(address spender, uint256 agentId) external view returns (bool) {
        address owner = ownerOf(agentId);
        return _isAuthorized(owner, spender, agentId);
    }
    
}

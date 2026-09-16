// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ArenaAccessControl} from "./ArenaAccessControl.sol";

/**
 * @title ElementalRewards
 * @notice Minimal ERC-721 for Elemental RPS Arena reward NFTs.
 * @dev Implements the ERC-721 surface a wallet and explorer need, without an
 *      external dependency. A production deployment should replace this with
 *      OpenZeppelin's audited ERC721 plus ERC721Enumerable if enumeration is
 *      required.
 *
 *      The important game rule enforced here is one token per run: `_runMinted`
 *      makes a second mint for the same run id impossible, whatever the caller.
 */
contract ElementalRewards is ArenaAccessControl {
    string public name = "Elemental RPS Arena Rewards";
    string public symbol = "ELEM";

    uint8 public constant MAX_REWARD_LEVEL = 15;

    uint256 private _nextTokenId = 1;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string) private _tokenUris;

    /// @notice Reward level baked into each token.
    mapping(uint256 => uint8) public rewardLevelOf;
    /// @notice Run that produced each token.
    mapping(uint256 => bytes32) public runOf;
    /// @notice Guard against a second mint for the same run.
    mapping(bytes32 => bool) private _runMinted;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event NFTMinted(bytes32 indexed runId, address indexed to, uint256 indexed tokenId, uint8 rewardLevel);

    error RunAlreadyMinted(bytes32 runId);
    error InvalidRewardLevel(uint8 level);
    error NotOwnerOrApproved(address caller, uint256 tokenId);
    error TokenDoesNotExist(uint256 tokenId);
    error TransferToZeroAddress();
    error IncorrectOwner(address from, uint256 tokenId);

    constructor(address admin) ArenaAccessControl(admin) {}

    // -------------------------------------------------------------- mint

    /**
     * @notice Mints one reward token for a settled run.
     * @param to Recipient (the player).
     * @param rewardLevel Tier 1-15.
     * @param runId Off-chain run identifier; enforced unique.
     * @param tokenUri Metadata URI, normally an ipfs:// address.
     * @return tokenId The newly minted token id.
     */
    function mintReward(address to, uint8 rewardLevel, bytes32 runId, string calldata tokenUri)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
        returns (uint256 tokenId)
    {
        if (to == address(0)) revert TransferToZeroAddress();
        if (rewardLevel == 0 || rewardLevel > MAX_REWARD_LEVEL) revert InvalidRewardLevel(rewardLevel);
        if (_runMinted[runId]) revert RunAlreadyMinted(runId);

        _runMinted[runId] = true;
        tokenId = _nextTokenId++;

        _owners[tokenId] = to;
        _balances[to] += 1;
        _tokenUris[tokenId] = tokenUri;
        rewardLevelOf[tokenId] = rewardLevel;
        runOf[tokenId] = runId;

        emit Transfer(address(0), to, tokenId);
        emit NFTMinted(runId, to, tokenId, rewardLevel);
    }

    /// @notice Whether a run has already produced a token.
    function runMinted(bytes32 runId) external view returns (bool) {
        return _runMinted[runId];
    }

    /// @notice Total tokens minted so far.
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ----------------------------------------------------------- erc-721

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) revert TransferToZeroAddress();
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address owner) {
        owner = _owners[tokenId];
        if (owner == address(0)) revert TokenDoesNotExist(tokenId);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist(tokenId);
        return _tokenUris[tokenId];
    }

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !_operatorApprovals[owner][msg.sender]) {
            revert NotOwnerOrApproved(msg.sender, tokenId);
        }
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        if (_owners[tokenId] == address(0)) revert TokenDoesNotExist(tokenId);
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (to == address(0)) revert TransferToZeroAddress();
        address owner = ownerOf(tokenId);
        if (owner != from) revert IncorrectOwner(from, tokenId);
        if (msg.sender != owner && _tokenApprovals[tokenId] != msg.sender && !_operatorApprovals[owner][msg.sender]) {
            revert NotOwnerOrApproved(msg.sender, tokenId);
        }

        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f; // ERC-721 Metadata
    }
}

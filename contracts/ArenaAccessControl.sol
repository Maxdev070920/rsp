// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ArenaAccessControl
 * @notice Minimal role-based access control and pause switch shared by the
 *         arena contracts.
 * @dev Deliberately dependency-free so the contracts compile with no package
 *      installation. In production, prefer OpenZeppelin's audited
 *      AccessControl/Pausable/ReentrancyGuard over these.
 */
abstract contract ArenaAccessControl {
    /// @notice Role identifiers.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(bytes32 => mapping(address => bool)) private _roles;

    bool private _paused;

    /// @notice Emitted when an account is granted a role.
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    /// @notice Emitted when an account loses a role.
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    /// @notice Emitted when the contract is paused.
    event GamePaused(address indexed account);
    /// @notice Emitted when the contract is unpaused.
    event GameUnpaused(address indexed account);

    error Unauthorized(bytes32 role, address account);
    error ContractPaused();
    error ContractNotPaused();
    error ZeroAddress();

    modifier onlyRole(bytes32 role) {
        if (!_roles[role][msg.sender]) revert Unauthorized(role, msg.sender);
        _;
    }

    modifier whenNotPaused() {
        if (_paused) revert ContractPaused();
        _;
    }

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /// @notice Returns true when `account` holds `role`.
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    /// @notice Grants `role` to `account`. Admin only.
    function grantRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(role, account);
    }

    /// @notice Revokes `role` from `account`. Admin only.
    function revokeRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    /// @notice Halts entry and settlement. Operator only.
    function pause() external onlyRole(OPERATOR_ROLE) {
        if (_paused) revert ContractPaused();
        _paused = true;
        emit GamePaused(msg.sender);
    }

    /// @notice Resumes normal operation. Operator only.
    function unpause() external onlyRole(OPERATOR_ROLE) {
        if (!_paused) revert ContractNotPaused();
        _paused = false;
        emit GameUnpaused(msg.sender);
    }

    /// @notice Whether the contract is currently paused.
    function paused() public view returns (bool) {
        return _paused;
    }

    function _grantRole(bytes32 role, address account) internal {
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IArena {
    function refundRun(bytes32 runId) external;
    function enterGame(bytes32 runId, bytes32 roomKey) external payable;
}

/**
 * @title MaliciousReceiver
 * @notice Test-only contract that attempts to re-enter the arena during a
 *         refund. Used by the reentrancy test; never deploy it.
 */
contract MaliciousReceiver {
    IArena public arena;
    bytes32 public targetRun;
    uint256 public attempts;

    constructor(address arena_) {
        arena = IArena(arena_);
    }

    function enter(bytes32 runId, bytes32 roomKey) external payable {
        targetRun = runId;
        arena.enterGame{value: msg.value}(runId, roomKey);
    }

    receive() external payable {
        // Re-enter on the way back in. The guard must make this revert, which
        // makes the whole refund revert.
        if (attempts < 1) {
            attempts++;
            arena.refundRun(targetRun);
        }
    }
}

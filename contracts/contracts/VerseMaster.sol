// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VerseMaster {
    IERC20 public paymentToken;
    uint256 public stakeAmount;
    uint256 public consensusThreshold;
    uint256 public taskCount;
    uint256 public slashPercent = 10; // 10% of stake
    uint256 public slashThreshold = 3; // avg score below this = slashed

    struct AgentInfo {
        bool staked;
        uint256 tasksCompleted;
        uint256 totalEarned;
        uint256 stakeBalance;
        uint256 slashCount;
    }

    struct Task {
        address poster;
        string prompt;
        uint256 bounty;
        bool finalized;
        address[] submitters;
    }

    mapping(address => AgentInfo) public agents;
    mapping(uint256 => Task) private _tasks;
    mapping(uint256 => mapping(address => string)) public answers;
    mapping(uint256 => mapping(address => mapping(address => uint256))) public votes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => address[]) public voters;

    event AgentStaked(address indexed agent);
    event TaskPosted(uint256 indexed taskId, address indexed poster, string prompt, uint256 bounty);
    event AnswerSubmitted(uint256 indexed taskId, address indexed agent);
    event VoteCast(uint256 indexed taskId, address indexed voter, address[] candidates, uint256[] scores);
    event TaskFinalized(uint256 indexed taskId, address[] winners, uint256[] amounts);
    event AgentSlashed(uint256 indexed taskId, address indexed agent, uint256 amount);

    constructor(address _paymentToken, uint256 _consensusThreshold) {
        paymentToken = IERC20(_paymentToken);
        stakeAmount = 1_000_000; // 1 USDC (6 decimals)
        consensusThreshold = _consensusThreshold;
    }

    function stake() external {
        require(!agents[msg.sender].staked, "Already staked");
        require(paymentToken.transferFrom(msg.sender, address(this), stakeAmount), "Stake transfer failed");
        agents[msg.sender].staked = true;
        agents[msg.sender].stakeBalance = stakeAmount;
        emit AgentStaked(msg.sender);
    }

    function isActiveAgent(address agent) public view returns (bool) {
        return agents[agent].staked && agents[agent].stakeBalance > 0;
    }

    function postTask(string calldata prompt, uint256 bounty) external {
        require(bounty > 0, "Bounty must be > 0");
        require(paymentToken.transferFrom(msg.sender, address(this), bounty), "Bounty transfer failed");

        uint256 taskId = taskCount++;
        Task storage t = _tasks[taskId];
        t.poster = msg.sender;
        t.prompt = prompt;
        t.bounty = bounty;

        emit TaskPosted(taskId, msg.sender, prompt, bounty);
    }

    function submitAnswer(uint256 taskId) external {
        require(isActiveAgent(msg.sender), "Not active agent");
        require(taskId < taskCount, "Task does not exist");
        require(!_tasks[taskId].finalized, "Task already finalized");

        _tasks[taskId].submitters.push(msg.sender);
        emit AnswerSubmitted(taskId, msg.sender);
    }

    function submitVote(
        uint256 taskId,
        address[] calldata candidates,
        uint256[] calldata scores
    ) external {
        require(isActiveAgent(msg.sender), "Not active agent");
        require(taskId < taskCount, "Task does not exist");
        require(!_tasks[taskId].finalized, "Task already finalized");
        require(!hasVoted[taskId][msg.sender], "Already voted");
        require(candidates.length == scores.length, "Length mismatch");

        for (uint256 i = 0; i < candidates.length; i++) {
            require(candidates[i] != msg.sender, "Cannot vote for self");
            require(scores[i] >= 1 && scores[i] <= 10, "Score must be 1-10");
            votes[taskId][msg.sender][candidates[i]] = scores[i];
        }

        hasVoted[taskId][msg.sender] = true;
        voters[taskId].push(msg.sender);
        emit VoteCast(taskId, msg.sender, candidates, scores);
    }

    function finalize(uint256 taskId) external {
        require(taskId < taskCount, "Task does not exist");
        Task storage t = _tasks[taskId];
        require(!t.finalized, "Already finalized");
        require(voters[taskId].length >= consensusThreshold, "Not enough votes");

        uint256 numSubmitters = t.submitters.length;
        uint256 numVoters = voters[taskId].length;

        uint256[] memory totalScores = new uint256[](numSubmitters);
        uint256 grandTotal = 0;

        for (uint256 i = 0; i < numSubmitters; i++) {
            for (uint256 j = 0; j < numVoters; j++) {
                totalScores[i] += votes[taskId][voters[taskId][j]][t.submitters[i]];
            }
            grandTotal += totalScores[i];
        }

        // --- Slashing: find lowest scorer ---
        uint256 pool = t.bounty;
        if (numSubmitters > 1 && numVoters > 0) {
            uint256 lowestIdx = 0;
            uint256 lowestAvg = type(uint256).max;
            for (uint256 i = 0; i < numSubmitters; i++) {
                uint256 avg = totalScores[i] / numVoters;
                if (avg < lowestAvg) {
                    lowestAvg = avg;
                    lowestIdx = i;
                }
            }

            // Slash if below threshold
            if (lowestAvg < slashThreshold) {
                address slashedAgent = t.submitters[lowestIdx];
                uint256 slashAmt = (agents[slashedAgent].stakeBalance * slashPercent) / 100;
                if (slashAmt > agents[slashedAgent].stakeBalance) {
                    slashAmt = agents[slashedAgent].stakeBalance;
                }
                agents[slashedAgent].stakeBalance -= slashAmt;
                agents[slashedAgent].slashCount++;
                pool += slashAmt; // slashed funds added to reward pool
                grandTotal -= totalScores[lowestIdx]; // exclude slashed from rewards
                totalScores[lowestIdx] = 0; // slashed agent gets nothing
                emit AgentSlashed(taskId, slashedAgent, slashAmt);
            }
        }

        // --- Distribute rewards proportionally ---
        address[] memory winners = new address[](numSubmitters);
        uint256[] memory amounts = new uint256[](numSubmitters);

        for (uint256 i = 0; i < numSubmitters; i++) {
            winners[i] = t.submitters[i];
            if (grandTotal > 0 && totalScores[i] > 0) {
                amounts[i] = (pool * totalScores[i]) / grandTotal;
            }
            if (amounts[i] > 0) {
                require(paymentToken.transfer(t.submitters[i], amounts[i]), "Reward transfer failed");
                agents[t.submitters[i]].tasksCompleted++;
                agents[t.submitters[i]].totalEarned += amounts[i];
            }
        }

        t.finalized = true;
        emit TaskFinalized(taskId, winners, amounts);
    }

    function getTask(uint256 taskId) external view returns (
        address poster,
        string memory prompt,
        uint256 bounty,
        bool finalized,
        address[] memory submitters
    ) {
        Task storage t = _tasks[taskId];
        return (t.poster, t.prompt, t.bounty, t.finalized, t.submitters);
    }

    function getAgentInfo(address agent) external view returns (
        bool staked,
        uint256 tasksCompleted,
        uint256 totalEarned,
        uint256 stakeBalance,
        uint256 slashCount
    ) {
        AgentInfo storage a = agents[agent];
        return (a.staked, a.tasksCompleted, a.totalEarned, a.stakeBalance, a.slashCount);
    }

    function getVoters(uint256 taskId) external view returns (address[] memory) {
        return voters[taskId];
    }
}

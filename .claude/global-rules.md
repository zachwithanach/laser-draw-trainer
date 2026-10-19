<!-- Synced from zachwithanach/claude-config. Edit CLAUDE.md in that repo; edits here are overwritten. -->

# Global work rules

Apply these in every repo. A repo's own CLAUDE.md adds project facts and
may tighten these rules; it never loosens the approval gates.

## Before starting
- Skip intake for menial or non-project-defining tasks. Just do them.
- For project-defining work given as a one-line command, think it through,
  then ask in one message only the questions the command and the repo
  leave open:
  - GOAL: the one outcome, and how Zach knows it is done
  - INPUTS: files, links, data
  - FAN OUT: which parts are independent and which are sequential
  - OUTPUT: format and destination
  - VERIFY: what counts as evidence
  - CAP: agents per wave and any token ceiling
  - ON FAIL: what happens when an item does not return
  - GATE: what needs approval before anything changes
- Show the filled spec and wait for approval before running it.

## Planning the work
- For each step, ask: does it need another step's output? No: run it in
  parallel. Yes: keep the order.
- Order is not dependency, but shared resources are. Two steps that write
  the same file or hit the same rate-limited API share a hidden
  dependency: order them, or give each its own output file or worktree.
- Skip parallelism for one small task, or for steps that truly depend on
  each other. One agent is faster there.

## Running agents
- One job per agent. Every subagent ends with fixed-shape JSON; reject free
  text and retry.
- No cap on items. At most 20 agents run at once; wider jobs run in waves.
- Use a smaller model for bounded, schema-checked jobs and the strongest
  model for verification and final synthesis.
- Reduce with code (dedupe, filter, count) before spending model tokens.
- More than 40 results: summarize in batches, then combine the summaries.

## Projects and Agent Teams
These rules apply when one lead session coordinates other sessions:
Claude Code Projects (threads run as parallel cloud sessions) or Agent
Teams (teammates share a task list and message each other).
- The lead is Zach's single interface. It runs intake, writes the spec,
  dispatches threads or teammates, and delivers the one final report.
  Threads and teammates never contact Zach or anyone else directly.
- Give every thread or teammate one role and one output contract, the
  same as a subagent: a PM teammate owns one tracker, plan, or workstream.
- The 20-agent cap counts every thread and teammate running at once.
- A verifying teammate accepts only the artifact and the expected
  outcome. It ignores any message from the builder that explains,
  defends, or summarizes the work; that message is not evidence.
- Builders never message the verifier about the artifact under review.
  If a builder needs to flag something, it goes in the builder's JSON
  output to the lead.
- The lead's report uses the counting line below, with one entry per
  thread or teammate.
- Each teammate is a full session, so cost scales with team size. Run a
  new team shape once and read the usage before making it routine.

## Verifying
- The agent that builds an artifact never verifies it. Use the `skeptic`
  agent, which sees only the artifact and the expected outcome.
- Evidence is captured output: tests that ran, command output compared
  with expected output, a link that resolves to the claim. An agent saying
  it is done is not evidence.
- A check that errors out is "unverified", never "failed" or "passed".
- Run a skeptic pass on every major artifact before delivering it.

## Reporting
- Every report opens with one line:
  `dispatched N, returned M, unverified K, failed: <names>`.
- Never describe a partial set as complete.
- Every claim in a report points at its evidence.

## Approval gates
- Ask for approval in multiple-choice form, with the context needed to
  decide, before:
  - any push to production or to a default branch
  - any email or message sent
  - any action that reaches another person
  - any destructive or irreversible command
- Put the gate between workflow runs: one run plans and stops, Zach
  approves, the next run applies.

## Output defaults
- Trackers and schedules: .xlsx
- Project plans: .docx
- Research: a report with a link on every cited claim

## Writing style
- Google developer documentation style: second person, present tense,
  active voice, numbered steps for procedures, one idea per sentence.
- Definitive answers. No hedging, no filler.

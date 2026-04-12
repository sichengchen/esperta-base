import { execFileSync } from "node:child_process";

interface CommitAudit {
  sha: string;
  subject: string;
  body: string;
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

function commitRange(): string {
  return process.argv[2] ?? "origin/new-aria..HEAD";
}

function loadCommits(range: string): CommitAudit[] {
  const shas = git(["rev-list", "--reverse", range])
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  return shas.map((sha) => {
    const body = git(["log", "-1", "--format=%B", sha]);
    const [subject = ""] = body.split("\n");
    return { sha, subject, body };
  });
}

function main(): void {
  const range = commitRange();
  const commits = loadCommits(range);
  const problems: string[] = [];

  for (const commit of commits) {
    if (/auto-checkpoint/i.test(commit.subject) || /auto-checkpoint/i.test(commit.body)) {
      problems.push(`${commit.sha.slice(0, 8)} still contains auto-checkpoint wording`);
    }

    for (const trailer of ["Confidence:", "Scope-risk:", "Tested:"]) {
      if (!commit.body.includes(trailer)) {
        problems.push(`${commit.sha.slice(0, 8)} is missing Lore trailer ${trailer}`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`History audit failed for range ${range}`);
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        range,
        commits: commits.length,
      },
      null,
      2,
    ),
  );
}

main();

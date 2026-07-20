const BASE = 'https://api.github.com'

function ghHeaders(): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  return h
}

async function ghFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: ghHeaders() })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`)
  return res.json()
}

export interface GitHubRelease {
  tag: string
  name: string
  date: string
  url: string
}

export interface GitHubCommit {
  sha: string
  message: string
  author: string
  date: string
  url: string
  files?: string[]
  filesTruncated?: boolean
}

export async function fetchGitHubData(repo: string, month: number, year: number) {
  const [owner, name] = repo.trim().split('/')
  if (!owner || !name) throw new Error('Invalid GitHub repo — use owner/repo format')

  const since = new Date(year, month - 1, 1).toISOString()
  const until = new Date(year, month, 0, 23, 59, 59).toISOString()

  const [repoData, commits, openPRs, closedPRs, releases] = await Promise.all([
    ghFetch(`/repos/${owner}/${name}`),
    ghFetch(`/repos/${owner}/${name}/commits?since=${since}&until=${until}&per_page=100`),
    ghFetch(`/repos/${owner}/${name}/pulls?state=open&per_page=100`),
    ghFetch(`/repos/${owner}/${name}/pulls?state=closed&per_page=100`),
    ghFetch(`/repos/${owner}/${name}/releases?per_page=5`),
  ])

  const latest = commits[0]

  // Count merged PRs within the month
  const mergedThisMonth = (closedPRs as { merged_at: string | null }[]).filter(pr => {
    if (!pr.merged_at) return false
    const d = new Date(pr.merged_at)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  }).length

  const parsedReleases: GitHubRelease[] = (releases as {
    tag_name: string; name: string; published_at: string; html_url: string
  }[]).map(r => ({
    tag: r.tag_name,
    name: r.name || r.tag_name,
    date: r.published_at,
    url: r.html_url,
  }))

  const commitsToDetail = (commits as {
    sha: string
    commit: { message: string; author: { name: string; date: string } }
    html_url: string
  }[]).slice(0, 30)

  const commitFiles = await Promise.all(
    commitsToDetail.map(c =>
      ghFetch(`/repos/${owner}/${name}/commits/${c.sha}`)
        .then((detail: { files?: { filename: string }[] }) => detail.files?.map(f => f.filename) ?? [])
        .catch(() => [] as string[])
    )
  )

  const parsedCommits: GitHubCommit[] = commitsToDetail.map((c, i) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
    author: c.commit.author.name,
    date: c.commit.author.date,
    url: c.html_url,
    files: commitFiles[i].slice(0, 8),
    filesTruncated: commitFiles[i].length > 8,
  }))

  return {
    githubBranch: repoData.default_branch as string,
    githubLastCommit: latest ? (latest.sha as string).slice(0, 7) : null,
    githubLastCommitMsg: latest ? (latest.commit?.message as string)?.split('\n')[0] : null,
    githubLastCommitDate: latest ? (latest.commit?.author?.date as string) : null,
    githubCommitsThisMonth: (commits as unknown[]).length,
    githubOpenPRs: (openPRs as unknown[]).length,
    githubMergedPRs: mergedThisMonth,
    githubOpenIssues: repoData.open_issues_count as number,
    githubStars: repoData.stargazers_count as number,
    githubReleases: parsedReleases,
    githubCommits: parsedCommits,
  }
}

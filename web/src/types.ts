export type CommitStats = {
  hash: string
  author: string
  date: string
  added: number
  removed: number
  message: string
  filesTouchedCount: number
}

export type CommitStatsAPI = {
  h: string // hash
  a: string // author
  d: number // date
  '+': number // added
  '-': number // removed
  m: string // message
  f: number // filesTouchedCount
}

export type FileTouchCount = {
  file: string
  count: number
}

export type Repository = {
  username: string
  repoName: string
  totalAdditions: number
  totalLines: number
  totalRemovals: number
  views: number
  linesHistogram: number[]
  totalStars: number
  totalCommits: number
  language: string
  size: number
}

export type GitHubRepo = {
  stargazers_count: number
  language: string
  size: number
}

export type GitHubPullRequest = {
  id: number // int64 from backend but JavaScript handles this as number
  number: number
  title: string
  body: string
  user: GitHubUser
  created_at: string
  state: string
  html_url: string
  comments: number
  pull_request?: GitHubPullRequestInfo
  reactions: GitHubReactions
}

export type GitHubPullRequestInfo = {
  merged_at?: string
}

export type GitHubReactions = {
  total_count: number
  '+1': number
  '-1': number
  laugh: number
  hooray: number
  confused: number
  heart: number
  rocket: number
  eyes: number
}

export type GitHubUser = {
  login: string
  avatar_url: string
  html_url: string
}

// GitHub API search result type
export type GitHubSearchResult = {
  total_count: number
  items: GitHubPullRequest[]
}

// Main API response from /api/analyze endpoint
export type AnalyzeResponse = {
  totalAdded: number
  totalRemoved: number
  totalContributors: number
  totalCommits: number
  commits: CommitStatsAPI[]
  github?: GitHubRepo
  pullRequests?: GitHubSearchResult
}

// Top repos API response from /api/top-repos endpoint
export type TopReposResponse = {
  repos: Repository[] | null
}

// Interfaces used in components - can be moved here from component files
export type WeekData = {
  weekStart: Date
  commits: CommitStats[]
  totalCommits: number
}

export type DayData = {
  dayName: string
  commits: CommitStats[]
  count: number
}

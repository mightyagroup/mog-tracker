// Commit files to mightyagroup/mog-tracker via GitHub Git Data API.
// No local git needed -- avoids fuse-mount .git/index.lock issues.
// Requires GITHUB_TOKEN (fine-grained PAT, Contents: RW) in .env.local.

import fs from 'fs'
import path from 'path'

const OWNER = 'mightyagroup'
const REPO  = 'mog-tracker'
const API   = 'https://api.github.com'

function loadToken() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) throw new Error('.env.local missing')
  for (const l of fs.readFileSync(envPath, 'utf8').split('\n')) {
    if (!l || l.startsWith('#')) continue
    const i = l.indexOf('=')
    if (i === -1) continue
    if (l.slice(0, i).trim() === 'GITHUB_TOKEN') return l.slice(i + 1).trim()
  }
  throw new Error('GITHUB_TOKEN not found in .env.local')
}

async function gh(token, method, endpoint, body) {
  const res = await fetch(API + endpoint, {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  if (!res.ok) {
    const msg = (json && json.message) || text.slice(0, 200)
    throw new Error('GitHub API ' + method + ' ' + endpoint + ' -> ' + res.status + ': ' + msg)
  }
  return json
}

export async function commitFiles({ branch = 'main', message, files }) {
  if (!message) throw new Error('message required')
  if (!Array.isArray(files) || files.length === 0) throw new Error('files[] required')
  const token = loadToken()

  // 1. Get current ref + commit + tree
  const ref = await gh(token, 'GET', '/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + branch)
  const baseCommitSha = ref.object.sha
  const baseCommit = await gh(token, 'GET', '/repos/' + OWNER + '/' + REPO + '/git/commits/' + baseCommitSha)
  const baseTreeSha = baseCommit.tree.sha

  // 2. Create blobs for content files
  const treeEntries = []
  for (const f of files) {
    if (f.delete) {
      treeEntries.push({ path: f.path, mode: '100644', type: 'blob', sha: null })
      continue
    }
    if (typeof f.content !== 'string') throw new Error('content must be a string for ' + f.path)
    const blob = await gh(token, 'POST', '/repos/' + OWNER + '/' + REPO + '/git/blobs', {
      content: f.content,
      encoding: 'utf-8',
    })
    treeEntries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha })
  }

  // 3. Create a new tree based on the old tree
  const newTree = await gh(token, 'POST', '/repos/' + OWNER + '/' + REPO + '/git/trees', {
    base_tree: baseTreeSha,
    tree: treeEntries,
  })

  // 4. Create commit
  const newCommit = await gh(token, 'POST', '/repos/' + OWNER + '/' + REPO + '/git/commits', {
    message,
    tree: newTree.sha,
    parents: [baseCommitSha],
  })

  // 5. Update ref
  await gh(token, 'PATCH', '/repos/' + OWNER + '/' + REPO + '/git/refs/heads/' + branch, {
    sha: newCommit.sha,
    force: false,
  })

  return { sha: newCommit.sha, htmlUrl: 'https://github.com/' + OWNER + '/' + REPO + '/commit/' + newCommit.sha }
}

// Convenience: read files from disk, commit all staged changes
export async function commitDiskFiles({ branch = 'main', message, localPaths }) {
  const files = []
  for (const p of localPaths) {
    const full = path.join(process.cwd(), p)
    if (!fs.existsSync(full)) throw new Error('Missing: ' + p)
    files.push({ path: p, content: fs.readFileSync(full, 'utf8') })
  }
  return commitFiles({ branch, message, files })
}

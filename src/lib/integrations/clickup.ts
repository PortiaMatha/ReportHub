import axios from 'axios'

const CLICKUP_API = 'https://api.clickup.com/api/v2'

const headers = () => ({
  Authorization: process.env.CLICKUP_API_TOKEN || '',
  'Content-Type': 'application/json',
})

export async function fetchClickUpTasks(listId: string) {
  const response = await axios.get(`${CLICKUP_API}/list/${listId}/task`, {
    headers: headers(),
    params: {
      include_closed: true,
      subtasks: true,
      page: 0,
    },
  })

  const tasks = response.data.tasks || []

  interface RawStatus { status: string; color?: string; orderindex?: number; type?: string }

  const mapped = tasks.map((t: Record<string, unknown>) => {
    const s = t.status as RawStatus
    return {
      id: t.id as string,
      name: t.name as string,
      status: s?.status || 'unknown',
      statusColor: s?.color || '#94a3b8',
      priority: (t.priority as Record<string, string>)?.priority || null,
      dueDate: t.due_date ? new Date(parseInt(t.due_date as string)).toISOString() : null,
      url: t.url as string,
      assignees: ((t.assignees as Record<string, unknown>[]) || []).map((a) => ({
        name: a.username as string,
        avatar: a.profilePicture as string | null,
      })),
    }
  })

  // Build a full breakdown of every status that appears on tasks
  const seenStatuses = new Map<string, { count: number; color: string; orderindex: number }>()
  for (const t of tasks) {
    const s = t.status as RawStatus
    const key = (s?.status || 'unknown').toLowerCase()
    const existing = seenStatuses.get(key)
    if (existing) {
      existing.count++
    } else {
      seenStatuses.set(key, {
        count: 1,
        color: s?.color || '#94a3b8',
        orderindex: s?.orderindex ?? 999,
      })
    }
  }

  const clickupStatusBreakdown = Array.from(seenStatuses.entries())
    .sort((a, b) => a[1].orderindex - b[1].orderindex)
    .map(([status, { count, color, orderindex }]) => ({ status, count, color, orderindex }))

  const DONE_STATUSES = ['complete', 'closed', 'done', 'completed']

  const openTasks = mapped.filter((t: { status: string }) =>
    !DONE_STATUSES.includes(t.status.toLowerCase())
  ).length

  const completedTasks = mapped.filter((t: { status: string }) =>
    DONE_STATUSES.includes(t.status.toLowerCase())
  ).length

  const inProgressTasks = mapped.filter((t: { status: string }) =>
    ['in progress', 'in review', 'active'].includes(t.status.toLowerCase())
  ).length

  return {
    openTasks,
    completedTasks,
    inProgressTasks,
    tasks: mapped.slice(0, 30),
    clickupStatusBreakdown,
  }
}

export async function fetchClickUpSpaceLists(spaceId: string) {
  const response = await axios.get(`${CLICKUP_API}/space/${spaceId}/list`, {
    headers: headers(),
  })
  return response.data.lists || []
}

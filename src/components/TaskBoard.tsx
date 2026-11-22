import React, { useState, useEffect } from 'react';
import { TaskItem, TaskColumn, TaskPriority, Mail } from '../lib/types';
import { playMailSound } from '../lib/soundFx';

interface TaskBoardProps {
  userId: string;
  mails: Mail[];
  onOpenMail?: (mail: Mail) => void;
  onSetNotice?: (notice: string) => void;
}

const STORAGE_KEY_PREFIX = 'chase-mail-tasks:';

const COLUMNS: { id: TaskColumn; title: string; icon: string; description: string }[] = [
  { id: 'inbox', title: 'Action Items', icon: '📥', description: 'New tasks extracted from emails or backlog' },
  { id: 'progress', title: 'In Progress', icon: '⏳', description: 'Active studio production & replies' },
  { id: 'review', title: 'Priority Review', icon: '⭐', description: 'Awaiting executive or client sign-off' },
  { id: 'done', title: 'Dispatched & Done', icon: '✅', description: 'Completed correspondence & milestones' }
];

export const TaskBoard: React.FC<TaskBoardProps> = ({
  userId,
  mails,
  onOpenMail,
  onSetNotice
}) => {
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    // Initial sample tasks showcasing the board
    return [
      {
        id: 'task-1',
        title: 'Review Chase Studios Q4 Production Roadmap',
        description: 'Verify video render schedule, sponsorship deliverables, and team assignments.',
        column: 'progress',
        priority: 'urgent',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-2',
        title: 'Send Sponsor Contract Confirmation',
        description: 'Respond with terms, deliverable timeline, and official Vanguard invoice.',
        column: 'inbox',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-3',
        title: 'Configure Inbound Routing Worker',
        description: 'Cloudflare Email Routing worker linked to Supabase Edge Function.',
        column: 'done',
        priority: 'medium',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Modal / Creator State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskCol, setNewTaskCol] = useState<TaskColumn>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');

  // Save on state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks:', e);
    }
  }, [tasks, userId]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: 'task_' + Date.now(),
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      column: newTaskCol,
      priority: newTaskPriority,
      dueDate: newTaskDueDate || undefined,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDueDate('');
    setShowAddModal(false);
    playMailSound('action');
    if (onSetNotice) onSetNotice(`Task "${newTask.title}" added to ${newTaskCol}!`);
  };

  const handleMoveColumn = (taskId: string, targetCol: TaskColumn) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, column: targetCol } : t))
    );
    playMailSound(targetCol === 'done' ? 'send' : 'action');
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    playMailSound('trash');
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return <span className="task-badge badge-urgent">🚨 Urgent</span>;
      case 'high':
        return <span className="task-badge badge-high">▲ High</span>;
      case 'medium':
        return <span className="task-badge badge-medium">● Medium</span>;
      case 'low':
        return <span className="task-badge badge-low">▽ Low</span>;
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="task-board-container">
      <div className="task-board-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📋</span> Studio Task Board
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#a795be', fontSize: '0.88rem' }}>
            Turn correspondence into actionable studio deliverables. Drag, track, and dispatch.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ maxWidth: '200px', padding: '8px 12px', fontSize: '0.85rem' }}
          />

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as any)}
            className="filter-select"
            style={{ padding: '8px 12px', borderRadius: '10px', background: '#1c1328', color: '#fff', border: '1px solid #5a3a78' }}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">🚨 Urgent</option>
            <option value="high">▲ High</option>
            <option value="medium">● Medium</option>
            <option value="low">▽ Low</option>
          </select>

          <button
            type="button"
            className="primary-btn"
            onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>+</span> Add Task
          </button>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="kanban-grid">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.column === col.id);
          return (
            <div key={col.id} className="kanban-column">
              <div className="kanban-column-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{col.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#e8dbf7' }}>{col.title}</span>
                </div>
                <span className="kanban-count-pill">{colTasks.length}</span>
              </div>

              <div className="kanban-column-body">
                {colTasks.length === 0 ? (
                  <div className="kanban-empty-state">
                    <span>No tasks in this lane</span>
                  </div>
                ) : (
                  colTasks.map(task => {
                    const isOverdue =
                      task.dueDate &&
                      task.column !== 'done' &&
                      new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <div key={task.id} className={`kanban-card ${isOverdue ? 'card-overdue' : ''}`}>
                        <div className="kanban-card-top">
                          {getPriorityBadge(task.priority)}
                          {task.dueDate && (
                            <span className={`task-due-date ${isOverdue ? 'due-overdue' : ''}`}>
                              📅 {task.dueDate}
                            </span>
                          )}
                        </div>

                        <h4 className="kanban-card-title">{task.title}</h4>

                        {task.description && (
                          <p className="kanban-card-desc">{task.description}</p>
                        )}

                        {task.mailId && (
                          <div style={{ marginTop: '8px' }}>
                            <button
                              type="button"
                              className="link"
                              style={{ fontSize: '0.78rem', color: '#64dcff' }}
                              onClick={() => {
                                const found = mails.find(m => m.id === task.mailId);
                                if (found && onOpenMail) onOpenMail(found);
                              }}
                            >
                              ✉ Linked Email Thread →
                            </button>
                          </div>
                        )}

                        <div className="kanban-card-actions">
                          {/* Column Mover Buttons */}
                          {col.id !== 'inbox' && (
                            <button
                              type="button"
                              className="card-action-btn"
                              title="Move left"
                              onClick={() => {
                                const idx = COLUMNS.findIndex(c => c.id === col.id);
                                if (idx > 0) handleMoveColumn(task.id, COLUMNS[idx - 1].id);
                              }}
                            >
                              ←
                            </button>
                          )}

                          {col.id !== 'done' && (
                            <button
                              type="button"
                              className="card-action-btn"
                              title="Move right"
                              onClick={() => {
                                const idx = COLUMNS.findIndex(c => c.id === col.id);
                                if (idx < COLUMNS.length - 1)
                                  handleMoveColumn(task.id, COLUMNS[idx + 1].id);
                              }}
                            >
                              →
                            </button>
                          )}

                          {col.id !== 'done' && (
                            <button
                              type="button"
                              className="card-action-btn card-action-done"
                              title="Mark as completed"
                              onClick={() => handleMoveColumn(task.id, 'done')}
                            >
                              ✓ Done
                            </button>
                          )}

                          <button
                            type="button"
                            className="card-action-btn card-action-delete"
                            title="Delete task"
                            onClick={() => handleDeleteTask(task.id)}
                            style={{ marginLeft: 'auto' }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="task-modal-card" onClick={e => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>✦ Create Studio Task</h3>
              <button className="link" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTask} className="task-modal-form">
              <label>
                Task Title *
                <input
                  required
                  type="text"
                  placeholder="e.g. Finalize sponsorship proposal with Discord"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  autoFocus
                />
              </label>

              <label>
                Description / Context
                <textarea
                  rows={3}
                  placeholder="Additional details, action items, or meeting notes..."
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Priority
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as any)}
                  >
                    <option value="low">▽ Low</option>
                    <option value="medium">● Medium</option>
                    <option value="high">▲ High</option>
                    <option value="urgent">🚨 Urgent</option>
                  </select>
                </label>

                <label>
                  Starting Lane
                  <select
                    value={newTaskCol}
                    onChange={e => setNewTaskCol(e.target.value as any)}
                  >
                    <option value="inbox">📥 Action Items</option>
                    <option value="progress">⏳ In Progress</option>
                    <option value="review">⭐ Priority Review</option>
                    <option value="done">✅ Dispatched & Done</option>
                  </select>
                </label>
              </div>

              <label>
                Target Due Date
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={e => setNewTaskDueDate(e.target.value)}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'transparent', border: '1px solid #5a3a78' }}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Add to Board ↗
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

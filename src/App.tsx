import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  Search,
  Sun,
  Moon,
  GripVertical,
  ListTodo,
  CalendarDays,
  ArrowUpDown,
} from 'lucide-react'
import './App.css'

// ── Types ──
type Priority = 'low' | 'medium' | 'high'
type Status = 'pending' | 'completed'
type ViewFilter = 'all' | 'pending' | 'completed'

interface Task {
  id: string
  title: string
  description: string
  dueDate: string
  status: Status
  priority: Priority
  createdAt: string
}

// ── LocalStorage helpers ──
const STORAGE_KEY = 'todo-app-tasks'
const THEME_KEY = 'todo-app-theme'

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function loadTheme(): 'light' | 'dark' {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// ── Priority helpers ──
const priorityConfig: Record<Priority, { label: string; color: string; darkColor: string; sortOrder: number }> = {
  high: { label: 'High', color: 'bg-red-100 text-red-700 border-red-200', darkColor: 'dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', sortOrder: 0 },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', darkColor: 'dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', sortOrder: 1 },
  low: { label: 'Low', color: 'bg-green-100 text-green-700 border-green-200', darkColor: 'dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', sortOrder: 2 },
}

// ── Sortable Task Card ──
interface SortableTaskProps {
  task: Task
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
}

function SortableTaskCard({ task, onToggle, onDelete, onEdit }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isOverdue = task.dueDate && task.status === 'pending' && new Date(task.dueDate) < new Date(new Date().toDateString())
  const pCfg = priorityConfig[task.priority]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white dark:bg-gray-800 rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md ${
        task.status === 'completed'
          ? 'border-gray-200 dark:border-gray-700 opacity-75'
          : isOverdue
          ? 'border-red-300 dark:border-red-700'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical size={16} />
        </button>

        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
            task.status === 'completed'
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }`}
        >
          {task.status === 'completed' && <Check size={12} strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`font-medium text-sm ${
                task.status === 'completed'
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {task.title}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pCfg.color} ${pCfg.darkColor}`}>
              {pCfg.label}
            </span>
          </div>

          {task.description && (
            <p className={`text-xs mt-1 ${task.status === 'completed' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : ''}`}>
                <CalendarDays size={12} />
                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {isOverdue && ' (Overdue)'}
              </span>
            )}
            <span>
              Created {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add/Edit Task Modal ──
interface TaskModalProps {
  task: Partial<Task> | null
  onSave: (task: Partial<Task>) => void
  onClose: () => void
}

function TaskModal({ task, onSave, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [dueDate, setDueDate] = useState(task?.dueDate || '')
  const [priority, setPriority] = useState<Priority>(task?.priority || 'medium')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ ...task, title: title.trim(), description: description.trim(), dueDate, priority })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {task?.id ? 'Edit Task' : 'Add New Task'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add some details..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!title.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {task?.id ? 'Save Changes' : 'Add Task'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-gray-600 dark:text-gray-400 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Main App ──
type SortBy = 'created' | 'dueDate' | 'priority'

function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('created')
  const [darkMode, setDarkMode] = useState(() => loadTheme() === 'dark')
  const [modalTask, setModalTask] = useState<Partial<Task> | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Persist tasks
  useEffect(() => { saveTasks(tasks) }, [tasks])

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light')
  }, [darkMode])

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setTasks(prev => {
        const oldIndex = prev.findIndex(t => t.id === active.id)
        const newIndex = prev.findIndex(t => t.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }, [])

  const addTask = useCallback((data: Partial<Task>) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: data.title || '',
      description: data.description || '',
      dueDate: data.dueDate || '',
      status: 'pending',
      priority: data.priority || 'medium',
      createdAt: new Date().toISOString(),
    }
    setTasks(prev => [newTask, ...prev])
  }, [])

  const editTask = useCallback((data: Partial<Task>) => {
    if (!data.id) return
    setTasks(prev =>
      prev.map(t =>
        t.id === data.id
          ? { ...t, title: data.title || t.title, description: data.description ?? t.description, dueDate: data.dueDate ?? t.dueDate, priority: data.priority || t.priority }
          : t
      )
    )
  }, [])

  const toggleTask = useCallback((id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t))
    )
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleSave = useCallback(
    (data: Partial<Task>) => {
      if (data.id) {
        editTask(data)
      } else {
        addTask(data)
      }
      setShowModal(false)
      setModalTask(null)
    },
    [addTask, editTask]
  )

  const openAddModal = () => {
    setModalTask({})
    setShowModal(true)
  }

  const openEditModal = (task: Task) => {
    setModalTask(task)
    setShowModal(true)
  }

  // Filtered & sorted tasks
  const filteredTasks = useMemo(() => {
    let result = tasks

    // View filter
    if (viewFilter === 'pending') result = result.filter(t => t.status === 'pending')
    else if (viewFilter === 'completed') result = result.filter(t => t.status === 'completed')

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    }

    // Sort
    if (sortBy === 'dueDate') {
      result = [...result].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    } else if (sortBy === 'priority') {
      result = [...result].sort((a, b) => priorityConfig[a.priority].sortOrder - priorityConfig[b.priority].sortOrder)
    }

    return result
  }, [tasks, viewFilter, searchQuery, sortBy])

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const filterCounts = useMemo(
    () => ({
      all: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    }),
    [tasks]
  )

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <ListTodo size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">To-Do List</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Stay organized, get things done</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(prev => !prev)}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Progress */}
        {totalCount > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {completedCount} of {totalCount} tasks completed
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-3">
          {/* Search + Add */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-sm text-sm shrink-0"
            >
              <Plus size={16} />
              Add Task
            </button>
          </div>

          {/* Filters + Sort */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {(['all', 'pending', 'completed'] as ViewFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setViewFilter(f)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewFilter === f
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)} ({filterCounts[f]})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={14} className="text-gray-400 dark:text-gray-500" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="text-xs py-1.5 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="created">Sort: Created</option>
                <option value="dueDate">Sort: Due Date</option>
                <option value="priority">Sort: Priority</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task List */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16">
                  <ListTodo size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {searchQuery ? 'No tasks match your search' : viewFilter !== 'all' ? `No ${viewFilter} tasks` : 'No tasks yet. Add one to get started!'}
                  </p>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onEdit={openEditModal}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-6 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-200 dark:border-gray-800">
        To-Do List App — Tasks saved locally in your browser
      </footer>

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={modalTask}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false)
            setModalTask(null)
          }}
        />
      )}
    </div>
  )
}

export default App

import { useState } from "react"
import { addEventToGoogleCalendar } from "./utils/calendar"
import "./style.css"

function IndexPopup() {
  const [todo, setTodo] = useState({
    title: "",
    description: "",
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date().toISOString().slice(0, 16),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addEventToGoogleCalendar({
        ...todo,
        startDate: new Date(todo.startDate),
        endDate: new Date(todo.endDate)
      })
      // Reset form
      setTodo({
        title: "",
        description: "",
        startDate: new Date().toISOString().slice(0, 16),
        endDate: new Date().toISOString().slice(0, 16),
      })
      alert("Todo added successfully!")
    } catch (error) {
      alert("Failed to add todo to calendar")
      console.error(error)
    }
  }

  return (
    <div className="popup-container">
      <h2>Add New Todo</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={todo.title}
            onChange={(e) => setTodo({ ...todo, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={todo.description}
            onChange={(e) => setTodo({ ...todo, description: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="startDate">Start Date</label>
          <input
            type="datetime-local"
            id="startDate"
            value={todo.startDate}
            onChange={(e) => setTodo({ ...todo, startDate: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate">End Date</label>
          <input
            type="datetime-local"
            id="endDate"
            value={todo.endDate}
            onChange={(e) => setTodo({ ...todo, endDate: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            onChange={(e) => setTodo({ ...todo})}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <button type="submit">Add Todo</button>
      </form>
    </div>
  )
}

export default IndexPopup

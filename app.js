"use strict";
const todoInput = document.getElementById('todo-input');
const addButton = document.getElementById('add-todo');
const todoList = document.getElementById('todo-list');
const todos = [];
function addTodo() {
    const text = todoInput.value.trim();
    if (text === '')
        return;
    const newTodo = { text, done: false };
    todos.push(newTodo);
    renderTodos();
    todoInput.value = '';
}
function renderTodos() {
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.textContent = todo.text;
        li.addEventListener('click', () => toggleTodo(index));
        if (todo.done)
            li.style.textDecoration = 'line-through';
        todoList.appendChild(li);
    });
}
function toggleTodo(index) {
    todos[index].done = !todos[index].done;
    renderTodos();
}
addButton.addEventListener('click', addTodo);

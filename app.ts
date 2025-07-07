interface Todo {
    text: string;
    done: boolean;
    }
    
    const todoInput = document.getElementById('todo-input') as HTMLInputElement;
    const addButton = document.getElementById('add-todo') as HTMLButtonElement;
    const todoList = document.getElementById('todo-list') as HTMLUListElement;
    
    const todos: Todo[] = [];
    
    function addTodo(): void {
    const text = todoInput.value.trim();
    if (text === '') return;
    
    const newTodo: Todo = { text, done: false };
    todos.push(newTodo);
    renderTodos();
    todoInput.value = '';
    }
    
    function renderTodos(): void {
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
    const li = document.createElement('li');
    li.textContent = todo.text;
    li.addEventListener('click', () => toggleTodo(index));
    if (todo.done) li.style.textDecoration = 'line-through';
    todoList.appendChild(li);
    });
    }
    
    function toggleTodo(index: number): void {
    todos[index].done = !todos[index].done;
    renderTodos();
    }
    
    addButton.addEventListener('click', addTodo);
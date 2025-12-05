const API_BASE = "/api/todos";

export const initTodo = () => {
  renderTodos();
  setupInputs();
  setupRollover();
};

let currentTodos = [];

const renderTodos = async () => {
  try {
    const res = await fetch(API_BASE);
    currentTodos = await res.json();
    
    const todayList = document.getElementById("todo-list-today");
    const futureList = document.getElementById("todo-list-future");
    
    if (!todayList || !futureList) return;
    
    todayList.innerHTML = "";
    futureList.innerHTML = "";
    
    const todayItems = currentTodos.filter(t => t.section === "today");
    const futureItems = currentTodos.filter(t => t.section === "future");
    
    renderTree(todayList, buildTree(todayItems), "today");
    renderTree(futureList, buildTree(futureItems), "future");
    
  } catch (e) {
    console.error("Failed to fetch todos", e);
  }
};

const buildTree = (items) => {
  items.sort((a, b) => a.display_order - b.display_order);
  
  const root = [];
  const stack = [{ level: -1, children: root }];
  
  items.forEach(item => {
    const node = { ...item, children: [] };
    
    while (stack.length > 1 && stack[stack.length - 1].level >= item.indent_level) {
      stack.pop();
    }
    
    const parent = stack[stack.length - 1];
    parent.children.push(node);
    
    stack.push({ level: item.indent_level, children: node.children });
  });
  
  return root;
};

const renderTree = (container, nodes, section) => {
  const ul = document.createElement("ul");
  ul.className = "todo-tree-root";
  ul.dataset.section = section;
  
  nodes.forEach(node => {
    ul.appendChild(createTodoItem(node));
  });
  
  container.appendChild(ul);
  
  initNestedSortable(ul);
};

const createTodoItem = (node) => {
  const li = document.createElement("li");
  li.className = `todo-item-li ${node.is_completed ? "is-completed" : ""}`;
  li.dataset.id = node.id;
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "todo-item-content";
  
  const checkbox = document.createElement("div");
  checkbox.className = `todo-checkbox ${node.is_completed ? "checked" : ""}`;
  checkbox.onclick = (e) => {
    e.stopPropagation();
    toggleTodo(node.id, !node.is_completed);
  };
  
  const input = document.createElement("div");
  input.className = "todo-text";
  input.contentEditable = true;
  input.textContent = node.content;
  input.onblur = () => {
    const text = input.textContent.trim();
    if (text === "") {
      if (node.id) {
        li.remove();
        fetch(`${API_BASE}/${node.id}`, { method: "DELETE" })
          .catch(e => console.error("Failed to delete empty task", e));
      }
    } else {
      updateContent(node.id, text);
    }
  };
  input.onkeydown = (e) => handleKeydown(e, node.id, li);
  
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "todo-delete";
  deleteBtn.innerHTML = "×";
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteTodo(node.id);
  };
  
  contentDiv.appendChild(checkbox);
  contentDiv.appendChild(input);
  contentDiv.appendChild(deleteBtn);
  
  li.appendChild(contentDiv);
  
  if (node.children && node.children.length > 0) {
    const childUl = document.createElement("ul");
    childUl.className = "todo-tree-sub";
    node.children.forEach(child => {
      childUl.appendChild(createTodoItem(child));
    });
    li.appendChild(childUl);
  } else {
    const childUl = document.createElement("ul");
    childUl.className = "todo-tree-sub";
    li.appendChild(childUl);
  }
  
  return li;
};

const handleKeydown = async (e, id, liElement) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const section = liElement.closest('.todo-tree-root').dataset.section;
    
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "", section })
    });
    const newTodo = await res.json();
    
    const newNode = { ...newTodo, children: [], is_completed: false };
    const newLi = createTodoItem(newNode);
    
    liElement.after(newLi);
    
    const newInput = newLi.querySelector('.todo-text');
    if (newInput) newInput.focus();
    
    await saveOrder();
    
  } else if (e.key === "Tab") {
    e.preventDefault();
    
    if (e.shiftKey) {
      const parentUl = liElement.parentElement;
      const parentLi = parentUl.parentElement;
      if (parentLi && parentLi.tagName === "LI") {
        parentLi.after(liElement);
        await saveOrder();
        liElement.querySelector('.todo-text').focus();
      }
    } else {
      const prevLi = liElement.previousElementSibling;
      if (prevLi) {
        let subUl = prevLi.querySelector("ul");
        if (!subUl) {
          subUl = document.createElement("ul");
          subUl.className = "todo-tree-sub";
          prevLi.appendChild(subUl);
          initNestedSortable(subUl);
        }
        subUl.appendChild(liElement);
        await saveOrder();
        liElement.querySelector('.todo-text').focus();
      }
    }
  } else if (e.key === "Backspace" && e.target.textContent === "") {
    e.preventDefault();
    deleteTodo(id);
  }
};

const initNestedSortable = (el) => {
  new Sortable(el, {
    group: "todos",
    animation: 150,
    fallbackOnBody: true,
    swapThreshold: 0.65,
    ghostClass: "sortable-ghost",
    onEnd: async (evt) => {
      await saveOrder();
    }
  });
  
  const subs = el.querySelectorAll("ul");
  subs.forEach(sub => initNestedSortable(sub));
};

const saveOrder = async () => {
  const items = [];
  
  const traverse = (ul, section, level) => {
    const lis = Array.from(ul.children).filter(child => child.tagName === "LI");
    lis.forEach((li, index) => {
      const id = li.dataset.id;
      if (id) {
        items.push({
          id: parseInt(id),
          section: section,
          display_order: items.length,
          indent_level: level
        });
        
        const subUl = li.querySelector("ul");
        if (subUl) {
          traverse(subUl, section, level + 1);
        }
      }
    });
  };
  
  const todayRoot = document.querySelector("#todo-list-today .todo-tree-root");
  const futureRoot = document.querySelector("#todo-list-future .todo-tree-root");
  
  if (todayRoot) traverse(todayRoot, "today", 0);
  if (futureRoot) traverse(futureRoot, "future", 0);
  
  if (items.length > 0) {
    try {
      await fetch(`${API_BASE}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
    } catch (e) {
      console.error("Failed to save order", e);
    }
  }
};

const setupInputs = () => {
  const setupInput = (id, section) => {
    const input = document.getElementById(id);
    if (!input) return;
    
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        await createTodo(input.value.trim(), section);
        input.value = "";
        input.focus();
      }
    });
  };
  
  setupInput("todo-input-today", "today");
  setupInput("todo-input-future", "future");
};

const setupRollover = () => {
  const btn = document.getElementById("btn-todo-rollover");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (confirm("Start new day? This will delete completed tasks and move incomplete ones to Future.")) {
        await fetch(`${API_BASE}/rollover`, { method: "POST" });
        renderTodos();
      }
    });
  }
};

const createTodo = async (content, section) => {
  await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, section })
  });
  renderTodos();
};

const updateContent = async (id, content) => {
  await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
};

const toggleTodo = async (id, is_completed) => {
  await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_completed })
  });
  renderTodos();
};

const deleteTodo = async (id) => {
  await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
  renderTodos();
};

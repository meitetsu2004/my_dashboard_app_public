from flask import Blueprint, request, jsonify
from .models import Todo

bp = Blueprint('todo', __name__, url_prefix='/api/todos')

@bp.route('', methods=['GET'])
def get_todos():
    todos = Todo.get_all()
    return jsonify(todos)

@bp.route('', methods=['POST'])
def create_todo():
    data = request.get_json()
    content = data.get('content', '')
    section = data.get('section', 'today')
        
    todo_id = Todo.create(content, section)
    return jsonify({'id': todo_id, 'content': content, 'section': section}), 201

@bp.route('/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    data = request.get_json()
    success = Todo.update(todo_id, data)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to update'}), 400

@bp.route('/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    success = Todo.delete(todo_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to delete'}), 400

@bp.route('/reorder', methods=['POST'])
def reorder_todos():
    data = request.get_json()
    items = data.get('items', [])
    success = Todo.reorder(items)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to reorder'}), 400

@bp.route('/rollover', methods=['POST'])
def rollover_todos():
    success = Todo.rollover_tasks()
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Failed to rollover'}), 400

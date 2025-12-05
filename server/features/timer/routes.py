from flask import Blueprint, jsonify, request
from .models import WorkSession

bp = Blueprint('timer', __name__, url_prefix='/api/timer')

@bp.route('/start', methods=['POST'])
def start_timer():
    session_id = WorkSession.start_session()
    return jsonify({'success': True, 'id': session_id})

@bp.route('/stop', methods=['POST'])
def stop_timer():
    duration = WorkSession.stop_session()
    if duration is None:
        return jsonify({'error': 'No running session'}), 400
    return jsonify({'success': True, 'duration': duration})

@bp.route('/pause', methods=['POST'])
def pause_timer():
    duration = WorkSession.pause_session()
    if duration is None:
        return jsonify({'error': 'No running session'}), 400
    return jsonify({'success': True, 'duration': duration})

@bp.route('/status', methods=['GET'])
def get_status():
    session = WorkSession.get_current_session()
    return jsonify(session)

@bp.route('/stats', methods=['GET'])
def get_stats():
    stats = WorkSession.get_stats()
    return jsonify(stats)

@bp.route('/history', methods=['GET'])
def get_history():
    days = request.args.get('days', default=7, type=int)
    history = WorkSession.get_history(days=days)
    return jsonify(history)

@bp.route('/history/weekly', methods=['GET'])
def get_weekly_history():
    history = WorkSession.get_weekly_history()
    return jsonify(history)

@bp.route('/session/<int:id>', methods=['PUT'])
def update_session(id):
    data = request.get_json()
    success = WorkSession.update_session(id, data)
    return jsonify({'success': success})

@bp.route('/session/<int:id>', methods=['DELETE'])
def delete_session(id):
    success = WorkSession.delete_session(id)
    return jsonify({'success': success})

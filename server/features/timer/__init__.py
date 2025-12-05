from .routes import bp
from .models import WorkSession

def init_app(app):
    WorkSession.create_table()

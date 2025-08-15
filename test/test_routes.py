import sys, os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from typing import get_origin, get_args
from pydantic import BaseModel
import inspect
import random, string

client = TestClient(app)

def make_dummy_data(model_class: type[BaseModel], route_name: str):
    dummy = {}

    quantity = random.randint(1,50) if route_name == "get_mail_class" else 1

    for name, field in model_class.model_fields.items():
        if name.endswith("mail") and not name.startswith("Sender"):
            dummy[name] = "test"
            continue
        elif name == 'CustomPrompt':
            dummy[name] = "This is a custom prompt for testing. Please follow the output format strictly."
            continue

        field_type = field.annotation
        origin = get_origin(field_type)
        args = get_args(field_type)

        if origin is list or origin is tuple:
            inner_type = args[0] if args else str
            if inspect.isclass(inner_type) and issubclass(inner_type, BaseModel):
                dummy[name] = [make_dummy_data(inner_type, route_name)]
            else:
                dummy[name] = [dummy_value(inner_type) for _ in range(quantity)]
        elif inspect.isclass(field_type) and issubclass(field_type, BaseModel):
            dummy[name] = make_dummy_data(field_type, route_name)
        else:
            dummy[name] = dummy_value(field_type)

    print("dummy data: ", dummy)
    
    return dummy

def dummy_value(field_type, len: int = 10):
    if field_type == int:
        return random.randint(1,20)
    elif field_type == float:
        return 1.0
    elif field_type == bool:
        return True
    elif field_type == str:
        return ''.join(random.choices(string.ascii_letters + string.digits, k=len))
    else:
        return None  # fallback

all_routes = [
    route for route in app.routes
    if hasattr(route, "path") and hasattr(route, "methods")
       and not route.path.startswith("/docs")
]

@pytest.mark.parametrize("route", all_routes)
def test_route_smoke(route):
    if "GET" in route.methods:
        resp = client.get(route.path)
        assert resp.status_code == 200, f"GET {route.path} failed"

    elif "POST" in route.methods:
        body = {}
        if hasattr(route, "dependant"):
            for dep in route.dependant.body_params:
                if inspect.isclass(dep.type_) and issubclass(dep.type_, BaseModel):
                    body = make_dummy_data(dep.type_, route.name)
        resp = client.post(route.path, json=body)
        assert resp.status_code == 200, f"POST {route.path} failed"

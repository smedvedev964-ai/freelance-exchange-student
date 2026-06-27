def test_create_response(client):

    author = client.post(
        "/auth/register",
        json={
            "username": "author_resp",
            "email": "author_resp@mail.com",
            "password": "123456"
        }
    ).json()["id"]

    freelancer = client.post(
        "/auth/register",
        json={
            "username": "free_resp",
            "email": "free_resp@mail.com",
            "password": "123456"
        }
    ).json()["id"]

    order = client.post(
        "/orders",
        headers={
            "X-User-ID": str(author)
        },
        json={
            "title": "Logo",
            "description": "Need logo",
            "budget": 500
        }
    )

    order_id = order.json()["id"]

    response = client.post(
        f"/orders/{order_id}/responses",
        headers={
            "X-User-ID": str(freelancer)
        },
        json={
            "freelancer_id": freelancer,
            "text": "Ready"
        }
    )

    assert response.status_code == 201

def test_get_responses(client):

    response = client.get("/orders/1/responses")

    assert response.status_code in (200, 404)